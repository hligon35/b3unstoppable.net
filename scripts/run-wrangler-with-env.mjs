import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import { buildChildEnv, parseEnvFile, resolveWranglerInvocation } from './env-utils.mjs';

const require = createRequire(import.meta.url);

const [, , envFileArg, ...wranglerArgs] = process.argv;

if (!envFileArg) {
  console.error('Usage: node scripts/run-wrangler-with-env.mjs <env-file> [wrangler args...]');
  process.exit(1);
}

const fileEnv = parseEnvFile(envFileArg);
const childEnv = buildChildEnv(fileEnv);
const effectiveWranglerArgs = wranglerArgs.length > 0 ? wranglerArgs : ['whoami'];
const wranglerInvocation = resolveWranglerInvocation(require, effectiveWranglerArgs);

const child = spawn(wranglerInvocation.command, wranglerInvocation.args, {
  stdio: 'inherit',
  env: childEnv,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
