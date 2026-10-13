# Backend Phase F — Workshops + Workshop Bookings Handover

## Overview

Phase F implements the **Workshops and Workshop Bookings** module for **LocalSpotter.nl**, enabling local business owners with active `WORKSHOP` subscriptions to publish experiential workshops, manage capacities and schedules, and allowing authenticated consumers to discover, book seats with price snapshots, and cancel bookings with atomic capacity restoration.

---

## Models & Schema Changes

### Modified: `WorkshopStatus` Enum
Added `FULL` status to indicate workshops with no remaining capacity.

```prisma
enum WorkshopStatus {
  DRAFT
  PUBLISHED
  FULL
  CANCELLED
  COMPLETED
}
```

### Modified: `Workshop` Model
- Added `imageUrl String? @map("image_url")` — allows direct image links alongside existing `MediaAsset` relations.

### Modified: `WorkshopBooking` Model
- Added `unitPrice Decimal @default(0) @map("unit_price") @db.Decimal(10, 2)` — immutable unit price snapshot per booking.

---

## Entitlement Gating

All workshop operations are gated by the `SubscriptionEntitlementService.hasFeature(businessId, 'WORKSHOPS')`. Only businesses with an active `WORKSHOP` subscription plan can:
- Create workshops
- Update workshops
- Publish workshops
- Accept bookings

Consumers with `WEBSHOP` or `SHOPROUTES` subscriptions are **not** entitled to workshops.

---

## Capacity Concurrency Protection

Seat reservation uses **atomic database updates inside transactions** to prevent overbooking:

```sql
UPDATE "workshops"
SET "booked_count" = "booked_count" + ${quantity}
WHERE "id" = ${workshopId}::uuid AND ("capacity" - "booked_count") >= ${quantity}
```

If `rowsAffected === 0`, the booking is rejected with `409 Conflict` (`Niet genoeg beschikbare plaatsen voor deze workshop.`). This guarantees concurrent booking requests never exceed workshop capacity.

Booking cancellation uses:
```sql
UPDATE "workshops"
SET "booked_count" = GREATEST("booked_count" - ${quantity}, 0)
WHERE "id" = ${workshopId}::uuid
```

---

## Price Snapshotting

When a consumer books a workshop:
- `unitPrice` is snapshotted from `workshop.price` at booking time
- `totalAmount = unitPrice * quantity`
- These values are immutable in the booking record

Payment processing (Stripe, iDEAL) is reserved for **Phase I**.

---

## RBAC & Authorization

| Action | Consumer | Business Owner | Super Admin |
|--------|----------|----------------|-------------|
| Create workshop | ❌ | ✅ (WORKSHOP plan) | ✅ |
| View own workshop | ✅ | ✅ | ✅ |
| View other draft | ❌ | ❌ | ✅ |
| Update workshop | ❌ | ✅ (owner only) | ✅ |
| Cancel workshop | ❌ | ✅ (owner only) | ✅ |
| Book workshop | ✅ | ❌ | ❌ |
| View own bookings | ✅ | ❌ | ✅ |
| View business bookings | ❌ | ✅ (owner) | ✅ |
| Cancel booking | ✅ (own) | ✅ (own workshop) | ✅ |

---

## Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workshops` | Public workshop catalog with filters |
| `GET` | `/workshops/:workshopId` | Public workshop details |

### Business Owner / Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/workshops` | Create workshop |
| `GET` | `/businesses/:businessId/workshops` | List business workshops |
| `PATCH` | `/workshops/:workshopId` | Update workshop |
| `DELETE` | `/workshops/:workshopId` | Cancel workshop |
| `POST` | `/workshops/:workshopId/cancel` | Cancel workshop (alt) |
| `GET` | `/businesses/:businessId/workshop-bookings` | List business bookings |

### Consumer
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/workshops/:workshopId/bookings` | Create booking |
| `GET` | `/workshops/bookings` | List own bookings |
| `GET` | `/workshops/bookings/:bookingId` | View booking |
| `POST` | `/workshops/bookings/:bookingId/cancel` | Cancel booking |

---

## DTOs

| File | Purpose |
|------|---------|
| `create-workshop.dto.ts` | Workshop creation validation (title, price, capacity, dates, etc.) |
| `update-workshop.dto.ts` | Partial updates with capacity >= bookedCount validation |
| `query-workshop.dto.ts` | Public catalog filters (page, limit, city, search, status) |
| `create-booking.dto.ts` | Booking quantity validation (1-20) |
| `query-booking.dto.ts` | Booking list filters (page, limit, status, workshopId) |

---

## File Structure

```
backend/src/workshops/
├── workshops.module.ts
├── workshops.controller.ts
├── workshops.service.ts
├── workshops.service.spec.ts
└── dto/
    ├── create-workshop.dto.ts
    ├── update-workshop.dto.ts
    ├── query-workshop.dto.ts
    ├── create-booking.dto.ts
    └── query-booking.dto.ts
```

---

## Test Commands

```bash
# Type checking
npm run typecheck

# Prisma validation
npx prisma validate

# Unit tests
npm test

# Production build
npm run build
```

---

## Known Limitations

1. **Payments not implemented** — Bookings record `status: CONFIRMED` with price snapshots. Payment processing (Stripe, iDEAL) and refunds are reserved for **Phase I**.
2. **No email notifications** — Booking confirmation and cancellation emails are not implemented.
3. **No image upload flow** — `imageUrl` is a direct string link; image upload infrastructure is not part of Phase F.
4. **Reviews not implemented** — Workshop reviews and ratings are planned for a future phase.
5. **No real-time seat updates** — Frontend must poll or use WebSocket for live capacity updates.

---

## Verification Results

Run the following commands to verify:

```bash
cd D:\LocalSpotter\backend
npx prisma validate
npm run typecheck
npm test
npm run build
```
