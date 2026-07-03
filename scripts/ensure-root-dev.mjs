import { cwd } from 'node:process';
import { rmSync } from 'node:fs';
import path from 'node:path';

const currentDir = cwd();
const normalizedDir = currentDir.toLowerCase();

if (normalizedDir.includes(`${path.sep}.open-next${path.sep}`) || normalizedDir.includes(`${path.sep}.next${path.sep}`)) {
  console.error('`npm run dev` must be run from the repository root, not from generated build output folders like `.open-next` or `.next`.');
  console.error(`Current directory: ${currentDir}`);
  process.exit(1);
}

try {
  rmSync('src/pages/api/submit', { recursive: true, force: true });
} catch {}