# Testing Specification

## Purpose
This document defines the Local Spotter MVP testing strategy across backend, frontend, payments, authorization, responsive UI, and deployment readiness.

## Confirmed Requirements
- Important business logic must be tested.
- Minimum required tests:
  - Authentication.
  - Authorization.
  - Business ownership.
  - Subscription access.
  - Product creation.
  - Product image limit.
  - Product variants.
  - Order creation.
  - Order total calculation.
  - Stock validation.
  - Review permissions.
  - Follower relationships.
  - Workshop capacity.
  - Payment webhook handling.
  - Payout authorization.
  - Admin approval.
- A feature is not complete just because UI renders.

## Backend Unit Tests
- Auth service:
  - password hashing/verification.
  - duplicate email/mobile.
  - reset token expiry/use.
  - OAuth linking rules.
- RBAC guards:
  - consumer/business/admin access.
  - suspended/deleted users blocked.
- Ownership:
  - owner cannot access another business.
  - owner cannot edit another product/order/payout.
- Subscription:
  - feature matrix for Webshop/Shoproutes/Workshop.
  - active/expired/past_due behavior.
- Products:
  - price/stock validation.
  - max 3 images.
  - variant SKU uniqueness.
- Orders:
  - totals.
  - price snapshots.
  - status transitions.
  - stock decrement.
- Workshops:
  - capacity.
  - date/time validation.
  - booking status.
- Reviews/followers:
  - rating validation.
  - follower uniqueness.
  - review eligibility.
- Payments:
  - webhook idempotency.
  - signature failure.
  - status transition.
- Payouts:
  - owner request.
  - admin approval.
  - owner cannot approve.

## Backend Integration / E2E Tests
- Registration -> role selection -> login.
- Business onboarding -> subscription checkout mocked -> webhook -> feature unlock.
- Create product -> upload metadata -> list public product.
- Cart -> order -> payment webhook -> stock decrement.
- Workshop creation -> booking -> payment webhook -> capacity decrement.
- Follow/unfollow.
- Review creation with plan enforcement.
- Payout request -> admin approval.
- Admin moderation.

## Database Tests
- Prisma migration applies from empty database.
- Seed data loads realistic Dutch/local data.
- Foreign keys prevent orphaned rows.
- Unique constraints:
  - user email/mobile.
  - follower.
  - active business subscription.
  - route stop sequence.
  - product image sort order.
- Transaction tests for concurrent stock and workshop capacity.

## Frontend Tests
- Component tests:
  - ProductCard.
  - RetailerCard.
  - WorkshopCard.
  - SegmentedSwitch.
  - Primary/Secondary buttons.
  - Form fields.
  - Map permission state.
- Page tests:
  - Login/signup validation.
  - Product listing loading/empty/error.
  - Product detail variant selection.
  - Add product image count.
  - Subscription plan selection.
  - Payment method selection.
  - Owner dashboards.

## Playwright E2E Tests
- Consumer:
  - Browse product -> detail -> add to cart -> checkout.
  - Manage address.
  - Follow business.
  - Book workshop.
- Business owner:
  - Signup -> business info -> subscription -> success.
  - Add product.
  - Add workshop.
  - Update order status.
- Admin:
  - Login admin.
  - Approve payout.
  - Moderate review.

## Visual and Responsive Tests
- Viewports:
  - 375 x 812.
  - 390 x 844.
  - 428 x 926.
  - 768 x 1024.
  - 1024 x 768.
  - 1440 x 900.
- Check:
  - No text overlap.
  - No button text overflow.
  - Bottom nav not covering content.
  - Product cards retain aspect ratio.
  - Forms remain usable.
  - Map panel usable.
- Compare key mobile screens against Figma:
  - Product listing `193:73`.
  - Login/signup.
  - Subscription/payment.
  - Add product.
  - Business profile.
  - Shoproute map.

## Security Tests
- Unauthenticated protected endpoint returns 401.
- Wrong role returns 403.
- Owner cannot access another business data.
- Consumer cannot access another consumer address.
- Business owner cannot approve payout.
- Webhook rejects invalid signature.
- File upload rejects invalid MIME/size.
- Rate limits trigger on auth abuse.

## Payment Tests
- Use provider sandbox/mocks.
- Duplicate webhook event processed once.
- Payment success updates order/subscription/booking once.
- Payment failure leaves order/booking pending or cancelled according policy.
- Frontend success page alone does not activate subscription/order.

## CI Requirements
- Lint.
- Typecheck.
- Unit tests.
- Integration tests with test database.
- Prisma migration check.
- Frontend build.
- Backend build.
- Playwright smoke tests.
- Secret scanning.

## Assumptions
- Jest/Vitest can be chosen per app conventions during implementation.
- Playwright is preferred for browser flows.
- Payment provider is mocked until credentials are available.
- Visual regression can start with screenshot assertions rather than paid tooling.

## Unresolved Questions
- Required coverage threshold.
- Whether CI should run full Playwright on every PR or nightly.
- Which payment provider sandbox will be used.
- Whether client wants automated Figma visual-diff thresholds.
- Whether admin MFA testing is required.

## Dependencies
- All product docs for behavior under test.
- `19-DEPLOYMENT.md` for CI/CD.
- `20-IMPLEMENTATION-PLAN.md` for phase-specific test gates.
