# Local Spotter User Flows

## Purpose
This document defines the MVP user journeys across consumer, business owner, and admin roles. It links UI screens, backend modules, and permission checks.

## Confirmed Requirements
- Consumers discover businesses/products/routes/workshops, purchase products, book workshops, follow shops, and review/comment when permitted.
- Business owners register, create business profiles, subscribe, manage products/orders/routes/workshops, and request payouts.
- Admins moderate and manage platform entities, payments, subscriptions, and payouts.
- Role and feature access must be validated by the backend.

## Consumer Flows

### Consumer Registration and Login
1. User opens `/signup`.
2. User enters name, email/mobile, password, confirm password, or uses Google/Facebook OAuth.
3. Backend creates user and role candidate.
4. User selects Consumer.
5. Backend persists role after validation.
6. User lands on discovery home.

Failure states:
- Duplicate email/mobile.
- Weak password.
- OAuth account already linked.
- Backend role validation failure.

### Product Discovery to Purchase
1. Consumer opens discovery or `/products`.
2. Consumer searches/filter by text/category/location.
3. Consumer opens product detail.
4. Consumer selects variant size/color where applicable.
5. Consumer selects quantity.
6. Backend validates product active status, business active status, Webshop-or-higher subscription, stock, and variant availability.
7. Consumer adds to cart.
8. Consumer selects/creates delivery address.
9. Consumer chooses payment method.
10. Backend creates pending order and payment session.
11. Payment webhook confirms payment.
12. Backend confirms order, snapshots price/variant data, decrements stock transactionally, and updates business ledger.
13. Consumer views order status.

Failure states:
- Subscription no longer active.
- Insufficient stock.
- Payment failed/cancelled/expired.
- Address validation failure.
- Business owner rejects/cancels order.

### Business Discovery and Follow
1. Consumer opens `/businesses` or a discovery section.
2. Consumer opens a business profile.
3. Backend returns public business data based on subscription.
4. Consumer follows/unfollows if authenticated and feature is enabled by business subscription.
5. Backend enforces unique `(consumer_id, business_id)`.

Failure states:
- Unauthenticated user prompts login.
- Business plan does not allow followers.
- Disabled/private business.

### Shoproute Flow
1. Consumer opens `/shoproutes`.
2. Consumer searches by city/category.
3. Consumer opens a route or route-enabled shop.
4. Consumer chooses "Start de shoproute".
5. Browser asks for geolocation permission.
6. Backend returns route stops and eligible businesses.
7. Map provider renders markers and directions.

Failure states:
- Location denied.
- No route stops.
- Business downgraded below Shoproutes.
- Map provider unavailable.

### Workshop Booking
1. Consumer opens `/workshops`.
2. Consumer filters/searches.
3. Consumer opens workshop detail.
4. Consumer selects quantity.
5. Backend validates Workshop subscription, active workshop, future date, capacity, and quantity.
6. Payment/reservation is created.
7. Webhook confirms booking if paid.
8. Consumer sees booking in profile.

Failure states:
- Sold out.
- Workshop cancelled.
- Payment failure.
- Business subscription inactive.

### Review and Comment Flow
1. Consumer completes eligible purchase or interaction.
2. Consumer opens product/business review form.
3. Backend verifies eligibility and business Workshop subscription.
4. Consumer submits rating 1-5, title/comment, optional images.
5. Backend validates images and stores metadata.
6. Review is published or enters moderation depending policy.

Failure states:
- Not eligible.
- Duplicate review if policy restricts one per item/order.
- Rating outside 1-5.
- Image upload rejected.

## Business Owner Flows

### Business Owner Onboarding
1. User signs up.
2. User selects Business Owner.
3. User completes store info form.
4. Backend validates KVK, phone, address, GPS fields, and owner role.
5. User selects subscription plan.
6. User pays subscription.
7. Webhook activates subscription.
8. Business becomes active or pending approval depending admin policy.
9. User lands on business profile/dashboard.

Failure states:
- Invalid KVK/phone/address.
- Payment failed.
- Subscription webhook not received.
- Business requires admin approval.

### Product Management
1. Owner opens `/owner/products/new`.
2. Owner fills product fields and uploads up to 3 images.
3. Backend checks owner owns business and active Webshop-or-higher subscription.
4. Backend validates price, stock, category, image count, MIME type, and variants.
5. Product is published or saved as draft depending status.

Failure states:
- More than 3 images.
- Invalid price/stock.
- Owner attempts to edit another business product.
- Subscription inactive or insufficient.

### Order Management
1. Owner opens orders dashboard.
2. Owner views orders for owned businesses only.
3. Owner accepts/processes order.
4. Backend validates allowed status transition.
5. Consumer receives notification.

Failure states:
- Invalid status transition.
- Unauthorized business access.
- Order already terminal.

### Shoproutes Management
1. Owner with Shoproutes or Workshop plan opens shoproute/location flow.
2. Owner adds or updates address/GPS location.
3. Backend validates ownership and plan.
4. Business appears in map discovery.
5. Route stops can be created/ordered if route-building is enabled.

Failure states:
- Webshop-only plan.
- Invalid coordinates.
- Missing address.

### Workshop Management
1. Owner with Workshop plan opens add workshop.
2. Owner enters details, capacity, date/time, location, and image.
3. Backend validates Workshop plan, date/time, capacity, price, ownership.
4. Workshop becomes discoverable.
5. Bookings update capacity.

Failure states:
- Capacity below existing booking count on edit.
- End time before start time.
- Owner lacks Workshop plan.

### Payout Request
1. Owner configures payout details.
2. Owner views available balance.
3. Owner requests withdrawal.
4. Backend checks available balance, minimum amount, and ownership.
5. Admin approves/rejects.
6. Approved payout is marked paid after external payment completion.

Failure states:
- Insufficient available balance.
- Missing payout details.
- Duplicate pending payout.
- Owner attempts to approve own payout.

## Admin Flows

### Payout Approval
1. Admin opens pending payouts.
2. Admin reviews business, ledger, payment references, and amount.
3. Admin approves or rejects with reason.
4. Backend records `approved_by`, timestamps, and audit log.
5. External payout process is initiated or marked manually depending provider.

### Moderation
1. Admin reviews reported products/reviews/comments/businesses.
2. Admin disables, restores, or removes content.
3. Backend records audit log and reason.

### Subscription Plan Management
1. Admin creates/updates plan details and feature flags.
2. Backend prevents breaking active subscriptions without migration policy.
3. Active businesses inherit updated feature configuration according to product decision.

## Cross-Flow Notifications
- Consumer: order confirmed/preparing/delivered, booking confirmation, followed shop updates.
- Business owner: new order, new follower, new review, payout status, subscription status.
- Admin: payout request, moderation event, payment/webhook failure.

## Assumptions
- Account deletion and privacy export will be backend-supported but may be minimal MVP UI.
- One order belongs to one business to simplify owner fulfillment and payouts.
- Reviews require either completed product order or completed workshop booking.
- Admin approval for business visibility is recommended but not confirmed.

## Unresolved Questions
- Multi-business cart: allowed or one business per checkout?
- Exact review eligibility policy.
- Exact payout holding period and fee policy.
- Whether shop routes are platform-created, business-created, consumer-created, or all of the above.
- Whether workshop booking requires immediate payment in MVP.

## Dependencies
- `04-PAGE-SCREEN-SPEC.md` for routes.
- `06-DATABASE-SCHEMA.md` for persistent state.
- `07-API-SPEC.md` for service calls.
- `08-AUTH-RBAC.md` for role checks.
- `09-SUBSCRIPTION-SPEC.md` for feature gates.
- `10-PAYMENT-SPEC.md` and `11-COMMERCE-SPEC.md` for paid flows.
