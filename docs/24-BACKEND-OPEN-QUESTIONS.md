# LocalSpotter — Backend Open Questions & Unresolved Decisions

**Document ID**: 24-BACKEND-OPEN-QUESTIONS  
**Version**: 1.0  
**Last Updated**: 2026-09-03  
**Status**: Active Tracking  

---

## Purpose

This document tracks unresolved business, legal, financial, or operational questions identified during backend implementation. To avoid making unsafe assumptions about business rules, questions are documented here while keeping backend database schemas and payment abstractions flexible enough to support future business decisions.

---

## Open Questions Log

### 1. Platform Commission & Order Payout Distribution

- **Context**: `docs/10-PAYMENT-SPEC.md` and `docs/15-ADMIN-SPEC.md` define payout management where business owners request withdrawals (`PENDING` → `APPROVED` → `PAID`) approved by Super Admins.
- **Unresolved Question**: What exact percentage or fixed commission fee does LocalSpotter retain from consumer order purchases or workshop bookings before crediting the business owner's balance?
- **Backend Architecture Decision**: The database schema tracks gross transaction amounts, order item snapshots, and seller balance ledgers. Commission percentage is configurable via environment variables (`PLATFORM_COMMISSION_PERCENTAGE=0`) so it can be changed without database schema alterations.

---

### 2. Refund & Return Workflow

- **Context**: `PROMPT.md` explicitly specifies *"There is no product return option"*. However, `docs/10-PAYMENT-SPEC.md` includes payment statuses `REFUNDED` and `PARTIALLY_REFUNDED`.
- **Unresolved Question**: Under what conditions (e.g. non-delivery, damaged goods, business cancellation of order/workshop) can a refund be initiated by a Super Admin or Business Owner, and does it auto-trigger payment provider refund webhooks (iDEAL / PayPal)?
- **Backend Architecture Decision**: Order and Payment models include `CANCELLED` and `REFUNDED` status flags. Refund logic is scoped to admin approval endpoints without auto-issuing refunds unless confirmed by payment provider webhooks.

---

### 3. Subscription Grace Period & Past-Due Restrictions

- **Context**: `docs/09-SUBSCRIPTION-SPEC.md` specifies auto-renewing subscriptions (€50/m Webshop, €100/m Shoproutes, €150/m Workshop).
- **Unresolved Question**: When a subscription payment fails, how many days grace period (`PAST_DUE`) is granted before public visibility (products, workshops, shoproutes) is suspended?
- **Backend Architecture Decision**: `subscription_status` includes `PAST_DUE` and `EXPIRED`. A configurable grace period (default 7 days) allows business owners to update payment details before public feed visibility queries filter out the business.

---

### 4. Shipping & Local Delivery Cost Calculation

- **Context**: `docs/11-COMMERCE-SPEC.md` includes delivery fee fields on order checkout.
- **Unresolved Question**: Is shipping a flat fee per order, calculated per business owner, or distance-based using GPS coordinates?
- **Backend Architecture Decision**: `orders` table includes `delivery_fee` column snapshotting the delivery fee supplied during checkout validation. Flat-rate default is defined in service configuration.
