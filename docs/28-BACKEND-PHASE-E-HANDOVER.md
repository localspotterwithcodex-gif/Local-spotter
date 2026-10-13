# LocalSpotter — Backend Phase E Handover Report

**Document ID**: 28-BACKEND-PHASE-E-HANDOVER  
**Version**: 1.0 (Phase E Completed)  
**Last Updated**: 2026-09-04  
**Status**: Completed — Cart, Orders, Order Items, Status Lifecycle & Concurrency-Safe Stock Implemented & Validated  

---

## 1. Executive Summary

This document confirms the completion and validation of **Backend Phase E** for the LocalSpotter.nl API. The backend now provides a robust commerce and ordering foundation, comprising:
- Temporary consumer shopping carts with single-business boundary enforcement.
- Permanent, immutable orders and order items with price and variant snapshots.
- Transactional checkout processing (`prisma.$transaction`) with atomic stock deduction and race-condition prevention.
- Controlled order status transitions (`PENDING`, `CONFIRMED`/`ACCEPTED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `REJECTED`) with audit logging (`OrderStatusEvent`).
- Stock restoration upon order cancellation or rejection.
- Multi-tenant RBAC validation ensuring strict consumer and business owner isolation.
- Complete OpenAPI/Swagger documentation.
- Automated unit test suites covering cart, checkout, stock protection, authorization, and lifecycle state machines.

> **Payment Integration Notice**:  
> Payment integration (Stripe, iDEAL, PayPal, Tikkie, payment webhooks, refunds) is **intentionally not implemented in Phase E** and is reserved for **Phase I (Payments & Webhooks)**.

---

## 2. Database Changes & Schema Integrity

### Modified Models (`prisma/schema.prisma`):
- **`Order`**:
  - Added optional geospatial coordinates: `latitude Decimal? @db.Decimal(9, 6)` and `longitude Decimal? @db.Decimal(9, 6)` alongside existing snapshot fields (`deliveryStreet`, `deliveryHouseNumber`, `deliveryCity`, `deliveryPostalCode`, `deliveryCountry`, `deliveryNotes`, `deliveryAddressSnapshot`).
- **`Cart` & `CartItem`**:
  - Maintained 1:1 relationship with `ConsumerProfile` (`consumerProfileId` unique).
  - Maintained `(cartId, productId, variantId)` compound uniqueness.
- **`OrderItem`**:
  - Maintained snapshot fields: `productNameSnapshot`, `variantSnapshot`, `unitPrice`, `quantity`, `subtotalPrice`.
- **`OrderStatusEvent`**:
  - Audit trail logging each transition (`fromStatus`, `toStatus`, `changedByUserId`, `reason`).

---

## 3. Cart Architecture & Business Rules

1. **Consumer Ownership**:
   - The cart is strictly tied to the authenticated consumer's `ConsumerProfile` derived from the JWT bearer token. Never trusted from request payloads.
2. **Single-Business-Per-Cart Constraint**:
   - A cart can only contain items from one business at a time. Attempting to add an item from a different business yields a `409 Conflict` error, instructing the customer to empty the cart first.
3. **Entitlement Validation**:
   - When adding an item, the owning business must hold an active subscription with the `PRODUCTS` feature via `SubscriptionEntitlementService.hasFeature(businessId, 'PRODUCTS')`.
4. **Temporary Nature**:
   - Stock is NOT deducted upon adding to the cart. Stock is only verified against current inventory.
   - When an item already exists in the cart, the quantity is incremented rather than duplicated.
5. **Clean Unlinking**:
   - Removing the final item or calling `DELETE /api/v1/cart` resets the cart's `businessId` to `null`.

---

## 4. Order Architecture & Snapshot Immutability

### Historical Snapshot Integrity:
Once an order is placed, the order becomes the permanent historical record:
- **`productNameSnapshot`**: Preserves the exact product title at the moment of purchase.
- **`variantSnapshot`**: Preserves the exact variant combination (e.g. "L - Zwart") at purchase time.
- **`unitPrice`**: Captures the exact unit price (variant override or base product price).
- **`subtotalPrice`**: Captures `unitPrice * quantity`.
- **`deliveryAddressSnapshot`**: Preserves the complete delivery address entered by the customer.

Subsequent edits, price changes, variant removals, or product soft-deletions by the merchant will **never** alter historical order data or totals.

---

## 5. Transactional Checkout & Concurrency Safety

Order placement (`POST /api/v1/orders`) executes inside an atomic `prisma.$transaction`:

```text
BEGIN TRANSACTION
  1. Fetch consumer profile and lock/read cart with products & variants.
  2. Validate cart is not empty.
  3. Validate business exists, is ACTIVE, and has PRODUCTS entitlement.
  4. For each cart item:
     - Validate product and variant are active and not deleted.
     - Atomic stock deduction in database:
       UPDATE "product_variants" SET "stock" = "stock" - qty WHERE "id" = variantId AND "stock" >= qty
       UPDATE "products" SET "stock" = "stock" - qty WHERE "id" = productId AND "stock" >= qty
     - If rows affected === 0:
       ROLLBACK TRANSACTION with 409 Conflict (insufficient inventory).
  5. Calculate immutable price snapshots and order totals.
  6. Insert "orders" record with unique order number (e.g. LS-MMDD-XXXX).
  7. Insert "order_items" records with snapshots.
  8. Insert "order_status_events" record (from: null, to: PENDING).
  9. Delete cart items and unlink cart from business.
COMMIT TRANSACTION
```

If any step fails, the entire transaction rolls back cleanly: no phantom orders, no leaked stock deductions, and the customer's cart remains completely intact.

---

## 6. Order Status Lifecycle & Controlled Transitions

Status transitions are governed by a finite state machine:

```text
PENDING
   ├── CONFIRMED (or ACCEPTED)
   ├── REJECTED
   └── CANCELLED

CONFIRMED
   ├── PREPARING
   └── CANCELLED

PREPARING
   ├── READY
   └── CANCELLED

READY
   ├── OUT_FOR_DELIVERY
   ├── DELIVERED
   └── CANCELLED

OUT_FOR_DELIVERY
   └── DELIVERED
```

- **Terminal States**: `DELIVERED`, `CANCELLED`, `REJECTED` cannot transition further.
- **Stock Restoration**: Transitioning to `CANCELLED` or `REJECTED` automatically restores product and variant stock back into inventory inside a database transaction.
- **Consumer Cancellation Window**: Consumers can cancel an order only while it is in `PENDING` or `CONFIRMED` status. Once `PREPARING` begins, cancellation must be coordinated with the merchant.

---

## 7. API Endpoints Reference

### Cart Endpoints (`/api/v1/cart`)
| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/cart` | `CONSUMER` | Get current cart with business, items, unit prices, and subtotal |
| `POST` | `/api/v1/cart/items` | `CONSUMER` | Add item or increment quantity; enforces stock & 1-business rule |
| `PATCH` | `/api/v1/cart/items/:itemId` | `CONSUMER` | Update item quantity with stock validation |
| `DELETE` | `/api/v1/cart/items/:itemId` | `CONSUMER` | Remove single item from cart |
| `DELETE` | `/api/v1/cart` | `CONSUMER` | Clear all items from cart and reset business |

### Order Endpoints (`/api/v1/orders`)
| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/orders` | `CONSUMER` | Transactional checkout from cart into order |
| `GET` | `/api/v1/orders` | `CONSUMER`, `SUPER_ADMIN` | Paginated list of consumer's own orders |
| `GET` | `/api/v1/orders/:orderId` | `CONSUMER`, `OWNER`, `ADMIN` | Get order details with snapshots and items |
| `GET` | `/api/v1/businesses/:businessId/orders` | `BUSINESS_OWNER`, `SUPER_ADMIN` | Paginated list of orders received by owned store |
| `PATCH` | `/api/v1/orders/:orderId/status` | `BUSINESS_OWNER`, `SUPER_ADMIN` | Transition order status (PENDING, CONFIRMED/ACCEPTED, PREPARING, etc.) |
| `POST` | `/api/v1/orders/:orderId/cancel` | `CONSUMER`, `OWNER`, `ADMIN` | Cancel order with reason and restore stock |

---

## 8. Multi-Tenant Authorization Matrix

| Operation | Consumer | Business Owner (Store) | Business Owner (Other) | Super Admin |
|---|---|---|---|---|
| Manage Cart | Own Cart only | Denied | Denied | Denied |
| Create Order | Yes (from cart) | Denied | Denied | Denied |
| View Order | Own orders only | Own store orders | Forbidden (403) | All orders |
| Update Status | Forbidden (403) | Own store orders | Forbidden (403) | All orders |
| Cancel Order | Pending/Confirmed only | Yes | Forbidden (403) | Yes |

---

## 9. Validation & Verification Results

### A. Prisma Schema Validation
```bash
npx prisma validate
```
**Result**: Valid 🚀

### B. TypeScript Compilation
```bash
npm run typecheck
```
**Result**: 0 errors (`tsc --noEmit` passed).

### C. Production Build
```bash
npm run build
```
**Result**: Successfully compiled with `nest build` to `dist/`.

### D. Automated Unit Tests
```bash
npm test
```
**Result**:
```text
PASS src/products/products.service.spec.ts (7 tests)
PASS src/cart/cart.service.spec.ts (8 tests)
PASS src/orders/orders.service.spec.ts (14 tests)

Test Suites: 3 passed, 3 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        12.374 s
```

---

## 10. Known Limitations & Scope Boundaries

1. **Payment Integration**:
   - Payments are intentionally deferred to **Phase I**. Order records currently default to `paymentStatus: PENDING`.
2. **Delivery Providers / Driver App**:
   - Delivery is merchant-managed in MVP. Real-time driver dispatching and tracking belong to Phase 2.
3. **Coupons / Taxes / Platform Commissions**:
   - No tax calculation or discount engines are implemented, adhering strictly to the MVP commerce specification.
4. **Order Returns**:
   - Per `docs/11-COMMERCE-SPEC.md`, product returns are not supported in MVP.

---

## 11. Next Phase

**Phase F**: Workshops + Workshop Bookings (`/api/v1/workshops` & `/api/v1/workshops/:id/bookings`).
