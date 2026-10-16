# LocalSpotter — Repair Changelog (Phase 1–7 repair round)

Date: 2026-10-13. Each entry: root cause · files · test command · **actual result** · remaining limitation.
"Sandbox" = the Linux VM used for this work (cannot download Prisma engines/npm audit data, cannot run the Windows-built `next build`). Backend specs were run there with `ts-jest` `isolatedModules` (type checking skipped, because your `node_modules` holds a Prisma client generated from the old schema) — run `npm test` locally after `npx prisma generate` for the full type-checked run.

## A. Frontend lint / types (Phase 1)

| # | Root cause | Files | Result | Remaining |
|---|---|---|---|---|
| A1 | Unescaped quotes in JSX | `(consumer)/account/reviews/page.tsx` | `eslint` 0 errors | — |
| A2 | `Math.random` + `MOCK_PRODUCTS` rendered in checkout success (impure render, fake data) | `(consumer)/checkout/success/page.tsx` | now fetches the real order by `?orderId=`; lint clean | Payment still shown as "not yet processed" (D-004) |
| A3 | `catch (err: any)` / `any` props | owner orders, owner products/new, workshop detail, home page, `ShopRegistrationModal`; new `lib/errors.ts` | lint clean | — |
| A4 | (FeedbackButton later removed entirely at the owner's request) | — | — | — |
| A5 | `AuthContext` set state synchronously in an effect | `features/auth/AuthContext.tsx` (async fetch, cancel flag) | lint clean | — |
| A6 | `LocaleProvider` initialised to `"en"` in an effect (hydration mismatch, `<html lang="nl">`) | `i18n/LocaleContext.tsx`, new `i18n/server-locale.ts`, `app/layout.tsx` | lint clean | Default language still pending your decision (D-008) |
| A7 | Unused imports/vars (9) | reset-password, WorkshopCard, AppHeader, TopNav, ShopRegistrationModal | lint clean | `showBack` prop left (public prop of `AppHeader`) |

Commands (frontend): `npm run typecheck` → **exit 0** · `npx eslint src` → **0 errors, 5 warnings** (baseline 13 errors / 90 warnings; the 5: three `<img>` for the logo, one unused public prop, one deliberate `window.location.assign("/login")` for a full-state reset on logout) · `npm test` (new, Node built-in runner) → **8 pass / 0 fail**.
**`npm run build` was NOT run** – the Next/SWC native binary in your `node_modules` is the Windows build and cannot execute in the sandbox. Please run it locally (see "Commands for you").
**npm vulnerabilities (9: 8 high, 1 critical): NOT investigated** – `npm audit` returns 403 from the sandbox. Run `npm audit` locally and review each advisory; do **not** run `npm audit fix --force` blindly (it can jump major versions of Next/ESLint). Prefer `npm audit fix` (non-forced), then upgrade direct dependencies one by one.

## B. Payments (31 failing tests → 46 passing)

Root causes (from the failing specs): user id vs profile id confusion; `CreatePaymentIntentDto` had no validators (with `whitelist` the endpoint always 400'd); client-supplied amount / `unitPrice` used instead of server-derived `totalAmount`; no refund validation; refund never contacted a provider; controller roles blocked owners from paying subscriptions; inconsistent fixtures.
Files: `payments/payments.service.ts`, `payments.controller.ts`, `payments.module.ts`, `payment-gateway.ts` (provider abstraction), `dto/create-payment-intent.dto.ts`, `dto/refund-payment.dto.ts`, `payments.service.spec.ts`, `common/types/auth-user.ts`.
Behaviour now: purpose/entity-id validation; ownership + role checks (consumer/owner/Super Admin); amount derived server-side from the order/booking/plan; refund validation (status, currency, positive amount, over-refund guard incl. partial refunds); refunds reserve inside a transaction with `SELECT … FOR UPDATE`, require an idempotency key, are written to the ledger + audit log, and only become *completed* after the provider confirms; provider failures leave the refund `FAILED`/reservation released; duplicate requests are idempotent. No security check was removed or weakened.
Test: `npx jest --preset ts-jest src/payments` → **46 passed** (sandbox).
Remaining: **no real PSP is integrated** (D-004) – `payment-gateway.ts` is the seam; a signed webhook endpoint (FR-PAY-03/07) must be added with the chosen provider. Orders therefore stay `paymentStatus=PENDING` and the UI says so.

## C. Authentication & session security (Phase 4)

| Fix | Detail | Files |
|---|---|---|
| No JWT secret fallback | `JWT_SECRET` required (≥32 chars), app refuses to boot otherwise (`env.validation.ts`) | `config/env.validation.ts`, `auth.module.ts`, `jwt.strategy.ts` |
| HttpOnly cookie session | `ls_session` HttpOnly, SameSite=Lax, Secure in production; access token never in a response body; frontend holds no token | `auth/utils/session-cookie.ts`, `auth.controller.ts`, `lib/api/client.ts`, `AuthContext.tsx` |
| CSRF | `OriginCheckGuard`: cookie-authenticated state-changing requests need an allowed Origin/Referer (global `APP_GUARD`) | `common/guards/origin-check.guard.ts`, `app.module.ts` |
| Secure OTP | CSPRNG 6-digit code, stored as HMAC, expiry, max 5 attempts then locked (`verification_attempts`), timing-safe compare, never logged | `auth.service.ts`, migration `20261013120000_auth_verification_attempts` |
| Delivery | `MailProvider` abstraction; `dev-file` transport writes to `.dev-outbox/` (git-ignored) for local development; production without a configured provider returns 503 instead of pretending to send | `mail/*`, `.gitignore` |
| Reset password | hashed single-use token, newest link only, expiry; frontend pages now call the API (they were `setTimeout` fakes with a `demo-reset-token` default) | `auth.service.ts`, `forgot-password/page.tsx`, `reset-password/page.tsx` |
| Rate limiting | per-IP/identifier limits on register/login/verify/resend/forgot/reset/shop-registration (in-memory) | `common/guards/rate-limit.guard.ts` |
| Roles | enforced by `JwtAuthGuard`+`RolesGuard` on the backend (unchanged mechanism); edge middleware now also routes by role | `middleware.ts` |
| Redirects | `redirectTo` honoured only for same-origin relative paths; signed-in users are bounced off /login and /signup; role landing pages | `lib/auth/redirect.ts`, `login/page.tsx` |
| Same-origin API | browser calls `/api/v1/*`, Next rewrites to `BACKEND_URL` so the cookie is first-party on Vercel+Render | `next.config.ts`, `frontend/.env.example` |

Tests: `src/auth` + `src/common` → **26 passed** (login, wrong password, verification success/expiry/attempt-lock/replay, resend, reset expiry & reuse, secret handling, rate-limit and origin guards, DTO password rules). Frontend `redirect.test.ts` → pass. The cross-portal suite (E) additionally asserts cookie flags, no token in body, 401/403 behaviour, CSRF block.
Remaining: rate limiting is per process (use Redis/edge limiter when running >1 instance); no refresh-token/revocation (7-day cookie JWT) – acceptable for MVP, revisit before scale; SMS delivery has no provider (email only) – **your existing `backend/.env` must get a strong `JWT_SECRET` (I did not edit it)**.

## D. Database, routes (Phase 5)

* **Route prefixes** (LS-003): `ShopRoutesController` and `WorkshopsController` repeated their prefix (`/shop-routes/shop-routes`, `/workshops/workshops`). Now `GET /shop-routes`, `GET /workshops`, … `GET /workshops/bookings` is declared before `GET /workshops/:workshopId` (it was shadowed). Reviews controller (`GET /businesses` with a missing `:businessId`, reading a non-existent `user.consumerProfileId`, and returning reviews of *all* businesses) → `POST/GET /businesses/:id/reviews`, `GET …/reviews/manage`, `GET /reviews/mine`, scoped to the business. Followers controller used the same non-existent `consumerProfileId` → `profileId`. Test: `src/routes.spec.ts` (no doubled prefixes, no duplicates, no param-route shadowing a later static route) → **4 passed**.
* **New endpoint** `GET /businesses` (public list, ACTIVE + running subscription) – the Local Shops page had no backend source.
* **Privacy fixes**: public `GET /workshops/:id` returned all attendees' names and the business's KvK/contact/subscription → stripped for non-owners. Reviews list previously leaked other businesses' reviews.
* **Subscription integrity**: `selectPlan` activated any plan for free (`MANUAL`). Outside production unchanged (dev convenience); in production the subscription stays `INCOMPLETE` (no entitlements/not listed) unless `ALLOW_UNPAID_SUBSCRIPTION_ACTIVATION=true` or a verified payment activates it.
* **Migration drift** (LS-011): `schema.prisma` had objects missing from migrations (`users.username`, `verification_code`, `verification_code_expires_at`, `businesses.address`, table `shop_registrations`). New forward-only, idempotent `20261013130000_schema_drift_catchup` (all `IF NOT EXISTS`, nothing dropped). Found by comparing table/column names between the schema and the SQL; **`prisma migrate diff/deploy` could not be run in the sandbox** – run `npx prisma migrate status` and `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url …` locally to confirm there is no remaining drift (types/indexes were not compared by my script).
* **Shop registrations** (LS-010): widget now posts to `POST /api/v1/shop-registrations` (PostgreSQL, validated, rate limited). The MongoDB Next route, `lib/mongodb.ts` and the zod schema were removed. Existing Mongo leads are **not** migrated (export them from Mongo if you need them). `mongodb` and `zod` are still listed in `frontend/package.json` – remove with `npm uninstall mongodb zod` locally (I did not touch the lockfile).
* Workshop DTOs: `@Min(3)` on the string `title` made every create/update fail validation → `@MinLength(3)`.
* Commands: `npx prisma validate` / `generate` / `migrate` → **NOT RUN** (blocked); backend `tsc` → only errors are `verificationAttempts` missing from your stale generated client (disappear after `npx prisma generate`); backend jest (isolatedModules harness) → **13 suites, 250 tests passed**.

## E. Real data in all portals (Phase 3) and cross-portal verification (Phase 6)

* `frontend/src/lib/api/index.ts` rewritten: every method is a real HTTP call; `mappers.ts` converts Prisma shapes (decimal strings, nested images/category, enums); `useApiResource` gives loading/error/retry; `useMyBusiness` replaces `bus-1`; `adminApi` (`lib/api/admin.ts`) for the admin portal. `data/mock/*` deleted. Plan marketing copy moved to `content/plan-features.ts` (prices/availability come from the API).
* Consumer: server-backed cart, checkout creates a real order, success page shows it, order history, reviews, following, profile. Public catalogue (home, products, shops, workshops, shop routes) from the API. Owner: dashboard stats, orders (backend transition rules, rejected transitions show the backend message), products incl. variants, workshops, bookings, settings/hours, shop-route location, subscription, onboarding. Admin: dashboard, users, businesses (approve/suspend), orders, products/reviews moderation, subscriptions, payments, payouts. All writes go through Prisma-backed endpoints.
* `test/cross-portal.e2e-spec.ts` (real PostgreSQL, no mocks; skipped unless `TEST_DATABASE_URL` is set): auth cookie flags, CSRF, roles; owner publishes product → public catalogue → consumer orders → owner/admin see it → status propagates; other consumer/owner cannot read it; deactivated product disappears; pending business hidden until admin approves; workshop publish → booking → capacity → privacy of attendees/bookings. **Written and type-checked, but NOT executed** (no database in the sandbox). Run: see "Commands for you".
* Verification performed on the frontend was static only (typecheck, lint, grep for mocks/ids). **No page has been clicked through against a running backend.**

## F. Language (Phase 7)
Locale resolved on the server (cookie → Accept-Language → `en`), one provider for all portals, persisted in the `localspotter_locale` cookie, `<html lang>` follows it. New test `i18n/dictionaries.test.ts` fails when an `en` key lacks an `nl` translation (or vice-versa) → pass. Coverage: only 10 of 44 pages use `useLocale`; the rest is hard-coded Dutch. **Default language not chosen – needs your answer (D-008).**

## Commands for you (run locally)
> **Warning:** `schema.prisma` has `directUrl = env("DIRECT_URL")`. Prisma migrate uses it, so never run migrate with only `DATABASE_URL` overridden. Use the `db:test:*` scripts (they override both and refuse a URL on the production server). Earlier instructions that overrode only `DATABASE_URL` were unsafe.
```
cd backend
npx prisma validate && npx prisma generate
npx prisma migrate status            # then: npx prisma migrate deploy
npm test && npm run build
npm run db:test:status && npm run db:test:migrate   # test DB only: overrides BOTH DATABASE_URL and DIRECT_URL
npm run test:e2e                                      # same wrapper; refuses to run against the production server
cd ../frontend
npm run typecheck && npm run lint && npm test && npm run build
npm audit        # review, do not run `audit fix --force`
```
New/changed environment (see `backend/.env.example`, `frontend/.env.example`): backend `JWT_SECRET` (≥32 chars, required), `MAIL_TRANSPORT=dev-file` for local, `FRONTEND_URL`, `CORS_ORIGIN`, `COOKIE_SECURE`, `TRUST_PROXY`, optional `ALLOW_UNPAID_SUBSCRIPTION_ACTIVATION`; frontend `BACKEND_URL` (server-side; replaces `NEXT_PUBLIC_API_URL`).

## G. Follow-up round (after your local verification)

* **Evidence from files on disk** (I cannot read your terminal): Prisma client regenerated and contains `verificationAttempts`; `backend/dist` produced by `nest build`; `frontend/.next/BUILD_ID` written (only after a completed `next build`). Exit codes and test output of your runs were not visible to me – paste them to confirm.
* Backend `tsc --noEmit` (including `test/`) against the regenerated client: **exit 0** (re-run by me). Frontend `tsc` exit 0, `eslint` 0 errors / 5 warnings, `npm test` 8 pass (re-run by me).
* **Safety fix – test database:** `prisma migrate` uses `directUrl` (`DIRECT_URL`), so overriding only `DATABASE_URL` could migrate production. New `backend/scripts/with-test-db.mjs` overrides both, derives the non-pooled host, refuses to run when the test URL is on the same server as `DATABASE_URL`/`DIRECT_URL`, and never prints credentials. Use `npm run db:test:status | db:test:migrate | test:e2e`. Note: your `TEST_DATABASE_URL` database is named `neondb` (not `localspotter-test`); it is on a different Neon server than production.
* `OptionalJwtAuthGuard` on `GET /products/:id`, `/workshops/:id`, `/shop-routes/:id`: services already had owner/admin preview branches, but `req.user` was never populated on these public routes, so owners could not preview inactive/draft items. Unit tested.
* `FLAT_SHIPPING_FEE` (already in your `.env`) was ignored; cart preview and order total now share one helper (`common/config/shipping.ts`, default 0). **If your `.env` sets a non-zero value, order totals will now include it.** Unit tested.
* Backend specs touched: 38 pass (common, cart, orders, routes).

## H. Database verification round

* Wrapper check (static + dry run, no DB contact): `with-test-db.mjs` overrides **both** `DATABASE_URL` and `DIRECT_URL`; the test host is a different Neon server (region us-east-2, non-pooled) from the application database (eu-central-1); it refuses to run if hosts match. Project/branch names are not visible in a Neon URL, so the project name `localspotter-test` rests on your console confirmation.
* I could **not** execute `db:test:status`, `db:test:migrate`, `npm test` (type-checked) or `test:e2e`: my shell cannot reach Neon and cannot download Prisma's Linux engines (HTTP 403 from binaries.prisma.sh). Run them locally; results are intentionally not claimed.
* New read-only production inspection: `npm run db:prod:status` (`prisma migrate status`) and `npm run db:prod:diff` (prints SQL needed to make the database match `schema.prisma`; never executes it). The script accepts no other arguments. Do not run `prisma migrate dev` / `npm run prisma:migrate` against the application database (it can propose a reset on drift).
* Offline schema↔migration comparison: tables, enum values, columns, unique indexes and indexes all line up after the catch-up migration. NOT NULL/default/FK-action details were not compared; `db:prod:diff` and `migrate diff` will show them.
* Bug fixed: an owner could lift an admin `SUSPENDED`/`DISABLED` block by setting their own business to `DRAFT`/`PENDING_APPROVAL` (`businesses.service.spec.ts`, 5 tests pass).

## I. First E2E run against the isolated Neon test database (your output)

* `npm test`: **15 suites, 259 tests passed** (as reported by you). Migrations applied to the test database (as reported by you).
* `test:e2e`: 9 of 14 passed; the 5 failures share **one root cause**: `PrismaClientKnownRequestError … Transaction already closed … timeout 5000 ms, 5326 ms passed` in `orders.service.ts` (create order) and `workshops.service.ts` (create booking). Interactive transactions make several sequential queries; with a database in another region each round trip costs 100–300 ms, so they exceeded Prisma's default 5 s limit and returned HTTP 500. The other three failures (order not listed, 404 on status change) are consequences of the order never being created.
* Fix: `PrismaService` now sets `transactionOptions` (`maxWait` 10 s, `timeout` 20 s, overridable with `PRISMA_TX_MAX_WAIT_MS` / `PRISMA_TX_TIMEOUT_MS`), covering every transaction in orders, workshops, payments, shop routes, businesses and auth. Not yet re-run — **pending your `npm run test:e2e`**.
* Passing in that run (real database): anonymous 401s, foreign-origin CSRF block, wrong-password 401, role enforcement, product publish → catalogue, cross-owner product creation blocked, invalid status transitions, deactivation hides product, admin approval makes a shop public.
* Not a failure: Jest's "worker failed to exit gracefully" notice; no timers exist in `src/` (not yet traced; run `npx jest --detectOpenHandles` if you want to chase it).

## J. E2E re-run after the transaction-timeout fix (your output)

`npm run test:e2e` against the isolated Neon test database: **1 suite, 14 of 14 tests passed** (198 s; slow because of cross-region latency). This now verifies against a real PostgreSQL: cookie auth (HttpOnly, no token in body), CSRF origin block, role enforcement, owner publishes product → public catalogue, consumer cart → order with server-computed totals, order visible to consumer/owning owner/admin but not to other consumers/owners, status propagation, invalid transitions rejected, deactivation hides product, admin approval controls public listing, workshop publish → booking → capacity limit → attendee/booking privacy.
Still not verified by any command: `db:prod:status` (read-only check of the application database), and manual click-through of the three portals against a running stack.

## K. Production migration status (read-only, your output)

`db:prod:status` on the application database (eu-central-1): 3 migrations found; **only** `20261013120000_auth_verification_attempts` and `20261013130000_schema_drift_catchup` are unapplied. The earlier `DATABASE_URL`-only instruction therefore did **not** migrate production, and nothing was applied there by this work. Production is on the original `init` migration.
Apply order when you decide to: (1) create a Neon branch/backup of production, (2) `npm run db:prod:diff` to preview any remaining drift as SQL (read-only), (3) `npx prisma migrate deploy` from `backend/` with the production `.env`, (4) only then deploy the new backend code (it expects `verification_attempts` and the other catch-up columns).

## L. Production schema diff (read-only, your output)

`db:prod:diff` (application database → `schema.prisma`) returned exactly one statement: `ALTER TABLE "users" ADD COLUMN "verification_attempts" INTEGER NOT NULL DEFAULT 0;`. So production already contains `users.username`, `verification_code*`, `businesses.address` and `shop_registrations` (it was synchronised outside migrations), and has **no other drift** in tables, columns, types, defaults, indexes or constraints. The catch-up migration is a no-op there (all `IF NOT EXISTS`); `20261013120000_auth_verification_attempts` adds the single missing column. Not applied — awaiting owner approval. Also fixed: `prod-readonly.mjs` now runs Prisma without a shell so Windows `cmd.exe` no longer splits the connection string at `&`.

## M. Production migration applied; Resend email provider

Production migration (your output): `prisma migrate deploy` applied both pending migrations after the Neon backup branch `pre-migration-2026-10-13` was created; `db:prod:status` = "Database schema is up to date" (3 migrations), `db:prod:diff` = empty migration.

Email (decision: Resend): `ResendMailProvider` in `backend/src/mail/mail.provider.ts` calls `POST https://api.resend.com/emails` with `fetch` (no new dependency), 8 s timeout, one retry on network/429/5xx using the same `Idempotency-Key`, logs only the status code (never key, recipient or body). SMS is refused with 503 (no SMS provider). Env: `MAIL_TRANSPORT=resend`, `RESEND_API_KEY`, `MAIL_FROM`. `validateEnv` now requires these in production and whenever `resend` is selected. Verified by me: 5 new provider unit tests + env validation tests pass (18 tests across `src/mail` and `src/common/guards`), backend `tsc` exit 0. Not verified: a real email delivery (needs your key and verified domain).

## N. Language, feedback button, demo logins, addresses, ratings (2026-10-14)

- **Language (frontend):** `src/i18n/dict/{core,common,auth,public,account,owner,admin}.ts` (typed pairs via `defineDict`, so a key missing in one language is a compile error); `t(key, params)`, `label(prefix, enum)`, `useFormat()` (currency/date/time per language), `useErrorMessage()` / `describeError()` (HTTP status → translated message; server text is never shown). Metadata title/description are translated server-side (`getServerT`). Tests check EN/NL key parity, duplicate keys across modules and matching `{placeholders}`. Static scan: no hardcoded user-visible text left except brand/bank names. Plan descriptions/features are translated by slug (`PLAN_DESCRIPTION_KEYS`, `PLAN_FEATURE_KEYS`). Limits: backend emails are Dutch; API data (names, categories) is shown as stored.
- **Feedback button:** `FeedbackButton.tsx` deleted and removed from `app/layout.tsx`.
- **Demo logins:** see IMPLEMENTATION-STATUS. These passwords are public in the repository; run the seed only on dev/test databases or temporarily, and run `npm run seed:demo:disable` before real launch.
- **Registration:** `MailProvider.supports(channel)`; mobile sign-up is refused (503) before any account is created while no SMS provider exists; UI shows "register with email". Free SMS verification providers were reviewed: none suits production (Twilio trial = verified numbers only; Firebase phone auth needs a billed plan).
- **Addresses:** `backend/src/addresses/*`, frontend `account/addresses` page, checkout pre-fill from the default address.
- **Ratings:** public product list/detail now include `averageRating` and `ratingCount` from PUBLISHED reviews (one grouped query).
- **Still blocked on decisions/inputs:** D-001..D-004, D-006 (owner payouts view/commission), D-008; image upload needs a storage service; chat and virtual store are not built.

## O. Owner portal real data, image upload, content translation (2026-10-14)

- **Demo products removed:** the seed no longer creates the demo product. `npm run demo:products:remove` (backend) is a dry run by default; applying needs `--apply` **and** `ALLOW_DEMO_CLEANUP=yes`, soft-deletes the seeded product and its review, and prints only the DB host. Not run by me on any database.
- **Image upload (Cloudinary):** `POST /api/v1/media/images` (owner/admin, rate-limited, 5 MB, JPEG/PNG/WebP verified by magic bytes, signed server-side upload into `localspotter/users/{userId}`; 503 when unconfigured). Env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server only). Used by Add/Edit Product and Add Workshop (`ServerImageUploader`). The "uploads are not supported" message is gone.
- **Content translation (DeepL API Free):** migration `20261014120000_translations_and_compare_price` adds `translations` (JSONB) + `source_locale` to products, workshops, businesses, shop_routes and `compare_at_price` to products. Create/update translates text to EN and NL (`DEEPL_API_KEY`, optional; keys ending `:fx` use api-free.deepl.com). Saving never fails because of translation. A global interceptor returns text in the language of `?lang=` / `Accept-Language`; the frontend sends the header and refetches on toggle. Limits: cart lines and order item names are snapshots and stay in the language at purchase time; source text in a language other than EN/NL is not kept in `translations`; DeepL free tier is quota-limited (500k characters/month).
- **Owner portal:** Add/Edit/Delete product (sizes XS–XXL, colours, old price, up to 3 photos); cancel workshop (existing bookings are **not** refunded automatically — D-003/D-004); Payouts & Balance is now real (`GET /api/v1/businesses/:id/balance`: gross, refunds, net, paid out, pending, available, recent ledger entries, payout history). No payout-request button and no commission deduction until D-006 is decided. Shoproutes location: address lookup (OpenStreetMap Nominatim, user-triggered), browser geolocation, live OSM map, saves latitude/longitude. Route detail page shows an OSM map of the stops. Stock-photo placeholders replaced by neutral "no image" tiles.
- **Not done / needs a decision:** notification preferences on Settings stay disabled (no backend storage); workshop *edit* form; chat/virtual store.
- **Required steps:** `prisma migrate deploy` (test DB first, then live) and `prisma generate`; set the Cloudinary/DeepL env vars on Render; redeploy.

## P. Login-first entry, any-image upload, Figma shell (2026-10-15)

- **Login first:** the session cookie is now a browser-session cookie (no `Max-Age`), so closing the browser ends the session; `middleware.ts` sends `/` to `/login` unless there is a valid session or the visitor chose "Continue as guest" (`ls_guest` cookie, cleared on logout). After login the role decides the portal as before. The JWT `exp` is still the hard limit.
- **Images:** the uploader accepts any image file (also files with an empty MIME type, e.g. AVIF/HEIC), shrinks it in the browser (WebP, longest edge 2000 px) and uploads it; the backend now accepts JPEG, PNG, WebP, GIF, AVIF, HEIC, BMP and TIFF by magic bytes (max 10 MB). SVG stays rejected on purpose (scripts). Cloudinary converts on delivery (`f_auto`).
- **Figma shell (all portals):** mobile header with rounded bottom + working hamburger menu (browse links, owner/admin links, logout), 4-icon bottom bar (consumer: Home/Orders/Routes/Settings; owner: Home/Orders/Bookings/Settings; admin: Overview/Users/Orders/Settings), Figma login/signup/forgot/reset screens (`AuthShell`), grey filled inputs with small grey labels, Settings as the card list from the Figma frame (consumer `/account`, owner `/owner/settings`; store form moved to `/owner/settings/store`), owner home rebuilt as the shop-profile screen (banner + stats, info card, Producten/Shoproutes/Workshops switch, floating "+"). Order metric tiles moved to the owner Orders page. Dead links removed from the consumer settings (Notifications, Terms, Help had no pages). No Figma frames exist for the admin portal: it only gets the shared header/menu/bottom bar and colours.
- **Then built in Q (below):** chat tab, social login, Notifications/Terms/Help pages.

## Q. Chat, social login, Notifications / Terms / Help (2026-10-15)

- **Chat (consumer <-> shop):** migration `20261015100000_chat` (idempotent SQL) adds `conversations` (one per consumer+business) and `chat_messages`. Endpoints (consumer or owner only, admins are not participants): `POST /conversations {businessId}` (consumer, active shop only), `GET /conversations`, `GET /conversations/unread-count`, `GET /conversations/:id/messages` (latest 200), `POST /conversations/:id/messages` (1-2000 chars, 60/min), `POST /conversations/:id/read`. Non-participants get 404 (no id probing). Frontend: `/chat`, `/chat/[id]` (refreshes every 5 s while the tab is visible), unread badge on the Chat tab, "Chat with shop" on the shop page. Bottom bar is now consumer Home/Orders/Chat/Settings and owner Home/Orders/Chat/Settings; Routes and Bookings stay in the header menu. Limits: polling, not websockets; no push/email on a new message; no attachments; no report/block yet; messages are not moderated.
- **Social login:** `POST /auth/social {provider, token, role?}`. Google ID token is verified at Google's `tokeninfo` (audience = `GOOGLE_CLIENT_ID`, issuer, expiry); the Facebook access token via Graph `debug_token` (app id) + `/me`. Known provider account -> login; same verified email -> provider is linked; otherwise a new account (needs `role`, else 409 `ROLE_REQUIRED`, and the UI asks once). Linking onto a never-verified password account clears that password (stops pre-registration takeover). Admins cannot use it. Buttons only render when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_FACEBOOK_APP_ID` are set. Needs your own Google OAuth client (authorised JavaScript origin = the Vercel URL) and Facebook app (Login, email permission, app live).
- **Notifications:** `/notifications` inbox on the existing endpoints (list incl. read, mark one, mark all). `GET /notifications` now reads `?includeRead=true` (it used to read a request body on GET).
- **Terms & Policy / Help & Support:** `/terms` (8 sections, GDPR rights) and `/help` (FAQ + mailto from `NEXT_PUBLIC_SUPPORT_EMAIL`, hidden when unset), EN/NL. **The legal text is a draft and says so on the page; have it reviewed before launch.** It describes returns generically (D-003 open) and payments generically (D-004 open).
- **Verified:** backend `tsc` clean; new tests: `chat.service.spec` (7), `social-login.spec` (9); `auth.service.spec` still passes; frontend `tsc` clean; 11 frontend tests pass. **Not verified:** the migration on a real DB, a real Google/Facebook login, browser rendering, ESLint.
- **Steps:** `prisma migrate deploy` (test DB first, then live) + `prisma generate`; set `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` on Render and the two `NEXT_PUBLIC_*` ids (+ `NEXT_PUBLIC_SUPPORT_EMAIL`) on Vercel; redeploy both.

## R. Upload fix, shop images, notification settings, 403 reasons, shoproute location (2026-10-16)

- **Image upload root cause:** `apiClient.post/patch/put` always `JSON.stringify`-ed the body, so the uploaded file was sent as the text `{}` and the backend answered 400 ("not a supported image") for every file. FormData is now sent untouched (browser sets the multipart boundary). Regression test: `frontend/src/lib/api/client.test.ts`.
- **Shop logo + cover image (Store Settings):** `PATCH /businesses/:id` accepts `logoAssetId` / `coverAssetId` (UUID of an uploaded `MediaAsset`; `null` removes). The asset must exist. Note: assets carry no owner column, so an owner who knows another asset's id could reference it; ids are random UUIDs and never listed. Add an owner column before opening uploads to untrusted roles.
- **Notification preferences:** migration `20261016100000_notification_preferences` (idempotent) adds `notification_preferences` (per user: orders, reviews, tips). `GET/PUT /notifications/preferences`. New orders and new reviews now create an in-app notification for the shop owner (best-effort, never fails the order/review, honours the switches). **Tips** is stored only: nothing sends tips yet. No email/push for these events yet.
- **Product "no permission" (403):** the backend now attaches a `code` to its 403s: `ORIGIN_BLOCKED` (CSRF guard: the browser's origin is not in Render `CORS_ORIGIN`), `NO_SUBSCRIPTION` (shop has no active subscription; adding products requires one), `NOT_SHOP_OWNER`. The UI shows a specific message for each instead of the generic text. The origin guard itself is unchanged (still strict).
- **Shoproute location:** search no longer forces "Nederland", falls back to city + province if the street is not found, lists up to 5 matches to choose from, never rewrites the typed street/city/province, has editable latitude/longitude, and refuses to save a pin that is stale after the address was edited.
- **Verified:** backend `tsc` clean; notifications, orders specs pass (see report for the rest); frontend `tsc` clean; 13 frontend tests pass. **Not verified:** browser behaviour, migration on a real DB, real Cloudinary upload.
- **Steps:** `prisma migrate deploy` (new migration), Render `CORS_ORIGIN` must include `https://local-spotter-alpha.vercel.app`, `CLOUDINARY_*` must be set (else uploads return 503), redeploy both.

## S. Subscription activation, plan prices/features, My Shop page (2026-10-16)

- **"Your shop needs an active subscription":** adding products needs an ACTIVE subscription (spec 09). In production a chosen plan stays `INCOMPLETE` until a verified payment arrives, and no payment provider exists yet (D-004, open). Until that is decided, the owner can enable the documented pilot switch: set `ALLOW_UNPAID_SUBSCRIPTION_ACTIVATION=true` on Render, redeploy, then open Manage Subscription and press **Activate this plan** (the current plan's button used to be disabled, so a not-yet-active plan could not be re-selected). **This activates plans without payment**; turn it off and wire real payments before charging anyone.
- **Plan prices:** the live plan rows were at EUR 0.00. Migration `20261016120000_plan_prices` sets Webshop 50 / Shoproutes 100 / Workshop 150 only where the price is still 0 (never overwrites a price set on purpose).
- **Plan feature lists** rewritten from the feature matrix in `09-SUBSCRIPTION-SPEC.md` (EN/NL). Removed claims the documents do not make ("Basic statistics", "send notifications", "city maps visibility").
- **Sidebar plan badge** now shows the real plan and state (it was hard-coded to "Workshop / All features active").
- **My Shop page:** the Products / Shop Routes / Workshops tabs and their lists were removed as requested. Side effect: product edit/delete and workshop cancel were only reachable from those lists, so they are currently not reachable from the UI; a dedicated Products page would restore this.
- **Not done:** real recurring payment (D-004), upgrade/downgrade proration, VAT, trial rules (open questions in 09).

## T. Customer city chips and shop visibility

- `/businesses` and `/shoproutes`: hardcoded city chips removed. Chips are now derived (`lib/cities.ts`, de-duplicated, sorted) from the cities of shops/routes owners have published; with no data only "All cities" shows. Each card shows its city.
- Why owner-added shops showed "No shops found": `BusinessesService.getPublicBusinesses` returns only ACTIVE shops with an ACTIVE, unexpired subscription. Admin lists all shops regardless. This rule is unchanged. In production a plan stays INCOMPLETE until payment (D-004, undecided); for the pilot set `ALLOW_UNPAID_SUBSCRIPTION_ACTIVATION=true` on Render, then press "Activate" on Manage Subscription.
- Redirects: onboarding already goes to subscription; selecting a plan that becomes ACTIVE now redirects to `/owner`; the dashboard shows a visibility banner (live + "View as customer" / pending approval / "Activate plan").

## U. Shop routes and workshops by subscription

- The "Jordaan Ambacht & Design Route" and "Ambachtelijk Leerbewerken Workshop" shown to customers are demo rows from `ALLOW_DEMO_SEED=yes npm run seed`, not code. Remove them with `backend/prisma/maintenance/remove-demo-routes-workshops.sql` (run by you; not a migration). Chips/lists then contain only owner-added content.
- Backend: public routes require an approved shop with a running SHOPROUTES/WORKSHOP plan (admin-created routes without a shop stay visible); public workshops require the WORKSHOP plan and ignore non-public `status` filters (drafts could leak before); `createRoute` published only when `publish === true` — inverted; now published unless `publish === false`.
- Owner portal: `/owner/shoproutes` (create with stops, publish/unpublish, delete) and `/owner/workshops` (list, cancel, add) plus sidebar links; both show an upgrade message when the plan lacks the feature (`lib/plan-access.ts` mirrors `SubscriptionEntitlementService`). New workshop redirects to the list.
- Tests: shoproutes (19) and workshops (21) specs pass; frontend 19 tests pass; tsc clean (backend + frontend).
