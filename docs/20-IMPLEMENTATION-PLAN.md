# Local Spotter Implementation Plan

## Purpose
This document defines the recommended implementation order. Application development must not start until the documentation is approved.

## Confirmed Requirements
- Do not implement the full app in one uncontrolled step.
- Complete Phase 0 discovery/documentation before Phase 1.
- Use incremental phases.
- Maintain architecture/database/API/security/testing documentation as major decisions change.

## Recommended Implementation Order

### Phase 0: Documentation and Validation
Status: current phase.
- Read `PROMPT.md` and `CLAUDE.md`.
- Inspect repository.
- Inspect Figma.
- Create docs 01-20.
- Update `requirements.txt` with repository helper dependencies only.
- Client approves unresolved questions and implementation order.

Exit criteria:
- Documentation exists.
- Figma-verifiable screens are listed.
- Missing designs are clearly marked.
- No app code scaffold created.

### Phase 1: Monorepo Foundation
- Create workspace structure:
  - `apps/web`.
  - `apps/api`.
  - `packages/types`.
  - `packages/validation`.
  - `packages/config`.
  - `prisma`.
- Configure Next.js App Router.
- Configure NestJS.
- Configure Prisma.
- Add shared linting, formatting, TypeScript strict mode.
- Add `.env.example`.
- Add Docker Compose for local PostgreSQL if needed.
- Add README setup.
- Add health checks.

### Phase 2: Database Foundation
- Implement Prisma schema from `06-DATABASE-SCHEMA.md`.
- Add initial migrations.
- Add seed data with realistic Dutch/local businesses, products, workshops, routes, orders.
- Add Prisma client service.
- Add test database setup.

### Phase 3: Authentication and RBAC
- Register/login/logout.
- Forgot/reset password.
- OAuth Google/Facebook.
- Role selection.
- Guards:
  - auth.
  - role.
  - ownership.
  - subscription feature.
- User/consumer/owner profile APIs.
- Auth screens from Figma.

### Phase 4: Business Owner Onboarding and Subscription
- Business info form.
- Business profile creation.
- KVK/phone/address validation.
- Subscription plan API and UI.
- Payment checkout stub or sandbox provider integration.
- Webhook handling.
- Success screen.

Provider decision required before full completion.

### Phase 5: Product System
- Product categories.
- Product CRUD.
- Image upload with max 3 enforcement.
- Variants.
- Stock.
- Product listing.
- Product detail.
- Owner add/edit product UI from Figma.

### Phase 6: Consumer Discovery
- Discovery home.
- Products.
- Businesses/retailers.
- Search/filter.
- Category modal.
- Business profile.
- Consumer profile/settings shell.
- Loading/empty/error states.

### Phase 7: Cart, Orders, and Product Payments
- Cart.
- Consumer addresses.
- Checkout.
- Product order payment.
- Payment webhook confirmation.
- Transaction-safe stock decrement.
- Order history.
- Business order dashboard and status transitions.

### Phase 8: Shoproutes and GPS
- Business location management.
- Map provider integration.
- Shop markers.
- Shop route CRUD.
- Route stops.
- Directions/start route.
- Geolocation permission handling.

Map provider decision required before full completion.

### Phase 9: Workshops
- Workshop CRUD.
- Workshop discovery/list/detail.
- Workshop booking.
- Capacity enforcement.
- Workshop payment flow if confirmed.
- Ticket/order metrics.

### Phase 10: Social Features
- Follow/unfollow.
- Follower counts/list.
- Reviews/ratings.
- Review images.
- Product reviews.
- Comments.
- Moderation hooks.
- Enforce Workshop plan.

### Phase 11: Payouts and Ledger
- Business ledger.
- Payout account metadata.
- Withdrawal request.
- Admin approval/rejection.
- Mark paid.
- Audit logs.

Provider/fee/holding policy required before full completion.

### Phase 12: Admin
- Admin shell.
- User management.
- Business management.
- Product moderation.
- Review/comment moderation.
- Payment dashboard.
- Payout approval.
- Subscription plan management.
- Audit log viewer.

### Phase 13: Polish, Responsive, Accessibility
- Compare mobile screens to Figma.
- Implement desktop/tablet adaptations.
- Add responsive checks.
- Add accessibility fixes.
- Add skeleton/empty/error states.
- Performance optimization.
- Security review.

### Phase 14: Testing and Hardening
- Unit tests.
- Integration tests.
- API tests.
- Payment webhook tests.
- Playwright flows.
- Production builds.
- Migration checks.
- Secret scanning.

### Phase 15: Deployment
- Staging deploy.
- Configure environment variables.
- Configure database/storage.
- Configure payment/map/email providers.
- Configure webhooks.
- Production deployment runbook.
- Monitoring/alerts.

## Technical Risks
- Figma has only mobile layouts; desktop/tablet require derived design.
- Admin screens are not in Figma.
- Consumer cart/checkout screens are not in Figma.
- Payment provider support for iDEAL, PayPal, Tikkie, recurring subscriptions, and payouts may require more than one integration.
- Marketplace payouts and platform-fee accounting need policy decisions.
- Product image limit conflict: requirements say 3, one Figma populated form shows four images.
- Role model may need multi-role users if owners also shop as consumers.
- Shoproute ownership/creation policy is unclear.
- Review eligibility and moderation policy are unclear.
- Current repository contains a local secret-like token in `.claude/settings.json`.

## Assumptions
- Build clean modular monolith first.
- One business per order/cart for MVP.
- Use Supabase PostgreSQL/Storage unless client changes infrastructure.
- Use provider-hosted payment pages/components.
- Build actual app screens, not marketing landing pages.

## Unresolved Questions Blocking Exact Implementation
- Payment provider and payout model.
- Map provider.
- Multi-business cart policy.
- Business approval workflow.
- Admin design expectations.
- Refund/cancellation policy.
- Workshop payment/refund rules.
- VAT/invoice handling.
- Final desktop design approval path.
- Final language/localization launch requirement.

## Dependencies
- All docs 01-19.
- Client approval before Phase 1 implementation.
