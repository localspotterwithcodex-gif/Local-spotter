# Payment Specification

## Purpose
This document separates subscription payments, consumer commerce payments, workshop booking payments, webhook handling, payout/withdrawal flow, and payment security.

## Confirmed Requirements
- Required payment methods: iDEAL, PayPal, Tikkie.
- Business owner subscription payments are distinct from consumer product purchase payments.
- Consumers can buy products.
- Consumers can book workshops where applicable.
- Business owners can configure payout/payment details and request withdrawals.
- Withdrawals require admin approval.
- Sensitive payment data such as card numbers and CVV must not be stored.
- Payment webhooks must be idempotent.

## Payment Flow A: Business Subscription
1. Business owner selects Webshop, Shoproutes, or Workshop.
2. Backend creates a provider customer/subscription checkout.
3. Frontend redirects to provider checkout or renders provider-approved component.
4. Provider processes iDEAL/PayPal/Tikkie or supported recurring method.
5. Provider sends webhook.
6. Backend verifies webhook signature and idempotency.
7. Backend updates `payments` and `business_subscriptions`.
8. Active subscription unlocks plan features.

Accounting:
- Revenue belongs to Local Spotter.
- Use `payment_purpose = BUSINESS_SUBSCRIPTION`.
- Link payment to `business_subscription_id` and `business_id`.

## Payment Flow B: Consumer Product Purchase
1. Consumer creates order from cart.
2. Backend snapshots product/variant prices and creates pending order.
3. Backend creates payment session.
4. Consumer completes payment.
5. Webhook marks payment paid.
6. Backend confirms order, decrements stock transactionally, and creates business ledger entry.
7. Business owner fulfills order.
8. Funds become eligible for payout according to holding/fee rules.

Accounting:
- Gross product revenue is linked to business.
- Platform fee must be a separate ledger entry if fees are charged.
- Use `payment_purpose = PRODUCT_ORDER`.

## Payment Flow C: Workshop Booking
1. Consumer chooses workshop and quantity.
2. Backend validates Workshop plan and capacity.
3. Backend creates pending booking and payment session.
4. Webhook confirms payment.
5. Backend confirms booking and increments booked quantity.

Accounting:
- Use `payment_purpose = WORKSHOP_BOOKING`.
- Revenue is associated with business ledger separately from product orders.

## Payout / Withdrawal Flow
1. Business owner configures payout account details.
2. Backend stores provider references and safe metadata only.
3. Business owner requests withdrawal from available balance.
4. Backend checks balance, minimum amount, no duplicate pending payout if policy requires.
5. Admin reviews request.
6. Admin approves or rejects.
7. Approved payout is paid through provider/manual process.
8. Backend marks payout `PAID` after confirmation.

Rules:
- Business owners cannot approve/reject their own payouts.
- Payout status transitions must be audited.
- Ledger entries should prevent double withdrawal.

## Payment Methods
- iDEAL: required for Netherlands market.
- PayPal: required.
- Tikkie: required by requirements.
- Card fields appear in Figma payment forms, but storing or directly processing card data is not allowed.

Provider selection is unresolved. The implementation must select a provider or combination that supports:
- Dutch iDEAL payments.
- PayPal.
- Tikkie or acceptable Tikkie-compatible flow.
- Recurring subscription billing.
- Webhooks.
- Refund support if cancellation/refund policy is required.
- Marketplace/payout support or compatible manual payout process.

## Webhook Handling
- Webhook endpoints must use raw request body for signature verification.
- Store every webhook in `payment_webhook_events`.
- Unique key: `(provider, provider_event_id)`.
- Webhook processing must be idempotent.
- Webhook handler should:
  - Validate signature.
  - Persist event.
  - Lock or transactionally load payment/subscription/order.
  - Apply state transition only if valid.
  - Mark event processed.
  - Return successful HTTP response for duplicate already-processed event.

## Payment Security
- Do not store card numbers, CVV, full IBAN, or provider secrets.
- Store only provider payment IDs, customer IDs, subscription IDs, checkout URLs, safe method names, status, amount, and timestamps.
- Use server-side payment creation only.
- Frontend must never set final amount.
- Backend recalculates all totals from database snapshots.
- Protect webhook secrets in environment variables.
- Payment pages must use HTTPS in production.
- Admin payout actions require Super Admin and audit logs.

## Refund and Cancellation Boundary
- Product returns are explicitly out of scope.
- Cancellation/refund is separate from product returns.
- Refund policy is unresolved and must be confirmed before implementation.
- If refunds are supported:
  - Link refund records to payment/order.
  - Do not restore stock unless cancellation occurs before fulfillment and policy allows.
  - Ledger must reverse business revenue and platform fees appropriately.

## Figma Evidence
- Subscription payment summary screens: `476:2156`, `405:710`.
- Payment form screens: `476:2326`, `409:1004`, `478:4284`.
- Payment method labels verified: `Ideal`, `Paypal`, `Tikkie`.
- Card fields verified in Figma: Card Number, Card Holder, Valid Until, CVV.
- Success screens: `476:2269`, `453:1248`.

## Assumptions
- Product and workshop payments use provider-hosted checkout or provider components; Local Spotter backend never handles raw card data.
- Marketplace payouts may require either provider marketplace support or admin-managed/manual payouts for MVP.
- Subscription billing provider may be different from payout mechanism if necessary.

## Unresolved Questions
- Which payment provider will be used?
- Should Tikkie be a native API flow, payment link, or manual/off-platform instruction?
- Are subscriptions required to auto-renew through iDEAL/Tikkie, or should recurring card/SEPA be supported?
- What is the platform commission on product/workshop sales?
- What payout holding period, minimum amount, and fee apply?
- Is VAT included in listed subscription prices?
- What cancellation/refund rules apply to orders and workshops?

## Dependencies
- `06-DATABASE-SCHEMA.md` for payment, webhook, ledger, and payout tables.
- `07-API-SPEC.md` for payment endpoints.
- `09-SUBSCRIPTION-SPEC.md` for recurring subscription behavior.
- `11-COMMERCE-SPEC.md` for order/payment coupling.
- `16-SECURITY-GDPR.md` for secret handling and data minimization.
