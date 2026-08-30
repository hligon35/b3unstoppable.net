import type { NextApiRequest, NextApiResponse } from 'next';
import { exportServerEntries } from '../../../../utils/logger/server';
import { isAuthorizedMonitoringRequest, withApiMonitoring } from '../../../../utils/debug/server';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  if (!isAuthorizedMonitoringRequest(req)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  const limit = Number(req.query.limit || 500);
  const payload = await exportServerEntries(limit);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).send(payload);
}

export default withApiMonitoring('debug-export', handler, { alertOnHttpError: false });
