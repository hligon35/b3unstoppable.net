import { getDebugConfig } from './config';
import type { MonitoringEntry } from './types';
import { captureClientError, logClientEntry } from '../logger/client';
import { previewValue, serializeError, summarizeUrl } from '../logger/shared';

const SESSION_ID_KEY = 'sparq.debug.session.id';
const SESSION_STARTED_KEY = 'sparq.debug.session.started';
const SESSION_PAGE_COUNT_KEY = 'sparq.debug.session.pageCount';
const CLIENT_MONITOR_KEY = '__SPARQ_CLIENT_MONITOR__';

type ClientFetchOptions = {
  label?: string;
  route?: string;
  source?: string;
  suppressErrorLogging?: boolean;
};

function isNextDataRequest(targetUrl: string): boolean {
  return /\/\_next\/data\/[^/]+\/.+\.json(?:$|\?)/i.test(targetUrl);
}

declare global {
  interface Window {
    __SPARQ_CLIENT_MONITOR__?: boolean;
    __SPARQ_ORIGINAL_FETCH__?: typeof fetch;
  }
}

export function installClientMonitoring(): void {
  if (typeof window === 'undefined' || window[CLIENT_MONITOR_KEY]) {
    return;
  }

  const config = getDebugConfig('client');
  window[CLIENT_MONITOR_KEY] = true;

  if (!window.__SPARQ_ORIGINAL_FETCH__) {
    window.__SPARQ_ORIGINAL_FETCH__ = window.fetch.bind(window);
  }

  if (config.monitoringEnabled) {
    installClientFetchMonitoring();
  }

  ensureSessionState();

  window.addEventListener('error', (event) => {
    const entry = captureClientError(event.error || new Error(event.message), {
      route: window.location.pathname,
      url: window.location.href,
      file: event.filename,
      line: event.lineno,
      column: event.colno,
      source: 'window.onerror',
      sessionId: getSessionId(),
    });
    void sendEntryToServer(entry);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const normalized = serializeError(event.reason);
    const entry = captureClientError(event.reason, {
      route: window.location.pathname,
      url: window.location.href,
      stack: normalized.stack,
      source: 'window.onunhandledrejection',
      sessionId: getSessionId(),
    });
    void sendEntryToServer(entry);
  });

  const onPageHide = () => {
    const durationMs = Date.now() - Number(window.sessionStorage.getItem(SESSION_STARTED_KEY) || Date.now());
    const pageViews = Number(window.sessionStorage.getItem(SESSION_PAGE_COUNT_KEY) || 0);
    const entry = logClientEntry({
      kind: 'session',
      level: 'info',
      message: 'Session ended',
      route: window.location.pathname,
      url: window.location.href,
      durationMs,
      sessionId: getSessionId(),
      source: 'pagehide',
      context: { pageViews },
    });
    void sendEntryToServer(entry, true);
  };

  window.addEventListener('pagehide', onPageHide);

  recordPageLoadPerformance(window.location.pathname);
}

export function installClientFetchMonitoring(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!window.__SPARQ_ORIGINAL_FETCH__) {
    window.__SPARQ_ORIGINAL_FETCH__ = window.fetch.bind(window);
  }

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => monitoredFetch(input, init, { source: 'global-fetch' })) as typeof fetch;
}

export async function monitoredFetch(input: RequestInfo | URL, init: RequestInit = {}, options: ClientFetchOptions = {}): Promise<Response> {
  const baseFetch = getBaseFetch();
  const targetUrl = resolveFetchUrl(input);
  if (shouldSkipMonitoring(targetUrl)) {
    return baseFetch(input, init);
  }

  const config = getDebugConfig('client');
  const startedAt = performance.now();
  const payloadPreview = summarizeRequestBody(init.body);

  try {
    const response = await baseFetch(input, init);
    const durationMs = Math.round(performance.now() - startedAt);
    const responseBytes = Number(response.headers.get('content-length') || 0);
    const isStaleNextData404 = response.status === 404 && isNextDataRequest(targetUrl);
    const entry = logClientEntry({
      kind: 'api',
      level: response.ok ? 'network' : isStaleNextData404 ? 'warn' : 'error',
      message: options.label || `${init.method || 'GET'} ${summarizeUrl(targetUrl) || targetUrl}`,
      endpoint: targetUrl,
      route: options.route || window.location.pathname,
      status: response.status,
      durationMs,
      payloadPreview,
      sessionId: getSessionId(),
      source: options.source || 'client-fetch',
      critical: !response.ok && !isStaleNextData404,
      context: {
        responseBytes,
        staleAfterDeploy: isStaleNextData404 || undefined,
      },
    });
    void sendEntryToServer(entry);

    if (durationMs > config.slowApiMs || responseBytes > config.largePayloadBytes) {
      const perfEntry = logClientEntry({
        kind: 'performance',
        level: 'warn',
        message: `Slow or heavy client request detected for ${summarizeUrl(targetUrl) || targetUrl}`,
        route: options.route || window.location.pathname,
        endpoint: targetUrl,
        durationMs,
        sessionId: getSessionId(),
        source: options.source || 'client-fetch',
        tags: ['api'],
        context: {
          responseBytes,
          thresholdMs: config.slowApiMs,
        },
      });
      void sendEntryToServer(perfEntry);
    }

    return response;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (options.suppressErrorLogging) {
      throw error;
    }

    const entry = captureClientError(error, {
      route: options.route || window.location.pathname,
      endpoint: targetUrl,
      payloadPreview,
      sessionId: getSessionId(),
      source: options.source || 'client-fetch',
    });
    void sendEntryToServer(entry);
    throw error;
  }
}

export function recordPageView(route: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const nextPageCount = Number(window.sessionStorage.getItem(SESSION_PAGE_COUNT_KEY) || 0) + 1;
  window.sessionStorage.setItem(SESSION_PAGE_COUNT_KEY, String(nextPageCount));

  void monitoredFetch('/api/analytics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: route,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
      language: navigator.language || '',
      screenSize: `${window.screen.width}x${window.screen.height}`,
    }),
    credentials: 'omit',
  }, {
    label: 'Page analytics tracking',
    route,
    source: 'pageview-tracker',
    suppressErrorLogging: true,
  }).catch(() => undefined);

  const entry = logClientEntry({
    kind: 'pageview',
    level: 'info',
    message: `Page view: ${route}`,
    route,
    url: window.location.origin + route,
    sessionId: getSessionId(),
    source: 'router',
  });
  void sendEntryToServer(entry);
}

export function recordRoutePerformance(route: string, durationMs: number, failed = false): void {
  const entry = logClientEntry({
    kind: 'performance',
    level: failed ? 'error' : durationMs > getDebugConfig('client').slowPageMs ? 'warn' : 'performance',
    message: failed ? `Route transition failed for ${route}` : `Route transition completed for ${route}`,
    route,
    durationMs: Math.round(durationMs),
    sessionId: getSessionId(),
    source: 'router',
    tags: ['page'],
  });
  void sendEntryToServer(entry);
}

export function reportReactRenderError(error: Error, componentStack?: string): void {
  const entry = captureClientError(error, {
    route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    stack: componentStack ? `${error.stack || ''}\n${componentStack}`.trim() : error.stack,
    sessionId: getSessionId(),
    source: 'react-error-boundary',
  });
  void sendEntryToServer(entry);
}

function recordPageLoadPerformance(route: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.setTimeout(() => {
    const [navigationEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (!navigationEntry) {
      return;
    }

    const durationMs = Math.round(navigationEntry.loadEventEnd || navigationEntry.duration);
    const entry = logClientEntry({
      kind: 'performance',
      level: durationMs > getDebugConfig('client').slowPageMs ? 'warn' : 'performance',
      message: `Initial page load completed for ${route}`,
      route,
      durationMs,
      sessionId: getSessionId(),
      source: 'navigation',
      tags: ['page'],
      context: {
        domInteractive: Math.round(navigationEntry.domInteractive),
        responseStart: Math.round(navigationEntry.responseStart),
      },
    });
    void sendEntryToServer(entry);
  }, 0);
}

async function sendEntryToServer(entry: MonitoringEntry, preferBeacon = false): Promise<void> {
  const config = getDebugConfig('client');
  if (!config.monitoringEnabled) {
    return;
  }

  const payload = JSON.stringify({ entry });
  if (preferBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon('/api/debug/ingest', blob);
    return;
  }

  const baseFetch = getBaseFetch();
  void baseFetch('/api/debug/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {
    // Keep the client logger additive. A failed telemetry POST should never affect app behavior.
  });
}

function getBaseFetch(): typeof fetch {
  if (typeof window !== 'undefined' && window.__SPARQ_ORIGINAL_FETCH__) {
    return window.__SPARQ_ORIGINAL_FETCH__;
  }
  return window.fetch.bind(window);
}

function shouldSkipMonitoring(url: string): boolean {
  return url.includes('/api/debug/ingest')
    || url.includes('/api/debug/export')
    || url.includes('/api/debug/weekly-report')
    || url.includes('/api/debug/health')
    || url.includes('/_next/static/webpack/')
    || url.includes('.webpack.hot-update.json')
    || url.includes('/__nextjs_original-stack-frames');
}

function getSessionId(): string {
  ensureSessionState();
  return window.sessionStorage.getItem(SESSION_ID_KEY) || 'unknown-session';
}

function ensureSessionState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!window.sessionStorage.getItem(SESSION_ID_KEY)) {
    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
    window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    window.sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
    window.sessionStorage.setItem(SESSION_PAGE_COUNT_KEY, '0');
  }
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
  return previewValue(body);
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  if (error instanceof Error) {
    return error.name === 'AbortError' || /signal is aborted/i.test(error.message);
  }

  return false;
}
