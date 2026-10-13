# Authentication and RBAC Specification

## Purpose
This document defines authentication, role-based access control, ownership checks, and security rules for Local Spotter.

## Confirmed Requirements
- Users authenticate with email/mobile identifier and password.
- Forgot password and reset password are required.
- Google OAuth and Facebook OAuth are required.
- Consumers and business owners use the same auth foundation with different permissions.
- Roles: `SUPER_ADMIN`, `BUSINESS_OWNER`, `CONSUMER`.
- Future role extension should allow `BUSINESS_STAFF`.
- Do not trust role, user ID, or business ID from frontend.
- Passwords must be hashed securely, never stored plaintext.
- Secure session/token handling is required.

## Authentication Model
- User identity is represented by `users`.
- Password accounts store `password_hash` only.
- OAuth accounts are linked through `oauth_accounts`.
- Password reset tokens are stored hashed and expire quickly.
- Authenticated request context must include:
  - `user.id`
  - `user.role`
  - `user.status`
  - profile IDs when loaded
  - business ownership scope when needed

## Recommended Token Strategy
- Web MVP: secure HTTP-only cookies for refresh/session and short-lived access tokens.
- Mobile future: same API supports Bearer access token and refresh token rotation.
- CSRF protection is required if cookie auth is used.
- Access tokens should be short-lived.
- Refresh tokens/sessions should be hashed server-side and revocable.

## Password Policy
- Minimum length: 10 characters recommended.
- Require at least one letter and one number or use a password-strength library.
- Block common leaked passwords if feasible.
- Hash using Argon2id or bcrypt with strong cost.
- Rate-limit login and reset flows.

## RBAC Matrix

| Resource / Action | Public | Consumer | Business Owner | Super Admin |
| --- | --- | --- | --- | --- |
| View active products | Yes | Yes | Yes | Yes |
| Purchase products | No | Yes | No | No |
| Manage own consumer profile | No | Own only | No | Admin override |
| Manage addresses | No | Own only | No | Admin override |
| Follow business | No | Yes | No | Admin override |
| Create review/comment | No | Eligible consumer | No | Moderation only |
| Create business | No | No | Yes | Yes |
| Manage business | No | No | Owned business only | Yes |
| Manage products | No | No | Owned business only | Yes |
| Manage orders | No | Own order read | Owned business orders | Yes |
| Create shop route | No | No | Owned business with plan | Yes |
| Create workshop | No | No | Owned business with Workshop | Yes |
| Request payout | No | No | Owned business only | Yes |
| Approve payout | No | No | No | Yes |
| Manage subscription plans | No | No | No | Yes |
| Moderate content | No | No | Own content limited | Yes |

## Ownership Rules
- Business owner can modify only businesses where `businesses.owner_profile_id` belongs to the authenticated user.
- Product ownership is derived through product -> business -> owner.
- Order ownership:
  - Consumer can read own orders.
  - Business owner can read/update orders for owned business.
  - Admin can read all.
- Payout ownership:
  - Business owner can create/read own business payout requests.
  - Only admin can approve/reject/mark paid.
- Address ownership:
  - Consumer can access only own addresses.
  - Business owners see only delivery snapshot necessary for their orders.
- Media ownership:
  - Access is tied to owning entity and user role.

## Subscription-Aware Authorization
- `WEBSHOP` or higher required:
  - Create/manage products.
  - Product listing and purchasing.
- `SHOPROUTES` or higher required:
  - Business map presence.
  - Shop route creation and route stops.
  - Directions/location discovery.
- `WORKSHOP` required:
  - Workshop creation.
  - Followers.
  - Reviews/ratings/comments.
  - Review images and product reviews.
  - Workshop booking.

Backend must return `403 FORBIDDEN` with feature-gate code when a business lacks an active plan.

## Account State Rules
- `PENDING_VERIFICATION` users can complete verification and onboarding only.
- `SUSPENDED` users cannot mutate data or purchase/book.
- `DELETED` users cannot authenticate.
- Disabled businesses are hidden from public discovery and cannot receive orders.

## Route Guards
- `AuthGuard`: authenticated user required.
- `RoleGuard`: validates role.
- `BusinessOwnershipGuard`: validates user owns business/resource.
- `SubscriptionFeatureGuard`: validates active plan and feature.
- `AdminGuard`: requires `SUPER_ADMIN`.
- `WebhookSignatureGuard`: validates provider signatures instead of user auth.

## Assumptions
- Email verification is recommended before purchase, subscription payment, or payout setup.
- Mobile verification is optional unless mobile login is used.
- Role changes after onboarding require admin intervention.
- Consumer and business owner roles are mutually exclusive for MVP; a user needing both may create separate accounts unless client confirms multi-role accounts.

## Unresolved Questions
- Should a single user be able to act as both Consumer and Business Owner?
- Is email verification mandatory before browsing, purchasing, or business activation?
- Should MFA be required for admins?
- Should business owners be approved by admin before public listing?
- What exact password policy will client approve?

## Dependencies
- `06-DATABASE-SCHEMA.md` for auth/profile tables.
- `07-API-SPEC.md` for guarded endpoints.
- `09-SUBSCRIPTION-SPEC.md` for feature gates.
- `16-SECURITY-GDPR.md` for security controls.
- `18-TESTING-SPEC.md` for auth and authorization coverage.
