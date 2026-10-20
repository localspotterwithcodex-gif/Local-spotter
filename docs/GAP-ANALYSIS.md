# LocalSpotter — Requirements Gap Analysis

Date: 2026-10-16. Source: *Requirements Document – LocalSpotter v1.1* (+ user stories v1.2), compared with the repository (Prisma schema, backend modules, frontend routes, `IMPLEMENTATION-STATUS.md`, `DECISIONS-AND-CONFLICTS.md`).

**Method and limits.** This is a static review: schema, modules, controllers, routes and docs were inspected. Nothing was exercised in a browser or against a live database, so "Done" means "code exists and typechecks/unit-tests", not "verified in production". `IMPLEMENTATION-STATUS.md` is partly stale (it still says chat is absent; a chat module and `Conversation`/`ChatMessage` tables now exist). Prices in the requirement docs (50/100/150) are superseded by your 12/27/57.

Legend: ✅ Done · 🟡 Partial · ⛔ Missing · ⏸ Blocked by an open decision (D-xxx)

## 1. Summary

| Area (REQ section) | Status |
|---|---|
| Auth: register, verify, login, reset, roles (FR-AUTH-01..03,05,06) | ✅ (SMS has no provider; email only) |
| Store employees / roles (FR-AUTH-04) | ⛔ no MerchantEmployee model |
| Social login Facebook / Apple (FR-AUTH-07, SHOULD) | 🟡 Facebook/Google OAuth tables exist; Apple missing |
| Store profiles (FR-SHOP-01..04) | 🟡 profile, hours, categories, map location done; website/social links, gallery/360° media missing |
| Product catalogue (FR-PROD) | 🟡 CRUD, variants, images, stock done; VAT, brand, weight/dimensions missing; owner product list/edit page not reachable from the UI |
| Cart & multi-store checkout (FR-CART, §42-43) | ⏸ one store per cart/order (D-001) |
| Fulfilment pickup/shipping/local delivery (FR-FUL) | ⛔ order always has a delivery address; no per-store method config |
| Payments (FR-PAY) | ⏸ gateway abstraction, intents, refund endpoint, webhook event table exist; no real PSP, no idempotent paid confirmation (D-004) |
| Guest checkout (FR-GUEST) | ⏸ login required (D-002) |
| Orders (FR-ORD) | 🟡 consumer/owner/admin order views and status transitions; status vocabulary differs from REQ (D-005) |
| Revenue model, commission (BR-REV) | ⏸ subscriptions done; commission rules not implemented (D-006) |
| Payouts (FR-PAYOUT) | 🟡 Payout + ledger tables, admin approval; no weekly job, no PSP transfer, owner payouts page empty |
| Returns / RMA (FR-RET) | ⏸ none (D-003) |
| Refunds | 🟡 refund endpoint exists; no return-linked refunds, no commission reversal |
| Shopping routes (FR-ROUTE) | 🟡 see §3 |
| Workshops (FR-WORK) | 🟡 see §3 |
| Chat (FR-CHAT) | 🟡 basic 1:1 text chat + unread count; no reports/block/attachments/real-time |
| Virtual store 360° / media (FR-3D, NFR-MEDIA) | ⛔ |
| Favorites (§22) | ⛔ no model, likes always 0 |
| Search & discovery (§23) | 🟡 text search and city filter; no category/price/distance/date/store filters |
| Notifications (§24) | 🟡 in-app + email (Resend) + preferences; not the full event list; no push/SMS |
| Retailer dashboard (§25) | 🟡 |
| Admin (§26) | 🟡 users, businesses, orders, products, reviews, subscriptions, payments, payouts; no categories, commissions, chat reports, routes/workshops management, refunds |
| Security / GDPR (§29-30) | 🟡 HttpOnly session, CSRF origin check, rate limits, audit log; no data export, account deletion flow, retention jobs |
| Reviews (Phase 2 in REQ) | ✅ ahead of scope |

## 2. Done in recent rounds (not in the original status doc)

Dynamic city chips; owner visibility banner and redirects; subscription-gated shop routes and workshops (WEBSHOP / SHOPROUTES / WORKSHOP) with owner pages; live follower/rating counts; plan prices 12/27/57; product view counting; share button with Web Share / clipboard fallback; DeepL translation backfill and admin status endpoint; shop-route auto-geocoding.

## 3. Detailed gaps by requirement

### Shopping routes (FR-ROUTE-01..07)
- ✅ Routes with ordered stops, city, publish/unpublish, public listing gated by subscription.
- ⛔ Theme, cover image, distance, estimated duration, featured flag (not in `ShopRoute`).
- ⛔ Admin-created routes (admin UI absent; `createdByUserId` exists in the schema).
- ⛔ Map rendering of the whole route and turn-by-turn / external navigation link.
- ⛔ Filters by theme/distance/duration.

### Workshops (FR-WORK-01..08, §17)
- ✅ Create/cancel, capacity, bookings, booked count, owner bookings page, city/location.
- ⛔ Multiple sessions per workshop with capacity per session (one start/end per workshop today).
- ⛔ Cancellation policy fields and refund percentages (open input #6), minimum age, participant list export, waitlist.
- ⛔ Automatic notifications on cancellation to participants (verify; not confirmed).

### Chat (FR-CHAT-01..09)
- ✅ Start conversation, send/read messages, unread count, owner and consumer pages.
- ⛔ Attachments (needs media pipeline and limits, open input #8), report message/user, block, admin moderation, retention policy, real-time delivery (polling or WebSocket), push/email on new message.

### Fulfilment, checkout, payments (FR-FUL, FR-PAY, FR-CART, FR-GUEST)
- All blocked by D-001, D-002, D-004. Without a PSP choice, marketplace split payments, webhook signature verification, idempotency keys and server-side "paid" confirmation cannot be implemented honestly. Subscription activation currently relies on `ALLOW_UNPAID_SUBSCRIPTION_ACTIVATION=true`, which is not acceptable for real revenue.

### Returns, refunds, commission, payouts
- Returns/RMA entities (Return, ReturnItem), retailer processing, refund + commission reversal (D-003).
- Commission rules per store/plan/category and ledger postings (D-006). Weekly payout run, reserve/delay rules, payout report (open input #4).

### Catalogue and discovery
- ⛔ Favorites for products and stores (model, API, account page, heart UI; "likes" display).
- ⛔ Distance-based discovery (user location, radius), price range, availability-date and store filters, sorting.
- ⛔ Product VAT rate, brand, weight, dimensions, compare-at price.
- 🟡 Owner product list/edit page exists in code but the My Shop tabs were removed, so it is unreachable; decide where to link it.

### Stores and roles
- ⛔ Store employees (MerchantEmployee, invite flow, role permissions).
- ⛔ Website and social links on the store profile; virtual store / 360° media (open input #7).

### Admin (§26)
- ⛔ Category management, commission configuration, chat reports, refunds/returns overview, routes and workshops moderation, translation status page (endpoint exists, no UI).

### Security / GDPR (§29-30)
- ⛔ Personal data export, account deletion/anonymisation flow (a `/data-deletion` info page exists), retention jobs for chat and logs, consent records.
- ⏸ Final legal/tax/compliance set-up (open input #13).

### Other
- Default language (D-008) still unanswered.
- SMS provider missing; mobile sign-up disabled.
- `next build`, ESLint after recent edits, e2e and `prisma validate` have not been run for the latest changes.
- Migrations pending on Neon: `20261016100000_notification_preferences`, `20261016120000_plan_prices`, `20261016130000_plan_prices_12_27_57`, `20261016140000_product_views`.

## 4. Suggested implementation order (no decision needed)

1. Favorites (products and stores) and real likes.
2. Search/discovery filters: category, price, city, distance, date, store.
3. Shop-route fields (theme, image, distance, duration) and map/navigation; admin route management.
4. Workshop sessions, cancellation policy, participant list.
5. Chat: report, block, attachments (after upload limits are set), unread email notification.
6. GDPR export and account deletion.
7. Store website/social links, product VAT/brand/weight/dimensions, product list entry point.
8. Store employees.
9. Admin: categories, chat reports, translation status UI.

## 5. Needs your decision first

D-001 order model · D-002 guest checkout · D-003 returns · D-004 payment provider (Mollie vs Stripe) · D-005 order statuses · D-006 commission and payouts · D-008 default language · plus open inputs: workshop cancellation deadlines, upload limits, retention periods, 360° technology.
