# LocalSpotter — Gap Closure Plan

Date: 2026-10-18. Companion to `GAP-ANALYSIS.md`. **Status 2026-10-19: all phases 1–11 implemented; see `RELEASE-GUIDE.md` for what remains to be verified by you.**

## 1. Working rules

- Modular monolith (NestJS + Prisma + Next.js). No new services, no redesign of the approved frontend; new screens reuse existing components and the EN/NL dictionaries (parity test must pass).
- Every phase ships as: Prisma migration (additive, reversible where practical) → backend module + DTO validation + authorization + unit tests → frontend wiring → EN/NL keys → `tsc` + tests → changelog entry in `REPAIR-CHANGELOG.md`.
- You run `prisma migrate deploy` and the seed. I give you the exact migration names after each phase.
- Security per feature: ownership/tenant checks, rate limits on write endpoints, no secrets in the client, audit-log entries for admin actions.
- Honest status: each phase ends with what was verified (tsc/jest) and what was not (browser, DB, third-party APIs).

## 2. Decisions that gate phases (answer before the phase starts)

| ID | Question | My recommendation | Gates |
|---|---|---|---|
| D-004 | Payment provider | Mollie Connect (iDEAL-first, split payments) | Phase 7 |
| D-001 | Order model | CustomerOrder + MerchantOrder (REQ FR-CART-05) | Phase 7 |
| D-002 | Guest checkout | Yes, after D-001 | Phase 8 |
| D-003 | Returns | Request/RMA after payments are live | Phase 9 |
| D-006 | Commission and payouts | Configurable % per plan, weekly payout run | Phase 9 |
| D-005 | Order status names | Keep enum, map display labels to REQ vocabulary | Phase 7 |
| D-008 | Default language | Dutch default with EN switch | Phase 1 (small) |
| — | Workshop cancellation deadline and refund % | e.g. full refund up to 48h before | Phase 4 |
| — | Upload limits, chat retention | 5 MB images, 10 MB attachments; chat kept 12 months | Phases 5, 6 |
| — | 360° technology | Photo-sphere (equirectangular) viewer | Phase 10 |

Phases 1–6 need no big decision and can start immediately.

## 3. Phases

### Phase 1 — Discovery and favorites (no decision needed; ~1 round)
- Favorites: `Favorite` table (user, target type PRODUCT|BUSINESS, target id, unique), `POST/DELETE /favorites`, `GET /favorites`, heart button on product and store cards, account "Favorites" page, real like counts.
- Search and filters: category, price range, city, store, sort; availability date for workshops; products and businesses endpoints accept the filters with validated DTOs and indexes.
- Distance: browser location (opt-in) → `lat/lng/radius` query, Haversine in SQL, "near me" sort. Default language switch (D-008) applied here.
- Done when: filters combine correctly (tests), favorites are per-user isolated (tests), counts are live.

### Phase 2 — Store profile and catalogue completion (~1 round)
- Business: `websiteUrl`, social links (validated URLs), gallery order.
- Product: `vatRate`, `brand`, `weightGrams`, dimensions, compare-at price.
- Restore a reachable owner product list/edit page (link from the owner sidebar, no redesign).
- Done when: owner can create/edit all fields and the customer product page shows them.

### Phase 3 — Shopping routes (~1 round)
- `ShopRoute`: `theme`, `coverImageUrl`, `distanceKm`, `durationMinutes`, `featured`.
- Distance and duration computed from stops (Haversine, walking speed) with manual override.
- Customer route page: map with all stops in order, "open in Google/Apple Maps" navigation link per route and per stop, filters by theme/distance/duration.
- Admin: create/edit/feature/unpublish routes (new admin page).
- Done when: owner and admin routes appear to customers by plan rules; unit tests for computation and permissions.

### Phase 4 — Workshops (~1–2 rounds)
- `WorkshopSession` (start, end, capacity, booked count) replacing the single time slot (migrate existing rows into one session each); bookings point to a session.
- Cancellation policy fields (deadline hours, refund %), minimum age, participant list (owner view + CSV), cancellation by owner notifies booked participants, consumer cancellation applies the policy.
- Capacity enforced transactionally (no overbooking under concurrent bookings; test).
- Done when: multi-session create/book/cancel works in tests; refund execution waits for Phase 7 and is recorded as a pending refund until then.

### Phase 5 — Chat completion (~1 round)
- Report message/user (`ChatReport`), block user/store (`ChatBlock`), admin moderation list and resolve action.
- Attachments: images via the existing Cloudinary/media pipeline, size and MIME validation, attached to messages.
- Near-real-time: SSE or short polling (polling first; no new infrastructure).
- Notifications: email and in-app on new message (rate-limited digest), retention job per your retention decision.
- Done when: blocked users cannot send (tests), reports reach admin, attachments validated.

### Phase 6 — GDPR, accounts, notifications, admin gaps (~1–2 rounds)
- Personal data export (JSON) and account deletion/anonymisation flow with a confirmation step; retention jobs; consent record at registration.
- Store employees: `MerchantEmployee` (invite by email, roles OWNER/MANAGER/STAFF), permission checks on owner endpoints.
- Notifications: complete the REQ event list (order, booking, cancellation, payout, chat, subscription expiry) with email + in-app, honouring preferences.
- Admin: category management, translation status page, chat reports (from Phase 5), routes/workshops moderation.
- Done when: export contains only the requester's data (test), deletion anonymises and blocks login (test).

### Phase 7 — Orders and payments (after D-001, D-004, D-005)
- `CustomerOrder` + `MerchantOrder` split; multi-store cart; one checkout, one payment, per-store fulfilment/status.
- Fulfilment per store: pickup / shipping / local delivery (fee, radius, address only when needed).
- PSP integration (Mollie recommended): payment creation, signed webhook verification, idempotency keys, server-side "paid" confirmation, failed-payment retry, subscription and workshop payments, real subscription activation (removes `ALLOW_UNPAID_SUBSCRIPTION_ACTIVATION`).
- Done when: webhook replay and failure paths are tested; sandbox end-to-end run by you with test keys.

### Phase 8 — Guest checkout (after Phase 7, D-002)
- Guest cart (signed cookie), guest order contact fields, order lookup token by email link, optional account creation after purchase, abuse limits.

### Phase 9 — Returns, refunds, commission, payouts (after Phase 7, D-003, D-006)
- Return requests (RMA) with retailer approve/reject/receive, refund + commission reversal.
- Commission rules (per plan/category), ledger postings on paid orders and bookings, weekly payout run with reserve rule, owner payouts page, admin payout and refund screens.

### Phase 10 — Virtual store / 360° (after technology choice)
- Store 360° media upload and viewer, product hotspots deferred to Phase 2 of the REQ.

### Phase 11 — Hardening and release (runs alongside, final pass at the end)
- `next build`, ESLint, `npm audit`, `prisma validate`, e2e suite against the isolated test DB, accessibility pass, responsive check, performance indexes, backups/rollback notes, updated `ARCHITECTURE.md`/`API.md`/`DATABASE.md`/`SECURITY.md`, refreshed `IMPLEMENTATION-STATUS.md`.

## 4. Order and dependencies

```
1 Discovery/Favorites → 2 Profile/Catalogue → 3 Routes → 4 Workshops → 5 Chat → 6 GDPR/Employees/Admin
                                                                                      ↓ (decisions D-001/004/005)
                                                       7 Orders+Payments → 8 Guest → 9 Returns/Commission/Payouts → 10 360°
11 Hardening: continuous, final gate before release
```

## 5. Risks

- Payments (Phase 7) is the largest and riskiest piece; it needs real PSP sandbox testing that I cannot do from here.
- Workshop session migration changes booking relations; the migration needs a backup first and a dry run on a copy of the data.
- Several phases touch many files; I will keep each phase to one reviewable change set and report evidence per phase.
- Nothing is verified in a browser from my side; you will need to click through each phase on staging.

## 6. Proposed start

Begin with Phase 1 (favorites, filters, distance) now. In parallel please answer D-004, D-001 and D-008 so Phase 7 can be designed, and give the policy numbers for workshop cancellation, upload limits and chat retention (or approve my suggested defaults above).
