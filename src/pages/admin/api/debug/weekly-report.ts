import type { NextApiRequest, NextApiResponse } from 'next';
import { buildWeeklyReportHtml, sendWeeklyReportEmail } from '../../../../utils/debug/email';
import { buildWeeklyReportSummary } from '../../../../utils/debug/weekly-report';
import { isAuthorizedMonitoringRequest, withApiMonitoring } from '../../../../utils/debug/server';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const preview = String(req.query.preview || req.body?.preview || '0') === '1';
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (!isAuthorizedMonitoringRequest(req) && !(preview && isDevelopment)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  const summary = await buildWeeklyReportSummary();

  if (preview) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(buildWeeklyReportHtml(summary));
    return;
  }

  const shouldSend = String(req.query.send || req.body?.send || '1') !== '0';
  const sent = shouldSend ? await sendWeeklyReportEmail(summary) : false;
  res.status(200).json({ ok: true, sent, summary });
}

export default withApiMonitoring('debug-weekly-report', handler, { alertOnHttpError: false });