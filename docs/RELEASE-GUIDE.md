# LocalSpotter — Release guide (gap closure complete)

Updated 2026-10-19. Companion to `GAP-CLOSURE-PLAN.md` (all 11 phases done) and `REPAIR-CHANGELOG.md` (sections W–AF describe each phase in detail).

## 1. What the system is now

Modular monolith: Next.js (Vercel) → same-origin `/api/v1` rewrite → NestJS + Prisma → PostgreSQL (Neon). External services: Mollie (payments, collected by the platform), Resend (e-mail), Cloudinary (images), DeepL (translation).

New modules since the gap analysis: `favorites`, `employees`, `privacy` (GDPR export/delete), `guest`, `returns`, `finance` (balance, payouts, payout account), chat extensions (reports, blocks, attachments), shop-route and workshop-session extensions, `payments` (Mollie gateway, webhook, refunds, ledger).

Money flow: customer pays the platform (one Mollie payment per checkout, one `Payment` row per store order) → ledger `SALE` + `COMMISSION` (held `PAYOUT_HOLD_DAYS`) → weekly run creates a `Payout` per store → **an admin transfers the money by bank and marks it paid** → refunds/returns reverse sale and commission.

## 2. Release steps (you run these)

1. Back up the database. Apply migrations in this order (Neon may need the SQL Editor): `20261016100000_notification_preferences`, `20261016120000_plan_prices`, `20261016130000_plan_prices_12_27_57`, `20261016140000_product_views`, `20261019100000_favorites`, `20261019110000_store_links_product_specs`, `20261019120000_shoproute_details`, `20261019130000_workshop_sessions` (restructures bookings: dry-run on a copy first), `20261019140000_chat_reports_blocks_attachments`, `20261019150000_gdpr_employees_categories`, `20261020100000_orders_payments_fulfilment`, `20261021100000_guest_checkout`, `20261022100000_returns_commission_payouts`, `20261023100000_store_panorama`.
2. `npx prisma generate`, then deploy backend (Render) and frontend (Vercel).
3. Environment variables (backend): `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, `FRONTEND_URL`, `API_PUBLIC_URL` (https), `CRON_SECRET` (≥16), `MOLLIE_API_KEY` (start with `test_`), `RESEND_API_KEY`+`MAIL_FROM`+`MAIL_TRANSPORT=resend`, `CLOUDINARY_*`, `DEEPL_API_KEY`, `FACEBOOK_APP_SECRET`, **`ENCRYPTION_KEY`** (base64, 32 bytes; back it up — losing it makes stored IBANs unreadable), `COMMISSION_DEFAULT_BPS`, `PAYOUT_HOLD_DAYS`, `PAYOUT_MIN_CENTS`, `RETURN_WINDOW_DAYS`. The app refuses to start on malformed values.
4. Render Cron Jobs (`POST`, header `x-cron-secret`, base `/api/v1/internal/jobs/`): daily `chat-retention`, `subscription-reminders`, `cleanup-guests`; every 10 min `expire-unpaid-orders`, `expire-unpaid-bookings`; weekly `weekly-payouts`.
5. Admin set-up: Admin → Commission (per-plan %), check Admin → Translation status. Shops add their bank account under Payouts.
6. Test end to end with Mollie test keys: checkout, webhook, refund, return, workshop booking, subscription, weekly payout + CSV export + mark paid.
7. Update the privacy policy and terms (consent record, chat retention 12 months, guest data, returns window).

## 3. Verification status

| Check | Result |
|---|---|
| Backend `tsc --noEmit` | clean (this session) |
| Backend jest | suites touched or at risk this session re-run and passing: payments (77), finance (balance, payouts, payout account, ledger), returns (service, refund maths), admin (service, plans), businesses, orders, cart, chat, addresses, guards/env, app module DI, routes. Suites not re-run in this final pass (unchanged since they last passed): auth, mail, media, notifications, privacy, products, reviews, shoproutes, subscriptions, translation, workshops, employees, favorites, followers, guest — run `npm test` to confirm all |
| Frontend `tsc --noEmit` | clean; `--noUnusedLocals` clean apart from unused `React` imports (automatic JSX runtime) |
| Frontend `npm test` | 31 pass |
| `next build`, ESLint, `npm audit`, `prisma validate`, e2e suite | **not run here** (no Linux SWC binary / npm registry / Prisma engine / test database in the sandbox) — run `npm run build`, `npm run lint`, `npm audit`, `npx prisma validate`, `npm run test:e2e` locally |
| Browser click-through, WebGL viewer, Mollie sandbox, migrations on Neon | **not verified** |

## 4. Security notes

- Auth: HttpOnly session cookie, CSRF origin check, role guards, default-deny for guest accounts (`@AllowGuest`), employee access checked per shop.
- Secrets: server-only env vars; bank details AES-256-GCM encrypted at rest, masked in every response, never logged or put in audit entries; IBAN export is admin-only and audited.
- Payments: amounts derived server-side; the Mollie webhook is unauthenticated by design and re-reads status/amount/metadata from Mollie; refunds are idempotent and reserved in the ledger before the provider call.
- Uploads: real-type detection, size limits, Cloudinary storage.
- Rate limits are in-memory per process: behind several instances use a shared limiter.

## 5. Known limitations

Payouts are manual bank transfers (Mollie cannot pay arbitrary IBANs); payouts created before Phase 9 are not ledger-debited; chargebacks are not handled; changing plan while ACTIVE pauses access until paid; client-supplied delivery coordinates are trusted; chat uses polling (no push); no chat-notification preference switch; legacy unpaid orders stay visible to customers; guests cannot use self-service GDPR export/delete (support handles it); SMS verification has no provider; the 360° viewer is a single panorama without hotspots.
