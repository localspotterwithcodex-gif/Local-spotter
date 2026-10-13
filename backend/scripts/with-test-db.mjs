#!/usr/bin/env node
/**
 * Runs a command against the ISOLATED TEST database only.
 *
 *   node scripts/with-test-db.mjs prisma migrate status
 *   node scripts/with-test-db.mjs prisma migrate deploy
 *   node scripts/with-test-db.mjs jest --config ./test/jest-e2e.json --runInBand
 *
 * Why this exists: prisma/schema.prisma declares BOTH `url` (DATABASE_URL) and
 * `directUrl` (DIRECT_URL). The Prisma CLI (migrate) uses DIRECT_URL, so
 * overriding only DATABASE_URL would still run migrations on whatever DIRECT_URL
 * points to (production). This wrapper overrides BOTH, and refuses to run if the
 * test URL points at the same server/database as the production URLs in .env.
 * Secrets are never printed.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readDotEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = readDotEnv(join(root, '.env'));
const get = (k) => process.env[k] || fileEnv[k];

const testUrl = get('TEST_DATABASE_URL');
if (!testUrl) {
  console.error('TEST_DATABASE_URL is not set (put it in backend/.env or export it).');
  process.exit(2);
}

// Neon pooled hosts contain "-pooler"; migrations need the direct host.
const toDirect = (u) => u.replace(/(@ep-[a-z0-9-]+?)-pooler(\.)/, '$1$2');
const testDirect = get('TEST_DATABASE_DIRECT_URL') || toDirect(testUrl);

const ident = (u) => {
  try {
    const p = new URL(u);
    return { host: p.hostname.replace('-pooler', ''), db: p.pathname.replace(/^\//, '') };
  } catch {
    return null;
  }
};

const t = ident(testUrl);
if (!t) {
  console.error('TEST_DATABASE_URL is not a valid URL.');
  process.exit(2);
}
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  const prod = get(key) && ident(get(key));
  if (prod && prod.host === t.host) {
    console.error(`REFUSING: TEST_DATABASE_URL points at the same server as ${key}. Use a separate Neon project/branch for tests.`);
    process.exit(3);
  }
}

console.log(`[with-test-db] target host ${t.host.slice(0, 14)}… database "${t.db}" (credentials hidden); DATABASE_URL and DIRECT_URL both overridden`);

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: with-test-db.mjs <command> [args…]');
  process.exit(2);
}
const res = spawnSync('npx', [cmd, ...args], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    DATABASE_URL: testUrl,
    DIRECT_URL: testDirect,
    TEST_DATABASE_URL: testUrl,
  },
});
process.exit(res.status ?? 1);
