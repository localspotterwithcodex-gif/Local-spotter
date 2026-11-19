# Audit of `MASTER-PROMPT.md` (v2: Vercel + Supabase + Bird SMS)

Date: 2026-11-18 · **Status: all fixes below were applied to `MASTER-PROMPT.md` on 2026-11-18.** The owner decisions in its §3 were kept; open points became decisions D9 (admin second factor), D11 (review media per plan), D12 (OTP expiry and countries) and D13 (Neon data) in its §6, each with a safe default.
Checked against: `docs/` (decisions, release guide, health audit, implementation status, requirements 01/08/09/14), the code on `main` (`a7e0aca`, the commit the prompt names), the two unmerged branches `feature/signup-redesign` (`dcf6be5`) and `security/production-hardening` (`f93ba75`), the installed Next.js docs, and Bird's official documentation (bird.com/docs, read 2026-11-18).

Verdicts: **OK** = matches code/docs · **FIX** = wrong or outdated, change the prompt · **GAP** = missing, add to the prompt · **ASK** = owner decision needed.

---

## 1. Must fix before anyone runs this prompt

| # | Section | Finding | Evidence | Suggested change |
|---|---|---|---|---|
| 1 | §2 | **FIX: describes `main` only.** Two unmerged branches rewrite the areas the prompt plans to build. | `feature/signup-redesign` adds `phone_verifications` (OTP before the account exists, hashed code, cooldown, attempts, one-time token consumed in the account transaction), password rules, "become shop owner". `security/production-hardening` adds a Postgres-backed shared rate limiter (`rate_limit_hits`), session revocation (`users.session_version`), admin TOTP MFA, security headers + CSP. They also conflict with each other (`auth.service.ts`, its spec, `schema.prisma`). | Add a §2 bullet naming both branches and a **Phase 0.5: merge decision** (merge security branch first, then sign-up branch, resolving conflicts) before any new work. |
| 2 | §2, §8.3 | **FIX: sign-up flow is the old one.** "register → SMS OTP → `verify-code` → account active" is what `main` does. The sign-up branch verifies the phone **before** the account exists (`/auth/signup/phone/send` → `/verify` → `/register` with a one-time token). | `dcf6be5` | Describe the branch flow, or state that the branch is discarded. |
| 3 | §3.6 | **FIX: duplicate OTP table.** `otp_codes` would duplicate `phone_verifications` (same job: hashed code, expiry, attempts, cooldown). The prompt's own rule says "reuse existing tables found in the audit before adding new ones". | `backend/prisma/migrations/20261102100000_phone_verifications` | One table: extend `phone_verifications` with `purpose` (`SIGNUP`/`LOGIN`/`PASSWORD_RESET`), nullable `user_id`, `consumed_at`, `ip_hash` (or rename it to `otp_codes` in one migration). |
| 4 | §3.5 | **FIX: proposed plan defaults contradict the requirements and the prompt itself.** The prompt says "defaults must reproduce today's behaviour", then proposes review photos for WEBSHOP (3) and SHOPROUTES (5). | `docs/01` l.18, `docs/09` l.41–45, `docs/14` l.7: reviews, review images, followers are **Workshop-only**. Code today: reviews tied to a delivered order are allowed on every plan; free-standing reviews need `WORKSHOPS` (`reviews.service.ts:34`). | Defaults: WEBSHOP/SHOPROUTES `max_review_photos=0`, `max_review_videos=0`; or record the change as a new owner decision in `DECISIONS-AND-CONFLICTS.md`. |
| 5 | §2, §3 (D1) | **ASK: "admin login always requires the SMS OTP" vs the admin TOTP MFA on the security branch.** SMS is weaker (SIM swap) and costs per login. | `f93ba75`: `/auth/mfa/setup|enable|verify`, recovery codes, `MFA_REQUIRED` guard. | Keep TOTP for admins (stronger, free); SMS OTP for customers/owners only. Reuse the branch's short-lived `mfaToken` challenge pattern for the customer login OTP. |
| 6 | §8 (D9), §8.1 | **FIX: the "older Channels API" fallback is not in Bird's docs.** `api.bird.com/workspaces/{id}/channels/{id}/messages` with `AccessKey` was not found. The only legacy API Bird documents is `rest.messagebird.com` (fields `recipients`, `originator`, `body`). | bird.com/docs/guides/sms/migrate/connectivity-platform | Drop the fallback and D9; build only the current API. If the client's account is legacy, migrate the account rather than code two APIs. |
| 7 | §2 | **ASK: "no production data to migrate" conflicts with the repo.** | `docs/RELEASE-GUIDE.md`: production = Render + **Neon** with 20+ applied migrations. Local `backend/.env` points at a Neon host. The Vercel project `local-spotter` deployed `a7e0aca` on 2026-11-02. | Owner confirms in writing that the Neon database (accounts, orders, payments, ledger, payouts) may be abandoned, **or** add a data-migration phase. Keep Neon read-only until confirmed. |
| 8 | §2, Phase 1 | **FIX: the repo is public (confirmed), not "may be public".** | GitHub's API answered anonymously for `localspotterwithcodex-gif/Local-spotter` during this session. `backend/prisma/manual-supabase-admin-setup.sql` contains a known admin password; demo passwords also appear in `CHANGELOG_ROUND2.md`, `CHANGELOG_ROUND3.md`, `CHANGELOG_THIS_PASS.md`, `docs/IMPLEMENTATION-STATUS.md`, `backend/prisma/seed.ts`. | Phase 1 step 0: make the repo private **now**. Deleting files does not remove them from git history, so treat every committed secret as public and rotate it. Add the changelog files to the cleanup list. |

## 2. Technical corrections

| # | Section | Finding | Suggested change |
|---|---|---|---|
| 9 | §4 Phase 4 | **FIX:** paths end in `.webp` and video in `.mp4`, but browsers upload **directly** to Supabase with signed URLs: nothing converts the file. Supabase image resizing is **Pro-only**; Supabase cannot transcode video. Today Cloudinary converts video to MP4 and reports duration. | Store the original format (`{uuid}.{ext}`) and resize via Next.js Image Optimization; keep Cloudinary for **video** until a transcoding decision is made, or accept MP4-only uploads and read duration from the MP4 header server-side. |
| 10 | Phase 4.4 | **GAP:** "create the review row first (`PENDING`)": reviews default to `PUBLISHED` today, and there is **no** review-media upload endpoint or form. | Mark review media as a new feature; state the publish rule explicitly (stay `PENDING` until media is confirmed). |
| 11 | Phase 8.1 | **FIX:** "retry `5xx` with the same `Idempotency-Key`". Bird does **not retain 5xx responses** and the idempotency window is **3 hours**, so a retry after a 5xx can send a second SMS. | Retry only network errors and `429`; on `5xx` mark the message `FAILED` for manual/job retry (or accept a rare duplicate for order messages, never for OTP). |
| 12 | Phase 8.1 | **GAP:** `category` for order messages left open. Bird's values: `transactional`, `marketing`, `authentication`, `service`. | OTP → `authentication`; order updates → `transactional`. |
| 13 | Phase 8.2 | **ASK:** OTP expiry 5 min (branch uses 10 min) and `SMS_ALLOWED_PREFIXES=+31` default vs the sign-up branch's country selector (NL, BE, DE, FR, GB, …, IN, US). | Pick one expiry; set the prefix allow-list to match the selector, or trim the selector to NL. |
| 14 | Phase 8.4 | **GAP:** `notifyStatus(...)` runs after commit and receives no event id, so `Idempotency-Key = sms:{order_status_event_id}` needs the id passed out of the transaction. `order_status_events` rows **are** already written in the transaction (`orders.service.ts:481, 562`). | Return the created event id from the status transaction and pass it to `notifyStatus`. |
| 15 | Phase 2.1 | **FIX:** `DIRECT_URL` = "direct (port 5432)". Supabase's direct host is **IPv6-only** unless the IPv4 add-on is bought; GitHub Actions and many machines have no IPv6. | Use the **session pooler** (port 5432) for `DIRECT_URL`, as Supabase's Prisma guide allows. |
| 16 | Phase 2.2 | **FIX:** "add the `binaryTargets` Vercel needs". Only needed when the client is generated somewhere other than the Vercel build. | "Add `binaryTargets` only if `prisma generate` runs outside Vercel; verify against Prisma's Vercel guide." |
| 17 | Phase 9 | **FIX:** Next.js 16 renamed Middleware to **Proxy** (`proxy.ts`), same functionality (installed docs: `next/dist/docs/01-app/01-getting-started/16-proxy.md`). | Say "`frontend/src/middleware.ts` (rename to `proxy.ts` per Next 16)". Also: working copy has Next 16.4.3 installed while `package.json` pins 16.3.4. The security branch bumps to 16.4.3. |
| 18 | Phase 9 | **GAP:** `TRUST_PROXY=1` behind web → API rewrite on Vercel is unverified. If wrong, every visitor shares one IP and per-IP OTP limits block everyone or nobody. | Measure on a preview (log `req.ip` vs `X-Forwarded-For`) before production. |
| 19 | Phase 4.6, 9 | **GAP:** the security branch's CSP (`img-src`, `connect-src`, `media-src`) must include the Supabase storage host, or images and direct uploads are blocked. | Add the host to the CSP alongside `remotePatterns`. |
| 20 | Phase 7.4 | **FIX:** "`weekly-payouts` Monday 06:00 Amsterdam (cron runs in UTC)": UTC cron can't follow DST. | State one UTC time (e.g. `0 5 * * 1`) and accept 06:00/07:00 local. |
| 21 | §8 env | **FIX:** `API_PUBLIC_URL` is listed but no code reads it (only a test). | Mark as "used only to build the Stripe webhook URL by hand". |
| 22 | Phase 0 | **FIX:** Phase 0 writes `docs/PROJECT-HEALTH-AUDIT.md`, which already holds the dated 2026-10-13 audit. | Write `docs/PROJECT-HEALTH-AUDIT-2026-11.md` or add a dated section. |
| 23 | §3 "separate tables" | **OK, clarify:** customers and shop owners already are `consumer_profiles` and `business_owner_profiles`, both FK → `users`. "Become shop owner" (sign-up branch) switches one user's role and keeps the customer profile. | Say "already satisfied; no new tables". |
| 24 | `DECISIONS-AND-CONFLICTS.md` | **FIX (doc):** D-004 says the payment provider was "Resolved: Mollie", but the code and the release guide use **Stripe Checkout (iDEAL)**, which the prompt keeps. | Correct D-004 when Phase 0 records conflicts (prompt rule 8). |

## 3. Verified correct (no change needed)

| Claim in §2 | Evidence |
|---|---|
| Monorepo, Next.js App Router + NestJS 10 + Prisma 5, **49 models** | `schema.prisma` on `a7e0aca` |
| Portals are route groups `(admin)`, `(owner)`, `(consumer)`, …; `/api/v1/*` rewrite keeps `ls_session` first-party; middleware routes by JWT role, backend is the boundary | `frontend/src/app/`, `next.config.ts`, `middleware.ts` |
| Login = identifier + password; forgot password = e-mail link via `password_reset_tokens` | `auth.service.ts` |
| Sign-up codes `crypto.randomInt` + HMAC keyed with `JWT_SECRET`; Twilio Verify via `SmsVerifier` + `SMS_PROVIDER_CODE` | `auth.service.ts`, `auth/sms/sms-verifier.ts` |
| Transition map ~l.584–622; `ShopOrdersBoard.tsx` has On the way / Delivered / Cancel | `orders.service.ts`, `ShopOrdersBoard.tsx:25,50,52,59` |
| `notifyStatus` sends in-app + e-mail after status change and cancel, best effort | `orders.service.ts:495, 576, 690` |
| Orders have **no** phone column; `consumer_profiles.phone` exists; `customer_orders` exists | `schema.prisma` |
| `GET /api/v1/health` checks the DB | `health.controller.ts` |
| Rate limiter is an in-memory `Map` on `main` (fixed on the security branch) | `rate-limit.guard.ts` |
| Stripe Checkout iDEAL, signed webhook, `payment_webhook_events` | `stripe.gateway.ts`, `schema.prisma` |
| Six job endpoints under `internal/jobs` with `x-cron-secret` | 6 controllers |
| `ALLOW_DEMO_SEED` guard in `seed.ts`; `manual-supabase-admin-setup.sql` exists | `seed.ts:19` |
| Bird: `POST /v1/sms/messages` on `https://eu1.platform.bird.com`; `bk_eu1_` keys; Bearer auth; `421` wrong region; body `from/to/text/category`; `Idempotency-Key`; `422 SMSDestinationNotEnabled` unless NL enabled under **SMS → Destinations**; alphanumeric sender 3–11 chars, one-way, no NL registration (some sectors need an authorisation letter); delivery webhooks are Standard Webhooks (`webhook-signature`, HMAC-SHA256) | bird.com/docs: guides/sms/sending-sms, api/authentication, api/regions, api/idempotency, guides/sms/senders, guides/webhooks, sms-api/features/destinations/netherlands |
| Vercel Cron = GET + `Authorization: Bearer <CRON_SECRET>`, UTC, no retries; Pro needed for 10-minute jobs | vercel.com/docs/cron-jobs (checked 2026-11-03) |

Not verifiable from here: Bird numeric rate limits (Bird publishes policy names, not numbers); live SMS delivery; anything needing the owner's Bird, Supabase or Vercel accounts.

## 4. Recommended order

1. Owner answers items **5, 7, 13** and confirms **4** (plan defaults).
2. Make the repo private and rotate secrets (item 8), before any other work.
3. Merge `security/production-hardening`, then `feature/signup-redesign` (items 1–3).
4. Update `MASTER-PROMPT.md` with the fixes above, then start its Phase 0.
