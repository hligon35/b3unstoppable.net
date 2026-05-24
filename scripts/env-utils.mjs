import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function parseEnvFile(envFileArg) {
  const envFilePath = resolve(process.cwd(), envFileArg);
  const contents = readFileSync(envFilePath, 'utf8');
  const entries = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

export function buildChildEnv(fileEnv) {
  const childEnv = {
    ...process.env,
    ...fileEnv,
  };

  if (!childEnv.CLOUDFLARE_ACCOUNT_ID && childEnv.CLOUDFLARE_ACCOUNT_TAG) {
    childEnv.CLOUDFLARE_ACCOUNT_ID = childEnv.CLOUDFLARE_ACCOUNT_TAG;
  }

  return childEnv;
}