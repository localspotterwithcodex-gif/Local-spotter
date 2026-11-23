# LocalSpotter — Security overview

What protects what, and where it lives in the code. Report vulnerabilities to the owner privately.

## Owner actions (not code)

- The GitHub repository must be **private**; rotate every secret that was ever committed (see `DEPLOYMENT.md` §0).
- Secrets live only in the hosting dashboards. The frontends hold no secrets.

## Authentication

- Session: signed JWT in an HttpOnly, SameSite=Lax cookie (`ls_session`), Secure in production. Every session carries
  `sv` (`users.session_version`); a password reset or MFA change revokes all sessions.
- Customers and shop owners: password + **SMS code at every login** (D1; optional trusted device via
  `LOGIN_OTP_TRUST_DAYS`). Accounts without a verified mobile log in with the password (D-013).
- Super admins: password + **authenticator app** (TOTP, encrypted secret, one-time recovery codes; D9). No admin
  session exists before the second factor; the admin portal has its own domain.
- SMS codes (`backend/src/auth/otp/otp.service.ts`): 6 random digits, HMAC with `OTP_HMAC_SECRET`, constant-time check,
  single use, 5 tries, 60 s cooldown, 5 per hour and 10 per day per number, allowed country prefixes, 5/5/10 min expiry.
  Responses never reveal whether an account exists. Codes and full numbers are never logged; `sms_messages` stores the
  last 4 digits only.
- Short-lived step tokens (`otp-login`, `mfa-login`, guest links) carry a `purpose` and are never accepted as sessions.

## Authorization

- The backend is the boundary: `JwtAuthGuard`, `RolesGuard`, shop membership (`EmployeesService.canAccessShop`) and
  ownership checks in every service. The frontend proxy (`frontend/src/proxy.ts`) only routes.
- Plan features and limits: `SubscriptionEntitlementService` only; denials are 403 `PLAN_FEATURE_REQUIRED` / `NO_SUBSCRIPTION`.
- `/admin/**` API routes require `SUPER_ADMIN` with MFA; the public site returns 404 for `/admin`.
- CSRF: `OriginCheckGuard` on every cookie-authenticated write; CORS limited to `CORS_ORIGIN`.

## Data

- Row Level Security on every table (no policies); only the API (table owner) reads data.
- IBANs and admin TOTP secrets: AES-256-GCM with `ENCRYPTION_KEY`; IBANs are never returned or exported unaudited.
- Rate limits are shared across instances (`rate_limit_hits`).
- Audit log for sensitive admin actions (plan/commission changes, payouts export, report exports, MFA events).

## Files (Supabase Storage)

- Browsers upload directly with a signed URL for one object at a fixed path chosen by the API, after checks on role,
  shop membership / review authorship / chat participation, plan limits, type and size.
- `POST /media/confirm` re-reads the object: size, real type by magic bytes (raster images only, no SVG), MP4 only with
  the duration read from the file; anything else is deleted. Chat attachments are in a private bucket, read through
  1-hour signed URLs. A daily job removes unconfirmed and unused files.

## Platform

- Security headers and CSP (`frontend/next.config.ts`), HSTS in production, `X-Frame-Options: DENY`, `noindex` on admin.
- Payments: Stripe Checkout; the plan or order is paid only after a verified, idempotent webhook.
- Internal jobs: `CronSecretGuard` (Bearer or `x-cron-secret`, constant-time), disabled without a secret; idempotent.
- Production refuses to start with missing or unsafe configuration (`backend/src/config/env.validation.ts`).
- Known dependency backlog: some `npm audit` findings need a NestJS major upgrade (audit G-04); CI reports them.
