# LocalSpotter — Project Health Audit, Phase 0 (MASTER-PROMPT v2)

Date: 2026-11-18 · Read-only audit for `MASTER-PROMPT.md` Phase 0. **No application code, configuration, dependency, database or deployment was changed.**
Previous audit (2026-10-13) stays in `docs/PROJECT-HEALTH-AUDIT.md`.

Audited: working tree `feature/signup-redesign` @ `dcf6be5` (= `main` @ `a7e0aca` + sign-up redesign), and `security/production-hardening` @ `f93ba75` (separate worktree). Machine: Windows 11, Node v24.22.1, npm 11.19.0.
Labels: **PASS** · **FAIL** · **BLOCKED** (could not run; command given) · **NOT RUN**.

---

## 1. Inventory

| Path | Purpose | Notes |
|---|---|---|
| `frontend/` | Next.js App Router, React 19, Tailwind 4, TypeScript | 200 tracked files in `src/`; `package-lock.json` tracked |
| `backend/` | NestJS 10, Prisma 5.22, PostgreSQL | 258 tracked files in `src/`; `package-lock.json` tracked |
| `backend/prisma/` | `schema.prisma`, 27 migrations, `seed.ts` (demo, guarded), `disable-demo-users.ts`, `remove-demo-products.ts`, `maintenance/remove-demo-routes-workshops.sql`, **`manual-supabase-admin-setup.sql` (contains a known admin password, see G-01)** | |
| `backend/scripts/` | `with-test-db.mjs` (e2e against a test DB), `prod-readonly.mjs` (migrate status/diff only) | |
| `backend/test/` | `cross-portal.e2e-spec.ts` (needs a test database) | |
| `docs/` | 44 tracked docs: specs 01–39, decisions, gap analysis, release guide, audits | |
| `.claude/skills/` | project skill(s) | |
| Root | `README.md`, `PROMPT.md`, `CLAUDE.md`, `AGENTS.md`, three `CHANGELOG_*.md` (contain demo passwords), `SHOP_REGISTRATION_WIDGET_CHANGES.md` | untracked: `MASTER-PROMPT.md`, `.agents/`, `.claude/launch.json`, `skills-lock.json` |
| Root stray | empty tracked file **`git`** (0 bytes, commit `c4fd19b`); Python stub `pyproject.toml` / `requirements.txt` / `.python-version` (no `.py` files tracked; local `.venv/` ignored) | remove or document |

Package managers: npm only (no yarn/pnpm locks). **No Node version pinned** (`engines` unset in both `package.json`, no `.nvmrc`). **No CI** (`.github/` absent).

## 2. Frontend map

- **77 pages**, one root `layout.tsx`; portal shells are components (`ConsumerLayout`, `OwnerLayout`, `AdminLayout`).
  - Public/consumer: `/`, `/products`, `/products/[productId]`, `/businesses`, `/businesses/[businessId]`, `/workshops`, `/workshops/[workshopId]`, `/shoproutes`, `/shoproutes/[routeId]`, `/cart`, `/checkout`, `/checkout/success`, `/payment/return`, `/guest/orders`, `/chat`, `/chat/[id]`, `/notifications`, `/help`, `/terms`, `/privacy-policy`, `/privacy-settings`, `/data-deletion`, `/account` + `addresses, favorites, following, orders, profile, reviews`.
  - Auth: `/login`, `/signup`, `/forgot-password`, `/reset-password`.
  - Onboarding: `/onboarding/business`, `/onboarding/subscription`, `/onboarding/subscription/payment`, `/onboarding/success`.
  - Owner: `/owner` + `orders, payouts, products, products/new, products/[productId]/edit, returns, settings, settings/{fulfilment,store,team}, shoproutes, shoproutes/location, subscription, workshop-bookings, workshops, workshops/new, workshops/[workshopId]/participants`.
  - Staff (employees): `/staff`, `/staff/accept`, `/staff/[businessId]/{orders,returns,workshops,workshops/[workshopId]}`.
  - Admin (17): `/admin` + `businesses, categories, chat-reports, commission, orders, payments, payouts, products, returns, reviews, shoproutes, subscriptions, translation, users, workshops`.
- No Next.js route handlers (`route.ts`); the old MongoDB shop-registration route is gone.
- `src/middleware.ts`: reads JWT claims (role, exp) from `ls_session` to route by role; the backend is the authorization boundary. **Next.js 16 renamed Middleware to Proxy** (`proxy.ts`, same behaviour; installed docs `next/dist/docs/01-app/01-getting-started/16-proxy.md`).
- `next.config.ts`: rewrite `/api/v1/*` → `BACKEND_URL` (first-party cookie); `images.remotePatterns` Unsplash + Cloudinary.
- API client `src/lib/api/client.ts` (+ `admin.ts`, `mappers.ts`); i18n: typed EN/NL dictionaries in `src/i18n/dict/*` with a parity test.
- **Mock data: none left** (`MOCK_`/mock imports: 0 hits) — October finding LS-001 is resolved.

## 3. Backend map

- 31 modules, 38 controllers, 35 services, 68 DTO files, 50 spec files; global prefix `/api/v1`; global `ValidationPipe` (whitelist, forbidNonWhitelisted), `PrismaExceptionFilter`, global `OriginCheckGuard` (CSRF).
- Modules: addresses, admin, auth, businesses, cart, chat, common, config, employees, favorites, finance, followers, guest, health, mail, media, notifications, orders, payments, prisma, privacy, products, returns, reviews, shop-registrations, shoproutes, subscriptions, translation, users, views, visual-search, workshops.
- **216 routes.** Authorization check (script over all controllers, class- and method-level decorators):
  - **16 public routes**, all intended: `POST /auth/logout`, `GET /health`, catalogue reads (`/businesses*`, `/products*`, `/shop-routes*`, `/workshops`, `/maps/businesses`, `/subscriptions/plans`, `/businesses/:id/reviews`, `/businesses/:id/hours`, `/products/categories`, `/businesses/categories`).
  - **All 55 `/admin/**` routes require `SUPER_ADMIN`.** PASS.
  - 6 job endpoints under `/internal/jobs/*` (`cleanup-guests`, `expire-unpaid-bookings`, `expire-unpaid-orders`, `subscription-reminders`, `weekly-payouts`, `chat-retention`), all `CronSecretGuard`, all `POST` + `x-cron-secret`.
  - Ownership/tenant checks live in services (shop membership via `EmployeesService`); covered by `test/cross-portal.e2e-spec.ts` (NOT RUN here, needs a test DB).
- Routes no static frontend string refers to (22). Expected: jobs, webhook, health, `/auth/verify-code` + `/auth/resend-code` (legacy pending accounts), `/maps/businesses`. Dynamic paths (false positives): favorites `PUT/DELETE`. **Verify whether a UI exists for**: `GET /admin/comments`, `PATCH /admin/comments/:id/moderation`, `GET/PATCH /admin/reports`, `GET /admin/payment-stats`, `GET/PATCH /users/profile/business-owner`.

## 4. Database map

- `schema.prisma`: **50 models** (49 on `main` + `PhoneVerification`), **23 enums**, 83 foreign-key relations (31 `onDelete: Cascade`, 2 `SetNull`), 21 `@@index`, 19 `@@unique`, 16 `@unique`.
- Users: `users` + `consumer_profiles` + `business_owner_profiles` (both FK → `users`); orders: `customer_orders` (one checkout) → `orders` (per shop) → `order_items`, `order_status_events` (written inside each status transaction); payments: `payments`, `payment_webhook_events` (idempotent), ledger `business_ledger_entries`, `payouts`; media: `media_assets` (url, mime, size only) with FK users from profiles, businesses (logo/cover/panorama/video), product images, workshops, `review_images`, chat attachments.
- Migrations: **27** (`20260906103004_init` … `20261102100000_phone_verifications`), plus `20261101100000_security_hardening` on the security branch. **No `DROP`, `TRUNCATE` or `DELETE` in any migration.** The old Neon database has 26 applied (census 2026-11-18).
- Seed: `seed.ts` exits unless `ALLOW_DEMO_SEED=yes`; creates demo logins (G-01). `disable-demo-users.ts` locks them.
- **NOT RUN:** `prisma migrate deploy` of all migrations on an **empty** database (what the new Supabase project will do). Command: `DATABASE_URL=<empty test db> DIRECT_URL=<same> npx prisma migrate deploy` (a throwaway local Postgres works).

## 5. Environment map

| Side | Read by code | In `.env.example` | Read but undocumented | Documented but unread |
|---|---|---|---|---|
| Backend | 38 | 35 | `ALLOW_DEMO_CLEANUP`, `ALLOW_DEMO_SEED`, `GEMINI_VISION_MODEL`, `SWAGGER_ENABLED` | `API_PUBLIC_URL` |
| Frontend | 5 (`BACKEND_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NODE_ENV`, `VERCEL`) | 4 | — | `MONGODB_URI` (and `mongodb` is still a frontend dependency, imported nowhere) |

Boot validation: `src/config/env.validation.ts` requires `JWT_SECRET` (minimum length); `JWT_SECRET` read with `getOrThrow`, no fallback (October LS-002 resolved). Local `backend/.env` (not tracked, never committed) holds stale names the code no longer reads: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `ALLOW_UNPAID_SUBSCRIPTION_ACTIVATION`, frontend variables.

## 6. Integrations

| Provider | Where | Without keys |
|---|---|---|
| Stripe Checkout (iDEAL) | `payments/stripe.gateway.ts` (REST, manual HMAC webhook check over raw body), `payments-webhook.controller.ts` | `UnconfiguredPaymentGateway` is bound (payments unavailable). Startup probe creates a trial checkout 5 s after boot (`payments.service.ts` `onApplicationBootstrap`) |
| Twilio Verify | `auth/sms/sms-verifier.ts` | `UnconfiguredSmsVerifier`; on the sign-up branch sign-up returns 503 (no SMS channel) |
| Cloudinary | `media/image-storage.ts`, `media/video-storage.ts` (REST, signed) | `UnconfiguredImageStorage` / `UnconfiguredVideoStorage`: uploads fail |
| Resend | `mail/mail.provider.ts` | `MAIL_TRANSPORT=dev-file` writes `.dev-outbox/`; rejected in production |
| DeepL, Gemini, Google sign-in | `translation/`, `visual-search/`, `auth/social/` | feature unavailable; exact behaviour not verified in this audit |

## 7. Security findings

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| S-01 | Critical | **Public repository** with a plaintext admin password and its bcrypt hash | GitHub API answered anonymously (2026-11-18); `backend/prisma/manual-supabase-admin-setup.sql` (added in `9f9cd9d`) |
| S-02 | High | Demo passwords in tracked docs | `CHANGELOG_ROUND2.md`, `CHANGELOG_ROUND3.md`, `CHANGELOG_THIS_PASS.md`, `docs/IMPLEMENTATION-STATUS.md`, `backend/prisma/seed.ts` |
| S-03 | — PASS | History scan (all branches) for live/test Stripe keys, `whsec_`, Resend, DB URLs with passwords, private keys, Google, AWS, Twilio, Cloudinary URLs | only hits: short fake fixtures in 3 spec files (`c4fd19b`), the deliberate dummy bcrypt hash in `auth.service.ts`, a test fixture hash, and S-01. **No `.env` ever committed**; `.gitignore` covers `.env*` |
| S-04 | Critical (dependency) | Next.js 16.3.4: RCE in `next/og` `ImageResponse` (fixed 16.4.6). App does not use `next/og` | `npm audit --omit=dev` (frontend); security branch only goes to 16.4.3 |
| S-05 | Critical (dependency) | `proxy-addr`: IP spoofing via IPv4-mapped IPv6 trust subnet; matters because `TRUST_PROXY` + per-IP rate limits rely on it. Non-breaking fix available | backend `npm audit --omit=dev` |
| S-06 | High (dependencies) | backend: 15 vulnerabilities (2 critical: `proxy-addr`, `tar` via bcrypt build tooling; 9 high: `multer` DoS, `body-parser` DoS, `lodash`, `js-yaml`, `brace-expansion`, …). Most fixes need NestJS major upgrades. Frontend: 4 (Next critical, `sharp`, `source-map-js`, `zod` — unused, removed on security branch) | `npm audit --omit=dev` |
| S-07 | High (on `main`) | In-memory rate limiter: no protection across serverless instances | `common/guards/rate-limit.guard.ts`; fixed on security branch (Postgres `rate_limit_hits`) |
| S-08 | Medium (on `main`) | No security headers / CSP; sessions not revocable; admin without second factor | fixed on security branch |
| S-09 | — PASS | CSRF: `OriginCheckGuard` + SameSite=Lax HttpOnly cookie; open redirect: `safeRedirect`; no `$queryRawUnsafe`/`$executeRawUnsafe` in `src/`; no `dangerouslySetInnerHTML`; uploads check magic bytes and size; purpose tokens rejected as sessions | code read |

## 8. Serverless blockers (Vercel)

| # | Blocker | Evidence |
|---|---|---|
| B-01 | Bootstrap calls `app.listen` | `src/main.ts` (Vercel's NestJS support detects `src/main.ts`; verify in Phase 7) |
| B-02 | Request body > 4.5 MB through the API | image upload ≤ 10 MB (`media.controller.ts`, multer), chat attachments ≤ 10 MB, visual-search upload |
| B-03 | Cron contract | jobs are `POST` + `x-cron-secret`; Vercel Cron sends `GET` + `Authorization: Bearer <CRON_SECRET>` |
| B-04 | Timer after boot | Stripe trial checkout 5 s after every start → every cold start |
| B-05 | 15 modules each create their own `PrismaService` (own connection pool) besides the global `PrismaModule` | `providers: [... PrismaService ...]` in addresses, chat, employees, favorites, finance, followers, media, notifications, payments, privacy, returns, reviews, shop-registrations, views, … |
| B-06 | In-memory state | rate limiter (fixed on branch), view de-duplication maps in `products.service.ts`, `views.service.ts` (accuracy only) |
| B-07 | File-system writes | `MAIL_TRANSPORT=dev-file` writes `.dev-outbox/` (development only; rejected in production) |

No WebSockets, SSE or background workers. PASS.

## 9. Baseline checks actually run

### Working tree `feature/signup-redesign` (`dcf6be5`)
| Check | Result |
|---|---|
| backend `npm ci` | PASS (23 s) |
| backend `npx prisma validate` / `generate` | PASS / PASS |
| backend `npx tsc --noEmit` | PASS |
| backend `npm run build` | PASS |
| backend `npm run lint` | **FAIL — cannot run**: `eslint` is not a backend dependency and there is no `eslint.config.*` |
| backend `npm test` (jest, `--runInBand`) | **FAIL 3 / 639** (636 pass, 50 suites): `app.module.spec` reads the real `STRIPE_SECRET_KEY` from local `.env` (test isolation); `chat.service.spec` expects the query from before "hide finished chats"; `payout-account.service.spec` has a typo in the expected account number. Pre-existing; the last two are fixed on the security branch |
| backend `npm audit --omit=dev` | 15 vulnerabilities (4 moderate, 9 high, 2 critical) — S-05, S-06 |
| frontend `npm ci` | PASS (Next 16.3.4) |
| frontend `npx tsc --noEmit` | PASS |
| frontend `npm run lint` | **FAIL: 3 errors, 3 warnings** — `components/charts/AdminCharts.tsx:286` (reassign after render), `components/orders/OrderTracker.tsx:22` and `components/search/SmartSearchInput.tsx:49` (setState directly in an effect) |
| frontend `npm test` | PASS 40/40 |
| frontend `next build` (`BACKEND_URL` set) | PASS |
| frontend `npm audit --omit=dev` | 4 vulnerabilities (3 high, 1 critical) — S-04 |

### `security/production-hardening` (`f93ba75`)
| Check | Result |
|---|---|
| backend `npm ci`, `prisma generate`, `tsc --noEmit`, `build` | PASS |
| backend `prisma validate` | PASS with `DATABASE_URL`/`DIRECT_URL` set (fails only on the missing env in a bare worktree) |
| backend `npm test` | **PASS 627/627** (50 suites) |
| frontend `npm test` | PASS 34/34 |
| frontend `npm ci`, `tsc`, `lint`, `build`, `audit` | **BLOCKED: drive C: was full (0 MB free)** during `npm ci`. After removing my temporary worktree: 523 MB free. Re-run in Phase 0.5: `cd frontend && npm ci && npx tsc --noEmit && npm run lint && npx next build && npm audit --omit=dev` |

Not run: e2e suite (`npm run test:e2e`, needs a test DB), migrations on an empty DB, browser journeys.

## 10. Gap list vs MASTER-PROMPT and requirements

| ID | Sev | Gap | Evidence | Minimal fix | Proving test |
|---|---|---|---|---|---|
| G-01 | Critical | Public repo + admin password + demo logins | S-01, S-02 | Repo private now; rotate every committed secret; delete the SQL file and demo passwords from docs (Phase 1) | history secret scan; `git grep` for demo passwords = 0 |
| G-02 | Critical | Next.js RCE advisory | S-04 | Next ≥ 16.4.6 (security branch bump is not enough) | `npm audit --omit=dev` without the advisory; `next build` |
| G-03 | High | `proxy-addr` IP spoofing | S-05 | `npm audit fix` (non-breaking) in backend | audit clean for it; rate-limit test |
| G-04 | High | Backend dependency backlog | S-06 | Plan the NestJS major upgrade separately; not in this migration unless approved | audit + full test suite |
| G-05 | High | Two unmerged, mutually conflicting branches | §9; conflicts in `auth.service.ts`, its spec, `schema.prisma` | Phase 0.5: merge security branch, then sign-up branch, via PRs | both suites green after merge |
| G-06 | High | Serverless blockers | B-01…B-05 | Phase 7 + Phase 4 (signed direct uploads) | Vercel preview: upload > 4.5 MB works via signed URL; cron GET with Bearer works; jobs idempotent |
| G-07 | High | Backend lint missing | §9 | Add ESLint + config (one PR) | `npm run lint` exits 0 |
| G-08 | Medium | Frontend lint errors | §9 | Fix the 3 components without visual change | `npm run lint` 0 errors |
| G-09 | Medium | 3 failing backend tests | §9 | Fixed by merging the security branch (2) + isolate env in `app.module.spec` (1) | `npm test` all green |
| G-10 | Medium | No Node pin, no CI | §1 | `engines.node` + `.nvmrc` matching Vercel's Node; GitHub Actions for typecheck/lint/test/build + `migrate deploy` (prompt Phase 2) | CI green on a PR |
| G-11 | Medium | Migrations never run on an empty DB in this audit | §4 | Run `prisma migrate deploy` on a throwaway Postgres before Supabase staging | deploy exits 0; `prisma migrate status` clean |
| G-12 | Medium | Env documentation gaps | §5 | Document the 4 undocumented vars; drop `API_PUBLIC_URL` from required lists; remove `MONGODB_URI` and the `mongodb` dependency | env-map diff empty |
| G-13 | Medium | Decisions log contradicts code (D-004 says Mollie; code is Stripe) | `docs/DECISIONS-AND-CONFLICTS.md` | Correct D-004 | doc review |
| G-14 | Low | Admin endpoints possibly without UI | §3 | Confirm or add pages (Phase 6) | page renders data |
| G-15 | Low | Stray files | §1 | Remove empty `git`; remove or document Python stub | `git ls-files` |
| G-16 | — | New work from MASTER-PROMPT not present yet (expected): Bird SMS, login/reset OTP, `media_assets` metadata + Supabase Storage, review media, plan entitlement columns, owner replies, admin monthly reports, portal split + `proxy.ts`, RLS, order SMS + `sms_messages`, `notify_phone_e164` | code search | Phases 3–9 | per-phase gates |

### Environment issue found during the audit
Drive **C: ran out of space** (0 MB free; 523 MB after cleanup). Docker Desktop's WSL data is about 5.9 GB. Free space before Phase 0.5 installs (owner's decision what to remove).

---

**Gate: Phase 0 report delivered. STOP — waiting for the owner's "APPROVED". No changes were made.**

---

## Status after Phases 0.5–11 (2026-11-23)

Branch `feature/production-migration` (on top of `feature/signup-redesign`, which contains `security/production-hardening`). None of it is on `main` until the pull requests are merged.

| Gap | Status |
|---|---|
| G-01 public repo, committed admin password, demo logins | **Code done** (SQL file deleted, docs scrubbed, `create-admin.ts`, `seed-plans.ts`). **Owner:** make the repo private, rotate secrets |
| G-02 Next.js advisory | Done (16.4.6) |
| G-03 `proxy-addr` | Open: `npm audit fix` changed nothing for it and added a finding; needs the NestJS upgrade (G-04) |
| G-04 dependency backlog | Open (NestJS major upgrade, separate project); CI reports `npm audit` |
| G-05 two unmerged branches | Merged into the sign-up branch; **owner:** open/merge the PRs |
| G-06 serverless blockers | Done in code: Vercel Cron (GET + Bearer), one Prisma client, no Stripe probe on cold start, direct uploads (no large bodies through the API). Vercel preview: **owner** |
| G-07 backend lint | Open: no ESLint in the backend; CI runs the type check instead |
| G-08 frontend lint errors | Done (0 errors) |
| G-09 failing backend tests | Done in CI (753/753). Locally `app.module.spec` still reads a Stripe key from a developer's `backend/.env` |
| G-10 Node pin, CI | Done (`.nvmrc` 24, `engines`, `.github/workflows/ci.yml`) |
| G-11 migrations on an empty DB | Done (30 migrations, zero drift, in CI) |
| G-12 env documentation | Done (`ENVIRONMENT.md`, both `.env.example`) |
| G-13 D-004 Mollie vs Stripe | Done (corrected) |
| G-14 admin endpoints without UI | Open (not part of the master prompt's phases) |
| G-15 stray files | Open (`git` empty file, Python stub) |
| G-16 master-prompt features | Done in code: Phases 3–9 (see `DEPLOYMENT.md`); gates that need Supabase, Bird or Vercel are BLOCKED on the owner's accounts |

Checks on 2026-11-23: backend 753 unit tests and 14 end-to-end tests pass (fresh database), frontend 39 tests, type
checks, lint (0 errors) and production build pass. Not run: anything against real Supabase, Bird or Vercel.
