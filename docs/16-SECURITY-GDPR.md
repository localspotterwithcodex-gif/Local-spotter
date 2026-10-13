# Security and GDPR Specification

## Purpose
This document defines security, privacy, GDPR-conscious engineering, secret handling, and abuse-prevention requirements.

## Confirmed Requirements
- Netherlands/EU target requires GDPR-conscious design.
- Implement password hashing, auth guards, RBAC, ownership checks, input validation, rate limiting, secure headers, CSRF protection where applicable, secure cookies/tokens, file upload validation, SQL injection protection through Prisma, XSS protection, and environment secret protection.
- Never commit API keys, OAuth secrets, database passwords, or payment secrets.
- Do not expose unnecessary private consumer information.
- Location permission must be explicit.

## Repository Security Finding
- `.claude/settings.json` currently contains a secret-like token.
- The value was not copied into docs.
- Before committing or sharing the repository, move secrets to local environment variables and ensure secret files are ignored.

## Authentication Security
- Hash passwords with Argon2id or bcrypt.
- Use short-lived access tokens and refresh rotation/session revocation.
- Store refresh/session tokens hashed if persisted.
- Rate-limit login, registration, password reset, and webhook abuse-sensitive paths.
- Use generic responses for password reset.
- Admin accounts should use MFA if client approves.

## Authorization Security
- Backend must derive user identity from auth context.
- Never accept `user_id` from request body for protected actions.
- Business owner resource access must join through owned business.
- Subscription feature checks run server-side for every gated action.
- Admin-only actions require `SUPER_ADMIN`.
- Payout approval requires admin and audit log.

## Input Validation
- Validate:
  - email.
  - mobile/phone.
  - password.
  - KVK.
  - price and currency.
  - stock and quantities.
  - rating 1-5.
  - coordinates.
  - subscription plan.
  - product image count.
  - workshop capacity.
  - start/end dates.
  - order status transitions.
- Reject unknown fields in DTOs.
- Normalize email and slugs.

## File Upload Security
- Store image binaries in object storage, not PostgreSQL.
- Validate MIME type and file extension.
- Enforce max file size.
- Enforce max product image count.
- Generate safe storage paths server-side.
- Do not allow users to overwrite arbitrary paths.
- Use signed upload URLs with short expiry where possible.
- Strip or ignore unsafe metadata where practical.

## Payment Security
- Use provider-hosted checkout or provider-approved components.
- Never store card number, CVV, full IBAN, or raw payment credentials.
- Verify webhook signatures using raw body.
- Store provider event IDs and process idempotently.
- Recalculate totals server-side.
- Separate subscription revenue from consumer order/workshop revenue.

## Location Privacy
- Do not continuously track consumer location.
- Request geolocation only after explicit user action.
- Store business coordinates because they are business-provided shop data.
- Avoid storing consumer GPS unless required and consented.
- Provide fallback city/manual search.

## Personal Data
Personal data includes:
- User email/mobile.
- Names.
- Consumer addresses.
- Profile images.
- Order delivery snapshots.
- Payment metadata.
- Review/comment content.
- Location data.

Data minimization:
- Business owners see only delivery data needed for fulfillment.
- Public profiles expose only intended public business/review data.
- Admin access is audited.

## GDPR-Conscious Features
- Privacy policy and terms pages required.
- Account deletion workflow should be supported.
- Data export workflow should be considered.
- Consent/permission for geolocation.
- Clear distinction between public business data and private consumer data.
- Soft delete where legal/accounting retention is needed.
- Hard delete/anonymization policy needs client/legal confirmation.

## Web Security Controls
- HTTPS in production.
- Security headers:
  - Content-Security-Policy.
  - X-Content-Type-Options.
  - Referrer-Policy.
  - X-Frame-Options or frame-ancestors.
  - Permissions-Policy for geolocation/camera.
- CSRF protection if cookies are used.
- CORS locked to frontend domains.
- Sanitize rich text if any is allowed.
- Escape rendered content.
- Use Prisma parameterization.

## Logging and Observability
- Do not log secrets, passwords, tokens, card data, or full addresses unnecessarily.
- Log security-relevant events:
  - login failures.
  - role changes.
  - subscription/payment webhook failures.
  - payout decisions.
  - moderation actions.
  - admin actions.
- Use request IDs for traceability.

## Assumptions
- Legal counsel/client provides final privacy policy, terms, cookie notice, and retention policy.
- Secure cookie auth is preferred for web MVP, with token support planned for mobile.
- Admin MFA is strongly recommended but requires client approval.

## Unresolved Questions
- Data retention periods for orders, reviews, addresses, payments, and logs.
- Whether account deletion anonymizes orders or deletes account data entirely.
- Cookie consent requirements if analytics are added.
- Admin MFA requirement.
- External KVK validation provider.
- Whether review images need moderation before publication.

## Dependencies
- `08-AUTH-RBAC.md` for auth/authorization rules.
- `10-PAYMENT-SPEC.md` for payment security.
- `12-GPS-SHOPROUTES.md` for location privacy.
- `06-DATABASE-SCHEMA.md` for audit and soft delete fields.
- `19-DEPLOYMENT.md` for environment and secret management.
