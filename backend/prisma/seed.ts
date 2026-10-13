import { PrismaClient, UserRole, UserStatus, BusinessStatus, SubscriptionPlanSlug, SubscriptionStatus, OrderStatus, ReviewStatus, WorkshopStatus, RouteStatus, PayoutStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LocalSpotter database seed...');

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
      monthlyPrice: 50.0,
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
      monthlyPrice: 100.0,
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
      monthlyPrice: 150.0,
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
  //   username: owner   |  password: Owner@123
  //   (also reachable via email eigenaar@boetiek-amsterdam.nl)
  console.log('🏬 Seeding Business Owner 1 & Profile...');
  const ownerPasswordHash = await bcrypt.hash('Owner@123', 10);
  const ownerUser1 = await prisma.user.upsert({
    where: { email: 'eigenaar@boetiek-amsterdam.nl' },
    update: {
      username: 'owner',
      passwordHash: ownerPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'eigenaar@boetiek-amsterdam.nl',
      username: 'owner',
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

  const product1 = await prisma.product.upsert({
    where: {
      businessId_slug: {
        businessId: business1.id,
        slug: 'handgemaakte-leren-shopper',
      },
    },
    update: {},
    create: {
      businessId: business1.id,
      categoryId: prodCategoryClothing.id,
      name: 'Handgemaakte Leren Shopper',
      slug: 'handgemaakte-leren-shopper',
      description: 'Stijlvolle en duurzame tas gemaakt van 100% plantaardig looien leer.',
      price: 149.95,
      stock: 15,
      active: true,
      variants: {
        createMany: {
          data: [
            { color: 'Zwart', sku: 'SHOPPER-BLK', price: 149.95, stock: 8 },
            { color: 'Bruin', sku: 'SHOPPER-BRN', price: 149.95, stock: 7 },
          ],
        },
      },
    },
  });

  const productVariants = [
    { color: 'Zwart', sku: 'SHOPPER-BLK', price: 149.95, stock: 8 },
    { color: 'Bruin', sku: 'SHOPPER-BRN', price: 149.95, stock: 7 },
  ];

  for (const variant of productVariants) {
    const existingVariant = await prisma.productVariant.findFirst({
      where: { productId: product1.id, sku: variant.sku },
    });

    if (!existingVariant) {
      await prisma.productVariant.create({
        data: {
          productId: product1.id,
          ...variant,
        },
      });
    }
  }

  // 7. Create Consumer User & Profile
  // Simple test login credentials (same pattern as Super Admin):
  //   username: consumer  |  password: Consumer@123
  //   (also reachable via email sophie.vis@example.nl)
  console.log('🛍️ Seeding Consumer User...');
  const consumerPasswordHash = await bcrypt.hash('Consumer@123', 10);
  const consumerUser = await prisma.user.upsert({
    where: { email: 'sophie.vis@example.nl' },
    update: {
      username: 'consumer',
      passwordHash: consumerPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'sophie.vis@example.nl',
      username: 'consumer',
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

  // 10. Create Review
  console.log('⭐ Seeding Review...');
  const existingReview = await prisma.review.findFirst({
    where: {
      businessId: business1.id,
      consumerProfileId: consumerUser.consumerProfile!.id,
      productId: product1.id,
      title: 'Prachtige kwaliteit tas!',
    },
  });

  if (!existingReview) {
    await prisma.review.create({
      data: {
        businessId: business1.id,
        consumerProfileId: consumerUser.consumerProfile!.id,
        productId: product1.id,
        rating: 5,
        title: 'Prachtige kwaliteit tas!',
        comment: 'Super snelle verzending en het leer is ontzettend mooi afgewerkt.',
        status: ReviewStatus.PUBLISHED,
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('🔑 Test login credentials:');
  console.log('   Super Admin  → username: Admin     password: Admin@123');
  console.log('   Business Owner → username: owner   password: Owner@123');
  console.log('   Consumer     → username: consumer  password: Consumer@123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
