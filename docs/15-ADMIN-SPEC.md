# Admin Specification

## Purpose
This document defines Super Admin capabilities, admin pages, backend operations, and audit requirements.

## Confirmed Requirements
- Super Admin can manage consumers, business owners, businesses, subscriptions, products, orders, reviews, reported content, payouts, payments, and platform activity.
- Admin can approve/reject withdrawals.
- Admin area must be protected separately.
- Business owners cannot approve their own payouts.

## Figma Evidence
- No admin screens were verified in accessible Figma pages.
- Admin UI must therefore use requirements plus the verified Local Spotter design system.
- Any admin layout produced during implementation should be reviewed because it is not Figma-provided.

## Admin Navigation
Recommended desktop-first admin modules:
- Overview.
- Users.
- Business Owners.
- Businesses.
- Products.
- Orders.
- Reviews.
- Reports.
- Payments.
- Payouts.
- Subscription Plans.
- Categories.
- Audit Logs.

Mobile admin can be functional but not primary if client accepts desktop-first admin workflows.

## User Management
- View consumers and business owners.
- Filter by role/status/date.
- Suspend/reactivate accounts.
- View account profile and associated orders/businesses.
- Start account deletion/export workflow if required.
- Role changes must be restricted and audited.

## Business Management
- View business profile, owner, KVK, status, subscription.
- Approve/manage/disable businesses.
- Edit limited administrative fields.
- View products, orders, reviews, followers, workshops, routes.
- Audit status changes.

## Product Moderation
- View products.
- Disable products.
- Review image/content reports.
- Do not edit merchant product data without audit reason unless policy allows.

## Order Monitoring
- View all orders and statuses.
- Filter by business, consumer, status, date.
- Admin correction of status requires audit reason.
- No product-return workflow.

## Review and Comment Moderation
- View reviews/comments/reports.
- Hide/remove inappropriate content.
- Restore content if mistakenly moderated.
- Status changes update rating aggregates when applicable.

## Payments
- View subscription payments and consumer payments separately.
- Inspect provider references, status, amount, method, timestamps.
- Retry or reconcile failed webhook processing where safe.
- Never display sensitive payment data.

## Payouts
- View pending payout requests.
- Approve.
- Reject with reason.
- Mark paid after external confirmation.
- View business ledger and available balance.
- Audit all payout decisions.

## Subscription Plans
- Manage plan names, descriptions, prices, feature flags, active status.
- Prevent accidental breaking changes to active subscriptions.
- Plan changes require explicit audit log.

## Categories
- Manage business categories and product categories.
- Activate/deactivate categories.
- Set sort order.

## Platform Activity
- Dashboard metrics:
  - Users.
  - Businesses.
  - Active subscriptions.
  - Orders.
  - Revenue.
  - Pending payouts.
  - Reported content.
  - Failed webhooks.

## Authorization
- Every admin endpoint requires `SUPER_ADMIN`.
- Admin sessions should have strong protection and ideally MFA.
- Admin actions write to `audit_logs`.
- Admin API responses should minimize personal data unless necessary.

## Assumptions
- Only one Super Admin role exists in MVP; finer admin permissions can be added later.
- Admin screens will use a denser dashboard layout than consumer mobile screens while preserving brand colors.
- Admin export functionality is not MVP unless required by GDPR request handling.

## Unresolved Questions
- Is MFA required for Super Admin at launch?
- Does business publication require admin approval?
- What moderation policy should be applied to reviews/comments/images?
- Should admins process payouts manually or through provider API?
- Who can create/edit subscription plan prices?

## Dependencies
- `06-DATABASE-SCHEMA.md` for admin-managed entities and audit logs.
- `07-API-SPEC.md` for admin endpoints.
- `08-AUTH-RBAC.md` for Super Admin role.
- `10-PAYMENT-SPEC.md` for payment/payout operations.
- `16-SECURITY-GDPR.md` for privacy and audit expectations.
