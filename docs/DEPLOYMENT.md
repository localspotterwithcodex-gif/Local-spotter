# LocalSpotter — Deployment (Vercel + Supabase + Bird)

Target set-up from `MASTER-PROMPT.md` §4. Replaces the Render + Neon set-up in `RELEASE-GUIDE.md`.
Every value goes into the hosting dashboards; nothing secret is ever committed. Variables: see `ENVIRONMENT.md`.

```text
Vercel team (region fra1, Node 24)
├─ localspotter-web    root=frontend  NEXT_PUBLIC_PORTAL=public  www.<domain>     consumers + shop owners
├─ localspotter-admin  root=frontend  NEXT_PUBLIC_PORTAL=admin   admin.<domain>   super admins only
└─ localspotter-api    root=backend                              api.<domain>     NestJS, the only app with secrets
Supabase (Frankfurt): one project for staging, one for production — Postgres (RLS on) + Storage buckets
Bird (SMS) · Stripe Checkout iDEAL · Resend (e-mail) · DeepL · Google sign-in (optional)
```

## 0. Before anything else (owner)

1. Make the GitHub repository **private**.
2. Rotate every key and password that was ever committed (git history keeps deleted files): the admin password from
   the deleted `backend/prisma/manual-supabase-admin-setup.sql`, the demo logins, any API key ever in a file.
3. Old Neon database (D13): take one `pg_dump` backup and store it **outside** the repository (it holds personal
   data). Keep the Neon project until production runs on Supabase; never write to it.

## 1. Supabase (staging first, then production)

1. Create the project in **EU Central (Frankfurt)**; Pro plan for production.
2. Connection strings (Project Settings → Database):
   - `DATABASE_URL` = **transaction pooler** (port 6543) + `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` = **session pooler** (port 5432). The direct host is IPv6-only unless the IPv4 add-on is bought.
3. API keys: the **service role / secret key** goes only into `localspotter-api` (`SUPABASE_SERVICE_ROLE_KEY`).
4. From a trusted machine (never in the Vercel build), in `backend/` with `npm ci` done and the two URLs exported:

   ```bash
   npx prisma migrate deploy                 # all migrations; never migrate dev / reset on staging or production
   npx ts-node scripts/check-rls.ts           # must print "RLS enabled on every public table."
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/storage-buckets.ts
   npx ts-node scripts/seed-plans.ts --webshop=<price> --shoproutes=<price> --workshop=<price>
   ADMIN_EMAIL=you@your-domain.nl npx ts-node scripts/create-admin.ts   # password typed, hidden
   ```

   Never run `prisma db seed` there: it creates demo logins with public passwords (it refuses without `ALLOW_DEMO_SEED=yes`).
5. Gate: migrations clean, `check-rls` OK, 3 plans, 1 super admin, 4 buckets, no demo users.

## 2. Bird (SMS)

1. Dashboard → SMS → Destinations: enable **the Netherlands** (and any other country in `SMS_ALLOWED_PREFIXES`);
   otherwise sends fail with `422 SMSDestinationNotEnabled`.
2. Create an API key with only the SMS-sending scope (`bk_eu1_…` keys use `https://eu1.platform.bird.com`).
3. Choose the sender (D6): alphanumeric `LocalSpotter` (3–11 characters, one-way) if Bird allows it for NL.
4. API env: `SMS_PROVIDER=bird`, `BIRD_API_KEY`, `BIRD_SMS_FROM`, `OTP_HMAC_SECRET` (32+ random characters).

## 3. Stripe, Resend, DNS

- Stripe: webhook endpoint `https://api.<domain>/api/v1/payments/webhooks/stripe` for `checkout.session.completed`,
  `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.
  Test keys (`sk_test_…`) on staging; the signing secret is `STRIPE_WEBHOOK_SECRET`.
- Resend: verify the sending domain; `MAIL_TRANSPORT=resend`, `RESEND_API_KEY`, `MAIL_FROM`.
- DNS: `www`, `admin` and `api` point at the three Vercel projects (D5: `*.vercel.app` until a domain exists).

## 4. Vercel (three projects, same repository)

| Project | Root directory | Key settings |
|---|---|---|
| `localspotter-api` | `backend` | Vercel detects `src/main.ts` (NestJS). Region `fra1`. All backend env from `ENVIRONMENT.md`, incl. `CRON_SECRET` (Production) |
| `localspotter-web` | `frontend` | `BACKEND_URL=https://api.<domain>`, `NEXT_PUBLIC_PORTAL=public`, `SUPABASE_STORAGE_HOST` |
| `localspotter-admin` | `frontend` | `BACKEND_URL=https://api.<domain>`, `NEXT_PUBLIC_PORTAL=admin`, `SUPABASE_STORAGE_HOST` |

- Backend `CORS_ORIGIN=https://www.<domain>,https://admin.<domain>`, `FRONTEND_URL=https://www.<domain>`, `NODE_ENV=production`.
- **Cron**: `backend/vercel.json` schedules the jobs (UTC). Vercel calls them with GET + `Authorization: Bearer <CRON_SECRET>`,
  on production deployments only. Every-10-minute schedules need a paid plan (Hobby allows once a day).
  Weekly payouts run Monday 05:00 UTC (06:00 Amsterdam in winter, 07:00 in summer).
- **`TRUST_PROXY`**: verify on a preview — log `req.ip` against `X-Forwarded-For` for a request through the web → API
  rewrite. A wrong hop count makes all visitors share one IP, and per-IP limits then block everyone or nobody.
- The admin project returns 404 for everything except `/admin/**`, the sign-in pages and `/api/v1/**`, and sends
  `X-Robots-Tag: noindex`; the public project returns 404 for `/admin/**` (`frontend/src/proxy.ts`).

## 5. Release order and rollback

1. Migrate staging → deploy staging → smoke test (below) → migrate production → deploy production.
2. Rollback: Vercel **Instant Rollback** for code. Migrations are additive; keep them backward-compatible for one release.

Smoke test on staging (MASTER-PROMPT Phase 10 journeys): guest browses a shop; customer signs up, logs in and resets the
password with SMS codes; owner picks a plan and pays in Stripe test mode (plan ACTIVE only after the webhook); owner
uploads a logo and product photos (they land in their Supabase folders); customer orders and pays; owner marks
shipped and delivered (one SMS each); customer reviews with a photo, owner replies; a Webshop owner is refused a
Workshop feature (403 `PLAN_FEATURE_REQUIRED`); admin signs in on the admin domain with the authenticator app and sees
the monthly report; owner A cannot reach owner B's data; `/admin` is 404 on the public domain.

## 6. CI

`.github/workflows/ci.yml` runs on every pull request and on `main`: backend validate, typecheck, unit tests, build,
`migrate deploy` on an empty Postgres, drift check, RLS check, end-to-end tests; frontend typecheck, lint, tests, build;
`npm audit` reported. Merge to `main` only when it is green.
