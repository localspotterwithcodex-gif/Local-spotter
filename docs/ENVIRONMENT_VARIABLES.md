# Environment variables

Every variable the code reads (`process.env.*` / `ConfigService.get`), checked against source on 2026-11-01. Secret values are never shown here. Set backend values in the Render service's environment and frontend values in the Vercel project settings. Never commit them.

**Label** — REQUIRED: you must supply a value · GENERATED: create a random value yourself · OPTIONAL: only for that feature · EXISTING: already configured on the live deployment (verified indirectly from live behaviour).

## Backend (NestJS, Render) — all server-side

| Variable | Label | Prod mandatory | Secret | Source / format | Purpose |
|---|---|---|---|---|---|
| `NODE_ENV` | EXISTING | yes | no | `production` | Enables production checks, Secure cookies, HSTS, no Swagger |
| `PORT` | EXISTING | host sets it | no | integer | Listen port |
| `API_PREFIX` | OPTIONAL | no | no | default `/api/v1` | Route prefix |
| `DATABASE_URL` | EXISTING | yes | **yes** | Postgres provider (pooled URL) | Prisma connection |
| `DIRECT_URL` | EXISTING | yes with a pooler | **yes** | Postgres provider (direct URL) | Migrations |
| `JWT_SECRET` | EXISTING | yes (startup fails without) | **yes** | GENERATED ≥ 32 chars: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` | Signs sessions. Rotating it logs everyone out (no other effect) |
| `JWT_EXPIRES_IN` | OPTIONAL | no | no | e.g. `1d` | Session lifetime |
| `COOKIE_SECURE` | OPTIONAL | no | no | `true`/`false` | Force Secure cookie outside production |
| `CORS_ORIGIN` | EXISTING | yes (startup fails without) | no | comma-separated exact origins, e.g. `https://local-spotter-alpha.vercel.app` | CORS + CSRF origin check |
| `FRONTEND_URL` | EXISTING | yes with Stripe | no | `https://…` | Links in e-mails, Stripe return URL |
| **`TRUST_PROXY`** | **REQUIRED — please check** | yes | no | integer hop count; Vercel rewrite + Render = `2` | Real client IP for rate limits. Unset → all visitors share the proxy IP (startup warning) |
| `SWAGGER_ENABLED` | OPTIONAL | no | no | `true` to expose `/api/v1/docs` in production | API docs (off by default in production) |
| `MAIL_TRANSPORT` | EXISTING | yes = `resend` | no | `resend` / `dev-file` (dev only) | Mail delivery |
| `RESEND_API_KEY` | EXISTING | yes | **yes** | Resend dashboard → API Keys | Sends verification/reset mail |
| `MAIL_FROM` | EXISTING | yes | no | `LocalSpotter <no-reply@verified-domain>` | Sender; domain must be verified in Resend |
| `STRIPE_SECRET_KEY` | EXISTING/OPTIONAL | for payments | **yes** | Stripe → Developers → API keys (`sk_live_…`) | Checkout, refunds |
| `STRIPE_WEBHOOK_SECRET` | EXISTING | yes with Stripe | **yes** | Stripe → Webhooks endpoint `https://<api>/api/v1/payments/webhooks/stripe` (`whsec_…`) | Webhook signature |
| **`ENCRYPTION_KEY`** | **REQUIRED** (now also for admin MFA) | yes | **yes** | GENERATED: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (32 bytes, base64) | AES-256-GCM for IBANs and admin TOTP secrets. **Back it up**: losing it makes saved IBANs and MFA secrets unreadable. If it was already set for payouts, keep the same value |
| `CRON_SECRET` | REQUIRED for jobs | yes | **yes** | GENERATED ≥ 16 chars | Auth header for `/internal/jobs/*`; unset = jobs disabled (no reconciliation, payouts, retention) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | EXISTING | for uploads | key+secret **yes** | Cloudinary → Settings → API Keys | Image/video upload |
| `DEEPL_API_KEY` | OPTIONAL | no | **yes** | DeepL account | Auto-translation |
| `GEMINI_API_KEY` / `GEMINI_VISION_MODEL` | OPTIONAL | no | key **yes** | Google AI Studio | Photo search |
| `GOOGLE_CLIENT_ID` | OPTIONAL | for Google login | no | Google Cloud OAuth client | Verifies Google ID tokens |
| `FLAT_SHIPPING_FEE` | OPTIONAL | no | no | decimal EUR | Shipping default |
| `COMMISSION_DEFAULT_BPS`, `PAYOUT_HOLD_DAYS`, `PAYOUT_MIN_CENTS`, `RETURN_WINDOW_DAYS` | OPTIONAL | no | no | integers (validated) | Finance rules |
| `PRISMA_TX_MAX_WAIT_MS`, `PRISMA_TX_TIMEOUT_MS` | OPTIONAL | no | no | ms | Transaction limits |
| `ALLOW_DEMO_SEED`, `ALLOW_DEMO_CLEANUP` | dev scripts only | never set in production | no | `yes` | Guard the demo seed/cleanup scripts |

No new variables were introduced by the security work: MFA reuses `ENCRYPTION_KEY`, the rate limiter uses the existing database, and Redis is not needed.

## Frontend (Next.js, Vercel)

| Variable | Label | Prod mandatory | Public? | Purpose |
|---|---|---|---|---|
| `BACKEND_URL` | EXISTING | yes (build fails without) | server-only | Where `/api/v1/*` is proxied |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OPTIONAL | no | public by design (OAuth client id, not a secret) | Shows the Google button |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | OPTIONAL | no | public | Overrides the default `contact@localspotter.com` |
| `NEXT_PUBLIC_SMS_ENABLED` | OPTIONAL | no | public | Mobile-number sign-up |

No secret is exposed through a `NEXT_PUBLIC_` variable.

## Action list for you

1. **Render → backend env:** confirm `ENCRYPTION_KEY` is set (32-byte base64). Keep the existing value if payouts already use it.
2. **Render → backend env:** set `TRUST_PROXY=2` (Vercel rewrite → Render load balancer → app). Verify after deploy: two requests from different networks must not share a rate-limit bucket.
3. **Render → backend env:** confirm `CRON_SECRET` is set and the scheduler calls the jobs listed in `backend/.env.example`.
4. Run `npx prisma migrate deploy` for migration `20261101100000_security_hardening` (additive only) **before** or together with the backend deploy.
