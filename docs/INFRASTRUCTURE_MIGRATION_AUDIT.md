# LocalSpotter — Infrastructure Migration Audit (Phase Zero)

Date: 2026-11-03 · Branch audited: `feature/signup-redesign` (head `dcf6be5`), plus `security/production-hardening` (`f93ba75`, unmerged).
Scope: audit and plan only. **No application code, infrastructure, DNS, credentials or data were changed for this document.**

Status legend used throughout: **PASS** (verified in code or docs), **BLOCKED** (needs information or a decision from the owner), **NOT RUN** (not attempted yet).

---

## 0. Summary — what needs a decision before any code is written

| # | Decision | Why it blocks | Recommendation |
|---|----------|---------------|----------------|
| D1 | **MSG91 for Dutch numbers** | MSG91's public docs did not give endpoint URLs, auth format, Netherlands coverage, sender-ID rules or DLR format (see §3). Building against guessed endpoints is not acceptable. | Get from MSG91 (account dashboard API reference + written answer from their support): NL (+31) delivery, sender ID rules for NL, international pricing/activation, DLR webhook format. Until then keep the working Twilio path. |
| D2 | **Vercel plan for the backend** | Hobby crons run at most **once per day** (6 existing jobs need more, e.g. expiring unpaid orders). Hobby is also intended for non-commercial use (verify Vercel's fair-use terms). | Vercel **Pro** for the backend project (and frontend). |
| D3 | **Supabase plan** | Image resizing is Pro-only; production also needs backups. Free projects can be paused (verify current Supabase terms). | Supabase **Pro**. |
| D4 | **Keep the same-origin API proxy** (do not introduce `NEXT_PUBLIC_API_URL`) | The browser calls `/api/v1/*` on the frontend origin and Next.js rewrites to `BACKEND_URL`; the session cookie is first-party. Calling a separate backend domain from the browser would make the HttpOnly cookie third-party and break login in Safari/Firefox. | Keep `BACKEND_URL` rewrite; point it at the new Vercel backend. |
| D5 | **Existing Cloudinary media** | Existing `media_assets.url` rows point at `res.cloudinary.com` (count unknown: the database was unreachable from here). | New uploads → Supabase; old URLs keep working from Cloudinary; optional copy job later. Do not delete Cloudinary. |
| D6 | **14 order/payment SMS messages** | None exist today — they are new features with per-message cost, not a migration. | Confirm which events actually need SMS (email + in-app already cover most); start with OTP only. |
| D7 | **Merge `security/production-hardening` first** | It already contains the Postgres-backed shared rate limiter (`rate_limit_hits` table), session revocation, admin MFA and security headers — all required for serverless. Migrating without it means redoing that work. | Review and merge it (with its migration) before the infrastructure move. |
| D8 | **Database cut-over window** | A consistent Neon → Supabase copy needs writes stopped during dump/restore. | Agree a maintenance window (low traffic, e.g. night CET). |

---

## 1. Current architecture

```
Browser ──HTTPS──▶ Vercel (Next.js, project "local-spotter")
                     │  rewrite /api/v1/*  →  BACKEND_URL
                     ▼
                 Render (NestJS, `node dist/src/main.js`, app.listen(PORT))
                     │ Prisma 5.22 (DATABASE_URL + directUrl DIRECT_URL)
                     ▼
                 Neon PostgreSQL (eu-central-1, pooled endpoint)
External: Stripe (fetch, no SDK) · Resend (email) · Twilio Verify (SMS OTP, fetch) ·
          Cloudinary (images + video, fetch) · Google Sign-In · Gemini (visual search) · DeepL
Scheduler: external caller of POST job endpoints with header x-cron-secret
```

Facts verified in code (PASS):
- Backend entry `backend/src/main.ts`: `NestFactory.create(AppModule, { rawBody: true })`, global prefix `API_PREFIX || /api/v1`, global `ValidationPipe` (whitelist, forbidNonWhitelisted), `PrismaExceptionFilter`, CORS from `CORS_ORIGIN`, Swagger off in production, `trust proxy` via `TRUST_PROXY`, then `app.listen(PORT)`.
- Global guard `OriginCheckGuard` (CSRF: state-changing cookie requests must come from an allowed origin).
- Session: HttpOnly cookie `ls_session`, `SameSite=Lax`, `Secure` in production, browser-session lifetime; JWT `expiresIn` `JWT_EXPIRES_IN || 1d`. Purpose tokens (guest links) are rejected as sessions; suspended/deleted users are re-checked per request.
- Frontend `next.config.ts`: rewrite `/api/v1/:path*` → `${BACKEND_URL}/api/v1/:path*`; `images.remotePatterns` allow `res.cloudinary.com` and Unsplash.
- No WebSockets, SSE or long-lived connections anywhere. No `@nestjs/schedule`; no in-process cron.
- Frontend `package.json` lists `mongodb`, which is imported nowhere (dead dependency).

## 2. Existing providers

| Concern | Provider | Where | Env vars |
|---|---|---|---|
| Hosting FE | Vercel | `frontend/` | `BACKEND_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_SUPPORT_EMAIL` |
| Hosting BE | Render | `backend/` | `PORT`, `TRUST_PROXY`, `NODE_ENV` |
| Database | Neon Postgres | `prisma/schema.prisma` | `DATABASE_URL`, `DIRECT_URL` |
| Email | Resend (prod) / dev-file (local) | `src/mail/mail.provider.ts` | `MAIL_TRANSPORT`, `RESEND_API_KEY`, `MAIL_FROM` |
| SMS OTP | Twilio Verify (REST, no SDK) | `src/auth/sms/sms-verifier.ts` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` |
| Images / video | Cloudinary (REST, signed) | `src/media/image-storage.ts`, `video-storage.ts` | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Payments | Stripe (REST, manual HMAC webhook check) | `src/payments/stripe.gateway.ts` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Social login | Google | `src/auth/social/` | `GOOGLE_CLIENT_ID` |
| Visual search | Gemini | `src/visual-search/` | `GEMINI_API_KEY`, `GEMINI_VISION_MODEL` |
| Translation | DeepL | | `DEEPL_API_KEY` |
| Jobs | external scheduler | 6 job controllers | `CRON_SECRET` |

Other backend config read: `JWT_SECRET`, `JWT_EXPIRES_IN`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `CORS_ORIGIN`, `COOKIE_SECURE`, `FLAT_SHIPPING_FEE`, `COMMISSION_DEFAULT_BPS`, `RETURN_WINDOW_DAYS`, `PAYOUT_MIN_CENTS`, `PAYOUT_HOLD_DAYS`, `PRISMA_TX_TIMEOUT_MS`, `PRISMA_TX_MAX_WAIT_MS`, `SWAGGER_ENABLED`, `API_PREFIX`, `ALLOW_DEMO_SEED`, `ALLOW_DEMO_CLEANUP`.

## 3. Twilio dependencies (to replace with MSG91)

Code (PASS — complete list, `grep -ri twilio`):
- `backend/src/auth/sms/sms-verifier.ts` — `SmsVerifier` interface (`isConfigured`, `start`, `check`) + `TwilioVerify` (REST `verify.twilio.com/v2/Services/{sid}/Verifications|VerificationCheck`) + `UnconfiguredSmsVerifier`.
- `backend/src/auth/auth.module.ts` — picks `TwilioVerify` when all three `TWILIO_*` vars are set.
- `backend/src/auth/auth.service.ts` — sign-up OTP (`sendSignupCode` / `verifySignupCode`) and legacy pending-account codes. When the provider owns the code, the row stores the marker `sms-provider` instead of a hash.
- `backend/.env.example` — three `TWILIO_*` placeholders. Specs: `sms-verifier.spec.ts`, `auth.service.spec.ts`.

Already provider-independent (PASS): `phone_verifications` table (HMAC code hash, expiry 10 min, 5 attempts, 60 s cooldown, 5 sends/number/hour, one-time token hashed, consumed in the account-creating transaction). Fallback path already generates the code with `crypto.randomInt` and sends it as a plain SMS through the mail provider's SMS channel.

**Recommended MSG91 design** (fits the brief's "store only OTP hashes" rule better than Twilio Verify): the backend generates and hashes the OTP itself (existing fallback path), and MSG91 is used only as a **transactional SMS sender**. Then `verifyOtp` is local, replay/attempt/expiry rules stay in our database, and MSG91's own OTP product (which generates the code on its side) is not needed. Interface:

```ts
interface SmsProvider {
  isConfigured(): boolean;
  sendTransactionalSms(to: string /* E.164 */, templateKey: string, vars: Record<string, string>): Promise<{ providerMessageId: string }>;
  getDeliveryStatus?(providerMessageId: string): Promise<'queued' | 'sent' | 'delivered' | 'failed' | 'unknown'>;
}
```
(`sendOtp`/`verifyOtp` live in `AuthService` on top of this, not in the provider.)

**MSG91 documentation check — BLOCKED.** Pages read: `docs.msg91.com/`, `/otp`, `/sms`, `msg91.com/help` (index). They list operations (SendOTP POST, Verify OTP GET, Resend OTP GET, Send SMS POST, SMS Logs POST) but not endpoint URLs, the auth header, payload fields, mobile number format, Netherlands support, sender-ID rules, template/DLT requirements outside India, delivery-report webhook format, or rate limits. `msg91.com/international-sms` returns 404. Needed from the owner: the API reference pages from the MSG91 dashboard (or their URLs) and MSG91's written confirmation for NL delivery and sender ID.

## 4. Neon dependencies

- Only connection strings: `DATABASE_URL`, `DIRECT_URL` (`schema.prisma` already has `directUrl = env("DIRECT_URL")`). PASS.
- `backend/scripts/with-test-db.mjs` mentions Neon (test database helper); `scripts/prod-readonly.mjs` reads production read-only.
- Docs mentioning Neon: `docs/19-DEPLOYMENT.md`, `RELEASE-GUIDE.md`, `GAP-ANALYSIS.md`, `IMPLEMENTATION-STATUS.md`, `REPAIR-CHANGELOG.md`.
- No Neon-specific SQL, extensions or driver (`@neondatabase/serverless` not used). PASS.
- The Neon database in local `.env` was **not reachable** from this environment, so row counts, data duplicates and extensions in use are **NOT RUN**.

## 5. Cloudinary dependencies

| Feature | Path | Upload style | Notes |
|---|---|---|---|
| Shop/product/workshop/profile images | `POST /media/images` (`media.controller.ts`) → `MediaService.uploadImage` → `CloudinaryImageStorage` | file through the API (multer, ≤ 10 MB; content ≤ 5 MB) | magic-byte type check (`image-validation.ts`), roles BUSINESS_OWNER / SUPER_ADMIN, rate-limited, folder `localspotter/users/{userId}` |
| Shop videos | `POST /media/videos/ticket` + `POST /media/videos` | browser uploads straight to Cloudinary with a signed ticket; backend re-reads metadata from Cloudinary | ≤ 50 MB, ≤ 120 s, folder ownership enforced |
| Chat attachments | `chat.controller.ts` `FileInterceptor` (≤ 10 MB) | through the API | |
| Visual search | `visual-search.controller.ts` (image not stored) | through the API | not storage — no migration needed |
| Delivery transforms | `optimiseDeliveryUrl` adds `f_auto,q_auto,w_1400,c_limit`; video `f_mp4,vc_h264,q_auto` | | **no free-plan equivalent in Supabase** (resizing is Pro-only); video transcoding has no Supabase equivalent at all |
| Frontend | `next.config.ts` `remotePatterns: res.cloudinary.com` | | must add the Supabase storage host |

`MediaAsset` model stores only `url`, `mimeType`, `fileSize`, `createdAt` — **no uploader, bucket or object path**. Ownership today is implied by the Cloudinary folder.

Reviews: `ReviewImage` model exists, but **no API endpoint or UI uploads review images**, and there are no review videos. Review media is therefore a new feature, not a migration.

## 6. Database migration requirements

- Prisma **5.22** (supports `directUrl` in `schema.prisma`; the Supabase docs' `prisma.config.ts` instructions are for newer Prisma — not needed).
- Target per Supabase docs (verified): `DATABASE_URL` = transaction pooler, port **6543**, `?pgbouncer=true`; `DIRECT_URL` = session pooler port **5432** (direct host is IPv6-only unless the IPv4 add-on is bought; the pooler is IPv4).
- Copy method per Supabase docs (verified): `pg_dump --format=directory --no-owner --no-privileges --no-subscriptions` from Neon, `pg_restore --no-owner --no-privileges` into Supabase over the **session pooler**, then `VACUUM ANALYZE`. Roles and RLS state are not migrated (we don't use either — Prisma connects as one role).
- Then `prisma migrate status` must report the `_prisma_migrations` history identical to Neon; **never** `prisma db push` or `migrate dev` against production.
- Pending migrations not yet in production: `20261101100000_security_hardening` (security branch), `20261102100000_phone_verifications` (this branch). Both additive.
- Verification plan: row counts per table, constraint and index lists (`pg_indexes`, `pg_constraint`), enum lists (`pg_enum`) — compared before/after. Neon stays read-only and untouched as rollback.
- Pre-migration data checks the owner must run on Neon (read-only): case-insensitive email duplicates, non-E.164 mobiles, accounts stuck in `PENDING_VERIFICATION` (queries in the sign-up report).

## 7. Vercel serverless compatibility issues

| # | Issue | Evidence | Fix |
|---|---|---|---|
| S1 | **4.5 MB request body limit** (Vercel docs, verified) | image uploads ≤ 10 MB and chat attachments ≤ 10 MB go through the API | Switch to signed direct uploads to Supabase (like videos already do); backend only issues the signed URL and then verifies the stored object (size, magic bytes) |
| S2 | **Cron = GET + `Authorization: Bearer <CRON_SECRET>`** (verified); Hobby once/day | 6 job endpoints are `POST` with `x-cron-secret` | Accept both headers in `CronSecretGuard`, add GET aliases, `vercel.json` crons; Pro plan for sub-daily schedules. Vercel does **not retry** failed cron runs → jobs must stay idempotent (they are written as sweeps) |
| S3 | In-memory rate limits | `RateLimitGuard` `Map` on `feature/signup-redesign`/`main` | Already solved on `security/production-hardening` (Postgres `rate_limit_hits`) — merge it |
| S4 | Start-up Stripe probe | `PaymentsService.onApplicationBootstrap` creates a **trial Stripe checkout on every start** after 5 s | On serverless every cold start would hit Stripe (and may not finish). Disable on Vercel (`process.env.VERCEL`), keep the admin `diagnose` endpoint |
| S5 | `app.listen` bootstrap | `main.ts` | Vercel's NestJS support detects `src/main.ts` zero-config (verified). Keep one `createApp()` used by both Render and Vercel so Render stays a working rollback |
| S6 | Raw body for Stripe | `rawBody: true` | Must be re-tested on Vercel with a real signed test-mode webhook (NOT RUN) |
| S7 | Client IP behind two proxies | Vercel FE rewrite → Vercel BE; rate limits key on `req.ip` with `TRUST_PROXY` | Verify which `X-Forwarded-For` hop is the client on Vercel→Vercel; otherwise every user shares the frontend's IP in the limiter |
| S8 | Prisma connections | `PrismaService` per instance, `$connect` on init | Transaction pooler + `pgbouncer=true`; consider `connection_limit=1` per function (Supabase Prisma troubleshooting page — not yet read) |
| S9 | View-count dedupe in memory | `products.service.ts`, `views.service.ts` `recentViews` Map | Harmless but less accurate on serverless; acceptable or move to DB |
| S10 | Proxy body limit on the frontend rewrite | not documented by Vercel | Test with a > 4.5 MB request; direct-to-storage uploads (S1) avoid the question |

Nothing uses WebSockets, SSE or background workers. PASS.

## 8. Storage migration requirements

1. Add to `MediaAsset` (additive migration): `ownerUserId`, `storageProvider` (`CLOUDINARY`|`SUPABASE`), `bucket`, `objectPath`. Existing rows keep `url` and get `storageProvider = CLOUDINARY`.
2. Buckets: `product-images`, `shop-assets` (public read), `user-avatars` (public read — avatars are shown on reviews), `review-media` (only when review media is approved as a feature), `chat-attachments` (**private**, signed read URLs — chat is not public). Each bucket with `allowedMimeTypes` and `fileSizeLimit` (Supabase supports both, verified).
3. Upload flow: client asks backend for a signed upload URL (valid 2 h per Supabase docs — we should request the shortest practical lifetime); path generated by the backend (`{bucket}/{ownerId}/{uuid}.{ext}`), ownership of shop/product checked before issuing; after upload the backend reads the object, checks magic bytes and size, then creates the `MediaAsset`. Unconfirmed uploads older than 24 h are removed by a cleanup job.
4. Service-role key backend-only; no Supabase client in the browser for privileged calls. No `NEXT_PUBLIC_SUPABASE_*` needed if all uploads use signed URLs created by the backend.
5. Without Supabase image resizing, product images should be resized by **Next.js Image Optimization** (already used for remote images) — set `remotePatterns` for the Supabase host.
6. Video: Supabase has no transcoding; keep Cloudinary for shop videos until a decision is made.

## 9. Security risks found

| Risk | Severity | Status |
|---|---|---|
| In-memory rate limits ineffective on serverless | High | fixed on `security/production-hardening` (unmerged) |
| No security headers (no CSP/HSTS/X-Frame-Options) on FE or BE | Medium | fixed on `security/production-hardening` per its commit message (verify) |
| JWT sessions not revocable (logout/password change) | Medium | session versioning on `security/production-hardening` |
| Admin accounts without MFA | High | admin MFA on `security/production-hardening` |
| Startup Stripe trial checkout per cold start | Low (cost/noise) | open (S4) |
| Cookie would become third-party if the API is called cross-domain | High if D4 rejected | avoided by keeping the proxy |
| Service-role key exposure risk once Supabase is added | High | design keeps it backend-only |
| Chat attachments in a public bucket would leak private files | High | private bucket + signed reads |
| `mongodb` unused dependency in frontend | Low | remove |
| Sign-up e-mail uniqueness case-sensitive at DB level (app lowercases) | Low | data check before migration |
| Legacy `PENDING_VERIFICATION` accounts can't log in or re-register | Low | data check; manual cleanup |

## 10. Deployment plan (proposed, nothing executed)

Each step ends with a check; the old system stays live until step 8.

1. **Decisions D1–D8** answered by the owner.
2. **Merge** `security/production-hardening` → `main` after review; apply its migration on Neon (current production) with `prisma migrate deploy` — approval required.
3. **Code (feature branch, PR, no direct push to main):** `createApp()` + Vercel entry, cron GET/Bearer support, disable start-up Stripe probe on Vercel, `SupabaseImageStorage` + signed uploads + `MediaAsset` columns, `Msg91SmsProvider` (after D1), notification delivery table (outbox) if SMS/email retries are wanted. Tests for each.
4. **Supabase project** (Pro, EU region e.g. Frankfurt to match Neon `eu-central-1`) — owner creates it or approves creation; buckets + limits.
5. **Rehearsal migration:** dump Neon → restore into Supabase **staging**; compare row counts, constraints, indexes, enums; run the full test suite against it.
6. **Backend on Vercel (preview)** pointed at Supabase staging; Stripe **test-mode** webhook to the preview URL; upload, sign-up, order, payment tests.
7. **Cut-over (maintenance window):** stop writes (maintenance flag / scale Render to read-only), final dump/restore into Supabase production, verify counts, switch Vercel backend env to Supabase prod, switch frontend `BACKEND_URL` to the Vercel backend, update the Stripe webhook endpoint URL (approval), smoke-test.
8. **Keep Render + Neon + Cloudinary untouched for ≥ 2 weeks** as rollback; rollback = point `BACKEND_URL` back to Render (Neon untouched, but writes made after cut-over would need replaying — hence the short validation window and a reconciliation query list).

Documents still to produce in later phases (after decisions): `SUPABASE_DATABASE_MIGRATION.md`, `FRONTEND_ENVIRONMENT.md`, `BACKEND_ENVIRONMENT.md`, `PRODUCTION_DEPLOYMENT.md`, `LOCALSPOTTER_PRODUCTION_MIGRATION_REPORT.md`.

---

### Sources checked (official documentation, 2026-11-03)
- Vercel: cron jobs (GET, `Authorization: Bearer`, UTC, no retry), cron usage & pricing (Hobby once/day, Pro once/minute), functions limitations (4.5 MB body, 300 s Hobby / 800 s Pro), NestJS framework page (zero-config, `src/main.*` entry).
- Supabase: Prisma guide (6543 + `pgbouncer=true`, `DIRECT_URL` 5432), connecting to Postgres (IPv6 direct, IPv4 pooler), signed upload URLs (2 h), bucket `allowedMimeTypes`/`fileSizeLimit`, image transformations (Pro+), migrating from Postgres (`pg_dump`/`pg_restore` flags).
- MSG91: `docs.msg91.com/`, `/otp`, `/sms`, `msg91.com/help` — insufficient for implementation (see §3).
