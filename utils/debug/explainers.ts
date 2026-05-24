import type { MonitoringEntry } from './types';

function isNextDataRoute(target: string): boolean {
  return /\/\_next\/data\/[^/]+\/.+\.json(?:$|\?)/i.test(target);
}

export function explainIssue(entry: MonitoringEntry): string {
  const message = `${entry.message} ${entry.responsePreview || ''} ${entry.payloadPreview || ''}`.toLowerCase();
  const target = entry.endpoint || entry.url || entry.route || 'the application';

  if (entry.kind === 'api' && entry.status === 500) {
    return `An API request to ${target} failed because the server returned a 500 error. This usually points to a server-side problem such as a missing environment variable, an upstream service failure, or an unhandled exception.`;
  }

  if (entry.kind === 'api' && entry.status === 404) {
    if (isNextDataRoute(target)) {
      return `A browser request hit a Next.js data URL from an older build at ${target}. This usually happens right after a deploy when a tab or cached client bundle still points at the previous build ID, and it is usually resolved by a hard refresh or retry.`;
    }

    return `A request reached ${target}, but the server could not find the resource. This often means the route path is wrong, a deployment is missing a file, or a trailing-slash mismatch is sending traffic to the wrong endpoint.`;
  }

  if (entry.kind === 'api' && entry.status === 401) {
    return `A request to ${target} was rejected because authentication failed. This usually means a token, API key, or signed URL is missing, expired, or pointing to the wrong environment.`;
  }

  if (message.includes('network') || message.includes('failed to fetch') || message.includes('fetch')) {
    return `A network request could not complete. This usually means the browser or server could not reach the endpoint, the endpoint blocked the request with CORS or auth rules, or an upstream service timed out.`;
  }

  if (message.includes('sendgrid')) {
    return `An email delivery operation failed while communicating with SendGrid. This usually means the SendGrid API key is invalid, a required sender identity is missing, or SendGrid rejected the request payload.`;
  }

  if (message.includes('environment') || message.includes('env')) {
    return `The application hit a configuration problem. This usually happens when a required environment variable is missing, misspelled, or only set in one deployment environment.`;
  }

  if (entry.kind === 'performance') {
    return `A page or API operation took longer than the configured threshold. This usually means the response payload is too large, upstream work is slow, or the browser is doing too much work during load.`;
  }

  if (entry.stack) {
    return `The application threw an exception while running ${target}. This usually means a code path received unexpected data, a dependency returned an invalid response, or a null or undefined value was accessed without a guard.`;
  }

  return `The application reported an issue in ${target}. Review the error details and nearby logs to confirm whether the problem came from client-side input, server configuration, or an external dependency.`;
}

export function suggestFixes(entry: MonitoringEntry): string[] {
  const suggestions: string[] = [];
  const message = `${entry.message} ${entry.responsePreview || ''}`.toLowerCase();

  if (entry.status && entry.status >= 500) {
    suggestions.push('Check server environment variables and upstream service credentials in the active deployment.');
    suggestions.push('Open the latest server log export and inspect the matching request ID or fingerprint for the full stack trace.');
  }

  if (entry.status === 404) {
    if (entry.endpoint && isNextDataRoute(entry.endpoint)) {
      suggestions.push('Hard refresh the page or reopen the tab so the browser loads the latest deployed build manifest and data routes.');
      suggestions.push('If the issue only appears immediately after deploy, treat it as a stale client cache rather than a missing application route.');
      return Array.from(new Set(suggestions)).slice(0, 4);
    }

    suggestions.push('Confirm the requested route exists in the current deployment and that the URL matches the expected trailing-slash pattern.');
  }

  if (entry.status === 401 || entry.status === 403) {
    suggestions.push('Verify the request carries the correct token, secret, or signed URL for the current environment.');
  }

  if (message.includes('sendgrid')) {
    suggestions.push('Validate SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, and sender verification settings in SendGrid.');
  }

  if (message.includes('failed to fetch') || message.includes('network') || message.includes('cors')) {
    suggestions.push('Check the endpoint URL, CORS policy, and whether the target service is reachable from the current environment.');
  }

  if (entry.kind === 'performance') {
    suggestions.push('Profile the slow route or page, then reduce payload size, defer non-critical work, or cache repeated upstream requests.');
  }

  if (entry.kind === 'error' && entry.stack) {
    suggestions.push('Use the stack trace to identify the first app-owned file in the call stack and add a guard or fallback around the failing value.');
  }

  if (suggestions.length === 0) {
    suggestions.push('Reproduce the issue with DEBUG enabled so the request, performance, and error context are captured together.');
  }

  return Array.from(new Set(suggestions)).slice(0, 4);
}
