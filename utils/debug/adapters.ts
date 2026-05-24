import type { ExternalWeeklyMetrics, TrendMetric } from './types';

export type MonitoringAdapter = {
  name: string;
  enabled: boolean;
  collectWeeklyMetrics: (range: { from: Date; to: Date }) => Promise<ExternalWeeklyMetrics | null>;
};

type CloudflareSheetWeeklySummary = {
  ok?: boolean;
  source?: string;
  current?: {
    visitors?: number | null;
    pageViews?: number | null;
  };
  previous?: {
    visitors?: number | null;
    pageViews?: number | null;
  };
  lastRefresh?: string | null;
  notes?: string[];
  error?: string;
};

function disabledAdapter(name: string): MonitoringAdapter {
  return {
    name,
    enabled: false,
    collectWeeklyMetrics: async () => null,
  };
}

export function createSentryAdapter(): MonitoringAdapter {
  return process.env.SENTRY_AUTH_TOKEN ? disabledAdapter('Sentry (hook ready, implementation pending)') : disabledAdapter('Sentry');
}

export function createCloudflareLogsAdapter(): MonitoringAdapter {
  return process.env.CLOUDFLARE_API_TOKEN ? disabledAdapter('Cloudflare Logs (hook ready, implementation pending)') : disabledAdapter('Cloudflare Logs');
}

export function createDatadogAdapter(): MonitoringAdapter {
  return process.env.DATADOG_API_KEY ? disabledAdapter('Datadog (hook ready, implementation pending)') : disabledAdapter('Datadog');
}

export function createCustomDashboardAdapter(): MonitoringAdapter {
  return process.env.MONITORING_DASHBOARD_URL ? disabledAdapter('Custom Dashboard (hook ready, implementation pending)') : disabledAdapter('Custom Dashboard');
}

export function getMonitoringAdapters(): MonitoringAdapter[] {
  return [createSentryAdapter(), createCloudflareLogsAdapter(), createDatadogAdapter(), createCustomDashboardAdapter()];
}

type WeeklyComparisonRange = {
  current: { from: Date; to: Date };
  previous: { from: Date; to: Date };
};

type CloudflareCombo = {
  dataset: string;
  dimField: string;
  sumFields: string[];
  uniqField: string | null;
};

const CLOUDFLARE_GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const cloudflareDatasetCandidates = ['webAnalyticsAdaptiveGroups', 'rumPageloadEventsAdaptiveGroups', 'rumPerformanceEventsAdaptiveGroups'];
const cloudflareDimCandidates = ['datetimeFiveMinutes', 'datetimeMinute', 'datetime', 'datetimeHour'];
const cloudflareSumCandidates = ['visits', 'pageViews', 'pageviews', 'page_views', 'views', 'pageLoadCount', 'pageLoads', 'pageViewCount'];
const cloudflareUniqCandidates = ['uniques', 'uniqueVisitors', 'uniq'];

let cachedCloudflareCombo: CloudflareCombo | null = null;

export async function collectAnalyticsSources(range: WeeklyComparisonRange): Promise<ExternalWeeklyMetrics[]> {
  const sources: ExternalWeeklyMetrics[] = [];

  const cloudflareSource = await buildCloudflareAnalyticsSource(range);
  if (cloudflareSource) {
    sources.push(cloudflareSource);
  }

  return sources;
}

async function buildCloudflareAnalyticsSource(range: WeeklyComparisonRange): Promise<ExternalWeeklyMetrics | null> {
  const scriptUrl = readString(process.env.CLOUDFLARE_ANALYTICS_SCRIPT_URL);
  const scriptSecret = readString(process.env.CLOUDFLARE_ANALYTICS_SCRIPT_SECRET);
  const token = readString(process.env.CLOUDFLARE_API_TOKEN);
  const accountTag = readString(process.env.CLOUDFLARE_ACCOUNT_TAG || process.env.CF_ACCOUNT_TAG);
  const siteTag = readString(
    process.env.CLOUDFLARE_ANALYTICS_TOKEN || process.env.CF_WEB_SITE_TAG || process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN,
  );

  let sheetFailureNote: string | null = null;
  if (scriptUrl) {
    try {
      return await buildCloudflareSheetSource(range, scriptUrl, scriptSecret);
    } catch (error) {
      sheetFailureNote = normalizeErrorMessage(error);
    }
  }

  if (!token || !accountTag || !siteTag) {
    const notes = [];
    if (scriptUrl && sheetFailureNote) {
      notes.push(`Apps Script analytics endpoint failed: ${sheetFailureNote}`);
    }
    notes.push('Set CLOUDFLARE_ANALYTICS_SCRIPT_URL to read Cloudflare metrics from the Google Sheets pipeline.');
    notes.push('Or set CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_TAG, and a Cloudflare site tag to include direct Cloudflare visitor metrics here.');

    return {
      id: 'cloudflare',
      label: 'Cloudflare Analytics',
      accentColor: '#F97316',
      status: 'partial',
      summary: 'Cloudflare analytics can be merged into this weekly report, but no working Cloudflare source is configured for this run.',
      notes,
    };
  }

  try {
    const combo = await resolveCloudflareCombo(accountTag, siteTag, range.current.from, range.current.to, token);
    const currentTotals = await queryCloudflareTotals(accountTag, siteTag, range.current.from, range.current.to, token, combo);
    const previousTotals = await queryCloudflareTotals(accountTag, siteTag, range.previous.from, range.previous.to, token, combo);

    return {
      id: 'cloudflare',
      label: 'Cloudflare Analytics',
      accentColor: '#F97316',
      status: 'active',
      summary: 'These numbers come from Cloudflare Web Analytics and represent the external traffic view recorded at the Cloudflare layer.',
      visitors: createTrend(currentTotals.visitors, previousTotals.visitors),
      pageViews: createTrend(currentTotals.pageViews, previousTotals.pageViews),
      notes: [
        `Dataset ${combo.dataset} using ${combo.dimField}.`,
        'Useful as an external traffic comparison against the app-level tracking in this report.',
        ...(sheetFailureNote ? [`Apps Script analytics endpoint failed, so the report fell back to direct Cloudflare GraphQL: ${sheetFailureNote}`] : []),
      ],
    };
  } catch (error) {
    return {
      id: 'cloudflare',
      label: 'Cloudflare Analytics',
      accentColor: '#F97316',
      status: 'partial',
      summary: 'Cloudflare analytics is configured, but the weekly report could not read it successfully for this run.',
      notes: [normalizeErrorMessage(error), ...(sheetFailureNote ? [`Apps Script analytics endpoint also failed: ${sheetFailureNote}`] : [])],
    };
  }
}

async function buildCloudflareSheetSource(
  range: WeeklyComparisonRange,
  scriptUrl: string,
  scriptSecret: string,
): Promise<ExternalWeeklyMetrics> {
  const url = new URL(scriptUrl);
  url.searchParams.set('endpoint', 'weekly_summary');
  url.searchParams.set('from', range.current.from.toISOString());
  url.searchParams.set('to', range.current.to.toISOString());
  url.searchParams.set('compareFrom', range.previous.from.toISOString());
  url.searchParams.set('compareTo', range.previous.to.toISOString());
  if (scriptSecret) {
    url.searchParams.set('secret', scriptSecret);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  });

  const bodyText = await response.text();
  let body: CloudflareSheetWeeklySummary | null = null;

  try {
    body = bodyText ? (JSON.parse(bodyText) as CloudflareSheetWeeklySummary) : null;
  } catch {
    throw new Error(`Apps Script analytics endpoint returned a non-JSON response: ${bodyText || response.statusText}`);
  }

  if (!response.ok) {
    throw new Error(body?.error || `Apps Script analytics endpoint failed with status ${response.status}.`);
  }

  if (!body?.ok) {
    throw new Error(body?.error || 'Apps Script analytics endpoint returned an unsuccessful response.');
  }

  const notes = [...(body.notes || [])];
  if (body.lastRefresh) {
    notes.push(`Sheet last refreshed at ${body.lastRefresh}.`);
  }

  return {
    id: 'cloudflare',
    label: 'Cloudflare Analytics',
    accentColor: '#F97316',
    status: 'active',
    summary: 'These numbers come from the Cloudflare analytics Google Sheet maintained by the Apps Script refresh job.',
    visitors: createTrend(firstNumber(body.current?.visitors), firstNumber(body.previous?.visitors)),
    pageViews: createTrend(firstNumber(body.current?.pageViews), firstNumber(body.previous?.pageViews)),
    notes,
  };
}

async function resolveCloudflareCombo(accountTag: string, siteTag: string, from: Date, to: Date, token: string): Promise<CloudflareCombo> {
  if (cachedCloudflareCombo) {
    return cachedCloudflareCombo;
  }

  for (const dataset of cloudflareDatasetCandidates) {
    for (const dimField of cloudflareDimCandidates) {
      const sumFields: string[] = [];
      for (const sumField of cloudflareSumCandidates) {
        try {
          await probeCloudflareQuery(accountTag, siteTag, from, to, token, dataset, dimField, sumField, 'sum');
          sumFields.push(sumField);
        } catch {
          // Keep probing until a working combination is found.
        }
      }

      if (!sumFields.length) {
        continue;
      }

      let uniqField: string | null = null;
      for (const candidate of cloudflareUniqCandidates) {
        try {
          await probeCloudflareQuery(accountTag, siteTag, from, to, token, dataset, dimField, candidate, 'uniq');
          uniqField = candidate;
          break;
        } catch {
          // Uniques are optional in Cloudflare GraphQL.
        }
      }

      cachedCloudflareCombo = { dataset, dimField, sumFields, uniqField };
      return cachedCloudflareCombo;
    }
  }

  throw new Error('No supported Cloudflare Web Analytics dataset was found for the configured account and site tag.');
}

async function probeCloudflareQuery(
  accountTag: string,
  siteTag: string,
  from: Date,
  to: Date,
  token: string,
  dataset: string,
  dimField: string,
  metricField: string,
  metricContainer: 'sum' | 'uniq',
): Promise<void> {
  const query = `query {
    viewer {
      accounts(filter: { accountTag: \"${escapeGraphql(accountTag)}\" }) {
        ${dataset}(
          limit: 1,
          filter: {
            siteTag: \"${escapeGraphql(siteTag)}\",
            datetime_geq: \"${from.toISOString()}\",
            datetime_lt: \"${to.toISOString()}\"
          }
        ) {
          dimensions { ${dimField} }
          ${metricContainer} { ${metricField} }
        }
      }
    }
  }`;

  await cloudflareGraphql(token, query);
}

async function queryCloudflareTotals(
  accountTag: string,
  siteTag: string,
  from: Date,
  to: Date,
  token: string,
  combo: CloudflareCombo,
): Promise<{ visitors: number | null; pageViews: number | null }> {
  const uniqBlock = combo.uniqField ? `uniq { ${combo.uniqField} }` : '';
  const query = `query {
    viewer {
      accounts(filter: { accountTag: \"${escapeGraphql(accountTag)}\" }) {
        ${combo.dataset}(
          limit: 10000,
          filter: {
            siteTag: \"${escapeGraphql(siteTag)}\",
            datetime_geq: \"${from.toISOString()}\",
            datetime_lt: \"${to.toISOString()}\"
          }
        ) {
          dimensions { ${combo.dimField} }
          sum { ${combo.sumFields.join(' ')} }
          ${uniqBlock}
        }
      }
    }
  }`;

  const data = await cloudflareGraphql(token, query);
  const groups = data?.data?.viewer?.accounts?.[0]?.[combo.dataset] || [];

  let totalVisitors = 0;
  let sawVisitors = false;
  let totalPageViews = 0;
  let sawPageViews = false;

  for (const group of groups) {
    const sum = group?.sum || {};
    const uniq = group?.uniq || {};

    const visitValue = firstNumber(uniq?.[combo.uniqField || ''], sum.visits, sum.uniqueVisitors, sum.uniques, sum.uniq);
    if (visitValue !== null) {
      totalVisitors += visitValue;
      sawVisitors = true;
    }

    const pageValue = firstNumber(
      sum.pageViews,
      sum.pageviews,
      sum.page_views,
      sum.views,
      sum.pageLoadCount,
      sum.pageLoads,
      sum.pageViewCount,
    );
    if (pageValue !== null) {
      totalPageViews += pageValue;
      sawPageViews = true;
    }
  }

  return {
    visitors: sawVisitors ? totalVisitors : null,
    pageViews: sawPageViews ? totalPageViews : null,
  };
}

async function cloudflareGraphql(token: string, query: string): Promise<any> {
  const response = await fetch(CLOUDFLARE_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const bodyText = await response.text();
  let data: any = null;

  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    throw new Error(`Cloudflare returned a non-JSON response: ${bodyText || response.statusText}`);
  }

  if (!response.ok) {
    throw new Error(data?.errors?.[0]?.message || `Cloudflare request failed with status ${response.status}.`);
  }

  if (data?.errors?.length) {
    throw new Error(data.errors[0]?.message || 'Cloudflare GraphQL request failed.');
  }

  return data;
}

function createTrend(current: number | null, previous: number | null): TrendMetric {
  if (current === null && previous === null) {
    return { current: null, previous: null, deltaPercent: null };
  }
  if (previous === null || previous === 0) {
    return { current, previous, deltaPercent: current === null ? null : 100 };
  }
  if (current === null) {
    return { current: null, previous, deltaPercent: -100 };
  }
  return {
    current,
    previous,
    deltaPercent: Number((((current - previous) / previous) * 100).toFixed(1)),
  };
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function escapeGraphql(value: string): string {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function readString(value?: string): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unknown analytics adapter failure.';
}
