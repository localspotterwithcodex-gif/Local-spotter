/**
 * Creates or updates the three subscription plans (staging/production). Creates no users.
 *
 *   npx ts-node scripts/seed-plans.ts --webshop=12 --shoproutes=27 --workshop=57
 *
 * Prices are monthly, in EUR, and always passed in (never hardcoded). Safe to re-run: an existing plan only
 * gets the new price; commission and active/inactive set in the admin panel are left alone.
 */
import { PrismaClient, SubscriptionPlanSlug } from '@prisma/client';
import { MAX_PLAN_PRICE } from '../src/admin/admin-plans.service';

const PLANS: Record<SubscriptionPlanSlug, { arg: string; name: string; description: string }> = {
  WEBSHOP: { arg: 'webshop', name: 'Webshop', description: 'Online winkelprofiel, productcatalogus, voorraadbeheer en directe verkoop.' },
  SHOPROUTES: { arg: 'shoproutes', name: 'Shoproutes', description: 'Alle Webshop functies + GPS kaartweergave, winkelroutes en lokale ontdekking.' },
  WORKSHOP: { arg: 'workshop', name: 'Workshop', description: 'Alle Webshop & Shoproutes functies + workshop organisatie, reviews & community.' },
};

/** Parses `--webshop=12 --shoproutes=27.50 --workshop=57` into prices; throws on anything missing or invalid. */
export function parsePlanPrices(argv: string[]): Record<SubscriptionPlanSlug, string> {
  const given = new Map<string, string>();
  for (const a of argv) {
    const m = /^--([a-z]+)=(.*)$/.exec(a);
    if (!m) throw new Error(`Unexpected argument "${a}"; use --webshop=<price> --shoproutes=<price> --workshop=<price>`);
    given.set(m[1], m[2]);
  }
  const known = Object.values(PLANS).map((p) => p.arg);
  for (const k of given.keys()) if (!known.includes(k)) throw new Error(`Unknown plan "--${k}"`);

  const prices = {} as Record<SubscriptionPlanSlug, string>;
  for (const [slug, plan] of Object.entries(PLANS) as [SubscriptionPlanSlug, (typeof PLANS)[SubscriptionPlanSlug]][]) {
    const raw = given.get(plan.arg);
    if (raw === undefined) throw new Error(`Missing --${plan.arg}=<monthly price in EUR>`);
    // Two decimals at most, no sign or exponent, so the value lands in Decimal(10,2) exactly.
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) > MAX_PLAN_PRICE) {
      throw new Error(`--${plan.arg} must be a price between 0 and ${MAX_PLAN_PRICE} with at most 2 decimals`);
    }
    prices[slug] = raw;
  }
  return prices;
}

async function main() {
  const prices = parsePlanPrices(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    for (const [slug, plan] of Object.entries(PLANS) as [SubscriptionPlanSlug, (typeof PLANS)[SubscriptionPlanSlug]][]) {
      const row = await prisma.subscriptionPlan.upsert({
        where: { slug },
        update: { monthlyPrice: prices[slug] },
        create: { slug, name: plan.name, description: plan.description, monthlyPrice: prices[slug], currency: 'EUR', active: true },
        select: { name: true, monthlyPrice: true, active: true },
      });
      console.log(`${row.name}: EUR ${row.monthlyPrice.toFixed(2)}/month${row.active ? '' : ' (inactive)'}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err: Error) => {
    console.error(`seed-plans: ${err.message}`);
    process.exit(1);
  });
}
