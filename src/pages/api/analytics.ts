import type { NextApiRequest, NextApiResponse } from 'next';

import { isAuthenticatedRequest } from '../../lib/adminAuth';
import { getAnalytics, getDeviceTypes, getTopBrowsers, getTopReferrers, getTotalViews, insertPageView } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { path, referrer, userAgent, language, screenSize } = req.body ?? {};
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim();

    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Path is required' });
    }

    try {
      insertPageView({
        path,
        referrer: typeof referrer === 'string' ? referrer : '',
        userAgent: typeof userAgent === 'string' ? userAgent : req.headers['user-agent'],
        language: typeof language === 'string' ? language : '',
        screenSize: typeof screenSize === 'string' ? screenSize : '',
        ip,
      });
      return res.status(200).json({ message: 'Tracked' });
    } catch {
      return res.status(500).json({ error: 'Failed to track' });
    }
  }

  if (req.method === 'GET') {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const [analytics, total, topReferrers, topBrowsers, deviceTypes] = await Promise.all([
        Promise.resolve(getAnalytics()),
        Promise.resolve(getTotalViews()),
        Promise.resolve(getTopReferrers()),
        Promise.resolve(getTopBrowsers()),
        Promise.resolve(getDeviceTypes()),
      ]);

      return res.status(200).json({
        analytics,
        total: total.total,
        topReferrers: topReferrers.map(({ label, count }) => ({ referrer: label, count })),
        topBrowsers: topBrowsers.map(({ label, count }) => ({ browser: label, count })),
        deviceTypes: deviceTypes.map(({ label, count }) => ({ device: label, count })),
      });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  res.setHeader('Allow', ['POST', 'GET']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
