import fs from 'node:fs/promises';
import path from 'node:path';
import { getDebugConfig } from '../debug/config';
import type { MonitoringEntry } from '../debug/types';
import { createEntry, getConsoleMethod, levelLabel, shouldConsoleLog } from './shared';

const LOG_DIRECTORY = path.join(process.cwd(), 'data', 'debug');
const LOG_FILE = path.join(LOG_DIRECTORY, 'server-log.jsonl');

type ServerEntryInput = Omit<Parameters<typeof createEntry>[0], 'runtime' | 'environment' | 'source'> & {
  source?: string;
};

export async function logServerEntry(input: ServerEntryInput): Promise<MonitoringEntry> {
  const config = getDebugConfig('server');
  const entry = createEntry({
    ...input,
    runtime: 'server',
    environment: config.environment,
    source: input.source || 'node',
  });

  await persistServerEntry(entry);
  writeConsoleEntry(entry);
  return entry;
}

export async function persistServerEntry(entry: MonitoringEntry): Promise<void> {
  const config = getDebugConfig('server');
  try {
    await fs.mkdir(LOG_DIRECTORY, { recursive: true });
    await fs.appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
    await rotateServerLog(config.maxServerEntries, config.maxLogFileBytes);
  } catch (error) {
    if (config.debug) {
      console.warn('Monitoring log persistence skipped:', error);
    }
  }
}

export async function readServerEntries(limit = 250): Promise<MonitoringEntry[]> {
  try {
    const raw = await fs.readFile(LOG_FILE, 'utf8');
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-limit);

    return lines
      .map((line) => {
        try {
          return JSON.parse(line) as MonitoringEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is MonitoringEntry => Boolean(entry));
  } catch {
    return [];
  }
}

export async function exportServerEntries(limit = 500): Promise<string> {
  const entries = await readServerEntries(limit);
  return JSON.stringify(entries, null, 2);
}

async function rotateServerLog(maxEntries: number, maxBytes: number): Promise<void> {
  try {
    const stats = await fs.stat(LOG_FILE);
    if (stats.size <= maxBytes) {
      const currentEntries = await readServerEntries(maxEntries + 50);
      if (currentEntries.length <= maxEntries) {
        return;
      }
    }

    const currentEntries = await readServerEntries(maxEntries + 200);
    const trimmed = currentEntries.slice(-maxEntries);
    const serialized = `${trimmed.map((entry) => JSON.stringify(entry)).join('\n')}\n`;
    await fs.writeFile(LOG_FILE, serialized, 'utf8');
  } catch {
    // Ignore rotation failures and keep the original log file intact.
  }
}

function writeConsoleEntry(entry: MonitoringEntry): void {
  const config = getDebugConfig('server');
  if (!shouldConsoleLog(entry, config.debug, config.debugNetwork, config.debugPerformance)) {
    return;
  }

  const method = getConsoleMethod(entry.level);
  if (config.structuredJsonLogs) {
    console[method](JSON.stringify(entry));
    return;
  }

  const ansiMap: Record<MonitoringEntry['level'], string> = {
    info: '\u001b[34m',
    warn: '\u001b[33m',
    error: '\u001b[31m',
    success: '\u001b[32m',
    network: '\u001b[36m',
    performance: '\u001b[35m',
  };

  console[method](`${ansiMap[entry.level]}[${levelLabel(entry.level)}]\u001b[0m ${entry.timestamp} ${entry.message}`);
}
