// @ts-expect-error generated at build time
import nextWorker from '../.open-next/worker.js';

type WorkerEnv = {
  MONITORING_CRON_TOKEN?: string;
  WORKER_SELF_REFERENCE?: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
};

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type WorkerScheduledEvent = {
  cron: string;
  scheduledTime: number;
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext) {
    return nextWorker.fetch(request, env, ctx);
  },

  async scheduled(_event: WorkerScheduledEvent, env: WorkerEnv, ctx: WorkerExecutionContext) {
    const cronToken = String(env.MONITORING_CRON_TOKEN || '').trim();

    if (!cronToken || !env.WORKER_SELF_REFERENCE) {
      return;
    }

    ctx.waitUntil((async () => {
      const response = await env.WORKER_SELF_REFERENCE!.fetch('https://internal/api/newsletters/process', {
        method: 'POST',
        headers: {
          'x-cron-token': cronToken,
          'x-newsletter-trigger': 'cron',
        },
      });

      if (!response.ok) {
        throw new Error(`newsletter-cron-${response.status}`);
      }
    })());
  },
};