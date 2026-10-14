import { PrismaClient, UserStatus } from '@prisma/client';

/**
 * Disables the three demo logins created by prisma/seed.ts (username login +
 * password removed, status SUSPENDED). Non-destructive: rows stay so that
 * demo orders/businesses keep their references. Run before real launch:
 *   npm run seed:demo:disable
 */
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.user.updateMany({
    where: { username: { in: ['Admin', 'Business_owner', 'customer'], mode: 'insensitive' } },
    data: { passwordHash: null, status: UserStatus.SUSPENDED },
  });
  console.log(`Disabled ${res.count} demo account(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
