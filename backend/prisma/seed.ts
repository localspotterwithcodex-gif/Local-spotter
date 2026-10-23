import { PrismaClient, UserRole, UserStatus, BusinessStatus, SubscriptionPlanSlug, SubscriptionStatus, OrderStatus, ReviewStatus, WorkshopStatus, RouteStatus, PayoutStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function describeTarget(): string {
  try {
    const u = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL || '');
    return `${u.hostname}${u.pathname}`; // never the credentials
  } catch {
    return '(unparseable database url)';
  }
}

async function main() {
  // This seed creates DEMO accounts with publicly known passwords (Admin@123,
  // Owner@123, Customer@123). Anyone who reads this repository can log in as
  // the admin on any database it has been run against, so it must be opt-in.
  if (process.env.ALLOW_DEMO_SEED !== 'yes') {
    console.error('Refusing to seed: demo accounts have publicly known passwords.');
    console.error(`Target database: ${describeTarget()}`);
    console.error('If this is a development/staging/demo database, re-run with ALLOW_DEMO_SEED=yes.');
    console.error('Remove the demo logins again later with: npm run seed:demo:disable');
    process.exit(1);
  }
  console.log(`🌱 Starting LocalSpotter database seed on ${describeTarget()} ...`);

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Subscription Plans
  console.log('📌 Seeding Subscription Plans...');
  const webshopPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: SubscriptionPlanSlug.WEBSHOP },
    update: {},
    create: {
      name: 'Webshop',
      slug: SubscriptionPlanSlug.WEBSHOP,
      description: 'Online winkelprofiel, productcatalogus, voorraadbeheer en directe verkoop.',
      monthlyPrice: 12.0,
      currency: 'EUR',
      active: true,
    },
  });

  const shoproutesPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: SubscriptionPlanSlug.SHOPROUTES },
    update: {},
    create: {
      name: 'Shoproutes',
      slug: SubscriptionPlanSlug.SHOPROUTES,
      description: 'Alle Webshop functies + GPS kaartweergave, winkelroutes en lokale ontdekking.',
      monthlyPrice: 27.0,
      currency: 'EUR',
      active: true,
    },
  });

  const workshopPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: SubscriptionPlanSlug.WORKSHOP },
    update: {},
    create: {
      name: 'Workshop',
      slug: SubscriptionPlanSlug.WORKSHOP,
      description: 'Alle Webshop & Shoproutes functies + workshop organisatie, reviews & community.',
      monthlyPrice: 57.0,
      currency: 'EUR',
      active: true,
    },
  });

  // 2. Create Super Admin User
  // Login credentials for the Super Admin portal:
  //   username: Admin
  //   password: Admin@123
  // (also reachable via email admin@localspotter.nl with the same password)
  console.log('👤 Seeding Super Admin User...');
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@localspotter.nl' },
    update: {
      username: 'Admin',
      passwordHash: adminPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'admin@localspotter.nl',
      username: 'Admin',
      mobile: '+31612345678',
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  // 3. Create Business Owner 1 & Profile
  // Simple test login credentials (same pattern as Super Admin):
  //   username: Business_owner   |  password: Owner@123
  //   (also reachable via email eigenaar@boetiek-amsterdam.nl)
  console.log('🏬 Seeding Business Owner 1 & Profile...');
  const ownerPasswordHash = await bcrypt.hash('Owner@123', 10);
  const ownerUser1 = await prisma.user.upsert({
    where: { email: 'eigenaar@boetiek-amsterdam.nl' },
    update: {
      username: 'Business_owner',
      passwordHash: ownerPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'eigenaar@boetiek-amsterdam.nl',
      username: 'Business_owner',
      mobile: '+31623456789',
      passwordHash: ownerPasswordHash,
      role: UserRole.BUSINESS_OWNER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      businessOwnerProfile: {
        create: {
          displayName: 'Anouk van Dijk',
          phone: '020-1234567',
        },
      },
    },
    include: { businessOwnerProfile: true },
  });

  // 4. Create Business Category
  const fashionCategory = await prisma.businessCategory.upsert({
    where: { slug: 'fashion-kleding' },
    update: {},
    create: {
      name: 'Fashion & Kleding',
      slug: 'fashion-kleding',
      description: 'Lokale kledingboetieks, schoenen en accessoires.',
    },
  });

  const homeCategory = await prisma.businessCategory.upsert({
    where: { slug: 'home-living' },
    update: {},
    create: {
      name: 'Home & Living',
      slug: 'home-living',
      description: 'Interieur, meubels en decoratie van lokale makers.',
    },
  });

  // Further shop categories (also added to existing databases by migration 20261025110000).
  for (const [name, slug, sortOrder] of [
    ['Jewelry', 'jewelry', 20],
    ['Shoes', 'shoes', 30],
    ['Home Ware', 'home-ware', 40],
  ] as const) {
    await prisma.businessCategory.upsert({ where: { slug }, update: {}, create: { name, slug, sortOrder } });
  }

  // 5. Create Business 1
  console.log('🏪 Seeding Business 1 (Boetiek Amsterdam)...');
  const business1 = await prisma.business.upsert({
    where: { slug: 'boetiek-amsterdam' },
    update: {},
    create: {
      ownerProfileId: ownerUser1.businessOwnerProfile!.id,
      name: 'Boetiek Amsterdam',
      slug: 'boetiek-amsterdam',
      description: 'Duurzame mode en ambachtelijke accessoires in het hart van Amsterdam.',
      phone: '020-1234567',
      email: 'info@boetiek-amsterdam.nl',
      kvkNumber: '87654321',
      categoryId: fashionCategory.id,
      state: 'Noord-Holland',
      city: 'Amsterdam',
      street: 'Keizersgracht',
      houseNumber: '142',
      postalCode: '1015 CX',
      latitude: 52.3752,
      longitude: 4.8851,
      status: BusinessStatus.ACTIVE,
      averageRating: 4.8,
      ratingCount: 12,
      followerCount: 145,
    },
  });

  await prisma.businessSubscription.upsert({
    where: { businessId: business1.id },
    update: {},
    create: {
      businessId: business1.id,
      planId: workshopPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const businessHours = [
    { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 2, openTime: '09:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 3, openTime: '09:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00', isClosed: false },
    { dayOfWeek: 5, openTime: '09:00', closeTime: '18:00', isClosed: false },
    { dayOfWeek: 6, openTime: '10:00', closeTime: '17:00', isClosed: false },
    { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
  ];

  for (const hours of businessHours) {
    await prisma.businessHours.upsert({
      where: {
        businessId_dayOfWeek: {
          businessId: business1.id,
          dayOfWeek: hours.dayOfWeek,
        },
      },
      update: {},
      create: {
        businessId: business1.id,
        ...hours,
      },
    });
  }

  // 6. Create Product Category & Products
  console.log('📦 Seeding Products...');
  const prodCategoryClothing = await prisma.productCategory.upsert({
    where: { slug: 'kleding' },
    update: {},
    create: { name: 'Kleding', slug: 'kleding' },
  });
  // Further product categories (also added to existing databases by migration 20261024100000).
  for (const [name, slug, sortOrder] of [
    ['Sieraden', 'sieraden', 20],
    ['Schoenen', 'schoenen', 30],
    ['Woonaccessoires', 'woonaccessoires', 40],
  ] as const) {
    await prisma.productCategory.upsert({ where: { slug }, update: {}, create: { name, slug, sortOrder } });
  }

  // No demo products are seeded: owners add their own via the portal.

  // 7. Create Consumer User & Profile
  // Simple test login credentials (same pattern as Super Admin):
  //   username: customer  |  password: Customer@123
  //   (also reachable via email sophie.vis@example.nl)
  console.log('🛍️ Seeding Consumer User...');
  const consumerPasswordHash = await bcrypt.hash('Customer@123', 10);
  const consumerUser = await prisma.user.upsert({
    where: { email: 'sophie.vis@example.nl' },
    update: {
      username: 'customer',
      passwordHash: consumerPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'sophie.vis@example.nl',
      username: 'customer',
      mobile: '+31634567890',
      passwordHash: consumerPasswordHash,
      role: UserRole.CONSUMER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      consumerProfile: {
        create: {
          displayName: 'Sophie Vis',
          firstName: 'Sophie',
          lastName: 'Vis',
          phone: '06-34567890',
        },
      },
    },
    include: { consumerProfile: true },
  });

  // 8. Create Workshop
  console.log('🎨 Seeding Workshop...');
  await prisma.workshop.upsert({
    where: {
      businessId_slug: {
        businessId: business1.id,
        slug: 'ambachtelijk-leerbewerken-workshop',
      },
    },
    update: {},
    create: {
      businessId: business1.id,
      title: 'Ambachtelijk Leerbewerken Workshop',
      slug: 'ambachtelijk-leerbewerken-workshop',
      description: 'Leer de basistechnieken van ambachtelijk leer snijden, stikken en afwerken.',
      price: 65.00,
      capacity: 10,
      bookedCount: 3,
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      location: 'Keizersgracht 142, Amsterdam',
      latitude: 52.3752,
      longitude: 4.8851,
      status: WorkshopStatus.PUBLISHED,
    },
  });

  // 9. Create Shop Route
  console.log('🗺️ Seeding Shop Route...');
  const shopRoute = await prisma.shopRoute.upsert({
    where: {
      businessId_slug: {
        businessId: business1.id,
        slug: 'jordaan-ambacht-design-route',
      },
    },
    update: {},
    create: {
      businessId: business1.id,
      title: 'Jordaan Ambacht & Design Route',
      slug: 'jordaan-ambacht-design-route',
      description: 'Wandel langs de leukste ambachtelijke boetieks en ateliers in de Jordaan.',
      city: 'Amsterdam',
      status: RouteStatus.PUBLISHED,
    },
  });

  await prisma.routeStop.upsert({
    where: {
      routeId_sequence: {
        routeId: shopRoute.id,
        sequence: 1,
      },
    },
    update: {},
    create: {
      routeId: shopRoute.id,
      businessId: business1.id,
      title: 'Boetiek Amsterdam',
      description: 'Startpunt met koffie en ambachtelijk leer',
      sequence: 1,
      latitude: 52.3752,
      longitude: 4.8851,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('🔑 Test login credentials:');
  console.log('   Super Admin  → username: Admin     password: Admin@123');
  console.log('   Business Owner → username: Business_owner password: Owner@123');
  console.log('   Consumer     → username: customer  password: Customer@123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
