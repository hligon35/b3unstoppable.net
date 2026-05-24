import { explainIssue, suggestFixes } from './explainers';
import { getDebugConfig } from './config';
import type { MonitoringEntry, WeeklyAnalyticsSource, WeeklyReportSummary } from './types';

export async function sendMonitoringAlertEmail(entry: MonitoringEntry, relatedLogs: MonitoringEntry[] = []): Promise<boolean> {
  const config = getDebugConfig('server');
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.MONITORING_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL;

  if (!config.emailAlertsEnabled || !apiKey || !fromEmail) {
    return false;
  }

  const explanation = explainIssue(entry);
  const fixes = suggestFixes(entry);
  const subject = `[Monitoring Alert] ${entry.message}`;
  const logsLink = config.siteUrl && config.cronToken ? `${config.siteUrl}/api/debug/export?token=${encodeURIComponent(config.cronToken)}` : '';

  await sendEmail({
    to: config.developerEmail,
    fromEmail,
    subject,
    html: buildAlertHtml({ entry, explanation, fixes, relatedLogs, logsLink }),
  });

  return true;
}

export async function sendWeeklyReportEmail(summary: WeeklyReportSummary): Promise<boolean> {
  const config = getDebugConfig('server');
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.MONITORING_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return false;
  }

  await sendEmail({
    to: config.developerEmail,
    fromEmail,
    subject: 'SparQ Digital - Weekly Monitoring Report',
    html: buildWeeklyReportHtml(summary),
  });

  return true;
}

async function sendEmail(params: { to: string; fromEmail: string; subject: string; html: string }): Promise<void> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: params.fromEmail, name: 'SparQ Digital Monitoring' },
      subject: params.subject,
      content: [{ type: 'text/html', value: params.html }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`monitoring-email-${response.status}:${detail}`);
  }
}

function buildAlertHtml(params: {
  entry: MonitoringEntry;
  explanation: string;
  fixes: string[];
  relatedLogs: MonitoringEntry[];
  logsLink: string;
}): string {
  const logoUrl = getEmailLogoUrl();
  const technicalRows: Array<[string, string]> = [
    ['Timestamp', params.entry.timestamp],
    ['Environment', params.entry.environment],
    ['Location', params.entry.endpoint || params.entry.url || params.entry.route || 'Unknown'],
    ['Request ID', params.entry.requestId || 'Unavailable'],
    ['Fingerprint', params.entry.fingerprint || 'Unavailable'],
  ];

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <style>
      :root {
        color-scheme: light only;
        supported-color-schemes: light only;
      }
      body,
      .email-shell { background:#eef4f8 !important; color:#102437 !important; }
      .email-card { background:#ffffff !important; }
      .email-header { color:#ffffff !important; }
      .email-header .email-header-subtle { color:#d8ebf7 !important; }
      .email-footer { color:#5a7389 !important; }
      @media (prefers-color-scheme: dark) {
        body,
        .email-shell { background:#eef4f8 !important; color:#102437 !important; }
        .email-card { background:#ffffff !important; border-color:#d4e2eb !important; }
        .email-header { color:#ffffff !important; }
        .email-header .email-header-subtle { color:#d8ebf7 !important; }
        .email-footer { color:#5a7389 !important; background:#fbfdff !important; }
      }
      [data-ogsc] body,
      [data-ogsc] .email-shell { background:#eef4f8 !important; color:#102437 !important; }
      [data-ogsc] .email-card { background:#ffffff !important; border-color:#d4e2eb !important; }
      [data-ogsc] .email-header { color:#ffffff !important; }
      [data-ogsc] .email-header .email-header-subtle { color:#d8ebf7 !important; }
      [data-ogsc] .email-footer { color:#5a7389 !important; background:#fbfdff !important; }
      @media only screen and (max-width: 640px) {
        .email-shell { padding: 16px 10px !important; }
        .email-card { border-radius: 18px !important; }
        .email-header,
        .email-content,
        .email-footer { padding-left: 20px !important; padding-right: 20px !important; }
        .email-header { padding-top: 22px !important; }
        .email-logo { width: 64px !important; }
        .email-title { font-size: 24px !important; line-height: 1.2 !important; }
        .email-section-title { font-size: 16px !important; }
        .email-table,
        .email-table tbody,
        .email-table tr,
        .email-table td,
        .email-table th { display: block !important; width: 100% !important; }
        .email-table thead { display: none !important; }
        .email-table td,
        .email-table th { padding-left: 0 !important; padding-right: 0 !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#eef4f8;color:#102437;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-shell" style="padding:24px 16px;">
      <div class="email-card" style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #d4e2eb;box-shadow:0 18px 44px rgba(16,36,55,0.12);">
        <div class="email-header" style="padding:28px 32px;background:linear-gradient(135deg,#0a1a2a 0%,#17415e 100%);color:#ffffff;">
          <div style="margin:0 0 16px;">
            <img class="email-logo" src="${logoUrl}" alt="B3U" width="84" style="display:block;width:84px;height:auto;border:0;outline:none;text-decoration:none;">
          </div>
          <div class="email-header-subtle" style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d8ebf7;font-weight:700;">SparQ Digital</div>
          <h1 class="email-title" style="margin:10px 0 0;font-size:30px;line-height:1.15;">Website Monitoring Alert</h1>
        </div>
        <div class="email-content" style="padding:30px 32px;">
          ${section('1. Error Overview', `<p style="margin:0 0 12px;"><strong>${escapeHtml(params.entry.message)}</strong></p>${detailList(technicalRows)}`)}
          ${section('2. Explanation', `<p style="margin:0;line-height:1.7;">${escapeHtml(params.explanation)}</p>`)}
          ${section('3. Fix Suggestions', `<ul style="margin:0;padding-left:20px;line-height:1.8;">${params.fixes.map((fix) => `<li>${escapeHtml(fix)}</li>`).join('')}</ul>`)}
          ${section('4. Technical Details', `<details style="border:1px solid #d4e2eb;border-radius:16px;padding:14px 16px;background:#f8fbfd;"><summary style="cursor:pointer;font-weight:700;">Stack trace</summary><pre style="white-space:pre-wrap;font-size:12px;line-height:1.6;color:#2f4c63;">${escapeHtml(params.entry.stack || 'No stack trace was captured.')}</pre></details>${params.entry.payloadPreview ? `<p style="margin:16px 0 0;"><strong>Payload preview:</strong> ${escapeHtml(params.entry.payloadPreview)}</p>` : ''}${params.entry.responsePreview ? `<p style="margin:10px 0 0;"><strong>Response preview:</strong> ${escapeHtml(params.entry.responsePreview)}</p>` : ''}`)}
          ${section('5. Link to Logs', `${params.logsLink ? `<p style="margin:0 0 12px;"><a href="${params.logsLink}" style="color:#0a5fb4;font-weight:700;">Open latest server log export</a></p>` : '<p style="margin:0 0 12px;">Set NEXT_PUBLIC_SITE_URL and MONITORING_CRON_TOKEN to enable direct log links.</p>'}${renderLogSnippets(params.relatedLogs)}`)}
        </div>
        <div class="email-footer" style="padding:20px 32px 28px;border-top:1px solid #e4edf4;background:#fbfdff;color:#5a7389;font-size:13px;line-height:1.7;">
          You are receiving this email because monitoring is enabled for the SparQ Digital website.<br>
          This alert is designed to summarize the issue quickly first, then provide technical detail.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function buildWeeklyReportHtml(summary: WeeklyReportSummary): string {
  const logoUrl = getEmailLogoUrl();
  const periodLabel = `${formatDate(summary.period.from)} to ${formatDate(summary.period.to)}`;
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <style>
      :root {
        color-scheme: light only;
        supported-color-schemes: light only;
      }
      body,
      .email-shell { background:#eef4f8 !important; color:#102437 !important; }
      .email-card,
      .split-panel,
      .kpi-card,
      .snapshot-card { background:#ffffff !important; }
      .email-header { color:#ffffff !important; }
      .email-header .email-header-subtle { color:#d8ebf7 !important; }
      .email-footer { color:#5a7389 !important; }
      @media (prefers-color-scheme: dark) {
        body,
        .email-shell { background:#eef4f8 !important; color:#102437 !important; }
        .email-card,
        .split-panel,
        .kpi-card,
        .snapshot-card { background:#ffffff !important; border-color:#d4e2eb !important; }
        .email-header { color:#ffffff !important; }
        .email-header .email-header-subtle { color:#d8ebf7 !important; }
        .email-footer { color:#5a7389 !important; background:#fbfdff !important; }
      }
      [data-ogsc] body,
      [data-ogsc] .email-shell { background:#eef4f8 !important; color:#102437 !important; }
      [data-ogsc] .email-card,
      [data-ogsc] .split-panel,
      [data-ogsc] .kpi-card,
      [data-ogsc] .snapshot-card { background:#ffffff !important; border-color:#d4e2eb !important; }
      [data-ogsc] .email-header { color:#ffffff !important; }
      [data-ogsc] .email-header .email-header-subtle { color:#d8ebf7 !important; }
      [data-ogsc] .email-footer { color:#5a7389 !important; background:#fbfdff !important; }
      @media only screen and (max-width: 640px) {
        .email-shell { padding: 10px 4px !important; }
        .email-card { border-radius: 18px !important; }
        .email-header,
        .email-content,
        .email-footer { padding-left: 14px !important; padding-right: 14px !important; }
        .email-header { padding-top: 22px !important; }
        .email-logo { width: 64px !important; }
        .email-title { font-size: 24px !important; line-height: 1.2 !important; }
        .email-section-title { font-size: 16px !important; }
        .email-section-copy { font-size: 13px !important; line-height: 1.6 !important; }
        .dashboard-grid,
        .source-grid,
        .split-grid,
        .dashboard-grid > tbody,
        .dashboard-grid > tbody > tr,
        .source-grid > tbody,
        .source-grid > tbody > tr,
        .split-grid > tbody,
        .split-grid > tbody > tr { display: block !important; width: 100% !important; }
        .dashboard-layout-cell,
        .source-layout-cell,
        .split-layout-cell { display: block !important; width: 100% !important; }
        .email-table { font-size: 13px !important; }
        .kpi-card,
        .dashboard-panel,
        .split-panel { margin-bottom: 12px !important; }
        .dashboard-layout-cell,
        .split-layout-cell,
        .source-layout-cell { padding-left: 0 !important; padding-right: 0 !important; }
        .metric-row-label,
        .metric-row-value { display: table-cell !important; width: auto !important; }
        .kpi-card { padding: 10px 7px !important; text-align: center !important; }
        .kpi-value { font-size: 24px !important; line-height: 1.1 !important; }
        .kpi-copy { font-size: 12px !important; line-height: 1.55 !important; }
        .snapshot-card { padding: 10px 6px !important; }
        .snapshot-value { font-size: 18px !important; }
        .snapshot-copy { font-size: 11px !important; line-height: 1.45 !important; }
        .stack-row { padding: 10px 0 !important; }
        .stack-value { margin-top: 6px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#eef4f8;color:#102437;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-shell" style="padding:24px 16px;">
      <div class="email-card" style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #d4e2eb;box-shadow:0 18px 44px rgba(16,36,55,0.12);">
        <div class="email-header" style="padding:28px 32px;background:linear-gradient(135deg,#0a1a2a 0%,#17415e 100%);color:#ffffff;">
          <div style="margin:0 0 16px;">
            <img class="email-logo" src="${logoUrl}" alt="B3U" width="84" style="display:block;width:84px;height:auto;border:0;outline:none;text-decoration:none;">
          </div>
          <div class="email-header-subtle" style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d8ebf7;font-weight:700;">SparQ Digital</div>
          <h1 class="email-title" style="margin:10px 0 0;font-size:30px;line-height:1.15;">Weekly Monitoring Report</h1>
          <p class="email-header-subtle" style="margin:12px 0 0;color:#d8ebf7;font-size:14px;line-height:1.6;">${escapeHtml(periodLabel)} · Generated ${escapeHtml(formatDateTime(summary.generatedAt))}</p>
        </div>
        <div class="email-content" style="padding:30px 32px;">
          ${dashboardHero(summary)}
          ${sectionWithIntro('Executive Summary', 'This is the plain-English version of the week so someone without a technical background can understand what changed.', `<ul style="margin:0;padding-left:20px;line-height:1.8;">${summary.insights.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No insights have been generated yet.</li>'}</ul>`)}
          ${sectionWithIntro('Analytics Sources', 'Each source below has its own color so you can quickly tell which numbers came from the app itself, Cloudflare, or Vercel.', renderAnalyticsSources(summary.analyticsSources))}
          ${sectionWithIntro('KPI Snapshot', 'These cards are the fastest way to see how many people visited, how fast the site felt, and how reliable the system was.', renderKpiGrid(summary))}
          ${sectionWithIntro('Trend Comparison', 'These panels compare this week to last week so you can quickly spot growth, slowdown, or stability issues.', renderTrendPanels(summary))}
          ${sectionWithIntro('Traffic And Experience', 'These tables show which pages attracted the most attention and which ones felt slow for visitors.', renderSplitPanels(summary))}
          ${sectionWithIntro('Operational Notes', 'These notes explain what systems are feeding data into the report and whether any future adapters are still disabled.', `<div class="dashboard-panel" style="border:1px solid #d4e2eb;border-radius:18px;background:#fbfdff;padding:18px 20px;"><ul style="margin:0;padding-left:20px;line-height:1.8;">${summary.adapterNotes.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No adapter notes were recorded.</li>'}</ul></div>`)}
        </div>
        <div class="email-footer" style="padding:20px 32px 28px;border-top:1px solid #e4edf4;background:#fbfdff;color:#5a7389;font-size:13px;line-height:1.7;">
          You are receiving this email as part of the SparQPlug monitoring service included in your subscription.<br>
          Weekly summaries are generated from captured monitoring events throughout your website.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function section(title: string, body: string): string {
  return `<section style="margin:0 0 28px;"><h2 class="email-section-title" style="margin:0 0 12px;font-size:18px;color:#0a1a2a;">${escapeHtml(title)}</h2>${body}</section>`;
}

function sectionWithIntro(title: string, intro: string, body: string): string {
  return `<section style="margin:0 0 28px;"><h2 class="email-section-title" style="margin:0 0 8px;font-size:18px;color:#0a1a2a;">${escapeHtml(title)}</h2><p class="email-section-copy" style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#5a7389;">${escapeHtml(intro)}</p>${body}</section>`;
}

function dashboardHero(summary: WeeklyReportSummary): string {
  return `<div class="dashboard-panel" style="margin:0 0 24px;border:1px solid #d4e2eb;border-radius:20px;background:linear-gradient(135deg,#f7fbff 0%,#eef7ff 45%,#fff7f2 100%);padding:20px 22px;">
    <table class="dashboard-grid" role="presentation" style="width:100%;border-collapse:collapse;">
      <tr>
        <td class="dashboard-layout-cell" style="width:62%;vertical-align:top;padding-right:14px;">
          <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#c2410c;font-weight:700;margin-bottom:10px;">Dashboard Overview</div>
          <div style="font-size:24px;line-height:1.25;font-weight:700;color:#0a1a2a;margin:0 0 10px;">Weekly site health in one view</div>
          <div style="font-size:14px;line-height:1.7;color:#36516a;">Traffic, performance, uptime, and API stability are summarized below using the latest captured monitoring data.</div>
        </td>
        <td class="dashboard-layout-cell" style="width:38%;vertical-align:top;">
          <div class="kpi-card" style="border-radius:18px;background:#ffffff;border:1px solid #dbe7ef;padding:16px 18px;box-shadow:0 10px 24px rgba(16,36,55,0.06);">
            <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:8px;">System Health</div>
            <div style="font-size:28px;line-height:1.1;color:#0a1a2a;font-weight:700;margin-bottom:8px;">${renderPrimaryHealthScore(summary)}</div>
            <div style="font-size:13px;line-height:1.6;color:#5a7389;">API error rate ${formatPercent(summary.apiErrorRate)} · Uptime ${formatPercent(summary.uptimePercentage)}</div>
          </div>
        </td>
      </tr>
    </table>
  </div>`;
}

function renderKpiGrid(summary: WeeklyReportSummary): string {
  return `<table class="kpi-grid" role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 8px;">
    <tr>
      <td style="width:50%;padding:0 4px 8px 0;vertical-align:top;">${kpiCard('Visitors', summary.visitors.current, summary.visitors.deltaPercent, '#0A5FB4', '# of individual visitor sessions were recorded this week.')}</td>
      <td style="width:50%;padding:0 0 8px 4px;vertical-align:top;">${kpiCard('Page Views', summary.pageViews.current, summary.pageViews.deltaPercent, '#0F766E', '# of pages people opened across the site this week.')}</td>
    </tr>
    <tr>
      <td style="width:50%;padding:0 4px 8px 0;vertical-align:top;">${kpiCard('Avg Page Load', formatMilliseconds(summary.averagePageLoadMs.current), summary.averagePageLoadMs.deltaPercent, '#7C3AED', 'How long pages took to become usable on average.')}</td>
      <td style="width:50%;padding:0 0 8px 4px;vertical-align:top;">${kpiCard('Bounce Rate', formatPercent(summary.bounceRate), null, '#B45309', 'How often people left after a short visit.')}</td>
    </tr>
    <tr>
      <td style="width:50%;padding:0 4px 0 0;vertical-align:top;">${kpiCard('API Error Rate', formatPercent(summary.apiErrorRate), null, '#B42318', 'How often monitored API requests ended in an error.')}</td>
      <td style="width:50%;padding:0 0 0 4px;vertical-align:top;">${kpiCard('Uptime', formatPercent(summary.uptimePercentage), null, '#15803D', 'How often the site answered scheduled health checks.')}</td>
    </tr>
  </table>`;
}

function renderAnalyticsSources(sources: WeeklyAnalyticsSource[]): string {
  if (!sources.length) {
    return '<p style="margin:0;">No analytics sources were recorded for this report.</p>';
  }

  return `<table class="source-grid" role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 12px;table-layout:fixed;">
    <tr>${sources
      .map((source, sourceIndex) => {
        const width = `${100 / sources.length}%`;
        const spacing = sources.length === 1 ? '' : sourceIndex === 0 ? 'padding-right:6px;' : sourceIndex === sources.length - 1 ? 'padding-left:6px;' : 'padding-left:3px;padding-right:3px;';
        return `<td class="source-layout-cell" style="width:${width};${spacing}vertical-align:top;">${analyticsSourceCard(source)}</td>`;
      })
      .join('')}</tr>
  </table>`;
}

function renderTrendPanels(summary: WeeklyReportSummary): string {
  return `<table class="dashboard-grid" role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 12px;">
    <tr>
      <td style="width:50%;padding-right:6px;vertical-align:top;">${trendPanel('Audience Trend', 'Visitors and pageview movement compared with last week.', summary.visitors, summary.pageViews)}</td>
      <td style="width:50%;padding-left:6px;vertical-align:top;">${trendPanel('Performance Trend', 'Load time, API failure rate, and operational friction.', summary.averagePageLoadMs, { current: summary.slowApiCount, previous: null, deltaPercent: null })}</td>
    </tr>
  </table>`;
}

function renderSplitPanels(summary: WeeklyReportSummary): string {
  return `<table class="split-grid" role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 12px;">
    <tr>
      <td class="split-layout-cell" style="width:50%;padding-right:6px;vertical-align:top;">${dataPanel('Top Pages', 'These are the pages visitors spent the most attention on this week.', renderTopPages(summary))}</td>
      <td class="split-layout-cell" style="width:50%;padding-left:6px;vertical-align:top;">${dataPanel('Slowest Pages', 'These pages took the longest to load and are the best candidates for optimization.', renderSlowPages(summary))}</td>
    </tr>
    <tr>
      <td class="split-layout-cell" style="width:50%;padding-right:6px;vertical-align:top;">${dataPanel('Operational Counters', 'These counts show how many stability or performance warning events were recorded.', renderOperationalCounters(summary))}</td>
      <td class="split-layout-cell" style="width:50%;padding-left:6px;vertical-align:top;">${dataPanel('Performance Snapshot', 'This compact table compares the main numbers from this week against the previous week.', metricTable(summary))}</td>
    </tr>
  </table>`;
}

function metricTable(summary: WeeklyReportSummary): string {
  return `<div>
    ${metricHighlights(summary)}
    ${metricSimpleRow('Bounce rate', formatPercent(summary.bounceRate))}
    ${metricSimpleRow('API error rate', formatPercent(summary.apiErrorRate))}
    ${metricSimpleRow('Uptime', summary.uptimePercentage === null ? 'Pending heartbeat data' : `${summary.uptimePercentage}%`)}
    ${metricSimpleRow('Slow API calls', String(summary.slowApiCount))}
    ${metricSimpleRow('Slow page loads', String(summary.slowPageCount))}
    ${metricSimpleRow('Large payload events', String(summary.largePayloadCount))}</div>`;
}

function metricHighlights(summary: WeeklyReportSummary): string {
  return `<table role="presentation" style="width:100%;table-layout:fixed;border-collapse:separate;border-spacing:4px 0;margin:0 0 12px;">
      <tr>
        <td style="width:33.33%;vertical-align:top;">${metricHighlightCard('Visitors', summary.visitors.current, summary.visitors.previous, summary.visitors.deltaPercent)}</td>
        <td style="width:33.33%;vertical-align:top;">${metricHighlightCard('Page Views', summary.pageViews.current, summary.pageViews.previous, summary.pageViews.deltaPercent)}</td>
        <td style="width:33.33%;vertical-align:top;">${metricHighlightCard('Avg Page Load', formatMilliseconds(summary.averagePageLoadMs.current), summary.averagePageLoadMs.previous === null ? 'Pending' : `${summary.averagePageLoadMs.previous}ms`, summary.averagePageLoadMs.deltaPercent)}</td>
      </tr>
    </table>`;
}

function metricHighlightCard(label: string, current: number | string | null, previous: number | string | null, delta: number | null): string {
  return `<div class="snapshot-card" style="height:100%;border:1px solid #dbe7ef;border-radius:16px;background:#fbfdff;padding:12px 8px;text-align:center;">
      <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:8px;">${escapeHtml(label)}</div>
      <div class="snapshot-value" style="font-size:20px;line-height:1.1;color:#0a1a2a;font-weight:700;margin-bottom:8px;">${escapeHtml(String(current ?? 'Pending'))}</div>
      <div class="snapshot-copy" style="font-size:11px;line-height:1.45;color:#5a7389;margin-bottom:6px;">Prev ${escapeHtml(String(previous ?? 'Pending'))}</div>
      <div>${delta === null ? '<span style="font-size:11px;color:#64748b;">Trend pending</span>' : trendPill(delta, '#0A5FB4')}</div>
    </div>`;
}

function metricSummaryRow(label: string, current: number | string | null, previous: number | string | null, delta: number | null): string {
  return `<div class="stack-row" style="padding:12px 0;border-bottom:1px solid #edf3f7;vertical-align:top;">
      <div style="font-weight:700;color:#0a1a2a;margin-bottom:6px;">${escapeHtml(label)}</div>
      <div class="stack-value" style="font-size:13px;line-height:1.6;color:#5a7389;">Current</div>
      <div style="font-size:14px;line-height:1.5;color:#0a1a2a;font-weight:700;">${escapeHtml(String(current ?? 'Pending'))}</div>
      <div class="stack-value" style="font-size:13px;line-height:1.6;color:#5a7389;">Previous</div>
      <div style="font-size:14px;line-height:1.5;color:#0a1a2a;font-weight:700;">${escapeHtml(String(previous ?? 'Pending'))}</div>
      <div class="stack-value" style="margin-top:10px;">${delta === null ? '<span style="font-size:12px;color:#64748b;">Trend pending</span>' : `${trendPill(delta, '#0A5FB4')}`}</div>
    </div>`;
}

function metricSimpleRow(label: string, value: string): string {
  return `<div class="stack-row" style="padding:12px 0;border-bottom:1px solid #edf3f7;">
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td class="metric-row-label" style="color:#5a7389;font-size:13px;line-height:1.6;padding:0;vertical-align:top;">${escapeHtml(label)}</td>
          <td class="metric-row-value" style="color:#0a1a2a;font-size:14px;line-height:1.5;font-weight:700;text-align:right;white-space:nowrap;padding:0;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>
      </table>
    </div>`;
}

function renderTopPages(summary: WeeklyReportSummary): string {
  if (summary.topPages.length === 0) {
    return '<p style="margin:0;">No pageview data has been captured yet.</p>';
  }
  return `<table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;">${summary.topPages
    .map(
      (page, index) => `<tr><td class="metric-row-label" style="padding:10px 0;border-bottom:1px solid #edf3f7;color:#0a1a2a;font-weight:700;line-height:1.5;vertical-align:top;"><span style="color:#64748b;margin-right:8px;">${index + 1}.</span>${escapeHtml(formatRouteLabel(page.route))}</td><td class="metric-row-value" style="padding:10px 0;border-bottom:1px solid #edf3f7;text-align:right;color:#5a7389;font-size:13px;line-height:1.5;vertical-align:top;white-space:nowrap;">${page.views} views</td></tr>`,
    )
    .join('')}</table>`;
}

function renderSlowPages(summary: WeeklyReportSummary): string {
  if (summary.slowestPages.length === 0) {
    return '<p style="margin:0;">No page performance data has been captured yet.</p>';
  }
  return `<table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;">${summary.slowestPages
    .map(
      (page, index) => `<tr><td class="metric-row-label" style="padding:10px 0;border-bottom:1px solid #edf3f7;color:#0a1a2a;font-weight:700;line-height:1.5;vertical-align:top;"><span style="color:#64748b;margin-right:8px;">${index + 1}.</span>${escapeHtml(formatRouteLabel(page.route))}</td><td class="metric-row-value" style="padding:10px 0;border-bottom:1px solid #edf3f7;text-align:right;color:#5a7389;font-size:13px;line-height:1.5;vertical-align:top;white-space:nowrap;">${page.averageMs}ms</td></tr>`,
    )
    .join('')}</table>`;
}

function kpiCard(label: string, value: number | string | null, delta: number | null, accent: string, description: string): string {
  return `<div class="kpi-card" style="height:100%;border:1px solid #dbe7ef;border-radius:18px;background:#ffffff;padding:14px 16px;box-shadow:0 10px 24px rgba(16,36,55,0.06);text-align:center;">
    <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:10px;">${escapeHtml(label)}</div>
    <div style="width:36px;height:4px;border-radius:999px;background:${accent};margin:0 auto 12px;"></div>
    <div class="kpi-value" style="font-size:28px;line-height:1.1;color:#0a1a2a;font-weight:700;margin-bottom:10px;">${value ?? 'Pending'}</div>
    <div style="margin-bottom:10px;">${trendPill(delta, accent)}</div>
    <div class="kpi-copy" style="font-size:13px;line-height:1.6;color:#5a7389;">${escapeHtml(description)}</div>
  </div>`;
}

function trendPanel(title: string, description: string, primary: { current: number | null; previous: number | null; deltaPercent: number | null }, secondary: { current: number | null; previous: number | null; deltaPercent: number | null }): string {
  return `<div class="dashboard-panel" style="height:272px;border:1px solid #d4e2eb;border-radius:18px;background:#fbfdff;padding:18px 20px;">
    <div style="font-size:16px;font-weight:700;color:#0a1a2a;margin-bottom:6px;">${escapeHtml(title)}</div>
    <div style="font-size:13px;line-height:1.6;color:#5a7389;margin-bottom:16px;">${escapeHtml(description)}</div>
    <div style="border-top:1px solid #e4edf4;padding-top:12px;">
      ${comparisonRow('Primary', primary)}
      ${comparisonRow('Secondary', secondary)}
    </div>
  </div>`;
}

function comparisonRow(label: string, metric: { current: number | null; previous: number | null; deltaPercent: number | null }): string {
  return `<div style="margin:0 0 12px;">
    <div style="margin-bottom:8px;"><strong style="color:#0a1a2a;font-size:13px;display:block;">${escapeHtml(label)}</strong></div>
    <div style="color:#5a7389;font-size:13px;line-height:1.6;margin-bottom:10px;">Current ${metric.current ?? 'Pending'} · Previous ${metric.previous ?? 'Pending'}</div>
    ${typeof metric.deltaPercent === 'number' ? `<div style="font-size:13px;color:${metric.deltaPercent >= 0 ? '#15803d' : '#b45309'};font-weight:700;margin-bottom:6px;">${metric.deltaPercent >= 0 ? 'Up' : 'Down'} ${Math.abs(metric.deltaPercent)}%</div>${trendBar(metric.deltaPercent)}` : '<div style="font-size:13px;color:#64748b;">Trend pending additional data.</div>'}
  </div>`;
}

function dataPanel(title: string, description: string, body: string): string {
  return `<div class="split-panel" style="height:100%;border:1px solid #d4e2eb;border-radius:18px;background:#ffffff;padding:18px 20px;box-shadow:0 10px 24px rgba(16,36,55,0.04);">
    <div style="font-size:16px;font-weight:700;color:#0a1a2a;margin-bottom:12px;">${escapeHtml(title)}</div>
    <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#5a7389;">${escapeHtml(description)}</p>
    ${body}
  </div>`;
}

function renderOperationalCounters(summary: WeeklyReportSummary): string {
  return `<table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <tbody>
        ${counterRow('Slow API calls', summary.slowApiCount, '#B42318')}
        ${counterRow('Slow page loads', summary.slowPageCount, '#7C3AED')}
        ${counterRow('Large payload events', summary.largePayloadCount, '#B45309')}
        ${counterRow('Uptime', formatPercent(summary.uptimePercentage), '#15803D')}
      </tbody>
    </table>`;
}

function analyticsSourceCard(source: WeeklyAnalyticsSource): string {
  return `<div class="split-panel" style="height:100%;border:1px solid #d4e2eb;border-radius:18px;background:#ffffff;padding:18px 20px;box-shadow:0 10px 24px rgba(16,36,55,0.04);">
    <div style="width:42px;height:4px;border-radius:999px;background:${source.accentColor};margin-bottom:12px;"></div>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:10px;table-layout:fixed;">
      <tr>
        <td style="padding:0 12px 0 0;font-size:17px;font-weight:700;color:#0a1a2a;line-height:1.3;vertical-align:middle;">${escapeHtml(source.label)}</td>
        <td style="width:96px;padding:0 0 0 8px;text-align:left;vertical-align:middle;white-space:nowrap;">${sourceStatusPill(source)}</td>
      </tr>
    </table>
    <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#5a7389;">${escapeHtml(source.summary)}</p>
    ${renderSourceMetrics(source)}
    ${renderSourceNotes(source)}
  </div>`;
}

function renderSourceMetrics(source: WeeklyAnalyticsSource): string {
  const rows: string[] = [];

  if (source.visitors) {
    rows.push(sourceMetricRow('Visitors', source.visitors.current, source.visitors.previous, source.visitors.deltaPercent, source.accentColor));
  }

  if (source.pageViews) {
    rows.push(sourceMetricRow('Page Views', source.pageViews.current, source.pageViews.previous, source.pageViews.deltaPercent, source.accentColor));
  }

  if (typeof source.bounceRate === 'number') {
    rows.push(simpleSourceMetricRow('Bounce Rate', `${source.bounceRate}%`));
  }

  if (source.topPages?.length) {
    rows.push(simpleSourceMetricRow('Top Page', `${formatRouteLabel(source.topPages[0].route)} (${source.topPages[0].views})`, true));
  }

  if (!rows.length) {
    return '<div style="font-size:13px;line-height:1.7;color:#64748b;margin-bottom:12px;">This source is currently providing status information only.</div>';
  }

  return `<table class="email-table" style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;"><tbody>${rows.join('')}</tbody></table>`;
}

function renderSourceNotes(source: WeeklyAnalyticsSource): string {
  if (!source.notes?.length) {
    return '';
  }

  return `<div style="border-top:1px solid #edf3f7;padding-top:12px;"><ul style="margin:0;padding-left:18px;line-height:1.7;color:#5a7389;font-size:12px;">${source.notes
    .map((note) => `<li>${escapeHtml(note)}</li>`)
    .join('')}</ul></div>`;
}

function sourceMetricRow(label: string, current: number | null, previous: number | null, delta: number | null, accent: string): string {
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #edf3f7;vertical-align:top;">
      <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          <td style="padding:0 12px 0 0;vertical-align:middle;">
            <div style="font-weight:700;color:#0a1a2a;margin-bottom:3px;">${escapeHtml(label)}</div>
            <div style="font-size:12px;line-height:1.6;color:#5a7389;">Current ${current ?? 'Pending'} · Previous ${previous ?? 'Pending'}</div>
          </td>
          <td style="width:96px;padding:0 0 0 8px;text-align:left;vertical-align:middle;white-space:nowrap;">${sourceTrendPill(delta, accent)}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function simpleSourceMetricRow(label: string, value: string, stackValue = false): string {
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #edf3f7;">
      <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          <td style="padding:0 12px 0 0;color:#5a7389;vertical-align:middle;">${escapeHtml(label)}</td>
          <td style="width:96px;padding:0 0 0 8px;color:#0a1a2a;text-align:${stackValue ? 'left' : 'center'};vertical-align:middle;white-space:${stackValue ? 'normal' : 'nowrap'};line-height:${stackValue ? '1.4' : 'inherit'};word-break:${stackValue ? 'break-word' : 'normal'};"><strong style="color:#0a1a2a;font-weight:700;display:${stackValue ? 'block' : 'inline'};">${escapeHtml(value)}</strong></td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function sourceStatusPill(source: WeeklyAnalyticsSource): string {
  const statusMap: Record<WeeklyAnalyticsSource['status'], { background: string; border: string; color: string; label: string }> = {
    active: { background: '#e8f7ef', border: '#b8e2c6', color: '#15803d', label: 'Active' },
    partial: { background: '#fff7e8', border: '#f0d2b1', color: '#b45309', label: 'Partial' },
    unavailable: { background: '#fff1f2', border: '#f8c7ce', color: '#b42318', label: 'Unavailable' },
  };

  const palette = statusMap[source.status];
  return `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${palette.background};border:1px solid ${palette.border};color:${palette.color};font-size:12px;font-weight:700;white-space:nowrap;">${palette.label}</span>`;
}

function sourceTrendPill(delta: number | null, accent: string): string {
  if (delta === null) {
    return '<span style="display:inline-block;padding:8px 10px;border-radius:999px;background:#eef4f8;color:#64748b;font-size:12px;font-weight:700;line-height:1.2;white-space:nowrap;vertical-align:middle;">Pending trend data</span>';
  }

  const positive = delta >= 0;
  return `<span style="display:inline-block;padding:8px 10px;border-radius:999px;background:${positive ? '#e8f7ef' : '#fff3e8'};color:${positive ? '#15803d' : '#b45309'};font-size:12px;font-weight:700;line-height:1.2;border:1px solid ${positive ? '#b8e2c6' : '#f0d2b1'};white-space:nowrap;vertical-align:middle;">${positive ? 'Up' : 'Down'} ${Math.abs(delta)}%</span>`;
}

function counterRow(label: string, value: number | string, color: string): string {
  return `<tr>
      <td class="metric-row-label" style="width:72%;padding:10px 0;border-bottom:1px solid #edf3f7;color:#5a7389;line-height:1.6;vertical-align:middle;">${escapeHtml(label)}</td>
      <td class="metric-row-value" style="width:28%;padding:10px 0;border-bottom:1px solid #edf3f7;text-align:right;font-weight:700;color:${color};line-height:1.6;vertical-align:middle;white-space:nowrap;">${escapeHtml(String(value))}</td>
    </tr>`;
}

function trendPill(delta: number | null, accent: string): string {
  if (delta === null) {
    return `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#eef4f8;color:#64748b;font-size:12px;font-weight:700;">Pending trend data</span>`;
  }

  const positive = delta >= 0;
  return `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${positive ? '#e8f7ef' : '#fff3e8'};color:${positive ? '#15803d' : '#b45309'};font-size:12px;font-weight:700;border:1px solid ${positive ? '#b8e2c6' : '#f0d2b1'};">${positive ? 'Up' : 'Down'} ${Math.abs(delta)}%</span>`;
}

function trendBar(delta: number): string {
  return `<div style="background:#d7e7f2;border-radius:999px;height:8px;overflow:hidden;"><div style="width:${Math.min(100, Math.abs(delta))}%;height:8px;background:${delta >= 0 ? '#15803d' : '#b45309'};"></div></div>`;
}

function renderPrimaryHealthScore(summary: WeeklyReportSummary): string {
  if (summary.uptimePercentage !== null) {
    return `${summary.uptimePercentage}%`;
  }
  if (summary.apiErrorRate !== null) {
    return `${Math.max(0, 100 - summary.apiErrorRate)}%`;
  }
  return 'Pending';
}

function formatPercent(value: number | null): string {
  return value === null ? 'Pending' : `${value}%`;
}

function formatMilliseconds(value: number | null): string {
  return value === null ? 'Pending' : `${value}ms`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatRouteLabel(route: string): string {
  const normalized = String(route || '').trim();
  if (!normalized || normalized === '/') {
    return 'Homepage';
  }

  const [pathname] = normalized.split('?');
  const cleanPath = pathname.replace(/\/$/, '');
  if (!cleanPath || cleanPath === '/') {
    return 'Homepage';
  }

  return cleanPath
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[-_]+/g, ' '))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' / ');
}

function detailList(rows: Array<[string, string]>): string {
  return `<div style="border:1px solid #d4e2eb;border-radius:16px;background:#f8fbfd;padding:14px 16px;">${rows
    .map(([label, value]) => `<div style="margin:0 0 10px;"><strong style="display:block;color:#0a1a2a;">${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`)
    .join('')}</div>`;
}

function renderLogSnippets(entries: MonitoringEntry[]): string {
  if (entries.length === 0) {
    return '<p style="margin:0;">No related log snippets were available.</p>';
  }

  const rows = entries.slice(-5).map((entry) => `<li style="margin:0 0 8px;"><strong>${escapeHtml(entry.timestamp)}</strong> ${escapeHtml(entry.message)}</li>`).join('');
  return `<div style="margin-top:12px;"><strong>Recent log snippets</strong><ul style="margin:10px 0 0;padding-left:20px;line-height:1.7;">${rows}</ul></div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeUrl(value?: string): string {
  return String(value || '').trim().replace(/\/$/, '');
}

function getEmailLogoUrl(): string {
  const configured = normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.CUSTOM_DOMAIN,
  );

  if (configured && !isLocalHostname(configured)) {
    const baseUrl = configured.startsWith('http') ? configured : `https://${configured}`;
    return `${baseUrl}/images/logos/B3U3D.png`;
  }

  return 'https://b3unstoppable.net/images/logos/B3U3D.png';
}

function isLocalHostname(value: string): boolean {
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return false;
  }
}