# Local Spotter MVP Project Requirements

## Purpose
This document captures the confirmed Local Spotter MVP requirements from `PROMPT.md`, `CLAUDE.md`, repository inspection, and the verified Figma file. It is the product source for later architecture, database, API, UI, testing, and deployment work.

## Confirmed Requirements
- Product name: Local Spotter.
- Market: Netherlands, with EUR pricing, Europe/Amsterdam business time handling, Dutch-local discovery, and GDPR-conscious engineering.
- MVP scope: responsive web application only. No native Android, native iOS, React Native, or Flutter implementation in this phase.
- Primary users: Consumer, Business Owner, Super Admin.
- Core product: local business discovery, local webshop, shop routes, workshops, reviews/followers/community features, and subscription-gated business capabilities.
- Backend/API must be reusable for future Android and iOS clients.
- Recommended architecture: Next.js App Router frontend, NestJS REST API backend, Prisma ORM, PostgreSQL, Supabase PostgreSQL/Storage or equivalent, modular monolith.
- Figma is the visual source of truth. Verified pages include `OLD VERSION`, `BUYER NEW`, and `SELLER NEW`.
- Business subscriptions:
  - Webshop: business profile, product listing, product images, details, inventory, purchasing.
  - Shoproutes: all Webshop features plus shop location, GPS/map presence, directions, and route functionality.
  - Workshop: all Shoproutes features plus workshops, followers, reviews, ratings, comments, review images, product reviews, and community interaction.
- Subscription pricing must be database-driven:
  - Webshop: EUR 50/month.
  - Shoproutes: EUR 100/month.
  - Workshop: EUR 150/month.
- Subscription feature access must be enforced by the backend, not only hidden in the UI.
- Authentication:
  - Email/mobile identifier and password.
  - Forgot password and reset password.
  - Google OAuth and Facebook OAuth.
  - User selects Consumer or Business Owner after registration, but the backend validates and persists roles.
- Business onboarding must collect profile image, store name, state/province, city, street, GPS coordinates, phone number, and KVK number.
- Product creation must support up to 3 images, name, price, description, stock, optional shop product link, category, colors, and sizes.
- Product variants must be normalized, including SKU, size, color, price, stock, and optional image.
- Consumers can browse/search businesses, products, categories, workshops, and shop routes, follow businesses, purchase products, manage addresses, and review eligible products/businesses.
- Business owners can manage profile, products, inventory, orders, followers, reviews, shop routes, workshops, subscription, earnings, payout details, and withdrawal requests.
- Super admins can manage users, businesses, subscriptions, products, orders, reviews, reports, payouts, payments, and platform activity.
- Payments must separate:
  - Business owner subscription payments to Local Spotter.
  - Consumer product/workshop payments associated with business revenue.
- Required payment methods from requirements: iDEAL, PayPal, Tikkie.
- Payouts/withdrawals require admin approval and must not be approvable by business owners.
- Order lifecycle must be controlled:
  - `PENDING -> CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED`.
  - Terminal states: `CANCELLED`, `REJECTED`.
  - No product return workflow in MVP.
- Stock and order totals must be transaction-safe. Historical order item prices must be snapshotted.
- Every major data-driven page must include loading, error, and empty states, even where Figma does not define them.
- Development seed data must use realistic Dutch/local-business data, not lorem ipsum.
- UI should be i18n-ready and preserve Dutch wording found in Figma.

## Repository State Confirmed
- Existing project is bare and does not contain production application code.
- Existing files: `PROMPT.md`, `CLAUDE.md`, `README.md`, `pyproject.toml`, `.gitignore`, `.python-version`, `.claude/settings.json`, and empty `requirements.txt`.
- `.claude/settings.json` contains a secret-like token and must not be committed or copied into documentation.

## Product Boundaries
- Do not add AI recommendations, chat systems, Elasticsearch, microservices, Kubernetes, event buses, blockchain, or Redis unless a later confirmed requirement requires them.
- PostgreSQL search is sufficient for MVP.
- Email notifications can be integrated where practical, but in-app notifications are the initial requirement.
- Cancellation/refund may exist as payment/order operations, but product returns must not exist.

## Assumptions
- Business owners can own one or more businesses, though the MVP UI appears centered on one active store profile.
- Consumer workshop booking can use the same payment infrastructure as product checkout, but must be accounted separately from product orders.
- Business category and product category data should be database-driven and admin-manageable.
- Backend will use HTTP-only cookie or token-based auth designed for web now and mobile later. Final token/session strategy needs implementation approval.
- Supabase is preferred for PostgreSQL and object storage unless client credentials or deployment constraints require another provider.
- A clean monorepo structure will be created only after documentation approval.

## Unresolved Questions
- Which payment provider should be used for iDEAL, PayPal, Tikkie, subscriptions, marketplace-style product payments, and payouts?
- Does the client require Dutch UI copy at MVP launch, or English-first with localization-ready structure?
- Should every business require admin approval before public visibility?
- Should consumers be able to buy products from multiple businesses in a single checkout, or one business per order?
- Are workshop payments required at MVP launch, or can booking be reservation-only initially?
- What are the payout eligibility rules, holding period, fees, and minimum withdrawal amount?
- Should KVK validation call an external registry service or only validate format initially?
- What map provider and geocoding provider will be funded and credentialed?
- What is the required refund/cancellation policy?
- Are business staff accounts in scope for MVP, or deferred?
- What exact legal pages and privacy text will client provide?

## Dependencies
- `02-FIGMA-DESIGN-SPEC.md` for verified screen inventory.
- `03-UI-UX-DESIGN-SYSTEM.md` for implementation visual rules.
- `04-PAGE-SCREEN-SPEC.md` for route and screen scope.
- `06-DATABASE-SCHEMA.md` for persistent entities.
- `07-API-SPEC.md` for module contracts.
- `08-AUTH-RBAC.md` for access control.
- `09-SUBSCRIPTION-SPEC.md`, `10-PAYMENT-SPEC.md`, and `11-COMMERCE-SPEC.md` for monetization and order behavior.
- `20-IMPLEMENTATION-PLAN.md` for delivery sequencing.
