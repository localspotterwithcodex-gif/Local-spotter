# Documentation Audit

## Purpose

This audit cross-checks `PROMPT.md`, `CLAUDE.md`, and the existing documentation set in `docs/01` through `docs/20`. It identifies confirmed requirements, contradictions, missing requirements, risky assumptions, and implementation issues that should be resolved before application development starts.

This document does not change product requirements. Corrections below are recommendations that require approval before the implementation plan or earlier specification documents are updated.

## Confirmed Requirements

### Product Scope

- Local Spotter is an MVP responsive web application for the Netherlands.
- The product has three primary user types: Consumer, Business Owner, and Super Admin.
- The application must be responsive web only for MVP, with API design kept compatible with future mobile apps.
- The Figma design is the visual source of truth. No new visual style should be invented.
- Only accessible and verified Figma screens should be documented. Missing screens must be marked as missing rather than invented.

### Required Stack

- Frontend: Next.js App Router, TypeScript, React, Tailwind CSS, shadcn/ui, React Hook Form, Zod, TanStack Query, Lucide icons.
- Backend: NestJS, TypeScript, REST APIs, Swagger/OpenAPI, Prisma ORM.
- Database: PostgreSQL, preferably Supabase or equivalent managed PostgreSQL.
- Storage: Supabase Storage or equivalent object storage.
- Payments must support iDEAL, PayPal, and Tikkie.

### Authentication And RBAC

- Users must be able to register and log in with email or mobile plus password.
- Forgot password and reset password are required.
- Google OAuth and Facebook OAuth are required.
- Role selection after registration must support Business Owner and Consumer.
- Backend authorization must not trust frontend role state.
- Super Admin must manage platform-wide records and approvals.
- Business owners must only access and mutate their own business data.

### Business Owner Onboarding

- Business owner onboarding must collect profile image, store name, state or province, city, street address, GPS coordinates, phone, and KVK number.
- GPS collection must support map picker or browser geolocation.
- After onboarding, the business owner must select a subscription plan.
- Business profile must include logo/profile image, store name, description, phone, email where applicable, KVK, category, address, city, state/province, postal code where needed, latitude, longitude, opening hours, subscription status, rating, and followers.

### Subscription Plans

- Webshop: business profile, product catalog, product images/details, inventory, and purchasing.
- Shoproutes: all Webshop features plus shop location, GPS/map visibility, directions, shop routes, and local discovery.
- Workshop: all Webshop and Shoproutes features plus workshops, followers, reviews, ratings, comments, review images, product reviews, community features, workshop discovery, and workshop booking where applicable.
- Prices are EUR 50/month for Webshop, EUR 100/month for Shoproutes, and EUR 150/month for Workshop.
- Plan prices must be database-driven, not hardcoded in application logic.
- Subscriptions are auto-renewing and must use payment webhooks as the source of truth.
- Backend feature enforcement is required.

### Products And Commerce

- Business owners can create products with up to 3 images.
- Product fields include name, price, description, stock, optional shop product link, and category.
- Product categories include Men, Women, Kids, Home, Fashion, Accessories, and Local products.
- Product variants are required and include size, color, SKU, price, stock, and optional image.
- Sizes confirmed in `PROMPT.md`: S, M, L, XL, XXL.
- Colors confirmed in `PROMPT.md` examples: Black, White, Blue, Pink.
- Orders must snapshot product, variant, and price data.
- Inventory must be handled transactionally.
- Order statuses are PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, and REJECTED.
- There is no product return option.
- Cancellation and refund behavior is separate from returns and still requires policy confirmation.

### Payments And Payouts

- Business subscription payments and consumer product payments must be separate payment purposes.
- iDEAL, PayPal, and Tikkie must be supported.
- Card/CVV data must not be stored by Local Spotter.
- Consumer purchases must update business-owner balance or ledger.
- Business owners must configure payout details.
- Business owners can request withdrawals.
- Payout statuses are PENDING, APPROVED, REJECTED, and PAID.
- Admin approval is required before payout.
- Business owners cannot approve their own payouts.
- Webhooks must be idempotent and secure.

### Social And Discovery

- Consumers can follow businesses.
- Followers must be modeled as a many-to-many relationship with uniqueness on consumer plus business.
- Reviews, ratings, comments, review images, product reviews, and follower/community features are part of the Workshop plan.
- Ratings must be limited to 1 through 5.
- Review images must use object storage.

### GPS And Shoproutes

- Businesses must have GPS coordinates collected during onboarding.
- Shoproutes must include route name, description, business stops, stop sequence, GPS/map support, shop icons, and business images where available.
- Continuous GPS tracking is not required.
- Browser location permission must be explicit.
- Google Maps or Mapbox are candidate map providers.

### Workshops

- Workshop-capable businesses can create workshops with title, description, date/time, capacity, price if applicable, image, and booking rules.
- Workshop bookings must enforce capacity server-side.
- Workshop discovery and booking are required where applicable.

### Figma Verification

- Accessible Figma pages documented so far: `OLD VERSION`, `BUYER NEW`, and `SELLER NEW`.
- Verified Figma layouts are mobile-sized frames around 428x926.
- Figma includes buyer discovery, buyer auth, buyer profile, route/map, retailer/business views, product views, subscription/payment views, and seller management/dashboard flows.
- No verified desktop, tablet, admin, complete cart, complete checkout, empty, loading, or error-state Figma screens are available in the current documentation.

## Contradictions

### C1. Documentation File Names Versus Prompt Phase 0 Names

- Source: `PROMPT.md` asks Phase 0 documentation with names such as `PROJECT_PLAN.md`, `ARCHITECTURE.md`, and `DATABASE_SCHEMA.md`.
- Source: The user explicitly requested numbered files `docs/01` through `docs/20`, plus this audit as `docs/21-DOCUMENTATION-AUDIT.md`.
- Impact: Future implementation agents may look for the original Phase 0 filenames and miss the numbered documentation set.
- Recommended correction: Keep the numbered docs because they follow the direct user request. Add an index or crosswalk later if needed.

### C2. Implementation Phase Numbering Drift

- Source: `PROMPT.md` defines phases 0 through 14.
- Source: `docs/20-IMPLEMENTATION-PLAN.md` refines the work into phases 0 through 15, including a separate database phase and separate deployment phase.
- Impact: Phase references may become confusing during project execution.
- Recommended correction: Either align phase numbers with `PROMPT.md` or clearly mark `docs/20` as the approved refined implementation sequence.

### C3. Figma Product Image Count Versus Prompt Limit

- Source: `PROMPT.md` limits product creation to a maximum of 3 images.
- Source: Figma documentation notes seller product-create UI with more image slots visible in at least one screen.
- Impact: UI may imply owners can upload more images than backend rules allow.
- Recommended correction: Treat 3 images as the confirmed backend rule until the client approves a higher limit. Adjust implementation UI to enforce 3 or ask for confirmation.

### C4. Figma Size Options Versus Prompt Size Options

- Source: `PROMPT.md` lists sizes S, M, L, XL, and XXL.
- Source: Figma documentation observes an XS option.
- Impact: Product variant validation could reject a Figma-visible size.
- Recommended correction: Ask the client whether XS is required. Until confirmed, keep XS as a design discrepancy, not a backend requirement.

### C5. Figma Currency Versus Netherlands/EUR Requirement

- Source: `PROMPT.md` requires Netherlands scope and EUR pricing.
- Source: Figma documentation records some product pricing examples using USD-style formatting.
- Impact: UI copy and formatting may ship with the wrong currency.
- Recommended correction: Use EUR formatting in implementation and treat non-EUR Figma values as placeholder content unless the client says otherwise.

### C6. Figma Card Payment UI Versus Payment Security Requirement

- Source: `PROMPT.md` requires iDEAL, PayPal, Tikkie, and no stored card/CVV data.
- Source: Figma includes payment screens with card-like fields.
- Impact: A literal implementation of card fields could create PCI scope and violate the no-card-storage requirement.
- Recommended correction: Implement payment screens with hosted provider components or redirects. Do not build raw card collection fields unless a compliant provider requires embedded secure fields.

### C7. Single Role Assumption Versus Real User Behavior

- Source: `docs/08-AUTH-RBAC.md` assumes Consumer and Business Owner are mutually exclusive.
- Source: `PROMPT.md` requires role selection but does not explicitly prohibit one person from both buying and owning a business.
- Impact: A business owner may be unable to purchase, review, follow, or book as a consumer.
- Recommended correction: Confirm whether accounts are single-role for MVP. Prefer a role-membership model if multi-role behavior is expected.

### C8. Webshop GPS Storage Wording

- Source: `PROMPT.md` requires GPS coordinates during business-owner onboarding.
- Source: `docs/09-SUBSCRIPTION-SPEC.md` describes Webshop location storage as limited to onboarding and reserves map visibility for Shoproutes.
- Impact: Developers may mistakenly make GPS optional for Webshop onboarding.
- Recommended correction: Clarify that GPS is collected for all businesses during onboarding, while public map/directions/shoproute features require Shoproutes or Workshop.

### C9. Review Delete Endpoint Used For Moderation

- Source: `docs/07-API-SPEC.md` includes destructive-style review deletion.
- Source: Product requirements call for review/comment moderation and public social features.
- Impact: Moderation may lose evidence and auditability.
- Recommended correction: Use explicit moderation endpoints such as hide, restore, approve, reject, or report. Reserve delete for owner self-delete or admin hard-delete if legally required.

### C10. Payment Provider Enum Is Premature

- Source: `docs/06-DATABASE-SCHEMA.md` lists provider enum values such as Mollie, Stripe, PayPal, Tikkie, and Manual.
- Source: `PROMPT.md` requires payment methods but does not select a provider.
- Impact: Premature schema choices may conflict with the final provider.
- Recommended correction: Keep provider records generic or mark enum values as candidates until the provider is selected.

## Missing Requirements

### Database Relationship Gaps

- Add persistent auth session or refresh-token storage if refresh token rotation is used.
- Add email and mobile verification token storage if account verification is required.
- Add a future-compatible `business_memberships` or `business_staff` relationship, because `PROMPT.md` asks the architecture to allow future staff roles.
- Resolve the circular optional relationship between orders and payments if both `orders.payment_id` and `payments.order_id` are kept.
- Decide whether polymorphic `media_assets.owner_type/owner_id` is acceptable without database-level foreign keys, or replace it with entity-specific image tables.
- Add product likes if Figma counters represent real user likes rather than analytics placeholders.
- Add refund or cancellation transaction records if cancellation/refund policy will be implemented after payment.
- Add subscription invoice or payment-attempt records if business billing needs invoice history beyond generic payments.
- Add platform fee, commission, or ledger configuration if Local Spotter takes a fee from consumer purchases.
- Add explicit route media relationships if shop-route-specific images or icons must be managed separately from business/product media.
- Add account deletion/anonymization records if GDPR erasure requests require asynchronous processing or audit history.

### API Requirement Gaps

- Add a unified discovery/search API if global search across products, businesses, categories, and workshops is required.
- Add explicit business-hours endpoints for profile opening hours.
- Add email/mobile verification endpoints if verification is required.
- Add refresh-session management endpoints if users can manage devices or sessions.
- Add data export and account deletion endpoints for GDPR workflows.
- Add explicit review moderation endpoints instead of using delete semantics.
- Add top-level or clearly documented nested product-variant APIs to satisfy the required `/product-variants` module.
- Add top-level or clearly documented nested order-item APIs to satisfy the required `/order-items` module.
- Add subscription invoice, retry, cancel-at-period-end, and payment-history endpoints if billing UI exposes those states.
- Add webhook reconciliation/admin retry endpoints for failed payment or payout webhooks.
- Add dashboard aggregate endpoints for business-owner metrics, admin metrics, and consumer account summaries.
- Add notification preferences and notification read/unread endpoints if notifications are user-visible.

### Subscription Permission Gaps

- Clarify whether consumers can follow any business or only Workshop-plan businesses.
- Clarify whether product reviews are available only for Workshop businesses or for all purchased products.
- Clarify whether basic business ratings are visible on Webshop and Shoproutes plans when reviews are Workshop-only.
- Clarify what happens to existing products, routes, workshops, followers, and reviews after downgrade, expiration, or cancellation.
- Clarify whether a business profile can be public before the first successful subscription payment.
- Clarify grace-period behavior for `PAST_DUE` subscriptions.
- Clarify proration and upgrade/downgrade timing.
- Clarify whether subscription is per business or per business-owner account. Current docs assume per business.

### Payment-Flow Gaps

- Confirm the payment service provider that can support iDEAL, PayPal, Tikkie, recurring subscriptions, webhooks, refunds, and payouts.
- Confirm whether Tikkie is required as a checkout method, a pay-by-link method, a payout helper, or all of these.
- Define how auto-renewal works for payment methods that may not support recurring charges cleanly.
- Define VAT, invoice numbering, tax receipt, and business billing requirements.
- Define consumer order refund rules despite the no-return requirement.
- Define cancellation windows for orders and workshops.
- Define stock reservation behavior for pending payments to avoid overselling.
- Define failed payment recovery for orders, workshops, and subscriptions.
- Define payout holding period, minimum withdrawal amount, fees, rejection reasons, and proof-of-payment handling.
- Define whether business-owner payouts are automated through a marketplace provider or manually marked paid by admin.

### Authentication And RBAC Gaps

- Confirm single-role versus multi-role accounts.
- Confirm whether email verification, mobile verification, or both are mandatory.
- Define admin MFA requirements.
- Define account lockout, suspicious login detection, and password policy thresholds.
- Define OAuth account linking and unlinking behavior.
- Define whether business-owner onboarding requires admin business approval before public listing.
- Define whether consumers can check out as guests. Current docs assume authenticated checkout.
- Define whether business owners can operate multiple businesses under one account. Current docs assume yes.

### GPS And Shoproute Gaps

- Select Google Maps, Mapbox, or another map/geocoding provider.
- Define whether business coordinates are mandatory before subscription purchase or only before public listing.
- Define address validation and geocoding fallback when browser geolocation is denied.
- Confirm who can create shop routes: business owners, admins, consumers, or curated platform logic.
- Define route travel mode: walking, cycling, driving, transit, or provider default.
- Define whether route optimization is manual sequence only or automated.
- Define how route stop icons and business images are selected.
- Define privacy behavior for consumer current-location use and whether any location events are stored.

### Consumer Workflow Gaps

- Consumer onboarding is less detailed than business onboarding. Profile image, phone, address, and location preference flows need confirmation.
- Cart behavior for products from multiple businesses needs confirmation.
- Checkout delivery method, delivery fee, pickup option, and address validation need confirmation.
- Consumer order cancellation rules need confirmation.
- Review eligibility needs confirmation: delivered order, completed workshop booking, manual admin approval, or other rule.
- Product likes shown or implied by Figma need confirmation.
- Notification surfaces need page-level specification.

### Business-Owner Workflow Gaps

- Business onboarding must explicitly include profile image upload, KVK capture, address, phone, and GPS picker in API and UI flows.
- Business profile editing needs stronger coverage for opening hours and profile media.
- Product image upload rules need UI validation aligned to the 3-image backend limit.
- Product variant creation needs bulk-edit ergonomics and validation for SKU uniqueness, price overrides, and stock.
- Owner order-management screens need transition rules and allowed next states.
- Owner payout dashboard needs ledger, pending balance, available balance, requested payout, rejected payout, and paid payout views.
- Workshop management needs cancellation/reschedule behavior.
- Shoproute creation ownership and route publishing rules need confirmation.

### Admin Workflow Gaps

- Admin screens are not verified in Figma.
- Admin business approval is not confirmed but appears necessary for trust, KVK review, and map quality.
- Admin payout approval needs operational details: approve, reject, mark paid, attach notes, attach provider reference, and audit trail.
- Admin moderation needs content-report workflow, evidence retention, and restore capability.
- Admin subscription-plan editing needs safeguards because prices are database-driven.
- Admin payment webhook troubleshooting needs logs, retry, reconciliation, and manual correction rules.
- Admin GDPR tools need export, deletion/anonymization, and audit access.

### Figma And Design Documentation Gaps

- No verified desktop Figma layouts.
- No verified tablet Figma layouts.
- No verified admin Figma screens.
- No complete verified cart and checkout flow.
- No verified empty states.
- No verified loading states.
- No verified error states.
- No verified responsive navigation behavior.
- Duplicate or variant Figma frames have not been canonically selected.
- `OLD VERSION` may be legacy, but its authoritative status is not confirmed.
- Chat-like screens appear in Figma but are not included in `PROMPT.md`; they should remain out of MVP unless approved.
- Some seller/product/payment details could not be fully verified after the Figma connector became unavailable.

### Responsive And Mobile-Web Gaps

- Mobile design is the only confirmed Figma layout.
- Desktop and tablet behavior are implementation-derived, not design-verified.
- Desktop business-owner dashboard layout needs approval.
- Desktop admin layout needs approval.
- Mobile sticky CTAs and safe-area handling need specification for checkout, booking, and forms.
- Bottom navigation destinations need confirmation.
- Map UI behavior on small screens needs validation for scroll, bottom sheets, and permissions prompts.

### Security And GDPR Gaps

- A secret-like value was found in repository configuration during earlier documentation work. It must be removed from version control if committed and rotated if real.
- Data retention periods are not defined.
- Account deletion versus anonymization policy is not defined.
- GDPR data export format is not defined.
- Cookie consent and analytics tracking policy are not defined.
- Admin access audit requirements need more detail.
- KVK verification provider and storage policy are not defined.
- File upload malware scanning is not defined.
- Review-image moderation before publication is not defined.
- Consumer geolocation persistence is not defined. The safest MVP behavior is permission-based ephemeral location use only.

## Incorrect Or Risky Assumptions

- Current docs assume subscriptions are per business, not per owner account. This is reasonable for multi-business support but requires client confirmation.
- Current docs assume a business owner can own multiple businesses. This supports scalability but may exceed MVP scope.
- Current docs assume authenticated consumer checkout. Guest checkout is not documented.
- Current docs assume one cart/order belongs to one business. This simplifies payouts and fulfillment but may surprise consumers.
- Current docs assume workshop bookings are paid unless confirmed otherwise.
- Current docs assume reviews require completed orders or completed workshop bookings. This is safer but stricter than the prompt states.
- Current docs assume business categories and product categories are DB-managed.
- Current docs assume shadcn/ui can be styled to match Figma without changing the visual language.
- Current docs assume mobile Figma screens are canonical and desktop/tablet must be derived.
- Current docs assume no continuous consumer GPS tracking.
- Current docs assume provider-hosted payment components or redirects for payment security.
- Current docs assume platform/admin approval for payouts, but the exact operational process is not defined.

## Recommended Corrections

### P0 Before Implementation

- Decide single-role versus multi-role account model.
- Select or shortlist the payment provider and verify support for iDEAL, PayPal, Tikkie, recurring subscriptions, refunds, webhooks, and payouts.
- Resolve product image limit discrepancy between Figma and `PROMPT.md`.
- Resolve XS size discrepancy between Figma and `PROMPT.md`.
- Confirm subscription gating for followers, reviews, comments, product reviews, and ratings.
- Confirm whether every business must complete GPS onboarding before becoming public.
- Confirm whether business public listing requires admin approval.
- Confirm who creates shop routes.
- Confirm consumer checkout rules: authenticated only, single-business cart, delivery/pickup, delivery fees, and cancellation.
- Remove and rotate any real secret-like repository value.

### P1 Specification Updates

- Add `auth_sessions` or refresh-token storage to the database schema.
- Add verification-token entities if email or mobile verification is required.
- Add future-compatible business membership/staff model or at least a documented migration path.
- Add or explicitly reject product likes.
- Add refund/cancellation transaction modeling if refunds are in MVP.
- Add business-hours API endpoints.
- Add unified search/discovery API.
- Add explicit moderation APIs for reviews, comments, products, businesses, and reports.
- Add dashboard aggregate APIs for consumer, business owner, and admin dashboards.
- Add webhook reconciliation and admin retry APIs.
- Add GDPR export/delete API and operational process.

### P2 Design And Delivery Updates

- Create or obtain desktop/tablet Figma layouts, or approve implementation-derived responsive layouts.
- Create or obtain admin screens, or approve a utilitarian admin design derived from the design system.
- Create or obtain checkout/cart/payment state screens, or approve provider-hosted payment UX.
- Define empty, loading, error, disabled, permission-denied, payment-failed, and no-results states.
- Confirm bottom navigation destinations and desktop navigation behavior.
- Confirm final Dutch/English copy, EUR formatting, address formatting, and localization scope.

## Technical Risks

- Payment complexity is high because the MVP requires iDEAL, PayPal, Tikkie, recurring subscriptions, consumer purchases, webhooks, refunds/cancellations, ledger accounting, and owner payouts.
- Tikkie may not fit recurring subscription or normal marketplace checkout flows depending on the provider and commercial setup.
- Stock overselling can occur if pending checkout orders reserve inventory incorrectly or if webhook confirmation is not atomic.
- Payout accounting can become inconsistent without a strict ledger, balance calculation rules, payout holds, and reconciliation.
- Single-role auth can block real-world behavior if business owners also need consumer actions.
- Admin approval and moderation workflows can become unsafe without audit logs and reversible moderation states.
- Mobile-only Figma means desktop/tablet implementation will involve design interpretation unless new designs are provided.
- Map provider costs, geocoding quality, and API key restrictions can affect Shoproutes reliability.
- GDPR erasure can conflict with order, payment, payout, and tax-retention records if data retention rules are not defined.
- Polymorphic media ownership can create orphaned files unless cleanup and ownership checks are implemented carefully.
- Subscription downgrades can expose or hide data unpredictably unless feature-lock behavior is defined before coding.
- OAuth plus password plus mobile login increases account-linking complexity.

## Questions That Require Client Confirmation

1. Can one user account be both Consumer and Business Owner?
2. Can one Business Owner manage multiple businesses?
3. Is business approval by Super Admin required before a business appears publicly?
4. Are subscriptions per business or per business-owner account?
5. What happens to visible products, routes, workshops, followers, reviews, and comments when a subscription expires or downgrades?
6. Are followers, reviews, ratings, comments, and product reviews only available for Workshop-plan businesses?
7. Should consumers be able to follow Webshop or Shoproutes businesses?
8. Should ratings display for businesses that are not on the Workshop plan?
9. Is the product image limit exactly 3, even where Figma shows more upload slots?
10. Is XS a supported product size?
11. Are product likes part of MVP or only visual placeholders in Figma?
12. Should consumer checkout allow products from multiple businesses in one cart?
13. Is checkout authenticated-only, or is guest checkout required?
14. Are delivery, pickup, or both required for product orders?
15. Who sets delivery fees and delivery areas?
16. What cancellation rules apply to orders if returns are not allowed?
17. Are refunds in MVP, and who can trigger them?
18. Which payment provider should be used for iDEAL, PayPal, Tikkie, recurring subscriptions, and payouts?
19. Is Tikkie required for subscriptions, product checkout, payout flows, or only one of those flows?
20. Are VAT invoices required for business subscriptions and consumer purchases?
21. What payout holding period, minimum payout amount, and payout fee rules apply?
22. Are payouts automatic after admin approval or manually marked as paid?
23. Which payout details must business owners provide?
24. Is KVK validation manual, automated, or simple format validation for MVP?
25. Which map provider should be used?
26. Who creates shop routes: business owners, admins, consumers, or the platform?
27. Are shop routes manually sequenced or automatically optimized?
28. Which route mode is required: walking, cycling, driving, or all?
29. Should consumer location ever be stored, or used only ephemerally in the browser/session?
30. Are workshops always paid, or can free workshops exist?
31. What workshop cancellation and refund rules apply?
32. Can workshop bookings include multiple attendees?
33. Should workshop reviews be separate from product and business reviews?
34. Is chat or messaging part of MVP, given Figma includes chat-like screens but `PROMPT.md` does not?
35. Should the MVP UI be Dutch, English, or bilingual?
36. Are desktop/tablet layouts expected from Figma before implementation, or may they be derived from the mobile design system?
37. Should admin UI follow Figma styling even though no admin screens are verified?
38. What are the data retention rules for users, orders, payments, reviews, GPS coordinates, and uploaded media?
39. What account deletion/anonymization behavior is legally required?
40. Should admin accounts require MFA for MVP?

## Approval Gate

Application implementation should not begin until the P0 confirmations above are resolved or explicitly deferred by the client.
