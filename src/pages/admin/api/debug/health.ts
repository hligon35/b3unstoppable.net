import type { NextApiRequest, NextApiResponse } from 'next';
import { captureServerError, isAuthorizedMonitoringRequest, recordHeartbeat, withApiMonitoring } from '../../../../utils/debug/server';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  if (!isAuthorizedMonitoringRequest(req)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  let heartbeatLogged = true;
  try {
    await recordHeartbeat('github-actions');
  } catch (error) {
    heartbeatLogged = false;
    await captureServerError(error, {
      req,
      routeName: 'debug-health',
      kind: 'heartbeat',
      critical: false,
      context: {
        source: 'heartbeat-log-write',
      },
    });
  }

  res.status(200).json({ ok: true, timestamp: new Date().toISOString(), heartbeatLogged });
}

export default withApiMonitoring('debug-health', handler, { alertOnHttpError: false });
