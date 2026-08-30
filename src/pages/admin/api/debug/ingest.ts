import type { NextApiRequest, NextApiResponse } from 'next';
import { ingestClientEntries, withApiMonitoring } from '../../../../utils/debug/server';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const entries = Array.isArray(payload) ? payload : Array.isArray(payload.entries) ? payload.entries : payload.entry ? [payload.entry] : [];

  if (entries.length === 0) {
    res.status(400).json({ ok: false, error: 'missing-entry' });
    return;
  }

  const result = await ingestClientEntries(entries, { request: req });
  res.status(200).json({ ok: true, stored: result.stored });
}

export default withApiMonitoring('debug-ingest', handler, { alertOnHttpError: false });
