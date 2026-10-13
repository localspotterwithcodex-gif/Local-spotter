#!/usr/bin/env node
/**
 * READ-ONLY inspection of the application (production) database.
 *
 *   node scripts/prod-readonly.mjs status   -> prisma migrate status
 *   node scripts/prod-readonly.mjs diff     -> prisma migrate diff (database -> schema.prisma), prints SQL only
 *
 * Only these two fixed commands exist; arbitrary arguments are rejected, so
 * nothing here can apply a migration, push a schema or modify data.
 * `migrate status` only reads the _prisma_migrations table; `migrate diff`
 * introspects the schema and prints SQL to the terminal – it never executes it.
 * Connection strings are read from backend/.env by Prisma and never printed.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function dotEnv(key) {
  const file = join(root, '.env');
  if (process.env[key]) return process.env[key];
  if (!existsSync(file)) return undefined;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith(key + '=')) return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

const COMMANDS = {
  status: ['prisma', 'migrate', 'status'],
  diff: ['prisma', 'migrate', 'diff', '--from-url', '__DIRECT_URL__', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'],
};

const which = process.argv[2];
if (process.argv.length !== 3 || !COMMANDS[which]) {
  console.error('usage: prod-readonly.mjs <status|diff>   (no other arguments are accepted)');
  process.exit(2);
}

const args = COMMANDS[which].map((a) => {
  if (a !== '__DIRECT_URL__') return a;
  const url = dotEnv('DIRECT_URL');
  if (!url) {
    console.error('DIRECT_URL is not set in backend/.env.');
    process.exit(2);
  }
  return url;
});

console.log(`[prod-readonly] running read-only "${which}" against the configured application database (credentials hidden)`);
// Run the Prisma CLI through node directly (no shell). With a shell, Windows cmd.exe splits the
// connection string at '&' (e.g. "...?sslmode=require&channel_binding=require") and treats the
// rest as a separate command.
const prismaBin = join(root, 'node_modules', 'prisma', 'build', 'index.js');
const res = spawnSync(process.execPath, [prismaBin, ...args.slice(1)], { cwd: root, stdio: 'inherit', shell: false });
process.exit(res.status ?? 1);
