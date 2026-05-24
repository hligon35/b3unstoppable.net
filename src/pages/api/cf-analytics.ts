import type { NextApiRequest, NextApiResponse } from 'next';

import { isAuthenticatedRequest } from '../../lib/adminAuth';
import { fetchCloudflareAnalytics } from '../../lib/cloudflareAnalytics';

const LAST_7_DAYS_QUERY = `
  query($zoneTag: string, $start: Date!, $end: Date!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1dGroups(limit: 7, filter: { date_geq: $start, date_leq: $end }) {
          dimensions { date }
          sum {
            requests
            pageViews
            bytes
            threats
          }
        }
      }
    }
  }
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isAuthenticatedRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const data = await fetchCloudflareAnalytics(LAST_7_DAYS_QUERY, { start, end });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Cloudflare analytics fetch failed',
    });
  }
}
