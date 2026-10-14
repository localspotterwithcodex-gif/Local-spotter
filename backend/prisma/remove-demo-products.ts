import { PrismaClient } from '@prisma/client';

/**
 * Removes the demo product(s) created by the OLD version of prisma/seed.ts
 * (soft delete: deletedAt + active=false; rows stay for referential integrity).
 *
 *   Dry run (default, changes nothing):   npm run demo:products:remove
 *   Apply:  set ALLOW_DEMO_CLEANUP=yes&& npm run demo:products:remove -- --apply   (Windows cmd)
 *
 * Only the known seed slug is targeted; products you created yourself are never touched.
 * The database host is printed (never credentials) so you can confirm the target.
 */
const SEED_PRODUCT_SLUGS = ['handgemaakte-leren-shopper'];

const prisma = new PrismaClient();

function describeTarget(): string {
  try {
    const u = new URL(process.env.DATABASE_URL ?? '');
    return `${u.hostname}${u.pathname}`;
  } catch {
    return '(unknown)';
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`Target database: ${describeTarget()}`);

  const products = await prisma.product.findMany({
    where: { slug: { in: SEED_PRODUCT_SLUGS }, deletedAt: null },
    select: { id: true, name: true, slug: true, business: { select: { name: true } } },
  });
  if (products.length === 0) {
    console.log('No demo products found. Nothing to do.');
    return;
  }
  for (const p of products) console.log(`- ${p.name} (${p.slug}) of "${p.business.name}"`);

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply and ALLOW_DEMO_CLEANUP=yes to remove them.');
    return;
  }
  if (process.env.ALLOW_DEMO_CLEANUP !== 'yes') {
    console.error('\nRefusing to modify data: set ALLOW_DEMO_CLEANUP=yes together with --apply.');
    process.exit(1);
  }

  const ids = products.map((p) => p.id);
  const now = new Date();
  const [prod, rev] = await prisma.$transaction([
    prisma.product.updateMany({ where: { id: { in: ids } }, data: { deletedAt: now, active: false } }),
    prisma.review.updateMany({ where: { productId: { in: ids }, deletedAt: null }, data: { deletedAt: now } }),
  ]);
  console.log(`\nRemoved ${prod.count} demo product(s) and hid ${rev.count} related review(s).`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
