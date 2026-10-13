# Local Spotter API Specification

## Purpose
This document defines the REST API modules, endpoint purposes, authentication requirements, authorization, and validation rules for the MVP. It is designed for a NestJS modular monolith and future mobile clients.

## Confirmed Requirements
- Backend: NestJS, TypeScript, REST API, Swagger/OpenAPI, Prisma.
- Frontend must communicate through APIs and not own business logic.
- APIs must enforce authentication, RBAC, ownership checks, subscription feature access, validation, rate limiting, and explicit error handling.
- Never trust frontend role, `user_id`, or `business_id` without authenticated context and ownership checks.

## API Standards
- Base path: `/api/v1`.
- Response envelope:
  - Success: `{ "data": ..., "meta": ... }`.
  - Error: `{ "error": { "code": "...", "message": "...", "details": ... } }`.
- Authentication: Bearer token or secure cookie strategy to be finalized.
- Validation: DTOs with class-validator/Zod-compatible shared schemas where appropriate.
- Pagination: cursor-based for feeds and offset/page for admin tables if needed.
- Sorting/filtering: explicit query params with whitelisted fields.
- Swagger: generated for every controller and DTO.

## Auth Module: `/auth`
- `POST /auth/register`
  - Public.
  - Creates base user account.
  - Validates email/mobile, password, confirm password.
- `POST /auth/login`
  - Public.
  - Accepts email/mobile identifier and password.
  - Rate-limited.
- `POST /auth/logout`
  - Authenticated.
  - Revokes current refresh/session token.
- `POST /auth/refresh`
  - Authenticated by refresh token.
  - Rotates access token/session.
- `GET /auth/me`
  - Authenticated.
  - Returns user, role, profiles, active business context.
- `POST /auth/forgot-password`
  - Public, rate-limited.
  - Does not reveal whether account exists.
- `POST /auth/reset-password`
  - Public with token.
  - Validates token hash and password.
- `GET /auth/oauth/google/start`, `GET /auth/oauth/google/callback`
  - Google OAuth.
- `GET /auth/oauth/facebook/start`, `GET /auth/oauth/facebook/callback`
  - Facebook OAuth.
- `POST /auth/select-role`
  - Authenticated.
  - Allows role selection only during valid onboarding state.

## Users and Profiles

### `/users`
- `GET /users/me`
  - Authenticated.
  - Returns current user account.
- `PATCH /users/me`
  - Authenticated.
  - Updates safe fields only.
- `DELETE /users/me`
  - Authenticated.
  - Starts account deletion workflow.

### `/consumers`
- `GET /consumers/me`
  - Consumer only.
- `PATCH /consumers/me`
  - Consumer only.
- `GET /consumers/me/orders`
  - Consumer only.
- `GET /consumers/me/following`
  - Consumer only.
- `GET /consumers/me/workshop-bookings`
  - Consumer only.

### `/business-owners`
- `GET /business-owners/me`
  - Business owner only.
- `PATCH /business-owners/me`
  - Business owner only.
- `GET /business-owners/me/businesses`
  - Business owner only.

## Business Module: `/businesses`
- `GET /businesses`
  - Public.
  - Filters: city, category, query, plan capability, coordinates radius.
- `GET /businesses/:businessId`
  - Public for active businesses.
  - Returns capability-gated public data.
- `POST /businesses`
  - Business owner only.
  - Creates onboarding business profile.
- `PATCH /businesses/:businessId`
  - Business owner of business or admin.
- `DELETE /businesses/:businessId`
  - Owner soft delete or admin disable depending policy.
- `GET /businesses/:businessId/products`
  - Public if business has Webshop or higher.
- `GET /businesses/:businessId/workshops`
  - Public if business has Workshop.
- `GET /businesses/:businessId/reviews`
  - Public if business has Workshop.
- `GET /businesses/:businessId/followers`
  - Owner/admin only, Workshop plan.

Validation:
- KVK, phone, country NL, coordinates bounds, required address fields, unique slug.

## Categories
- `GET /business-categories`
  - Public.
- `GET /product-categories`
  - Public.
- `POST/PATCH/DELETE /admin/business-categories`, `/admin/product-categories`
  - Admin only.

## Subscription Module: `/subscriptions`
- `GET /subscription-plans`
  - Public/authenticated.
  - Returns active plans and feature matrix.
- `POST /businesses/:businessId/subscriptions/checkout`
  - Business owner of business.
  - Creates provider subscription checkout.
- `GET /businesses/:businessId/subscription`
  - Owner/admin.
- `POST /businesses/:businessId/subscription/cancel`
  - Owner/admin.
- `POST /webhooks/payments/subscriptions`
  - Provider webhook.
  - Raw body signature validation.
  - Idempotent.

## Product Module: `/products`
- `GET /products`
  - Public.
  - Filters: query, category, business, city, price, rating.
- `GET /products/:productId`
  - Public if product/business active and business has Webshop or higher.
- `POST /businesses/:businessId/products`
  - Owner/admin.
  - Requires Webshop or higher.
- `PATCH /products/:productId`
  - Owning business owner/admin.
- `DELETE /products/:productId`
  - Owning business owner/admin; soft delete.
- `POST /products/:productId/images`
  - Owner/admin.
  - Enforces max 3 images.
- `DELETE /products/:productId/images/:imageId`
  - Owner/admin.
- `POST /products/:productId/variants`
  - Owner/admin.
- `PATCH /products/:productId/variants/:variantId`
  - Owner/admin.
- `DELETE /products/:productId/variants/:variantId`
  - Owner/admin.

Validation:
- Price cents >= 0, stock >= 0, max 3 images, MIME/size, valid category, valid color hex, allowed sizes.

## Cart and Orders
- `GET /cart`
  - Consumer only.
- `POST /cart/items`
  - Consumer only.
  - Validates product availability and stock.
- `PATCH /cart/items/:itemId`
  - Consumer only.
- `DELETE /cart/items/:itemId`
  - Consumer only.
- `POST /orders`
  - Consumer only.
  - Creates pending order from cart.
- `GET /orders/:orderId`
  - Consumer owner, business owner of order business, or admin.
- `GET /orders`
  - Consumer own orders or owner business orders based query context.
- `PATCH /orders/:orderId/status`
  - Business owner/admin.
  - Validates allowed transitions.
- `POST /orders/:orderId/cancel`
  - Consumer/owner/admin according cancellation policy.

## Consumer Addresses: `/addresses`
- `GET /addresses`
  - Consumer only.
- `POST /addresses`
  - Consumer only.
- `PATCH /addresses/:addressId`
  - Address owner only.
- `DELETE /addresses/:addressId`
  - Address owner only.
- `POST /addresses/:addressId/default`
  - Address owner only.

## Payments Module: `/payments`
- `POST /payments/orders/:orderId/checkout`
  - Consumer owner.
  - Creates product order payment session.
- `POST /payments/workshop-bookings/:bookingId/checkout`
  - Consumer owner.
- `GET /payments/:paymentId`
  - Payment owner, business owner where relevant, or admin.
- `POST /webhooks/payments`
  - Provider webhook for order/workshop payments.
  - Signature and idempotency required.
- `POST /webhooks/payments/subscriptions`
  - Provider webhook for recurring subscriptions.

## Payouts Module: `/payouts`
- `GET /businesses/:businessId/ledger`
  - Owner/admin.
- `GET /businesses/:businessId/payouts`
  - Owner/admin.
- `POST /businesses/:businessId/payout-account`
  - Owner/admin.
- `POST /businesses/:businessId/payouts`
  - Owner/admin creates withdrawal request.
- `POST /admin/payouts/:payoutId/approve`
  - Admin only.
- `POST /admin/payouts/:payoutId/reject`
  - Admin only.
- `POST /admin/payouts/:payoutId/mark-paid`
  - Admin only.

## Shoproutes and Maps
- `GET /shop-routes`
  - Public.
  - Filters by city/category/location.
- `GET /shop-routes/:routeId`
  - Public.
- `POST /shop-routes`
  - Business owner/admin, requires Shoproutes or Workshop.
- `PATCH /shop-routes/:routeId`
  - Creator/admin.
- `DELETE /shop-routes/:routeId`
  - Creator/admin.
- `POST /shop-routes/:routeId/stops`
  - Creator/admin.
- `PATCH /shop-routes/:routeId/stops/:stopId`
  - Creator/admin.
- `DELETE /shop-routes/:routeId/stops/:stopId`
  - Creator/admin.
- `GET /maps/businesses`
  - Public.
  - Returns map markers for route-eligible businesses.

## Workshops
- `GET /workshops`
  - Public.
- `GET /workshops/:workshopId`
  - Public if business Workshop subscription active.
- `POST /businesses/:businessId/workshops`
  - Owner/admin, requires Workshop.
- `PATCH /workshops/:workshopId`
  - Owner/admin.
- `DELETE /workshops/:workshopId`
  - Owner/admin, soft delete/cancel.
- `POST /workshops/:workshopId/bookings`
  - Consumer only.
  - Validates capacity transactionally.
- `GET /workshop-bookings/:bookingId`
  - Booking consumer, business owner, or admin.
- `PATCH /workshop-bookings/:bookingId/status`
  - Owner/admin according rules.

## Followers, Reviews, Comments
- `POST /businesses/:businessId/follow`
  - Consumer only, requires business Workshop plan if followers are Workshop-gated.
- `DELETE /businesses/:businessId/follow`
  - Consumer only.
- `GET /businesses/:businessId/followers/count`
  - Public if enabled.
- `POST /reviews`
  - Consumer only.
  - Requires eligible target and business Workshop plan.
- `GET /reviews`
  - Public filtered list.
- `PATCH /reviews/:reviewId`
  - Review author before moderation lock or admin.
- `DELETE /reviews/:reviewId`
  - Author/admin or business moderation hide.
- `POST /reviews/:reviewId/images`
  - Review author.
- `POST /comments`
  - Consumer only, requires Workshop plan.
- `GET /comments`
  - Public for eligible target.
- `DELETE /comments/:commentId`
  - Author, business owner for own content, or admin.

## Media Module: `/media`
- `POST /media/upload-url`
  - Authenticated.
  - Returns signed upload URL or direct upload policy.
- `POST /media/complete`
  - Authenticated.
  - Creates `media_assets` metadata after validation.
- `DELETE /media/:assetId`
  - Owner/admin and entity ownership check.

Validation:
- MIME allowlist, max file size, image dimensions, storage path ownership, virus scanning if available.

## Notifications
- `GET /notifications`
  - Authenticated.
- `POST /notifications/:notificationId/read`
  - Owner only.
- `POST /notifications/read-all`
  - Owner only.

## Admin Module: `/admin`
- `GET /admin/overview`
  - Super admin only.
- `GET /admin/users`, `PATCH /admin/users/:userId`
  - Super admin.
- `GET /admin/businesses`, `PATCH /admin/businesses/:businessId/status`
  - Super admin.
- `GET /admin/products`, `PATCH /admin/products/:productId/moderation`
  - Super admin.
- `GET /admin/orders`
  - Super admin.
- `GET /admin/reviews`, `PATCH /admin/reviews/:reviewId/moderation`
  - Super admin.
- `GET /admin/reports`, `PATCH /admin/reports/:reportId`
  - Super admin.
- `GET /admin/payments`
  - Super admin.
- `GET /admin/payouts`
  - Super admin.
- `GET/POST/PATCH /admin/subscription-plans`
  - Super admin.

## Assumptions
- REST is preferred over GraphQL for MVP clarity and mobile reuse.
- OpenAPI will be generated from Nest decorators and used by frontend API client generation.
- Webhooks will be mounted outside normal auth but protected by provider signature verification.

## Unresolved Questions
- Exact auth transport: HTTP-only cookies vs access/refresh tokens in mobile-ready flow.
- Whether product checkout can span multiple businesses.
- Which payment provider-specific webhook event names need to be supported.
- Admin table filtering/sorting requirements.
- Whether business approval is required before subscriptions activate public visibility.

## Dependencies
- `06-DATABASE-SCHEMA.md` for persistence.
- `08-AUTH-RBAC.md` for guards and permission matrix.
- `09-SUBSCRIPTION-SPEC.md` for feature enforcement.
- `10-PAYMENT-SPEC.md` for provider and webhook behavior.
- `18-TESTING-SPEC.md` for API test coverage.
