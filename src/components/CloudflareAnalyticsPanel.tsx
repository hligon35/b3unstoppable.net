import { useEffect, useState } from 'react';

type CloudflareGroup = {
  dimensions?: { date?: string };
  sum?: {
    requests?: number;
    pageViews?: number;
    bytes?: number;
    threats?: number;
  };
};

type CloudflarePayload = {
  viewer?: {
    zones?: Array<{
      httpRequests1dGroups?: CloudflareGroup[];
    }>;
  };
  error?: string;
};

function formatBytes(bytes = 0) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export default function CloudflareAnalyticsPanel() {
  const [groups, setGroups] = useState<CloudflareGroup[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/cf-analytics');
        const payload = (await response.json()) as CloudflarePayload;

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to fetch Cloudflare analytics');
        }

        const zone = payload.viewer?.zones?.[0];
        setGroups(zone?.httpRequests1dGroups || []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch Cloudflare analytics');
      } finally {
        setLoading(false);
      }
    }

    void fetchAnalytics();
  }, []);

  return (
    <section className="rounded bg-white p-6 shadow lg:col-span-2 xl:col-span-3">
      <div className="mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cloudflare Edge Analytics</h2>
          <p className="text-sm text-gray-600">Last 7 days from the Cloudflare GraphQL API.</p>
        </div>
      </div>

      {loading ? <div className="text-sm text-gray-500">Loading Cloudflare analytics...</div> : null}
      {error ? <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {!loading && !error ? (
        <div className="grid gap-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Requests</th>
                  <th className="py-2 pr-4 font-medium">Page Views</th>
                  <th className="py-2 pr-4 font-medium">Bandwidth</th>
                  <th className="py-2 pr-4 font-medium">Threats</th>
                </tr>
              </thead>
              <tbody>
                {groups.length ? (
                  groups.map((group) => (
                    <tr key={group.dimensions?.date || 'unknown'} className="border-b border-gray-100">
                      <td className="py-3 pr-4 font-medium text-gray-900">{group.dimensions?.date || 'Unknown'}</td>
                      <td className="py-3 pr-4 text-gray-700">{group.sum?.requests ?? 0}</td>
                      <td className="py-3 pr-4 text-gray-700">{group.sum?.pageViews ?? 0}</td>
                      <td className="py-3 pr-4 text-gray-700">{formatBytes(group.sum?.bytes ?? 0)}</td>
                      <td className="py-3 pr-4 text-gray-700">{group.sum?.threats ?? 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-sm text-gray-500">No Cloudflare analytics data available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
