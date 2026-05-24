type CloudflareGraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

function normalizeCloudflareAnalyticsError(message: string) {
  if (/zone\.analytics\.read/i.test(message) || /does not have permission/i.test(message)) {
    return 'Cloudflare API token is missing Zone Analytics Read permission for this zone.';
  }

  return message;
}

export async function fetchCloudflareAnalytics<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !zoneId) {
    throw new Error('Cloudflare API token or zone ID missing');
  }

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        zoneTag: zoneId,
        ...variables,
      },
    }),
  });

  const payload = (await response.json()) as CloudflareGraphQlResponse<T>;
  if (!response.ok || payload.errors?.length) {
    throw new Error(normalizeCloudflareAnalyticsError(payload.errors?.[0]?.message || 'Cloudflare API error'));
  }

  if (!payload.data) {
    throw new Error('Cloudflare API returned no data');
  }

  return payload.data;
}
