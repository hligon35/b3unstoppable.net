import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

import { buildChildEnv, parseEnvFile } from './env-utils.mjs';

const require = createRequire(import.meta.url);

const SECRET_KEYS = [
  'ADMIN_PASSWORD',
  'ADMIN_USERNAME',
  'CLOUDFLARE_ANALYTICS_TOKEN',
  'CLOUDFLARE_ANALYTICS_SCRIPT_SECRET',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ZONE_ID',
  'CSRF_TOKEN',
  'FORMS_BACKUP_URL',
  'FORMS_SIGNING_SECRET',
  'MONITORING_CRON_TOKEN',
  'MONITORING_FROM_EMAIL',
  'MONITORING_TO_EMAIL',
  'SENDGRID_API_KEY',
  'SENDGRID_FROM_EMAIL',
  'SENDGRID_FROM_NAME',
  'SENDGRID_MARKETING_LIST_IDS',
  'SENDGRID_REPLY_TO',
  'SENDGRID_TO_EMAIL',
];

const [, , envFileArg = 'env.cloudflare', ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');

const fileEnv = parseEnvFile(envFileArg);
const childEnv = buildChildEnv(fileEnv);
const wranglerBinPath = require.resolve('wrangler/bin/wrangler.js');

const selectedEntries = SECRET_KEYS
  .map((key) => [key, fileEnv[key]])
  .filter(([, value]) => typeof value === 'string' && value.length > 0);

const missingKeys = SECRET_KEYS.filter((key) => !fileEnv[key]);

if (selectedEntries.length === 0) {
  console.error(`No secret values were found in ${envFileArg} for the allowlist.`);
  process.exit(1);
}

if (missingKeys.length > 0) {
  console.warn(`Skipping unset allowlisted keys: ${missingKeys.join(', ')}`);
}

if (dryRun) {
  console.log(`Dry run: would sync ${selectedEntries.length} Cloudflare secrets from ${envFileArg}`);
  for (const [key] of selectedEntries) {
    console.log(`- ${key}`);
  }
  process.exit(0);
}

for (const [key, value] of selectedEntries) {
  await putSecret({ wranglerBinPath, childEnv, key, value });
  console.log(`Synced ${key}`);
}

async function putSecret({ wranglerBinPath, childEnv, key, value }) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [wranglerBinPath, 'secret', 'put', key],
      {
        env: childEnv,
        stdio: ['pipe', 'inherit', 'inherit'],
      },
    );

    child.stdin.write(`${value}\n`);
    child.stdin.end();

    child.on('error', rejectPromise);
    child.on('exit', (code, signal) => {
      if (signal) {
        rejectPromise(new Error(`wrangler secret put ${key} terminated with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        rejectPromise(new Error(`wrangler secret put ${key} failed with exit code ${code}`));
        return;
      }

      resolvePromise();
    });
  });
}