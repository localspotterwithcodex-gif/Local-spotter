# LocalSpotter — Environment variables (per Vercel project)

Every variable the code reads, checked against the source on 2026-11-23. Values are set in the hosting dashboards,
never committed. Templates: `backend/.env.example`, `frontend/.env.example`. Generate fresh secrets per environment.
`R` = required in production, `O` = optional.

## `localspotter-api` (backend) — the only project with secrets

| Variable | | Purpose |
|---|---|---|
| `DATABASE_URL` | R | Supabase transaction pooler (6543) `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | R | Supabase session pooler (5432), used by `prisma migrate` |
| `JWT_SECRET` | R | Session signing, 32+ random characters |
| `ENCRYPTION_KEY` | R | base64 of 32 bytes; encrypts IBANs and admin authenticator secrets (admins cannot sign in without it) |
| `OTP_HMAC_SECRET` | R | 32+ random characters; HMAC of SMS codes |
| `CRON_SECRET` | R | 16+ characters; Vercel Cron sends it as `Authorization: Bearer …` |
| `NODE_ENV` | R | `production` |
| `CORS_ORIGIN` | R | `https://www.<domain>,https://admin.<domain>` (also the CSRF origin check) |
| `FRONTEND_URL` | R | Public site URL for links in e-mails, SMS and the Stripe return page |
| `TRUST_PROXY` | R | Proxy hops in front of the API; verify on a preview (see DEPLOYMENT.md) |
| `SMS_PROVIDER` | R | `bird` (`dev-file` locally only; refused in production) |
| `BIRD_API_KEY`, `BIRD_SMS_FROM` | R | Bird SMS key (SMS-send scope) and sender |
| `BIRD_API_BASE_URL` | O | Default `https://eu1.platform.bird.com` |
| `SMS_ALLOWED_PREFIXES` | O | Countries that may receive codes, e.g. `+31,+32`; default = sign-up country selector |
| `LOGIN_OTP_TRUST_DAYS` | O | Days a device skips the login code (default 0 = every login, D1; max 90) |
| `STORAGE_PROVIDER` | R | `supabase` (Cloudinary only until staging is verified) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | R | Storage; the key never goes to a frontend |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | R | Stripe Checkout (iDEAL); test keys on staging |
| `MAIL_TRANSPORT`, `RESEND_API_KEY`, `MAIL_FROM` | R | `resend` + key + verified sender |
| `COMMISSION_DEFAULT_BPS`, `PAYOUT_HOLD_DAYS`, `PAYOUT_MIN_CENTS`, `RETURN_WINDOW_DAYS`, `FLAT_SHIPPING_FEE` | O | Platform settings |
| `DEEPL_API_KEY`, `GEMINI_API_KEY`, `GEMINI_VISION_MODEL`, `GOOGLE_CLIENT_ID` | O | Translation, photo search, Google sign-in |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | O | Previous storage; remove after Supabase is verified |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | O | Temporary SMS fallback when `SMS_PROVIDER` is unset; remove after Bird is verified |
| `PORT`, `API_PREFIX`, `JWT_EXPIRES_IN`, `COOKIE_SECURE`, `SWAGGER_ENABLED`, `PRISMA_TX_MAX_WAIT_MS`, `PRISMA_TX_TIMEOUT_MS` | O | Runtime tuning |
| `VERCEL` | — | Set by Vercel itself |

Scripts only (not on Vercel): `ADMIN_EMAIL` (create-admin), `ALLOW_DEMO_SEED`, `ALLOW_DEMO_CLEANUP` (local demo data),
`TEST_DATABASE_URL`, `TEST_DATABASE_DIRECT_URL` (end-to-end tests).

## `localspotter-web` and `localspotter-admin` (frontend) — no secrets

| Variable | web | admin | Purpose |
|---|---|---|---|
| `BACKEND_URL` | R | R | `https://api.<domain>`; server-side only (the `/api/v1` rewrite) |
| `NEXT_PUBLIC_PORTAL` | `public` | `admin` | Which deployment this is (`frontend/src/proxy.ts`) |
| `SUPABASE_STORAGE_HOST` | R | R | Host only (`<ref>.supabase.co`); images config and CSP |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | O | — | Google sign-in button |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | O | — | Help page contact |

The production API refuses to start when a required value is missing or malformed (`backend/src/config/env.validation.ts`).
