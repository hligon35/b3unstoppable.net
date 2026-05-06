import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { getDebugConfig } from './config';
import { sendMonitoringAlertEmail } from './email';
import type { MonitoringEntry } from './types';
import { readServerEntries, logServerEntry, persistServerEntry } from '../logger/server';
import { createEntry, previewValue, serializeError, summarizeUrl } from '../logger/shared';

const ALERT_CACHE_FILE = path.join(process.cwd(), 'data', 'debug', 'alert-cache.json');
const GLOBAL_MONITOR_KEY = '__SPARQ_SERVER_MONITORING__';

type ApiMonitoringOptions = {
  alertOnHttpError?: boolean;
  capturePayload?: boolean;
};

type ServerErrorContext = {
  req?: NextApiRequest;
  routeName?: string;
  requestId?: string;
  endpoint?: string;
  status?: number;
  kind?: MonitoringEntry['kind'];
  critical?: boolean;
  context?: Record<string, unknown>;
};

type MonitoredFetchOptions = {
  label?: string;
  route?: string;
  requestId?: string;
  alertOnFailure?: boolean;
  source?: string;
};

type IngestOptions = {
  request?: NextApiRequest;
};

export function registerServerProcessMonitoring(): void {
  const scope = globalThis as typeof globalThis & Record<string, unknown>;
  if (scope[GLOBAL_MONITOR_KEY]) {
    return;
  }
  scope[GLOBAL_MONITOR_KEY] = true;

  process.on('uncaughtException', (error) => {
    void captureServerError(error, {
      routeName: 'process',
      kind: 'error',
      critical: true,
      context: { source: 'uncaughtException' },
    });
  });

  process.on('unhandledRejection', (reason) => {
    void captureServerError(reason, {
      routeName: 'process',
      kind: 'error',
      critical: true,
      context: { source: 'unhandledRejection' },
    });
  });
}

export function withApiMonitoring(routeName: string, handler: NextApiHandler, options: ApiMonitoringOptions = {}): NextApiHandler {
  registerServerProcessMonitoring();

  return async function monitoredHandler(req: NextApiRequest, res: NextApiResponse) {
    const startedAt = Date.now();
    const requestId = crypto.randomUUID();
    res.setHeader('x-request-id', requestId);

    res.once('finish', () => {
      void handleApiCompletion({ req, res, routeName, startedAt, requestId, options });
    });

    try {
      await handler(req, res);
    } catch (error) {
      await captureServerError(error, {
        req,
        routeName,
        requestId,
        kind: 'error',
        critical: true,
      });

      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: 'internal-server-error', requestId });
      }
    }
  };
}

export async function monitoredServerFetch(input: RequestInfo | URL, init: RequestInit = {}, options: MonitoredFetchOptions = {}): Promise<Response> {
  const config = getDebugConfig('server');
  const targetUrl = resolveFetchUrl(input);
  if (!config.monitoringEnabled || targetUrl.includes('/api/debug/')) {
    return fetch(input, init);
  }

  const startedAt = Date.now();
  const payloadPreview = summarizeRequestBody(init.body);

  try {
    const response = await fetch(input, init);
    const durationMs = Date.now() - startedAt;
    const responseBytes = Number(response.headers.get('content-length') || 0);

    const baseEntry = await logServerEntry({
      kind: 'api',
      level: response.ok ? 'network' : 'error',
      message: options.label || `${init.method || 'GET'} ${targetUrl}`,
      endpoint: targetUrl,
      route: options.route,
      requestId: options.requestId,
      status: response.status,
      durationMs,
      payloadPreview,
      context: {
        responseBytes,
        method: init.method || 'GET',
      },
      critical: !response.ok,
      source: options.source || 'server-fetch',
    });

    if (durationMs > config.slowApiMs || responseBytes > config.largePayloadBytes) {
      await logServerEntry({
        kind: 'performance',
        level: 'warn',
        message: `Slow or heavy response detected for ${options.label || summarizeUrl(targetUrl) || targetUrl}`,
        endpoint: targetUrl,
        route: options.route,
        requestId: options.requestId,
        status: response.status,
        durationMs,
        tags: ['api'],
        context: {
          responseBytes,
          thresholdMs: config.slowApiMs,
          payloadThresholdBytes: config.largePayloadBytes,
        },
        source: options.source || 'server-fetch',
      });
    }

    if (!response.ok && options.alertOnFailure !== false) {
      const responsePreview = await response
        .clone()
        .text()
        .then((text) => previewValue(text))
        .catch(() => undefined);

      await maybeSendAlert({
        ...baseEntry,
        responsePreview,
        critical: true,
      });
    }

    return response;
  } catch (error) {
    await captureServerError(error, {
      routeName: options.route,
      requestId: options.requestId,
      endpoint: targetUrl,
      kind: 'api',
      critical: true,
      context: {
        payloadPreview,
        method: init.method || 'GET',
      },
    });
    throw error;
  }
}

export async function captureServerError(error: unknown, context: ServerErrorContext = {}): Promise<MonitoringEntry> {
  const config = getDebugConfig('server');
  const normalized = serializeError(error);
  const url = context.endpoint || (context.req ? getRequestUrl(context.req) : undefined);

  const entry = await logServerEntry({
    kind: context.kind || 'error',
    level: 'error',
    message: normalized.message,
    stack: normalized.stack,
    route: context.routeName,
    endpoint: url,
    url,
    requestId: context.requestId,
    status: context.status,
    payloadPreview: previewValue(context.context || {}),
    userAgent: context.req?.headers['user-agent'],
    context: {
      ...context.context,
      file: extractFileFromStack(normalized.stack),
    },
    critical: context.critical ?? true,
    source: config.environment,
  });

  await maybeSendAlert(entry);
  return entry;
}

export async function ingestClientEntries(rawEntries: unknown[], options: IngestOptions = {}): Promise<{ stored: number }> {
  const storedEntries: MonitoringEntry[] = [];

  for (const rawEntry of rawEntries) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      continue;
    }

    const entry = normalizeClientEntry(rawEntry as Partial<MonitoringEntry>, options.request);
    await persistServerEntry(entry);
    storedEntries.push(entry);

    if (entry.critical || entry.kind === 'error' || (entry.kind === 'api' && (entry.status || 0) >= 500)) {
      await maybeSendAlert(entry);
    }
  }

  return { stored: storedEntries.length };
}

export async function recordHeartbeat(source = 'scheduler'): Promise<void> {
  await logServerEntry({
    kind: 'heartbeat',
    level: 'success',
    message: 'Monitoring heartbeat received',
    source,
  });
}

export function isAuthorizedMonitoringRequest(req: NextApiRequest): boolean {
  const expected = getDebugConfig('server').cronToken;
  if (!expected) {
    return false;
  }

  const provided = String(req.headers['x-monitoring-token'] || req.query.token || '').trim();
  if (!provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function getRecentServerLogs(limit = 40): Promise<MonitoringEntry[]> {
  return readServerEntries(limit);
}

async function handleApiCompletion(params: {
  req: NextApiRequest;
  res: NextApiResponse;
  routeName: string;
  startedAt: number;
  requestId: string;
  options: ApiMonitoringOptions;
}): Promise<void> {
  const { req, res, routeName, startedAt, requestId, options } = params;
  const durationMs = Date.now() - startedAt;
  const status = res.statusCode || 200;
  const entry = await logServerEntry({
    kind: 'api',
    level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'network',
    message: `${req.method || 'GET'} ${routeName}`,
    endpoint: getRequestUrl(req),
    route: routeName,
    requestId,
    status,
    durationMs,
    payloadPreview: options.capturePayload ? summarizeRequestBody(req.body) : undefined,
    userAgent: req.headers['user-agent'],
    context: {
      method: req.method || 'GET',
      query: req.query,
    },
    critical: status >= 500,
    source: 'api-middleware',
  });

  const config = getDebugConfig('server');
  if (durationMs > config.slowApiMs) {
    await logServerEntry({
      kind: 'performance',
      level: 'warn',
      message: `Slow API response detected for ${routeName}`,
      endpoint: getRequestUrl(req),
      route: routeName,
      requestId,
      status,
      durationMs,
      tags: ['api'],
      context: {
        thresholdMs: config.slowApiMs,
      },
      source: 'api-middleware',
    });
  }

  if (status >= 500 && options.alertOnHttpError !== false) {
    await maybeSendAlert(entry);
  }
}

async function maybeSendAlert(entry: MonitoringEntry): Promise<void> {
  const config = getDebugConfig('server');
  if (!config.monitoringEnabled || !config.emailAlertsEnabled || !entry.fingerprint) {
    return;
  }

  const cache = await readAlertCache();
  const previousSentAt = Number(cache[entry.fingerprint] || 0);
  const now = Date.now();
  if (previousSentAt && now - previousSentAt < config.alertCooldownMs) {
    return;
  }

  const recentLogs = await readServerEntries(12);
  try {
    const sent = await sendMonitoringAlertEmail(entry, recentLogs);
    if (!sent) {
      return;
    }

    cache[entry.fingerprint] = now;
    await writeAlertCache(cache);
  } catch (error) {
    const normalized = serializeError(error);
    await logServerEntry({
      kind: 'error',
      level: 'warn',
      message: `Monitoring alert delivery failed: ${normalized.message}`,
      stack: normalized.stack,
      route: 'monitoring-alert',
      endpoint: 'sendgrid',
      requestId: entry.requestId,
      context: {
        alertFingerprint: entry.fingerprint,
        originalMessage: entry.message,
      },
      critical: false,
      source: 'monitoring-email',
    });
  }
}

async function readAlertCache(): Promise<Record<string, number>> {
  try {
    const raw = await fs.readFile(ALERT_CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

async function writeAlertCache(cache: Record<string, number>): Promise<void> {
  await fs.mkdir(path.dirname(ALERT_CACHE_FILE), { recursive: true });
  await fs.writeFile(ALERT_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

function normalizeClientEntry(entry: Partial<MonitoringEntry>, req?: NextApiRequest): MonitoringEntry {
  return createEntry({
    kind: entry.kind || 'log',
    level: entry.level || 'info',
    message: entry.message || 'Client monitoring event',
    runtime: 'client',
    environment: entry.environment || getDebugConfig('server').environment,
    source: entry.source || 'browser-ingest',
    route: entry.route,
    url: entry.url,
    endpoint: entry.endpoint,
    file: entry.file,
    line: entry.line,
    column: entry.column,
    stack: entry.stack,
    status: entry.status,
    durationMs: entry.durationMs,
    userAgent: entry.userAgent || req?.headers['user-agent'],
    requestId: entry.requestId,
    sessionId: entry.sessionId,
    payloadPreview: entry.payloadPreview,
    responsePreview: entry.responsePreview,
    tags: entry.tags,
    context: entry.context,
    critical: entry.critical,
  });
}

function getRequestUrl(req: NextApiRequest): string {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost');
  const protocol = String(req.headers['x-forwarded-proto'] || 'https');
  return `${protocol}://${host}${req.url || ''}`;
}

function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function summarizeRequestBody(body: unknown): string | undefined {
  if (!body) {
    return undefined;
  }
  if (typeof body === 'string') {
    return previewValue(body);
  }
  if (body instanceof URLSearchParams) {
    return previewValue(body.toString());
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return previewValue(Object.fromEntries(body.entries()));
  }
  if (ArrayBuffer.isView(body)) {
    return `[binary:${body.byteLength}]`;
  }
  return previewValue(body);
}

function extractFileFromStack(stack?: string): string | undefined {
  if (!stack) {
    return undefined;
  }

  const line = stack.split('\n').find((value) => value.includes('.ts') || value.includes('.tsx') || value.includes('.js'));
  return line?.trim();
}
