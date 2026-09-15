#!/usr/bin/env node
// Monthly maintenance orchestrator for the "monthlyUpdate" GitHub Actions workflow.
// Runs safe, read-mostly repository health checks, applies only non-breaking
// dependency updates, and generates monthlyReport.md. Never merges or deploys.
//
// Usage: node scripts/monthly-maintenance.mjs
// Designed to run from the repository root inside the monthly-maintenance workflow,
// but is safe to run locally (it only touches package.json/package-lock.json via
// `npm update`, and reverts that change automatically if validation fails).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'monthlyReport.md');
const LARGE_FILE_THRESHOLD_BYTES = 5 * 1024 * 1024;
const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.next-dev', '.open-next', '.wrangler',
  'out', 'coverage', '.sanity', '.tmp',
]);

const SECRET_PATTERNS = [
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', regex: /-----BEGIN (RSA|EC|OPENSSH|PGP|PRIVATE) KEY-----/ },
  { name: 'Stripe live secret key', regex: /sk_live_[0-9a-zA-Z]{16,}/ },
  { name: 'Resend API key', regex: /re_[A-Za-z0-9_]{20,}/ },
  { name: 'Slack token', regex: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { name: 'Generic secret assignment', regex: /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/i },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const IS_WINDOWS = process.platform === 'win32';

function run(cmd, args) {
  // Windows needs a shell to resolve npm/npx .cmd shims; Linux (the CI target) does not.
  // All args here are static, developer-controlled strings — never interpolated user input —
  // so shell interpretation on Windows carries no injection risk.
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: IS_WINDOWS,
    maxBuffer: 1024 * 1024 * 64,
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function tail(text, n) {
  const trimmed = text.trim();
  if (trimmed.length <= n) return trimmed || '(no output)';
  return `…(truncated)…\n${trimmed.slice(-n)}`;
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
}

function scanTextForSecrets(label, text) {
  const findings = [];
  for (const { name, regex } of SECRET_PATTERNS) {
    if (regex.test(text)) findings.push({ file: label, detector: name });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Dependency checks
// ---------------------------------------------------------------------------

function npmCiInstall() {
  const res = run('npm', ['ci']);
  const deprecated = Array.from(
    new Set([...res.stderr.matchAll(/npm warn deprecated ([^\n]+)/gi)].map((m) => m[1].trim())),
  );
  return { passed: res.status === 0, deprecated, outputTail: tail(res.stderr, 2000) };
}

function npmOutdated() {
  const res = run('npm', ['outdated', '--json']);
  try {
    return JSON.parse(res.stdout || '{}');
  } catch {
    return {};
  }
}

function npmAudit() {
  const res = run('npm', ['audit', '--json']);
  try {
    const data = JSON.parse(res.stdout || '{}');
    return data.metadata?.vulnerabilities || {};
  } catch {
    return {};
  }
}

function isMajorBump(current, latest) {
  const majorOf = (v) => parseInt(String(v).replace(/^[^0-9]*/, '').split('.')[0], 10);
  const a = majorOf(current);
  const b = majorOf(latest);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b > a;
}

function gitDiffNames(paths) {
  const res = run('git', ['diff', '--name-only', '--', ...paths]);
  return res.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

function gitRevert(paths) {
  run('git', ['checkout', '--', ...paths]);
}

// ---------------------------------------------------------------------------
// Validation suite (typecheck / lint / test / build / opennext build)
// ---------------------------------------------------------------------------

function runCheck(name, cmd, args) {
  const start = Date.now();
  const res = run(cmd, args);
  const combined = `${res.stdout}\n${res.stderr}`;
  return {
    name,
    command: `${cmd} ${args.join(' ')}`,
    passed: res.status === 0,
    durationMs: Date.now() - start,
    outputTail: tail(combined, 4000),
  };
}

function runValidationSuite() {
  return [
    runCheck('TypeScript typecheck', 'npm', ['run', 'typecheck', '--silent']),
    runCheck('ESLint', 'npm', ['run', 'lint', '--silent']),
    runCheck('Unit tests', 'npm', ['test', '--silent']),
    runCheck('Next.js build', 'npm', ['run', 'build', '--silent']),
    runCheck('OpenNext Cloudflare build', 'npm', ['run', 'opennext:build', '--silent']),
  ];
}

// ---------------------------------------------------------------------------
// D1 schema drift (schema.sql vs src/lib/db.ts)
// ---------------------------------------------------------------------------

function checkD1SchemaDrift() {
  const schemaSqlPath = path.join(ROOT, 'schema.sql');
  const dbTsPath = path.join(ROOT, 'src/lib/db.ts');
  if (!fs.existsSync(schemaSqlPath) || !fs.existsSync(dbTsPath)) {
    return { skipped: true, inSync: true, missingInTs: [], missingInSql: [], idxMissingInTs: [], idxMissingInSql: [] };
  }
  const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
  const dbTs = fs.readFileSync(dbTsPath, 'utf8');
  const extract = (text) => ({
    tables: new Set([...text.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/gi)].map((m) => m[1].toLowerCase())),
    indexes: new Set([...text.matchAll(/CREATE INDEX IF NOT EXISTS (\w+)/gi)].map((m) => m[1].toLowerCase())),
  });
  const fromSql = extract(schemaSql);
  const fromTs = extract(dbTs);
  const missingInTs = [...fromSql.tables].filter((t) => !fromTs.tables.has(t));
  const missingInSql = [...fromTs.tables].filter((t) => !fromSql.tables.has(t));
  const idxMissingInTs = [...fromSql.indexes].filter((i) => !fromTs.indexes.has(i));
  const idxMissingInSql = [...fromTs.indexes].filter((i) => !fromSql.indexes.has(i));
  const inSync = !missingInTs.length && !missingInSql.length && !idxMissingInTs.length && !idxMissingInSql.length;
  return { skipped: false, inSync, missingInTs, missingInSql, idxMissingInTs, idxMissingInSql };
}

// ---------------------------------------------------------------------------
// Wrangler / OpenNext config sanity
// ---------------------------------------------------------------------------

function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function checkWranglerConfig() {
  const issues = [];
  const wranglerPath = path.join(ROOT, 'wrangler.jsonc');
  if (!fs.existsSync(wranglerPath)) {
    issues.push('wrangler.jsonc not found');
    return { issues, config: null };
  }
  const raw = fs.readFileSync(wranglerPath, 'utf8');
  let config;
  try {
    config = JSON.parse(stripJsonComments(raw));
  } catch (e) {
    issues.push(`wrangler.jsonc failed to parse: ${e.message}`);
    return { issues, config: null };
  }
  if (!config.account_id) issues.push('Missing account_id');
  if (!config.name) issues.push('Missing worker name');
  if (!config.compatibility_date) {
    issues.push('Missing compatibility_date');
  } else {
    const ageMonths = (Date.now() - new Date(config.compatibility_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (ageMonths > 18) {
      issues.push(`compatibility_date (${config.compatibility_date}) is ${ageMonths.toFixed(0)} months old — review for newer runtime behavior before bumping`);
    }
  }
  if (!Array.isArray(config.d1_databases) || !config.d1_databases.some((d) => d.binding === 'B3U_DB')) {
    issues.push('Expected D1 binding "B3U_DB" not found in d1_databases');
  }
  if (!config.assets?.directory) issues.push('Missing assets.directory (OpenNext output binding)');
  return { issues, config };
}

// ---------------------------------------------------------------------------
// GitHub Actions workflow checks (duplicates, permissions, Node version)
// ---------------------------------------------------------------------------

function checkWorkflows() {
  const dir = path.join(ROOT, '.github/workflows');
  if (!fs.existsSync(dir)) return { info: [], duplicateNames: [], duplicateCrons: [], missingPermissions: [], nodeVersions: [] };
  const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/i.test(f));
  const info = files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const hasPermissions = /^permissions:/m.test(content);
    const crons = [...content.matchAll(/cron:\s*'([^']+)'/g)].map((m) => m[1]);
    const nodeVersionMatch = content.match(/node-version:\s*'?([0-9.]+)'?/);
    return {
      file: f,
      name: nameMatch ? nameMatch[1].trim() : f,
      hasPermissions,
      crons,
      nodeVersion: nodeVersionMatch ? nodeVersionMatch[1] : null,
    };
  });
  const nameCounts = {};
  for (const w of info) nameCounts[w.name] = (nameCounts[w.name] || 0) + 1;
  const duplicateNames = Object.entries(nameCounts).filter(([, c]) => c > 1).map(([n]) => n);
  const cronMap = {};
  for (const w of info) for (const c of w.crons) (cronMap[c] ||= []).push(w.file);
  const duplicateCrons = Object.entries(cronMap).filter(([, fileList]) => fileList.length > 1);
  const missingPermissions = info.filter((w) => !w.hasPermissions).map((w) => w.file);
  const nodeVersions = [...new Set(info.filter((w) => w.nodeVersion).map((w) => w.nodeVersion))];
  return { info, duplicateNames, duplicateCrons, missingPermissions, nodeVersions };
}

// ---------------------------------------------------------------------------
// Env var consistency (used in code vs documented in example env files)
// ---------------------------------------------------------------------------

function checkEnvVarConsistency() {
  const codeDirs = ['src', 'worker', 'scripts', 'functions'];
  const files = [];
  for (const dir of codeDirs) walk(path.join(ROOT, dir), files);
  const used = new Set();
  for (const file of files) {
    if (!/\.(ts|tsx|js|mjs|cjs)$/.test(file)) continue;
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const m of content.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) used.add(m[1]);
  }
  const builtinAllow = new Set(['NODE_ENV', 'CI', 'GITHUB_OUTPUT', 'GITHUB_STEP_SUMMARY']);
  const exampleKeys = new Set();
  for (const f of ['env.cloudflare.example', '.env.local.example']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const m of content.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)) exampleKeys.add(m[1]);
  }
  const undocumented = [...used].filter((k) => !builtinAllow.has(k) && !exampleKeys.has(k)).sort();
  return { undocumented };
}

// ---------------------------------------------------------------------------
// Tracked-file safety checks (secrets, sensitive files, large files)
// ---------------------------------------------------------------------------

function gitLsFiles() {
  const res = run('git', ['ls-files']);
  return res.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}

function scanTrackedFilesForSecrets() {
  const findings = [];
  for (const rel of gitLsFiles()) {
    if (!/\.(ts|tsx|js|mjs|cjs|json|jsonc|md|yml|yaml|txt|gs|sql)$/i.test(rel) && !path.basename(rel).startsWith('.env')) continue;
    const full = path.join(ROOT, rel);
    let content;
    try {
      const stat = fs.statSync(full);
      if (stat.size > 2_000_000) continue;
      content = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    findings.push(...scanTextForSecrets(rel, content));
  }
  return findings;
}

function checkTrackedSensitiveFiles() {
  const patterns = [
    /\.csv$/i, /\.sqlite3?$/i, /(^|\/)data\/app\.db$/i, /subscribers.*\.csv$/i,
    /(^|\/)\.env(\..+)?$/i, /\.pem$/i, /\.key$/i,
  ];
  const allowlist = new Set(['.env.local.example', 'env.cloudflare.example']);
  return gitLsFiles().filter((f) => !allowlist.has(path.basename(f)) && patterns.some((p) => p.test(f)));
}

function checkLargeTrackedFiles(thresholdBytes) {
  const large = [];
  for (const rel of gitLsFiles()) {
    const full = path.join(ROOT, rel);
    try {
      const stat = fs.statSync(full);
      if (stat.size > thresholdBytes) large.push({ file: rel, sizeMB: (stat.size / 1024 / 1024).toFixed(2) });
    } catch {
      // deleted-but-tracked edge case; ignore
    }
  }
  return large.sort((a, b) => b.sizeMB - a.sizeMB);
}

// ---------------------------------------------------------------------------
// Best-effort internal link + doc reference checks
// ---------------------------------------------------------------------------

function collectPageRoutes() {
  const pagesDir = path.join(ROOT, 'src/pages');
  const files = [];
  walk(pagesDir, files);
  const routes = new Set();
  for (const file of files) {
    if (!/\.(tsx|ts)$/.test(file)) continue;
    let rel = path.relative(pagesDir, file).replace(/\\/g, '/');
    if (/^api\//.test(rel)) continue;
    rel = rel.replace(/\.(tsx|ts)$/, '').replace(/\/index$/, '');
    if (rel === 'index') rel = '';
    routes.add('/' + rel);
  }
  return routes;
}

function checkInternalLinks() {
  const routes = collectPageRoutes();
  const matchesRoute = (route) => {
    if (routes.has(route)) return true;
    for (const r of routes) {
      if (!r.includes('[')) continue;
      const pattern = '^' + r.replace(/\[[^\]]+\]/g, '[^/]+') + '$';
      if (new RegExp(pattern).test(route)) return true;
    }
    return false;
  };
  const filesToScan = [];
  walk(path.join(ROOT, 'src/pages'), filesToScan);
  filesToScan.push(path.join(ROOT, 'README.md'));
  const broken = [];
  for (const file of filesToScan) {
    if (!/\.(tsx|ts|md)$/.test(file)) continue;
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const m of content.matchAll(/href=["'](\/[^"'#?]*)["']/g)) {
      const route = m[1].replace(/\/$/, '') || '/';
      const lastSegment = route.split('/').pop() || '';
      if (lastSegment.includes('.')) continue; // static asset under public/, not a page route
      if (!matchesRoute(route)) broken.push({ file: path.relative(ROOT, file), route });
    }
  }
  return broken;
}

function checkDocReferences() {
  const readmePath = path.join(ROOT, 'README.md');
  if (!fs.existsSync(readmePath)) return [];
  const readme = fs.readFileSync(readmePath, 'utf8');
  const missing = [];
  const seen = new Set();
  for (const m of readme.matchAll(/`([\w.\-/]+\.(ts|tsx|js|mjs|cjs|json|jsonc|sql|md|yml|yaml))`/g)) {
    const ref = m[1];
    if (ref.includes('*') || seen.has(ref)) continue;
    seen.add(ref);
    const candidates = [path.join(ROOT, ref)];
    if (!ref.includes('/') && /\.ya?ml$/.test(ref)) candidates.push(path.join(ROOT, '.github/workflows', ref));
    if (!candidates.some((c) => fs.existsSync(c))) missing.push(ref);
  }
  return missing;
}

function checkA11ySeoBasics() {
  const results = [];
  results.push({ label: 'public/robots.txt exists', passed: fs.existsSync(path.join(ROOT, 'public/robots.txt')) });
  results.push({ label: 'public/sitemap.xml exists', passed: fs.existsSync(path.join(ROOT, 'public/sitemap.xml')) });
  const docPath = path.join(ROOT, 'src/pages/_document.tsx');
  let langOk = false;
  if (fs.existsSync(docPath)) langOk = /<Html[^>]*\slang=/.test(fs.readFileSync(docPath, 'utf8'));
  results.push({ label: '_document.tsx sets <Html lang=...>', passed: langOk });
  return results;
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------

function renderCheckList(checks) {
  return checks
    .map((c) => `- **${c.name}**: ${c.passed ? '✅ passed' : '❌ failed'} (${c.command}, ${c.durationMs}ms)`)
    .join('\n');
}

function renderFailureDetails(checks) {
  const failed = checks.filter((c) => !c.passed);
  if (!failed.length) return '_None._';
  return failed.map((c) => `<details><summary>${c.name} output (tail)</summary>\n\n\`\`\`\n${c.outputTail}\n\`\`\`\n</details>`).join('\n\n');
}

function main() {
  const now = new Date();
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  const commitSha = run('git', ['rev-parse', 'HEAD']).stdout.trim();

  const manualActions = [];
  const notChanged = [];
  const requiresApproval = [];

  // 1. Install baseline deps and capture deprecation warnings.
  const ciInstall = npmCiInstall();
  if (!ciInstall.passed) {
    manualActions.push('`npm ci` failed on the current lockfile — this must be fixed manually before any further maintenance can run.');
  }

  // 2. Dependency update pass.
  const outdatedBefore = npmOutdated();
  run('npm', ['update']);
  const depFilesChanged = gitDiffNames(['package.json', 'package-lock.json']);
  let regressionReverted = false;
  let validation;
  if (depFilesChanged.length > 0) {
    validation = runValidationSuite();
    if (validation.some((v) => !v.passed)) {
      gitRevert(['package.json', 'package-lock.json']);
      regressionReverted = true;
      validation = runValidationSuite();
      manualActions.push('`npm update` caused one or more validation checks to fail. The dependency bump was reverted automatically; see "Recommended manual actions" for the packages involved.');
    }
  } else {
    validation = runValidationSuite();
  }
  const outdatedAfter = npmOutdated();
  const auditVulns = npmAudit();
  const depsChanged = depFilesChanged.length > 0 && !regressionReverted;
  if (!depsChanged) notChanged.push('Dependency versions in package.json/package-lock.json (either nothing was eligible for a safe update, or the update was reverted due to a regression).');

  for (const [name, info] of Object.entries(outdatedAfter)) {
    const majorBump = isMajorBump(info.current, info.latest);
    manualActions.push(
      `\`${name}\`: current \`${info.current}\`, wanted \`${info.wanted}\`, latest \`${info.latest}\`` +
      (majorBump ? ' — **major version bump, not applied automatically**.' : ' — blocked by a version constraint, review manually.'),
    );
    if (majorBump) requiresApproval.push(`Major version upgrade for \`${name}\` (${info.current} → ${info.latest}).`);
  }

  // 3. Static / heuristic checks.
  const d1 = checkD1SchemaDrift();
  const wrangler = checkWranglerConfig();
  const workflows = checkWorkflows();
  const envVars = checkEnvVarConsistency();
  const secretsFound = scanTrackedFilesForSecrets();
  const sensitiveFiles = checkTrackedSensitiveFiles();
  const largeFiles = checkLargeTrackedFiles(LARGE_FILE_THRESHOLD_BYTES);
  const brokenLinks = checkInternalLinks();
  const docIssues = checkDocReferences();
  const a11y = checkA11ySeoBasics();

  if (workflows.missingPermissions.length) {
    manualActions.push(`Add an explicit \`permissions:\` block to: ${workflows.missingPermissions.join(', ')} (currently rely on default token permissions).`);
  }
  if (workflows.nodeVersions.length > 1) {
    manualActions.push(`Workflows declare inconsistent Node.js versions: ${workflows.nodeVersions.join(', ')}. Align them with the deployment workflow.`);
  }
  if (!d1.inSync) {
    manualActions.push('`schema.sql` and `src/lib/db.ts` have drifted apart — reconcile table/index definitions in both files.');
    requiresApproval.push('D1 schema drift between schema.sql and src/lib/db.ts.');
  }
  if (wrangler.issues.length) manualActions.push(...wrangler.issues.map((i) => `wrangler.jsonc: ${i}`));
  if (envVars.undocumented.length) {
    manualActions.push(`Environment variables used in code but missing from env.cloudflare.example/.env.local.example: ${envVars.undocumented.join(', ')}.`);
  }
  if (sensitiveFiles.length) {
    manualActions.push(`Tracked files matching sensitive/generated-data patterns: ${sensitiveFiles.join(', ')}. Verify these should be committed.`);
    requiresApproval.push('Tracked sensitive/generated data files detected (see report).');
  }
  if (secretsFound.length) {
    manualActions.push(`Possible secret-like values detected in tracked files (file/detector only, values redacted): ${secretsFound.map((f) => `${f.file} (${f.detector})`).join('; ')}.`);
    requiresApproval.push('Possible exposed secrets detected in tracked files — investigate immediately.');
  }
  if (brokenLinks.length) {
    notChanged.push(`${brokenLinks.length} internal link(s) that could not be matched to a known page route (best-effort static check; see report table).`);
  }

  // 4. Determine safety gates.
  const buildable = validation.every((v) => v.passed);
  const ownDiffText = fs.existsSync(path.join(ROOT, 'package.json')) ? fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8') : '';
  const ownDiffSecrets = scanTextForSecrets('package.json (working tree)', ownDiffText);
  const requiresManualReview = !buildable || secretsFound.length > 0 || requiresApproval.length > 0 || !ciInstall.passed;
  const safeToPush = buildable && ownDiffSecrets.length === 0 && ciInstall.passed;

  // ---------------------------------------------------------------------
  // Render monthlyReport.md
  // ---------------------------------------------------------------------
  const lines = [];
  lines.push('# Monthly Maintenance Report');
  lines.push('');
  lines.push(`- **Maintenance date**: ${now.toISOString()}`);
  lines.push(`- **Branch**: \`${branch}\``);
  lines.push(`- **Commit SHA**: \`${commitSha}\``);
  lines.push(`- **Safe to review/merge**: ${safeToPush && !requiresManualReview ? '✅ Yes' : '⚠️ Requires manual review before merging'}`);
  lines.push('');

  lines.push('## Dependency changes');
  lines.push(depsChanged
    ? `\`npm update\` applied non-breaking updates. Files changed: ${depFilesChanged.join(', ')}.`
    : regressionReverted
      ? '`npm update` was attempted but reverted automatically because it caused a validation failure (see below).'
      : 'No eligible non-breaking dependency updates were found this run.');
  lines.push('');
  if (ciInstall.deprecated.length) {
    lines.push('**Deprecated packages flagged during `npm ci`:**');
    for (const d of ciInstall.deprecated) lines.push(`- ${d}`);
  } else {
    lines.push('No deprecated-package warnings were emitted during `npm ci`.');
  }
  lines.push('');

  lines.push('## Security findings (npm audit)');
  const v = auditVulns;
  lines.push(`- Info: ${v.info ?? 0}, Low: ${v.low ?? 0}, Moderate: ${v.moderate ?? 0}, High: ${v.high ?? 0}, Critical: ${v.critical ?? 0}, Total: ${v.total ?? 0}`);
  lines.push('');

  lines.push('## Outdated packages (not auto-applied)');
  const outdatedEntries = Object.entries(outdatedAfter);
  if (outdatedEntries.length) {
    lines.push('| Package | Current | Wanted | Latest | Major bump? |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const [name, info] of outdatedEntries) {
      lines.push(`| \`${name}\` | ${info.current} | ${info.wanted} | ${info.latest} | ${isMajorBump(info.current, info.latest) ? 'Yes' : 'No'} |`);
    }
  } else {
    lines.push('_None — all dependencies are up to date within their allowed ranges._');
  }
  lines.push('');
  lines.push(`_Before this run, ${Object.keys(outdatedBefore).length} package(s) were outdated._`);
  lines.push('');

  lines.push('## Validation results');
  lines.push(renderCheckList(validation));
  lines.push('');
  lines.push('### Failure details');
  lines.push(renderFailureDetails(validation));
  lines.push('');

  lines.push('## Cloudflare / OpenNext / Wrangler findings');
  if (wrangler.issues.length) {
    for (const issue of wrangler.issues) lines.push(`- ⚠️ ${issue}`);
  } else {
    lines.push('- ✅ `wrangler.jsonc` has the expected `account_id`, `compatibility_date`, D1 binding, and assets directory.');
  }
  lines.push(`- OpenNext Cloudflare build: ${validation.find((c) => c.name.includes('OpenNext'))?.passed ? '✅ passed' : '❌ failed'} (see Validation results above).`);
  lines.push('');

  lines.push('## D1 schema findings');
  if (d1.skipped) {
    lines.push('_Skipped — schema.sql or src/lib/db.ts not found._');
  } else if (d1.inSync) {
    lines.push('- ✅ `schema.sql` and `src/lib/db.ts` define the same tables and indexes.');
  } else {
    if (d1.missingInTs.length) lines.push(`- ⚠️ Tables in schema.sql but not src/lib/db.ts: ${d1.missingInTs.join(', ')}`);
    if (d1.missingInSql.length) lines.push(`- ⚠️ Tables in src/lib/db.ts but not schema.sql: ${d1.missingInSql.join(', ')}`);
    if (d1.idxMissingInTs.length) lines.push(`- ⚠️ Indexes in schema.sql but not src/lib/db.ts: ${d1.idxMissingInTs.join(', ')}`);
    if (d1.idxMissingInSql.length) lines.push(`- ⚠️ Indexes in src/lib/db.ts but not schema.sql: ${d1.idxMissingInSql.join(', ')}`);
  }
  lines.push('- Note: this repository has no formal D1 migration tool; schema changes are applied via idempotent `CREATE TABLE/INDEX IF NOT EXISTS` statements in both files.');
  lines.push('');

  lines.push('## GitHub Actions workflow findings');
  lines.push(`- Workflows scanned: ${workflows.info.map((w) => w.file).join(', ') || 'none'}`);
  lines.push(workflows.duplicateNames.length ? `- ⚠️ Duplicate workflow names: ${workflows.duplicateNames.join(', ')}` : '- ✅ No duplicate workflow names.');
  lines.push(workflows.duplicateCrons.length ? `- ⚠️ Duplicate cron schedules: ${workflows.duplicateCrons.map(([c, fs2]) => `\`${c}\` in ${fs2.join(', ')}`).join('; ')}` : '- ✅ No duplicate cron schedules across workflows.');
  lines.push(workflows.missingPermissions.length ? `- ⚠️ Missing explicit \`permissions:\` block: ${workflows.missingPermissions.join(', ')}` : '- ✅ All workflows declare an explicit `permissions:` block.');
  lines.push(workflows.nodeVersions.length > 1 ? `- ⚠️ Inconsistent Node.js versions across workflows: ${workflows.nodeVersions.join(', ')}` : `- ✅ Consistent Node.js version across workflows (${workflows.nodeVersions[0] ?? 'n/a'}).`);
  lines.push('');

  lines.push('## Environment variable consistency');
  lines.push(envVars.undocumented.length
    ? `- ⚠️ Used in code but undocumented in env.cloudflare.example/.env.local.example: ${envVars.undocumented.join(', ')}`
    : '- ✅ All `process.env.*` variables referenced in code appear in at least one example env file.');
  lines.push('');

  lines.push('## Sensitive / generated file findings');
  lines.push(sensitiveFiles.length
    ? `- ⚠️ Tracked files matching sensitive-data patterns: ${sensitiveFiles.join(', ')}`
    : '- ✅ No CSV/SQLite/subscriber/.env files are tracked in git (`.gitignore` is effective).');
  lines.push(secretsFound.length
    ? `- 🚨 Possible secret-like strings found (values redacted): ${secretsFound.map((f) => `${f.file} — ${f.detector}`).join('; ')}`
    : '- ✅ No secret-like patterns detected in tracked text files.');
  lines.push(largeFiles.length
    ? `- ℹ️ Large tracked files (>${(LARGE_FILE_THRESHOLD_BYTES / 1024 / 1024).toFixed(0)}MB), informational only: ${largeFiles.map((f) => `${f.file} (${f.sizeMB}MB)`).join(', ')}`
    : `- ✅ No tracked files exceed ${(LARGE_FILE_THRESHOLD_BYTES / 1024 / 1024).toFixed(0)}MB.`);
  lines.push('');

  lines.push('## Broken internal links (best-effort static check)');
  lines.push(brokenLinks.length
    ? brokenLinks.map((b) => `- \`${b.route}\` referenced in ${b.file} did not match a known page route.`).join('\n')
    : '_None found by static route matching._');
  lines.push('');

  lines.push('## Documentation findings');
  lines.push(docIssues.length
    ? `- ⚠️ README.md references files that no longer exist: ${docIssues.join(', ')}`
    : '- ✅ File paths referenced in README.md code spans all exist.');
  lines.push('');

  lines.push('## Accessibility / SEO (static, best-effort)');
  for (const check of a11y) lines.push(`- ${check.passed ? '✅' : '❌'} ${check.label}`);
  lines.push('- Full automated accessibility/SEO auditing (e.g. Lighthouse CI, axe) is not wired up in this repository; these are static presence checks only.');
  lines.push('');

  lines.push('## Recommended manual actions');
  lines.push(manualActions.length ? manualActions.map((m) => `- ${m}`).join('\n') : '_None._');
  lines.push('');

  lines.push('## Items requiring approval before merging');
  lines.push(requiresApproval.length ? requiresApproval.map((m) => `- ${m}`).join('\n') : '_None — this run found nothing that requires special approval beyond a normal review._');
  lines.push('');

  lines.push('## Items intentionally not changed');
  lines.push(notChanged.length ? notChanged.map((m) => `- ${m}`).join('\n') : '_None._');
  lines.push('- Major dependency version bumps (see "Outdated packages" table).');
  lines.push('- No automatic merge into `main` and no deployment — this is always a manual, human-reviewed step.');
  lines.push('');

  fs.writeFileSync(REPORT_PATH, lines.join('\n') + '\n', 'utf8');

  // ---------------------------------------------------------------------
  // Emit outputs for the workflow to gate commit/push behavior on.
  // ---------------------------------------------------------------------
  const summary = {
    hasChanges: depsChanged,
    buildable,
    requiresManualReview,
    safeToPush,
  };
  console.log('Monthly maintenance summary:', JSON.stringify(summary, null, 2));

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(summary).map(([k, val]) => `${k}=${val}`).join(os.EOL) + os.EOL,
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, fs.readFileSync(REPORT_PATH, 'utf8'));
  }

  // Never fail the job step itself here — the workflow decides what to do
  // with `requiresManualReview`/`safeToPush`. A hard process failure would
  // prevent the report from being committed at all.
}

main();
