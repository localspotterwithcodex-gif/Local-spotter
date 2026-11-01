# LocalSpotter — Production Audit

Date: 2026-11-01 · Scope: `backend/` (NestJS 10.3, Prisma 5.22, PostgreSQL), `frontend/` (Next.js 16.3.4, React 19.2.8, Tailwind 4), deployment (Vercel frontend, Render backend per `frontend/next.config.ts`).
Method: source read + targeted greps, existing unit tests (48 suites, 604 tests), live site checks. Findings are only listed when verified in code.

Priorities: **P0** critical security/data loss · **P1** required before launch · **P2** important MVP improvement · **P3** later.

## 1. Existing architecture

- **Modular monolith** NestJS API, ~30 modules, global prefix `/api/v1`, global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, global `PrismaExceptionFilter`, global `OriginCheckGuard` (APP_GUARD).
- **Frontend** Next.js App Router; the browser only calls its own origin, `next.config.ts` rewrites `/api/v1/*` to `BACKEND_URL` so the session cookie is first-party. `src/middleware.ts` routes by JWT claims (does not verify; backend is the boundary).
- **Roles** (`UserRole`): `SUPER_ADMIN`, `BUSINESS_OWNER`, `CONSUMER`; guest = consumer with `isGuest`; shop staff = `MerchantEmployee` (role per shop).
- **Data**: ~50 Prisma models, 26 forward-only migrations. Money in `Decimal(10,2)` and ledger in integer cents.
- **Integrations** (raw HTTPS, no SDKs): Stripe Checkout (iDEAL), Resend, Cloudinary (signed uploads), DeepL, Gemini, Google ID-token verification.
- **Jobs**: `POST /internal/jobs/*` behind `CronSecretGuard` (constant-time secret compare), called by an external scheduler: expire unpaid orders/bookings (with Stripe reconciliation), weekly payouts, subscription reminders, guest cleanup, chat retention.

## 2. Existing security implementations (verified, keep)

| Area | Implementation |
|---|---|
| Passwords | bcrypt, dummy-hash compare on unknown users (timing-safe login, no enumeration) |
| Session | JWT in `ls_session` HttpOnly, SameSite=Lax, Secure in production, never in response body; `purpose` tokens can't be sessions; user status re-checked on every request |
| CSRF | `OriginCheckGuard`: cookie-authenticated writes need an exact allowed Origin/Referer; missing origin is blocked |
| CORS | exact list from `CORS_ORIGIN`, no wildcard |
| OTP | 6-digit `crypto.randomInt`, stored HMAC-hashed, 10 min TTL, 5 attempts then burned, timing-safe compare, never logged |
| Password reset | random token stored as SHA-256, single active token per user, 1-time use, generic response (no enumeration) |
| Registration | role restricted to `CONSUMER`/`BUSINESS_OWNER` (no self-admin); no role-change endpoint exists |
| RBAC / IDOR | admin controllers class-level `@Roles(SUPER_ADMIN)`; every resource endpoint passes the caller to the service, which checks ownership/membership (orders, payments, refunds, returns, chat, notifications, employees, addresses, reviews). Many negative unit tests exist |
| Payments | amounts from DB only; Stripe signature on raw body with 5-min tolerance; webhook only supplies the session id, status/amount/metadata re-read from Stripe and cross-checked; status transition table (out-of-order safe); `PaymentWebhookEvent` dedupe; advisory lock on checkout creation; Stripe idempotency keys |
| Refunds | row lock, remaining-amount check, idempotency key, two-phase reserve/confirm with ledger and commission reversal |
| Payouts | advisory lock + unique `(businessId, periodKey)`; IBAN AES-256-GCM encrypted, masked in API |
| Inventory | conditional atomic decrement (`stock >= qty`) inside the order transaction |
| Uploads | magic-byte detection (no trust in MIME), SVG not accepted, size limits, signed Cloudinary uploads with server-side verification of video format/size |
| Injection | no `$queryRawUnsafe`/`$executeRawUnsafe`; all raw SQL uses tagged templates |
| XSS | no `dangerouslySetInnerHTML`/`innerHTML` in the frontend |
| SSRF / redirects | server-side fetches go to fixed provider hosts only; Stripe return URL built server-side; login `redirectTo` passes `safeRedirect` |
| Secrets | `.env*` git-ignored; full-history scan found only test fixtures and local `postgres:postgres` dev URLs — no rotation needed |
| Config | `validateEnv` fails fast on weak/placeholder `JWT_SECRET`, bad Stripe keys, missing webhook secret, wrong `ENCRYPTION_KEY` length |
| Ops | Swagger off in production; `/health` returns 503 when the DB is down |

## 3–8. Findings

| # | P | Area | Finding | Evidence |
|---|---|---|---|---|
| F1 | P1 | Auth | **No session revocation.** A password reset or account compromise leaves every issued JWT valid until expiry (`JWT_EXPIRES_IN`, default 1 d). | `auth.service.ts` `resetPassword` only updates the hash; `jwt.strategy.ts` has no version check |
| F2 | P1 | Auth | **Reset token redemption not atomic.** `findFirst` then `update` by id: two concurrent requests with the same token both succeed. | `auth.service.ts:393-408` |
| F3 | P2 | Auth | OTP attempt counter read-then-increment: parallel guesses can exceed 5 attempts (bounded by the rate limit). | `auth.service.ts:186-210` |
| F4 | P1 | Abuse | **Rate limiter is per process and keyed by `req.ip`.** Behind Vercel→Render, without `TRUST_PROXY` every visitor shares the proxy IP: shop registration 5/h, guest start 8/h, sign-up 10/h become **site-wide** limits. Counters reset on deploy and are not shared across instances. No `Retry-After`. | `rate-limit.guard.ts`, `main.ts` |
| F5 | P1 | Orders | **Order status update race.** Status is read outside the transaction and written unconditionally; two concurrent cancel/reject calls both restore stock (inventory inflation) and both write events. | `orders.service.ts` `updateOrderStatus`, `cancelOrder` |
| F6 | P1 | Admin | **No MFA for `SUPER_ADMIN`.** A stolen admin password gives full platform access (payouts export, user suspension, refunds). | no MFA code/schema |
| F7 | P1 | Headers | **No security headers** on frontend or API (no CSP, HSTS, frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy). | `next.config.ts`, `main.ts` |
| F8 | P1 | Frontend | **Redirect loop on a rejected-but-unexpired cookie**: middleware trusts the claims and sends `/login` → portal; the API answers 401; the app goes back to `/login`; repeat. Seen in the browser as hundreds of RSC requests. Gets worse once sessions can be revoked (F1). | `middleware.ts`, `AuthContext.tsx` |
| F9 | P2 | Ops | No request ids / structured access log; no graceful shutdown hooks. | `main.ts` |
| F10 | P2 | API | Malformed UUID in a path param reaches Prisma and returns **500** (P2023 unmapped) instead of 400. | `prisma-exception.filter.ts` |
| F11 | P2 | Payments | `checkout.session.async_payment_failed` maps to `PENDING` (Checkout Session reports `complete`/`unpaid`); the order is only released by the expiry job after the hold window instead of immediately. Not unsafe (no wrong "paid"), just slow. | `stripe.gateway.ts getPayment` |
| F12 | P2 | Notifications | Notifications/emails are sent after the business transaction (good: email failure never rolls back payments) but there is no outbox/retry: a crash between commit and send loses that notification. | `payments.service.ts afterPaid`, `notifications.service.ts` |
| F13 | P2 | Deploy | Backend `.env.example` documents only part of the variables the code reads (Stripe, Resend, Cloudinary, ENCRYPTION_KEY, CRON_SECRET, GEMINI…). | §9 |
| F14 | P3 | Pre-existing test failures | 3 unit tests fail on `main` before this work (ChatService role scoping, AppModule graph, PayoutAccount non-IBAN). | `npm test` |
| F15 | P3 | Lint | 3 pre-existing frontend lint errors (setState in effect, reassign after render). | `npx eslint src` |

Not found (explicitly checked): self-escalation to admin, IDOR on orders/payments/refunds/returns/chat/notifications, SQL injection, XSS sinks, open redirect, SSRF, committed secrets, trust of frontend totals, webhook without signature, refunds above the paid amount.

### Database risks
- Migrations are forward-only and additive; keep it that way (new columns with defaults only).
- Money: `Decimal` in rows, integer cents in ledger. `Number(product.price)` in order building is safe for 2-decimal EUR amounts (< 2^53 cents) but should stay cents-based in new code.

### Payment risks
- Covered well (see §2). Residual: F11, and the reconciliation job only runs when the external scheduler calls `expire-unpaid-orders` — the scheduler must be configured.

### Deployment risks
- `TRUST_PROXY` must match the real proxy chain (F4). Value can't be read from here; see §9.
- Scheduler for `/internal/jobs/*` and `CRON_SECRET` must exist, otherwise reconciliation, payouts and retention never run.
- Database backups: provider-side; verify a restore before launch (human action).

## 9. Required environment variables
See `docs/ENVIRONMENT_VARIABLES.md`.

## 10. Implementation plan (this pass)

| Order | Item | Finding |
|---|---|---|
| 1 | Session version on `User`, carried in the JWT and checked on every request; bumped on password reset | F1 |
| 2 | Atomic reset-token redemption; atomic OTP attempt counter | F2, F3 |
| 3 | Conditional (compare-and-set) order status updates | F5 |
| 4 | Shared Postgres-backed rate limiter (no new infrastructure), `Retry-After`, in-memory fallback if the DB is unreachable; startup warning when `TRUST_PROXY` is unset in production | F4 |
| 5 | TOTP MFA for `SUPER_ADMIN` (enrolment, login step, hashed recovery codes, secret encrypted with the existing `ENCRYPTION_KEY`) | F6 |
| 6 | Security headers: Next.js `headers()` with CSP; API headers in `main.ts` | F7 |
| 7 | Clear a rejected session cookie so the redirect loop can't happen | F8 |
| 8 | Request id + JSON access log, shutdown hooks | F9 |
| 9 | Map Prisma P2023 to 400 | F10 |
| 10 | Env documentation, tests, full script run, readiness report | F13 |

Deferred with reason: transactional notification outbox (F12, P2 — needs a worker and scheduler slot; current behaviour never loses orders/payments), immediate async-failure mapping (F11, P2), Redis (not needed: Postgres is already shared and the traffic is small).
