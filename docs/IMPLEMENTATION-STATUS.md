# LocalSpotter — Implementation Status

Updated: 2026-10-13 (after repair round, see `REPAIR-CHANGELOG.md`). Legend: ✅ wired to the real backend, statically verified · 🟡 wired but needs a live run / partial · 🔴 missing · ⛔ blocked on an owner decision.
"Verified" below means typecheck + lint + unit tests + grep; **no flow has been exercised end-to-end against a running stack yet** (see Verification).

| Area | Frontend | Backend | Notes |
|---|---|---|---|
| Register / verify / login / logout | ✅ cookie session | ✅ HMAC OTP, attempts, rate limit | SMS has no provider (email only); dev outbox for local |
| Forgot / reset password | ✅ real API | ✅ hashed single-use token | needs mail provider in production |
| Role redirects, `redirectTo` | ✅ | ✅ guards | LS-007 fixed |
| Public catalogue (home, products, shops, workshops, routes) | ✅ | ✅ (`GET /businesses` added) | product ratings/likes are 0 – backend does not track them |
| Cart | ✅ server cart (consumer) | ✅ | one business per cart (D-001) |
| Checkout → order | ✅ creates real order | ✅ | **payment not processed** (D-004) |
| Guest checkout | ⛔ login required | ⛔ | D-002 |
| Order history (consumer) / owner orders / admin orders | ✅ | ✅ | status transitions enforced by backend |
| Owner dashboard, products (+variants), workshops, bookings, settings, subscription, onboarding | ✅ | ✅ | image upload not supported (URLs only), compare-at price not stored |
| Owner payouts | 🔴 empty state | 🟡 admin side only | D-006 |
| Subscriptions | ✅ plans/subscription from API | 🟡 | free activation only outside production until PSP (D-004) |
| Admin portal (dashboard, users, businesses, orders, products, reviews, subscriptions, payments, payouts) | ✅ | ✅ | payout approve sets APPROVED, not PAID |
| Reviews / follow | ✅ | 🟡 | review needs WORKSHOP plan; follow needs WORKSHOP plan (existing backend rules); no review delete |
| Consumer addresses | 🔴 "not available" state | 🔴 no endpoint | |
| Shop-registration widget | ✅ → PostgreSQL | ✅ + rate limit | Mongo removed, old leads not migrated |
| Returns | ⛔ | ⛔ | D-003 |
| Chat, virtual store, media upload | 🔴 | 🔴 | LS-014 |
| Localization | 🟡 10/44 pages | n/a | default language open (D-008) |

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
