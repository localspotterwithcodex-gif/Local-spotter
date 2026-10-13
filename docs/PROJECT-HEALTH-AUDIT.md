# LocalSpotter — Project Health Audit (Phase 0)

Date: 2026-10-13 · Scope: read-only audit of `frontend/` (Next.js 16 / React 19 / Tailwind 4) and `backend/` (NestJS 10 / Prisma 5 / PostgreSQL). **No source code was modified in Phase 0.**
Classification: **Confirmed** = proven by code read or a command that was run · **Likely** = evidence points to it, not reproduced · **Unknown** = needs credentials/DB/provider/decision.

## 1. Route map (frontend)

| Portal | Routes (from `frontend/src/app`) |
|---|---|
| Public / Consumer | `/`, `/products`, `/products/[productId]`, `/businesses`, `/businesses/[businessId]`, `/workshops`, `/workshops/[workshopId]`, `/shoproutes`, `/shoproutes/[routeId]`, `/cart`, `/checkout`, `/checkout/success`, `/account`, `/account/{profile,addresses,orders,following,reviews}` |
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password` |
| Onboarding | `/onboarding/business`, `/onboarding/subscription`, `/onboarding/subscription/payment`, `/onboarding/success` |
| Business Owner | `/owner`, `/owner/orders`, `/owner/payouts`, `/owner/products/new`, `/owner/settings`, `/owner/shoproutes/location`, `/owner/subscription`, `/owner/workshop-bookings`, `/owner/workshops/new` (no owner product list / workshop list / chat / virtual-store / finance-ledger routes exist) |
| Super Admin | `/admin`, `/admin/{businesses,orders,payments,payouts,products,reviews,subscriptions,users}` |
| Next API route | `/api/shop-registrations` (writes to **MongoDB** — see LS-010) |

Backend (NestJS, prefix `/api/v1`): modules `auth, users, businesses, products, cart, orders, payments, subscriptions, workshops, shoproutes, reviews, followers, notifications, admin, shop-registrations, health`. **Absent:** chat/messaging, virtual store media, returns, commission config, fulfilment-method config, file upload, payout scheduling, guest checkout.

## 2. Baseline checks actually run

| Check | Result |
|---|---|
| `backend: npx tsc --noEmit` | **PASS** (exit 0) |
| `backend: npx jest --preset ts-jest` | **INCOMPLETE** — `admin.service.spec.ts` PASS (101 s); full run exceeded the 170 s tool limit in two attempts. Re-run locally: `cd backend && npm test`. |
| `backend: npx prisma validate` | **BLOCKED** — Prisma engine checksum download returns 403 in this sandbox. Run locally. |
| `backend: npx prisma generate / migrate status`, health endpoint vs DB | **BLOCKED** — no DB/credentials, engine download blocked |
| `frontend: npm install` | **BLOCKED** — sandbox registry access incomplete (install timed out, `node_modules/.bin` never created) |
| `frontend: npm run typecheck / lint / build` | **BLOCKED** — depends on the install above. Run locally. |
| Browser/E2E journeys | **NOT RUN** (no running stack) |

## 3. Findings

Severity: Critical / High / Medium / Low.

| ID | Sev | Class | Portal / area | Finding & evidence | Expected | Minimal fix | Proof test | Phase |
|---|---|---|---|---|---|---|---|---|
| LS-001 | Critical | Confirmed | All portals | `frontend/src/lib/api/index.ts` serves every catalog/order/workshop/route/review/plan call from `MOCK_*` arrays with `setTimeout` delays; writes (`createProduct`, `bookWorkshop`, `updateOrderStatus`) mutate in-memory arrays and "succeed". Only `AuthContext` and `onboarding/business` use `apiClient`. Admin pages (`businesses, orders, products, reviews, subscriptions`) import `MOCK_*` directly; `checkout/page.tsx:30` uses `setTimeout` then redirects (fake order). | Persisted via backend; no false success | Replace methods one feature at a time with typed `apiClient` calls; delete mock use from prod paths | create→reload→still there, per entity | 3 |
| LS-002 | Critical | Confirmed | Backend auth | `auth.module.ts:16` and `jwt.strategy.ts:22` fall back to a hard-coded JWT secret when `JWT_SECRET` is unset → anyone can forge admin tokens on a misconfigured deploy. | Fail at boot if secret missing | Remove fallback; throw on startup; enforce min length | Boot test without `JWT_SECRET` fails | 1 |
| LS-003 | High | Confirmed (code) | Backend routing | `ShopRoutesController` is `@Controller('shop-routes')` but methods repeat `'shop-routes'` → `/shop-routes/shop-routes`; `maps/businesses`, `businesses/:id/shop-routes` also under the wrong prefix. `WorkshopsController` same (`/workshops/workshops`). In `workshops.controller.ts`, `GET workshops/:workshopId` (l.47) is declared before `GET workshops/bookings` (l.146) so "bookings" is captured as an id. Not yet reproduced against a running server. | Documented paths (`/workshops`, `/shop-routes`, `/businesses/:id/workshops`…) | Make controllers `@Controller()` with explicit full paths; order static routes first | e2e route test per path | 3 |
| LS-004 | High | Confirmed | Owner / Consumer | Hard-coded identities: `"bus-1"` (`owner/page.tsx:53`, `owner/orders:23`, `owner/products/new:64`) and `"cons-1"` (`account/orders:21`, `workshop-bookings:19`); `api.bookWorkshop` fabricates consumer "Sanne de Jong". Source TODO at `owner/page.tsx:50`. | Identity from `/auth/me` + `/businesses/my` | Resolve business via `GET /businesses/my`; never send ownerId from client | Owner A sees only A | 3/5 |
| LS-005 | High | Confirmed (conflict) | Orders/cart | `Order` has a single `businessId` and mandatory `consumerProfileId`; no Customer-Order/Merchant-Order split; `CartController` and `POST /orders` are `@Roles(CONSUMER)` only → multi-store checkout (FR-CART-05) and guest checkout (FR-GUEST-01) impossible. | Requirements §6, §9, §10 | Schema redesign + migration (see D-001/D-002) — needs owner decision | Multi-store + guest order test | 6/7 |
| LS-006 | High | Likely | Payments | `PaymentsService.createPaymentIntent` accepts `providerTransactionId` and falls back to client `dto.amount` for non-workshop/subscription purposes; `updatePaymentStatus` ("webhook handler") sets any status with no signature/provider verification; no provider SDK, no webhook controller route located. Violates FR-PAY-03/07. | Paid only after verified provider webhook; idempotent | Provider adapter + signed webhook endpoint + `PaymentWebhookEvent` idempotency | Replay/forged webhook test | 6 |
| LS-007 | High | Confirmed | Auth/redirects | `login/page.tsx` ignores `redirectTo` (middleware sets it); consumer always → `/products` (spec: `/` or approved); no same-origin validation helper; logged-in users opening `/login`/`/signup` are not redirected; `BUSINESS_OWNER` always → `/owner` even when no business/onboarding incomplete. | See Phase 2 spec | Central `safeRedirect()` + `routeForRole()` | Redirect matrix tests incl. `//evil.com` | 2 |
| LS-008 | High | Confirmed | Session | Token stored in `localStorage` and mirrored in a JS-readable cookie without `Secure`; 7-day JWT; no refresh/revocation; cookie/localStorage can drift (documented in `AuthContext.tsx`). Middleware only checks cookie presence — no role check, so a consumer can load `/admin` or `/owner` shells (API still returns 403). | httpOnly Secure cookie set by backend; role-aware UX guard | Backend sets cookie; middleware decodes role claim for UX only | Role-mismatch route test | 2 |
| LS-009 | High | Confirmed | Auth backend | Verification code uses `Math.random`, stored in plaintext, and is only `console.log`ged (`auth.service.ts:106-116`); no email/SMS provider → real users cannot verify. Forgot-password flow delivery not verified. No rate limiting or `helmet` (absent from `package.json`). | CSPRNG, hashed code, provider-backed delivery, throttling | `crypto.randomInt`, hash, provider interface, `@nestjs/throttler` | Unit + throttle test | 2 |
| LS-010 | High | Confirmed | Data architecture | `frontend/src/app/api/shop-registrations/route.ts` + `lib/mongodb.ts` store shop registrations in **MongoDB**, while backend has a Prisma `ShopRegistration` model/module on PostgreSQL → two stores; GET guarded by a shared-secret header, not RBAC. README still says MongoDB. | One system of record | Point widget at `POST /api/v1/shop-registrations`; retire Mongo route after data migration decision | Widget submit appears in admin | 3 |
| LS-011 | Medium | Likely | Prisma | Only migration `20260906103004_init` (38 `CREATE TABLE`) vs 39 models in `schema.prisma`; `shop_registrations` is not in the migration SQL → schema/migration drift; extra `manual-supabase-admin-setup.sql` is outside migration history. | `prisma migrate status` clean | Add forward migration after drift check (never edit applied one) | `migrate diff` empty | 1/6 |
| LS-012 | Medium | Confirmed | Revenue | `PLATFORM_COMMISSION_PERCENTAGE` is documented in `.env.example` but unused in `src/`; no configurable commission model (BR-REV-01/02), no weekly payout job (§12), `FLAT_SHIPPING_FEE` env only (no per-store fulfilment, FR-FUL-01). | Config in DB by store/plan/type | New tables + admin UI | Ledger tests | 6/9 |
| LS-013 | Medium | Confirmed | i18n | `LocaleProvider` initial state `"en"` but `<html lang="nl">`, UI copy is largely hard-coded Dutch; only 9 of 72 component/page files use `useLocale`; dictionaries are `en`/`nl` (171 lines); locale read in `useEffect` → flash/hydration mismatch; login errors/placeholders not translated. | One persisted locale across 3 portals | Server-read cookie in root layout; extend dictionaries | Locale persistence test | 4 |
| LS-014 | Medium | Confirmed | Features | No chat, virtual store, media upload/object storage endpoints (only `create-product-image.dto.ts`), returns, fulfilment config, guest cart. These are MVP-MUST in Requirements §33. | See requirements | Phase 7–9 | per feature | 7–9 |
| LS-015 | Medium | Confirmed | Status model | Backend `OrderStatus` = PENDING/CONFIRMED/PREPARING/READY/OUT_FOR_DELIVERY/DELIVERED/CANCELLED/REJECTED vs requirements `new→paid→processing→ready/shipped→completed, cancelled, refunded`; payment methods IDEAL/PAYPAL/TIKKIE/CARD/BANK_TRANSFER vs "relevant Dutch methods incl. iDEAL". | Mapped, documented | Decision D-003 | Mapping test | 6 |
| LS-016 | Low | Confirmed | Seed/secrets | `prisma/seed.ts` creates well-known credentials (e.g. admin/owner/consumer demo passwords). Fine for dev; must never run against production. `.env` is git-ignored and untracked (verified with `git ls-files`). | Guard seed by `NODE_ENV` | Refuse to run in production | seed guard test | 6 |
| LS-017 | Low | Confirmed | Docs | README is a 12-line stub mentioning MongoDB; backend uses PostgreSQL. | Verified setup docs | Phase 12 | — | 12 |
| LS-018 | Unknown | Unknown | Deploy | Payment provider (Mollie/Stripe/other), email/SMS provider, object storage, map provider, retention periods, subscription pricing/commission % are undecided (Requirements §35). | Owner decisions | — | — | blocker |

## 4. Prioritised repair plan

1. **Phase 1 (do first, small):** LS-002 (secret fallback), LS-011 drift check, reproducible install/test commands, README/.env.example correction.
2. **Phase 2:** LS-007/008/009 auth + redirects (safe `redirectTo`, role destinations, backend cookie decision).
3. **Phase 3:** LS-003, LS-004, LS-001, LS-010 — fix backend paths first, then migrate frontend mock methods feature by feature (catalog → owner → admin → orders).
4. Phase 5/6 after owner decisions D-001…D-006 (multi-store order model, guest checkout, payments).

## 5. Gate

Baseline and prioritised plan exist; critical risks identified: LS-001, LS-002, LS-005, LS-006. Phase 0 status: **PASS (audit complete)** — with frontend/Prisma/test-suite baseline checks **BLOCKED/incomplete** in this sandbox (commands listed in §2).


## 6. Status after the repair round (2026-10-13)

Evidence and per-fix detail: `REPAIR-CHANGELOG.md`. "Fixed (unit-tested)" = verified by tests that run; "Fixed (not executed live)" = implemented, statically checked, not run against a live stack.

| ID | Status | Note |
|---|---|---|
| LS-001 mock API | Fixed (not executed live) | all portals use real endpoints; mock data deleted |
| LS-002 JWT fallback | Fixed (unit-tested) | env validation + no fallback |
| LS-003 route prefixes / shadowing | Fixed (unit-tested) | `routes.spec.ts` |
| LS-004 `bus-1`/`cons-1` | Fixed (not executed live) | `useMyBusiness`, server-scoped queries |
| LS-005 order model | **Open – D-001** | single-store model kept |
| LS-006 payments | Partly fixed (unit-tested) | server-derived amounts, validated/transactional/auditable refunds; **no PSP + signed webhook yet (D-004)** |
| LS-007 redirects | Fixed (unit-tested) | |
| LS-008 session | Fixed (unit-tested) | HttpOnly cookie, CSRF origin check; no refresh/revocation |
| LS-009 OTP | Fixed (unit-tested) | email only; production needs a mail provider |
| LS-010 MongoDB | Fixed | Postgres only; old leads not migrated |
| LS-011 migration drift | Partly fixed | catch-up migration written; **needs `prisma migrate status/diff` locally** |
| LS-012 commission | Open – D-006 | |
| LS-013 i18n | Partly | persistence + parity test; coverage 10/44 pages; default language D-008 |
| LS-014 missing features | Open | chat, virtual store, uploads, returns |
| LS-015 status vocabulary | Open – D-005 | mapping layer not built |
| LS-016 seed credentials | Open | do not run seed in production |
| LS-017 README | Fixed | rewritten for PostgreSQL + current commands |
| LS-018 owner inputs | Open | |

New findings fixed this round: public workshop endpoint leaked attendees and business KvK/contact data; reviews endpoint returned other businesses' reviews and used a non-existent user field; followers controller used a non-existent user field; `selectPlan` activated paid plans for free; workshop DTO `@Min` on a string rejected every create; forgot/reset-password pages were fakes; migrations lacked `users.username`/`verification_code*`, `businesses.address`, `shop_registrations`.

Gate: **not yet complete.** Remaining before completion: run the local commands (build, prisma, full test, e2e against a test DB), owner decisions D-001…D-004/D-008, and a manual click-through of each portal.
