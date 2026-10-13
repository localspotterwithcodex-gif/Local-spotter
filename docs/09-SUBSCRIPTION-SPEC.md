# Subscription Specification

## Purpose
This document defines the business subscription plans, feature matrix, backend enforcement rules, and UI behavior.

## Confirmed Requirements
- Business owners subscribe to one of three plans: Webshop, Shoproutes, Workshop.
- Pricing is database-driven:
  - Webshop: EUR 50/month.
  - Shoproutes: EUR 100/month.
  - Workshop: EUR 150/month.
- Currency: EUR.
- Subscriptions support automatic monthly renewal.
- Provider subscription status must be synchronized by webhooks.
- Feature access must be enforced by backend, not just hidden in the frontend.

## Plan Hierarchy
- `WEBSHOP` is the base plan.
- `SHOPROUTES` includes all Webshop features.
- `WORKSHOP` includes all Shoproutes and Webshop features.

## Feature Matrix

| Feature | Webshop | Shoproutes | Workshop |
| --- | --- | --- | --- |
| Business profile | Yes | Yes | Yes |
| Product listing | Yes | Yes | Yes |
| Product images | Yes | Yes | Yes |
| Product details | Yes | Yes | Yes |
| Inventory | Yes | Yes | Yes |
| Product purchasing | Yes | Yes | Yes |
| Shop location storage | Limited onboarding | Yes | Yes |
| Map presence | No | Yes | Yes |
| GPS coordinates | Required for route visibility | Yes | Yes |
| Directions | No | Yes | Yes |
| Shop route participation | No | Yes | Yes |
| Shop route creation | No | Yes | Yes |
| Workshops | No | No | Yes |
| Workshop booking | No | No | Yes |
| Followers | No | No | Yes |
| Reviews | No | No | Yes |
| Ratings | No | No | Yes |
| Comments | No | No | Yes |
| Review images | No | No | Yes |
| Product reviews | No | No | Yes |

## Backend Enforcement
- Every protected feature must call a subscription capability service before mutation and before public exposure.
- Feature checks must use:
  - Business active status.
  - Active subscription status.
  - Current period validity.
  - Plan feature configuration.
  - Entity ownership where relevant.

Examples:
- `POST /businesses/:businessId/products` requires `products.manage`.
- `GET /businesses/:businessId/products` requires `products.public_listing`.
- `POST /reviews` requires target business feature `reviews.enabled`.
- `POST /shop-routes` requires `shoproutes.manage`.
- `POST /businesses/:businessId/workshops` requires `workshops.manage`.
- `POST /businesses/:businessId/follow` requires `followers.enabled` if followers are Workshop-gated.

## Subscription Status Behavior
- `ACTIVE`: all plan features available.
- `TRIALING`: features available if trial is supported.
- `PAST_DUE`: owner sees billing warnings; public feature behavior needs client confirmation.
- `INCOMPLETE`: onboarding can resume payment, public features disabled.
- `CANCELLED`: features remain until `current_period_end` if `cancel_at_period_end` true; otherwise disabled.
- `EXPIRED`: public subscription-gated features disabled.

## Subscription UI From Figma
- Verified plan selection screens:
  - Buyer: `476:852`, `476:1855`, `476:1955`, `476:2055`.
  - Seller: `383:2237`, `476:3466`, `476:3583`, `476:3748`, `383:2792`, `383:2877`, `383:2962`, `476:3865`, `491:1353`.
- Plan cards show Webshop, Shoproutes, Workshop and prices.
- NEXT button advances to payment.
- Visual card colors include white surfaces, primary pink, magenta highlight, and illustrative abstract assets.

## Data Model
- `subscription_plans` stores name, slug, description, monthly price, currency, feature config, active status.
- `business_subscriptions` stores provider customer/subscription IDs, status, current period, cancellation, auto-renewal.
- Payment records for subscription charges use `payment_purpose = BUSINESS_SUBSCRIPTION`.

## Admin Management
- Admin can create/update/deactivate subscription plans.
- Existing subscription migrations need explicit policy before changing prices/features.
- Admin can view active subscriptions and payment status.
- Admin should not manually mark subscriptions active without audit log.

## Assumptions
- Subscription is per business, not per owner account.
- A business has at most one active subscription.
- Plan feature config is a database JSON object, but capabilities are represented in backend code with typed constants.
- Workshop plan is required for both business reviews and product reviews because requirements place community features there.

## Unresolved Questions
- Should `PAST_DUE` immediately disable public features or allow a grace period?
- Should business owners be able to downgrade mid-cycle?
- Should upgrade take effect immediately with prorated payment?
- Should prices include VAT, and how should invoices show VAT?
- Should subscription plans have a free trial?
- Are subscriptions tied to one business or owner-wide if one owner has multiple shops?

## Dependencies
- `06-DATABASE-SCHEMA.md` for subscription tables.
- `07-API-SPEC.md` for checkout and feature endpoints.
- `08-AUTH-RBAC.md` for plan guards.
- `10-PAYMENT-SPEC.md` for recurring provider payments.
- `04-PAGE-SCREEN-SPEC.md` for onboarding routes.
