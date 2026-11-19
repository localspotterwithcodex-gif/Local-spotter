# LocalSpotter — Production Readiness Report

Date: 2026-11-01 · Companion documents: `docs/PRODUCTION_AUDIT.md` (findings F1–F15), `docs/ENVIRONMENT_VARIABLES.md`.

## A. Architecture changes

No module was rewritten. Changes extend the existing guards, services and schema:

- `User` gains `sessionVersion` (session revocation) and admin MFA fields; new `RateLimitHit` table (shared rate-limit store in the existing Postgres).
- `RateLimitGuard` keeps its decorator API (`@RateLimit({...})`), now backed by the database with an in-memory fallback.
- `JwtAuthGuard` gains one rule (admin sessions need MFA), mirroring the existing `AllowGuest` pattern with `AllowWithoutMfa`.
- New `requestContext` middleware (request id, API security headers, JSON access log); `enableShutdownHooks()`.
- Frontend: `next.config.ts` security headers; login MFA step; `AdminMfaSetup` screen inside `AdminLayout`; cookie cleanup on 401.

## B. Security fixes

| Finding | Fix | Files |
|---|---|---|
| F1 no session revocation | `sv` claim in every session JWT, compared with `users.session_version` on each request; bumped on password reset and MFA enrolment. Old tokens without `sv` count as version 0, so current sessions keep working after deploy | `jwt.strategy.ts`, `auth.service.ts`, `guest.service.ts` |
| F2 reset token reuse race | Token claimed with `updateMany … usedAt: null` inside the transaction; only one request can win | `auth.service.ts` |
| F3 OTP attempt race | Attempt counted atomically (`verificationAttempts < 5` conditional increment) **before** comparing | `auth.service.ts` |
| F5 order status race + double stock release | Compare-and-set (`updateMany where status = previous`) before any side effect; re-sending the current status is a no-op (previously a second `CANCELLED` restored stock twice) | `orders.service.ts` |
| F6 no admin MFA | RFC 6238 TOTP (no new dependency, verified against RFC test vectors), secret AES-256-GCM encrypted with `ENCRYPTION_KEY`, 10 one-time recovery codes stored as SHA-256 and consumed atomically, audit log entries `MFA_ENABLED` / `MFA_RECOVERY_CODE_USED`. Password login of an MFA admin returns only a 5-minute step token; every admin action (all endpoints, incl. shared ones) is refused without an MFA session (`MFA_ENROLLMENT_REQUIRED` / `MFA_REQUIRED`). Admin Google login was already blocked | `auth/mfa/totp.ts`, `auth.service.ts`, `auth.controller.ts`, `jwt-auth.guard.ts` |
| F7 no security headers | Frontend: CSP (allow-list of the verified origins: Google sign-in, Cloudinary, Unsplash, OpenStreetMap), HSTS, `X-Frame-Options: DENY` + `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy (camera/mic/geolocation self only). API: `default-src 'none'`, nosniff, DENY, no-referrer, CORP, HSTS | `next.config.ts`, `request-context.middleware.ts` |
| F8 redirect loop on rejected cookie | When `/auth/me` answers 401 the app asks the API to clear the cookie | `AuthContext.tsx` |
| F10 malformed id → 500 | Prisma `P2023` → 400 `INVALID_ID` | `prisma-exception.filter.ts` |
| Dependencies | Frontend: Next 16.3.4 → 16.4.3, sharp/source-map-js fixed, unused `zod` removed → **0 vulnerabilities** (prod and dev). Backend: non-breaking fixes (incl. critical `proxy-addr`) | `package.json`, lockfiles |
| Contrast regression | Admin sidebar shield icon restored to theme magenta on dark purple | `AdminLayout.tsx` |

**Breaking change (explained):** after deploy the admin must enrol MFA on first login (screen shown automatically). Nothing else changes for customers, owners or guests.

## C. Rate limiting

Store: `rate_limit_hits` table, one atomic `INSERT … ON CONFLICT DO UPDATE` per limited request, shared by all instances. Key = SHA-256 of route + (user id if signed in, else client IP) + optional body field, so no IPs or e-mails are stored. 429 with `Retry-After`; first block per window logged (hashed key prefix only). Database unreachable → per-process fallback (never fail-open, never block everyone). Expired rows are pruned opportunistically.

Limits (unchanged values, now shared): login 10/15 min per identifier; register 10/h; verify-code 10/15 min; resend-code 3/10 min; forgot-password 3/h per e-mail; reset-password 10/15 min; **new** MFA verify 5/5 min, MFA setup 10/15 min, MFA enable 5/5 min; guest start 8/h, guest link 3/h per e-mail; shop registration 5/h; chat 30/h, 60/min, 20/10 min (attachments); media 40 and 20 /10 min; visual search 12/10 min; reviews/favorites/views 120/15 min; returns 10/h; payout account 10/h; privacy export/delete 5/h; Stripe webhook 300/min.

**Proxy IP:** depends on `TRUST_PROXY` (see G). Without it, anonymous limits are shared by all visitors.

## D. Payment reliability (verified, unchanged)

Already correct before this work (see audit §2): server-side amounts, raw-body Stripe signature with 5-min tolerance, provider re-read of status/amount/metadata, transition table (out-of-order safe), webhook event dedupe, advisory lock + Stripe idempotency keys, two-phase refunds under row lock with remaining-amount check and ledger/commission reversal, and the `expire-unpaid-orders` job which reconciles stale checkouts against Stripe before releasing stock. A browser redirect can never mark anything paid.
Not changed: F11 (`async_payment_failed` releases at the hold timeout rather than instantly) — safe, just slower.

## E. Notification reliability

Not changed in this pass (F12, P2). Current behaviour: notifications and e-mails are sent after the business transaction commits, so a mail failure never rolls back an order or payment; duplicate webhooks don't duplicate notifications because state transitions are idempotent. Gap: a crash between commit and send loses that one notification (no outbox/retry). Recommended next step: `NotificationOutbox` table written in the same transaction, drained by a new `/internal/jobs/notifications` cron call with retry/backoff.

## F. Database changes

Migration `20261101100000_security_hardening` (additive, idempotent `IF NOT EXISTS`, no data change):
- `users.session_version INT NOT NULL DEFAULT 0`
- `users.mfa_secret TEXT`, `users.mfa_enabled_at TIMESTAMP(3)`, `users.mfa_recovery_codes TEXT[] NOT NULL DEFAULT '{}'`
- table `rate_limit_hits (key PK, count, reset_at)` + index on `reset_at`

**Deploy order matters:** the new backend code reads these columns, so the migration must be applied **before** the backend deploy. This project applies migrations by hand (Neon SQL editor per `RELEASE-GUIDE.md`) and Render auto-deploys `main`; therefore the changes were committed to a branch and **not** pushed to `main`.

## G. Environment changes

No new variables. Changed requirements:

| Variable | Label | Action |
|---|---|---|
| `ENCRYPTION_KEY` | REQUIRED (now also admin MFA) | Confirm it is set on Render (32-byte base64). If payouts already use one, keep it. Back it up. |
| `TRUST_PROXY` | REQUIRED — verify value | Set `2` for Vercel rewrite → Render LB → app. |
| `CRON_SECRET` | EXISTING/REQUIRED | Confirm set; scheduler must call the jobs (reconciliation depends on it). |
| `SWAGGER_ENABLED` | OPTIONAL | Leave unset in production. |

Full list: `docs/ENVIRONMENT_VARIABLES.md`.

## H. Test results (commands actually run on 2026-11-01)

| Command | Result |
|---|---|
| backend `npx prisma validate` | PASS |
| backend `npm run typecheck` | PASS |
| backend `npm run build` | PASS |
| backend `npm test` (jest, 50 suites) | **626 passed, 1 failed** — `app.module.spec` fails only on this machine because the local `backend/.env` contains a Stripe key the test cannot unset; passes without that file (CI). Before this work: 602 passed, 3 failed |
| backend `npm run lint` | **BLOCKED** — `eslint` is not installed in `backend/` (script exists, dependency missing; pre-existing) |
| backend `npm audit --omit=dev` | **15 remaining** (1 critical `tar` via bcrypt's install-time `node-pre-gyp`, not reachable at runtime; highs in `body-parser`, `multer`, `js-yaml`, `lodash` need NestJS 10 → 12 major upgrade) |
| backend `npm run test:e2e` | NOT RUN — needs a disposable test database (`scripts/with-test-db.mjs`) |
| frontend `npx tsc --noEmit` | PASS |
| frontend `npx eslint src` | 3 errors, 3 warnings — all pre-existing, unchanged (AdminCharts, OrderTracker, SmartSearchInput) |
| frontend `npm test` | PASS (34/34) |
| frontend `npm audit` | PASS (0 vulnerabilities) |
| frontend `next build` | PASS |
| Browser check (production build, port 3001) | Login, home and shop pages render with the CSP enforced; OpenStreetMap iframe + Nominatim allowed, unknown origins blocked; all headers present. Google button not testable locally (no client id) |

New tests: session revocation (2), reset-token reuse race, atomic OTP counting, order compare-and-set + idempotent status, admin MFA (5 service + 2 guard), TOTP RFC vectors (8), shared rate limiter (3), request-context (2). Two stale tests corrected (chat hide filter; payout test digit typo) — the code was right in both.

Not covered by automated tests (needs a real database): concurrency against Postgres itself, multi-instance rate limiting end-to-end, the MFA screens against a live API.

## I. Remaining risks / human actions

1. **Apply migration `20261101100000_security_hardening` before merging to `main`** (see F).
2. Set/confirm `ENCRYPTION_KEY`, `TRUST_PROXY=2`, `CRON_SECRET` on Render.
3. After deploy, the admin enrols MFA on first login and stores the recovery codes. Lost device **and** codes → reset by hand: `UPDATE users SET mfa_enabled_at = NULL, mfa_secret = NULL, mfa_recovery_codes = '{}', session_version = session_version + 1 WHERE username = '<admin>';`
4. NestJS 10 → 12 upgrade for the remaining backend advisories (P1 follow-up).
5. Install ESLint in the backend so `npm run lint` works.
6. Verify a database backup restore at the provider.
7. Deferred P2: notification outbox (F12), instant async-failure mapping (F11), CSP nonces instead of `'unsafe-inline'`, step-up re-auth for individual admin actions (MFA is enforced per session).
8. Legal review of privacy/retention texts (not changed here).

## J. Launch decision

**NOT READY — BLOCKING ISSUES REMAIN**, all of them operational rather than code:
- the migration must be applied and the branch deployed (until then the live site still has F1–F8);
- `TRUST_PROXY` and `ENCRYPTION_KEY` must be confirmed on Render;
- backend lint can't run and the e2e suite hasn't run against a real database.

Once items 1–3 in §I are done and the e2e suite passes, the application meets the bar for a **controlled MVP launch**: no open P0, all P1 code findings fixed, payment flow verified, frontend dependencies clean.
