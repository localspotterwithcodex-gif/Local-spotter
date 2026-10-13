# Deployment Specification

## Purpose
This document defines the deployment architecture, environments, secrets, infrastructure candidates, and operational requirements for the Local Spotter MVP.

## Confirmed Requirements
- Frontend: Next.js.
- Backend: NestJS REST API.
- Database: PostgreSQL, preferably Supabase PostgreSQL.
- Storage: Supabase Storage or equivalent object storage.
- Use environment variables.
- Never commit production secrets.
- Prefer free or low-cost platforms where suitable:
  - Vercel.
  - Cloudflare.
  - Railway.
  - Render.
  - Fly.io.
  - Supabase.
  - Neon.
  - RunPod.
  - Hugging Face.
- Docker support when useful.

## Recommended MVP Deployment Architecture
- Frontend: Vercel.
- Backend API: Railway, Render, or Fly.io.
- Database: Supabase PostgreSQL.
- Storage: Supabase Storage.
- Payment provider: unresolved.
- Map provider: unresolved.
- Email: unresolved transactional email provider.

Rationale:
- Vercel is natural for Next.js App Router.
- Railway/Render/Fly are simpler than Kubernetes for a NestJS modular monolith.
- Supabase gives managed PostgreSQL and Storage with a low-cost path.

## Environments
- `local`: developer machine, local env files, optional Supabase dev project.
- `staging`: production-like test environment with sandbox payments.
- `production`: live customer environment.

Each environment needs separate:
- Database.
- Storage bucket.
- Payment provider keys/webhook secrets.
- OAuth app credentials.
- Map keys.
- Email credentials.
- Auth secrets.

## Environment Variables
Required categories:
- `DATABASE_URL`.
- `DIRECT_URL`.
- `NEXT_PUBLIC_API_URL`.
- `AUTH_SECRET`.
- `GOOGLE_CLIENT_ID`.
- `GOOGLE_CLIENT_SECRET`.
- `FACEBOOK_CLIENT_ID`.
- `FACEBOOK_CLIENT_SECRET`.
- `PAYMENT_SECRET_KEY`.
- `PAYMENT_WEBHOOK_SECRET`.
- `MAP_PROVIDER_KEY`.
- `STORAGE_URL`.
- `STORAGE_SERVICE_ROLE_KEY`.
- `STORAGE_PUBLIC_BUCKET`.
- `EMAIL_PROVIDER_API_KEY`.
- `APP_BASE_URL`.
- `API_BASE_URL`.

No actual secret values should be committed.

## Build and Runtime
- Monorepo after approval:
  - `apps/web`: Next.js.
  - `apps/api`: NestJS.
  - `packages/*`: shared types/config/validation.
  - `prisma`: schema and seed.
- Use Node.js LTS.
- Use pnpm or npm workspaces; final package manager to be chosen during implementation.
- API should expose health endpoint:
  - `GET /health`.
  - `GET /health/db`.
- Use structured logging.

## Database Deployment
- Prisma migrations must be reproducible.
- Run migrations in CI/CD before app deploy or as release command.
- Seed data only for local/staging.
- Backups:
  - Supabase automated backups for production.
  - Manual restore runbook before launch.

## Storage Deployment
- Buckets:
  - `public-business-assets`.
  - `product-images`.
  - `review-images`.
  - `workshop-images`.
  - `private-user-assets` if needed.
- Use signed URLs for private assets.
- Validate upload completion server-side.

## Payment Webhooks
- Webhook endpoints must be publicly reachable over HTTPS.
- Configure provider webhook URLs per environment.
- Use separate webhook secrets per environment.
- Log and alert failed webhook processing.

## CI/CD Pipeline
Recommended checks:
- Install dependencies.
- Lint.
- Typecheck.
- Unit tests.
- Integration tests with PostgreSQL service.
- Prisma validate/migrate diff.
- Build web.
- Build api.
- Secret scan.
- Deploy staging on main/develop branch.
- Manual promotion to production.

## Docker
- Docker support should be added during implementation for API and local development.
- Use Docker Compose locally for API + PostgreSQL if not using Supabase local.
- Frontend can run outside Docker for faster DX unless deployment requires container.

## Observability
- Structured logs with request IDs.
- Error tracking candidate: Sentry or platform-native logs.
- Metrics:
  - API latency/errors.
  - webhook failures.
  - payment state mismatch.
  - order creation failures.
  - stock transaction conflicts.
- Audit logs in database for admin/security events.

## Assumptions
- Use managed platforms instead of self-managed servers for MVP.
- Production database is not hosted on the same ephemeral container as API.
- Client will provide domain/DNS access before production launch.
- Provider selection for payments/maps/email happens before Phase 3/6 implementation.

## Unresolved Questions
- Final hosting provider for API.
- Final package manager: pnpm or npm.
- Domain names for web/API.
- Payment provider and webhook domains.
- Map provider.
- Email provider.
- Backup retention requirements.
- Monitoring/alerting budget.

## Dependencies
- `01-PROJECT-REQUIREMENTS.md` for stack.
- `10-PAYMENT-SPEC.md` for payment environment needs.
- `12-GPS-SHOPROUTES.md` for map provider needs.
- `16-SECURITY-GDPR.md` for secret/privacy requirements.
- `18-TESTING-SPEC.md` for CI gates.
- `20-IMPLEMENTATION-PLAN.md` for deployment phase.
