/**
 * Fails (exit 1) when any table in the "public" schema has Row Level Security disabled.
 * Run after `prisma migrate deploy` in CI:  npx ts-node scripts/check-rls.ts
 * A new table needs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` in its migration (no policies: only the
 * backend, which owns the tables, may read them; Supabase's public API gets nothing).
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw<{ table: string }[]>`
      SELECT c.relname AS "table" FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity ORDER BY 1`;
    if (rows.length) {
      console.error(`RLS is disabled on: ${rows.map((r) => r.table).join(', ')}`);
      process.exit(1);
    }
    console.log('RLS enabled on every public table.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: Error) => {
  console.error(`check-rls: ${err.message}`);
  process.exit(1);
});
