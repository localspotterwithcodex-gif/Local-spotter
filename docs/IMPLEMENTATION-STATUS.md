# LocalSpotter — Implementation Status

> **Superseded (2026-10-19):** the gap-closure programme (11 phases) is finished. The tables below are historical; current status, release steps, verification evidence and limitations are in `RELEASE-GUIDE.md`; per-phase details in `REPAIR-CHANGELOG.md` (W–AF).

Updated: 2026-10-14 (after i18n/addresses/ratings round; earlier: 2026-10-13 repair round, see `REPAIR-CHANGELOG.md`). Legend: ✅ wired to the real backend, statically verified · 🟡 wired but needs a live run / partial · 🔴 missing · ⛔ blocked on an owner decision.
"Verified" below means typecheck + lint + unit tests + grep; **no flow has been exercised end-to-end against a running stack yet** (see Verification).

| Area | Frontend | Backend | Notes |
|---|---|---|---|
| Register / verify / login / logout | ✅ cookie session | ✅ HMAC OTP, attempts, rate limit | SMS has no provider (email only); dev outbox for local |
| Forgot / reset password | ✅ real API | ✅ hashed single-use token | needs mail provider in production |
| Role redirects, `redirectTo` | ✅ | ✅ guards | LS-007 fixed |
| Public catalogue (home, products, shops, workshops, routes) | ✅ | ✅ (`GET /businesses` added) | product ratings come from PUBLISHED reviews; likes/views are 0 (not tracked) |
| Cart | ✅ server cart (consumer) | ✅ | one business per cart (D-001) |
| Checkout → order | ✅ creates real order | ✅ | **payment not processed** (D-004) |
| Guest checkout | ⛔ login required | ⛔ | D-002 |
| Order history (consumer) / owner orders / admin orders | ✅ | ✅ | status transitions enforced by backend |
| Owner dashboard, products (+variants), workshops, bookings, settings, subscription, onboarding | ✅ | ✅ | image upload not supported (URLs only), compare-at price not stored |
| Owner payouts | 🔴 empty state | 🟡 admin side only | D-006 |
| Subscriptions | ✅ plans/subscription from API | 🟡 | free activation only outside production until PSP (D-004) |
| Admin portal (dashboard, users, businesses, orders, products, reviews, subscriptions, payments, payouts) | ✅ | ✅ | payout approve sets APPROVED, not PAID |
| Reviews / follow | ✅ | 🟡 | review needs WORKSHOP plan; follow needs WORKSHOP plan (existing backend rules); no review delete |
| Consumer addresses | ✅ list/add/edit/delete/default, checkout pre-fill | ✅ `/api/v1/addresses` (consumer-only, scoped to own profile, max 10, soft delete) | tested by unit tests; not run against a live stack |
| Shop-registration widget | ✅ → PostgreSQL | ✅ + rate limit | Mongo removed, old leads not migrated |
| Returns | ⛔ | ⛔ | D-003 |
| Chat, virtual store, media upload | 🔴 | 🔴 | LS-014 |
| Localization | ✅ all portals use typed EN/NL dictionaries (`src/i18n/dict/*`), locale-aware money/dates, translated errors | n/a | default language still open (D-008); backend emails are Dutch only |

## Phase tracker
| Phase | Status |
|---|---|
| 0 Audit | PASS |
| 1 Frontend lint/types | PASS for typecheck + lint (0 errors); **`next build` and `npm audit` not run – run locally** |
| 2 Payments | PASS for unit tests (46/46); no PSP/webhook (D-004) |
| 3 Real data | Implemented for consumer, owner, admin; not run against a live backend |
| 4 Auth/security | Implemented + unit tested; cookie/CSRF behaviour covered by the (unexecuted) DB suite |
| 5 DB & routes | Routes fixed + tested; migration catch-up written; **Prisma validate/migrate not run** |
| 6 Cross-portal tests | **PASS** – 14/14 against the isolated Neon test database (2026-10-13) |
| 7 Language | Persistence + parity test done; **default language awaiting your answer** |

## Verification evidence (this round)
| Command | Result |
|---|---|
| frontend `tsc --noEmit` | exit 0 |
| frontend `eslint src` | 0 errors, 5 warnings |
| frontend `npm test` | 8 pass |
| backend `npm test` (run by you) | 15 suites, 259 pass, 0 fail |
| backend `npm run test:e2e` (run by you, isolated test DB) | 14/14 pass |
| migrations on isolated test DB (run by you) | applied successfully |
| backend `tsc --noEmit` | only stale-Prisma-client errors (`verificationAttempts`), clears after `prisma generate` |
| `prisma validate`, `npm audit`, production `db:prod:status`, manual portal click-through | **NOT RUN** (blocked here / still to do by you) |

Do not treat the project as complete until the "Commands for you" in `REPAIR-CHANGELOG.md` pass on your machine and the e2e suite passes against a test database.

## Round 2026-10-14
| Item | Result |
|---|---|
| Feedback button | removed (component + layout use) |
| Demo logins | seed creates `Admin`/`Admin@123`, `Business_owner`/`Owner@123`, `customer`/`Customer@123`; refuses to run without `ALLOW_DEMO_SEED=yes`; `npm run seed:demo:disable` locks them. **Not run against any database.** |
| Email | Resend provider (`MAIL_TRANSPORT=resend`, `RESEND_API_KEY`, `MAIL_FROM`); no SMS provider, mobile sign-up disabled in the UI unless `NEXT_PUBLIC_SMS_ENABLED=true`; backend rejects mobile sign-up before creating an unverifiable account |
| frontend `tsc --noEmit` | exit 0 |
| frontend `eslint src` | 0 errors, 5 warnings (unchanged) |
| frontend tests | 11 pass |
| backend `tsc --noEmit` | exit 0 |
| backend jest run this round | auth (+mail) 25 pass; addresses + routes 13 pass; products 10 pass. Full backend suite and e2e **not re-run** after these changes |
| Not verified | browser click-through of EN/NL on every page; live Resend delivery; `next build`; `prisma validate`; `npm audit` |
