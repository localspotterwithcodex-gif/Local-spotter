# Backend Phase G — Shop Routes + GPS Handover

## Overview

Phase G implements the **Shop Routes and GPS** module for **LocalSpotter.nl**, enabling business owners with active `SHOPROUTES` or `WORKSHOP` subscriptions to create and manage city shopping routes with ordered stops, and allowing consumers to discover public routes and nearby eligible businesses on a map.

---

## Database Changes

### Modified: `ShopRoute` Model
- Added `createdByBusinessId String? @map("created_by_business_id") @db.Uuid` — nullable reference to the business that created the route
- Added `createdByUserId String? @map("created_by_user_id") @db.Uuid` — nullable reference to the user who created the route
- Added `deletedAt DateTime? @map("deleted_at")` — soft delete for archival
- Added `business Business? @relation(fields: [businessId], references: [id])` — route ownership
- Added `createdByBusiness Business? @relation("CreatedByBusiness", fields: [createdByBusinessId], references: [id])` — creator business
- Added `createdByUser User? @relation(fields: [createdByUserId], references: [id])` — creator user
- Added `@@unique([businessId, slug])` — unique constraint
- Changed `businessId` from required to optional (routes can be admin-created)

### Modified: `RouteStop` Model
- Changed `shopRouteId` → `routeId` (`@map("route_id")`) for consistency
- Added `businessId String @map("business_id") @db.Uuid` — reference to LocalSpotter business
- Added `@@unique([routeId, sequence])` — prevents duplicate sequence numbers
- Added `@@unique([routeId, businessId])` — prevents same business in multiple stops
- Added `business Business @relation(fields: [businessId], references: [id])` — business reference

### Modified: `User` Model
- Added `shopRoutes ShopRoute[]` — reverse relation for routes created by user

---

## Subscription Entitlement

All route operations are gated by `SubscriptionEntitlementService.hasFeature(businessId, 'SHOPROUTES')`.

The existing Phase C implementation grants `SHOPROUTES` entitlement to both:
- `SHOPROUTES` plan subscribers
- `WORKSHOP` plan subscribers (which includes all lower-tier features)

**Flow**:
```text
business
   ↓
active subscription
   ↓
SHOPROUTES entitlement (SHOPROUTES or WORKSHOP plan)
   ↓
Shop Routes functionality
```

---

## GPS Coordinate Validation

All route stops enforce strict geographic coordinate validation:

- `latitude`: `-90` to `90` (Decimal(9,6))
- `longitude`: `-180` to `180` (Decimal(9,6))
- Invalid coordinates are rejected with `400 BadRequestException`

Follows existing conventions used by `Business`, `Workshop`, and `Order` models.

---

## Route Stop Business Reference

Each `RouteStop` references a `Business` entity. When adding or updating a stop:
1. Business must exist
2. Business must have `status: ACTIVE`
3. Business must have an active subscription with `SHOPROUTES` entitlement
4. Business cannot already be a stop in the same route (unique `(routeId, businessId)`)

---

## RBAC & Authorization

| Action | Consumer | Business Owner | Super Admin |
|--------|----------|----------------|-------------|
| Create route | ❌ | ✅ (SHOPROUTES entitlement) | ✅ |
| View own route | ❌ | ✅ | ✅ |
| View public route | ✅ | ✅ | ✅ |
| View draft route | ❌ | ✅ (owner) | ✅ |
| Update route | ❌ | ✅ (owner/admin) | ✅ |
| Cancel route | ❌ | ✅ (owner) | ✅ |
| Add stop | ❌ | ✅ (owner) | ✅ |
| Update stop | ❌ | ✅ (owner) | ✅ |
| Remove stop | ❌ | ✅ (owner) | ✅ |
| Reorder stops | ❌ | ✅ (owner) | ✅ |
| Map businesses | ✅ | ✅ | ✅ |

---

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/shop-routes` | Public route catalog with filters |
| `GET` | `/shop-routes/:routeId` | Route details by ID |
| `GET` | `/maps/businesses` | Map markers for eligible businesses |
| `GET` | `/shop-routes/:routeId/stops` | Ordered stops for a route |

### Business Owner / Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/shop-routes` | Create route (requires SHOPROUTES entitlement) |
| `GET` | `/businesses/:businessId/shop-routes` | List business routes |
| `PATCH` | `/shop-routes/:routeId` | Update route |
| `DELETE` | `/shop-routes/:routeId` | Cancel/archive route |
| `POST` | `/shop-routes/:routeId/stops` | Add stop |
| `PATCH` | `/shop-routes/:routeId/stops/:stopId` | Update stop |
| `DELETE` | `/shop-routes/:routeId/stops/:stopId` | Remove stop |
| `POST` | `/shop-routes/:routeId/reorder` | Reorder stops |

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

1. **No external map provider integration** — Backend returns coordinates only; map rendering is handled by frontend/mobile apps
2. **No distance calculation** — Simple geographic filtering; PostGIS not used
3. **No route directions** — Turn-by-turn navigation deferred to later phases
4. **No consumer route following** — Consumer route participation deferred
5. **No media assets for routes** — Route images not implemented
6. **No pagination for stops** — Stops returned in full sequence order
7. **Route creation requires business owner** — Admin-created routes have limited support in this phase

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
