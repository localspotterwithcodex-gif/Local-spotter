# Local Spotter Database Schema

## Purpose
This document defines a normalized PostgreSQL schema for the Local Spotter MVP. It is implementation-ready for Prisma but does not include application code yet.

## Confirmed Requirements
- Database: PostgreSQL, preferably Supabase PostgreSQL.
- ORM: Prisma.
- Primary keys: UUID.
- Use foreign keys, unique constraints, indexes, timestamps, enums, and soft deletion where appropriate.
- Core business data must be normalized, not stored as unstructured JSON.
- Large image binaries must not be stored in PostgreSQL.
- Currency: EUR.
- Country default: NL.

## Core Enums
- `user_role`: `SUPER_ADMIN`, `BUSINESS_OWNER`, `CONSUMER`.
- `user_status`: `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `DELETED`.
- `business_status`: `DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `DISABLED`.
- `subscription_plan_slug`: `WEBSHOP`, `SHOPROUTES`, `WORKSHOP`.
- `subscription_status`: `INCOMPLETE`, `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`.
- `payment_provider`: `MOLLIE`, `STRIPE`, `PAYPAL`, `TIKKIE`, `MANUAL`.
- `payment_method`: `IDEAL`, `PAYPAL`, `TIKKIE`, `CARD`, `BANK_TRANSFER`.
- `payment_status`: `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
- `payment_purpose`: `BUSINESS_SUBSCRIPTION`, `PRODUCT_ORDER`, `WORKSHOP_BOOKING`.
- `order_status`: `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `REJECTED`.
- `review_status`: `PENDING`, `PUBLISHED`, `HIDDEN`, `REJECTED`.
- `workshop_status`: `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`.
- `booking_status`: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`.
- `route_status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- `payout_status`: `PENDING`, `APPROVED`, `REJECTED`, `PAID`, `FAILED`.
- `media_owner_type`: `USER`, `BUSINESS`, `PRODUCT`, `REVIEW`, `WORKSHOP`, `SHOP_ROUTE`.
- `notification_type`: `ORDER`, `BOOKING`, `FOLLOWER`, `REVIEW`, `PAYOUT`, `SUBSCRIPTION`, `SYSTEM`.

## Identity and Profiles

### `users`
- `id uuid pk`
- `email varchar unique null`
- `mobile varchar unique null`
- `password_hash varchar null`
- `role user_role not null`
- `status user_status not null default PENDING_VERIFICATION`
- `email_verified_at timestamptz null`
- `mobile_verified_at timestamptz null`
- `last_login_at timestamptz null`
- `created_at timestamptz`
- `updated_at timestamptz`
- `deleted_at timestamptz null`

Indexes:
- Unique lower email where not null.
- Unique mobile where not null.
- `(role, status)`.

Rules:
- At least one of email/mobile is required.
- Password hash required for password accounts.
- Role changes require admin path or onboarding rule, never raw client input.

### `oauth_accounts`
- `id uuid pk`
- `user_id uuid fk users(id) on delete cascade`
- `provider varchar`
- `provider_account_id varchar`
- `access_token_hash varchar null`
- `refresh_token_hash varchar null`
- `expires_at timestamptz null`
- `created_at`, `updated_at`

Constraints:
- Unique `(provider, provider_account_id)`.
- Unique `(user_id, provider)`.

### `password_reset_tokens`
- `id uuid pk`
- `user_id uuid fk users(id)`
- `token_hash varchar unique`
- `expires_at timestamptz`
- `used_at timestamptz null`
- `created_at timestamptz`

### `consumer_profiles`
- `id uuid pk`
- `user_id uuid fk users(id) unique`
- `display_name varchar`
- `first_name varchar null`
- `last_name varchar null`
- `phone varchar null`
- `profile_image_asset_id uuid fk media_assets(id) null`
- `created_at`, `updated_at`

### `business_owner_profiles`
- `id uuid pk`
- `user_id uuid fk users(id) unique`
- `display_name varchar`
- `phone varchar null`
- `profile_image_asset_id uuid fk media_assets(id) null`
- `created_at`, `updated_at`

## Business Data

### `businesses`
- `id uuid pk`
- `owner_profile_id uuid fk business_owner_profiles(id)`
- `name varchar not null`
- `slug varchar unique not null`
- `description text null`
- `phone varchar null`
- `email varchar null`
- `kvk_number varchar not null`
- `category_id uuid fk business_categories(id) null`
- `logo_asset_id uuid fk media_assets(id) null`
- `cover_asset_id uuid fk media_assets(id) null`
- `state varchar not null`
- `city varchar not null`
- `street varchar not null`
- `house_number varchar null`
- `postal_code varchar null`
- `country_code char(2) not null default 'NL'`
- `latitude decimal(9,6) null`
- `longitude decimal(9,6) null`
- `status business_status not null default DRAFT`
- `average_rating decimal(3,2) not null default 0`
- `rating_count int not null default 0`
- `follower_count int not null default 0`
- `created_at`, `updated_at`, `deleted_at`

Indexes:
- `(owner_profile_id)`.
- `(status, city)`.
- `(category_id, status)`.
- GIST or btree indexes for coordinates depending geospatial implementation.
- Unique `kvk_number` if one business per KVK is confirmed; otherwise index only.

Rules:
- Public visibility requires active business and active subscription.
- Coordinates required for Shoproutes/Workshop map visibility.

### `business_categories`
- `id uuid pk`
- `name varchar not null`
- `slug varchar unique not null`
- `description text null`
- `active boolean default true`
- `sort_order int default 0`
- `created_at`, `updated_at`

### `business_hours`
- `id uuid pk`
- `business_id uuid fk businesses(id) on delete cascade`
- `day_of_week smallint not null`
- `open_time time null`
- `close_time time null`
- `closed boolean not null default false`
- `created_at`, `updated_at`

Constraint:
- Unique `(business_id, day_of_week)`.
- `day_of_week` 0-6.

## Subscription Entities

### `subscription_plans`
- `id uuid pk`
- `name varchar not null`
- `slug subscription_plan_slug unique`
- `description text`
- `monthly_price_cents int not null`
- `currency char(3) default 'EUR'`
- `features jsonb not null`
- `active boolean default true`
- `sort_order int`
- `created_at`, `updated_at`

Rule:
- Features are stored as structured JSON for plan feature flags only. Core business data remains normalized.

### `business_subscriptions`
- `id uuid pk`
- `business_id uuid fk businesses(id)`
- `plan_id uuid fk subscription_plans(id)`
- `provider payment_provider`
- `provider_customer_id varchar null`
- `provider_subscription_id varchar null`
- `status subscription_status`
- `current_period_start timestamptz null`
- `current_period_end timestamptz null`
- `cancel_at_period_end boolean default false`
- `auto_renew boolean default true`
- `created_at`, `updated_at`, `cancelled_at`

Indexes:
- Unique active subscription per business using partial unique index where status in active-like statuses.
- `(provider, provider_subscription_id)`.
- `(business_id, status)`.

## Product Catalog

### `product_categories`
- `id uuid pk`
- `name varchar not null`
- `slug varchar unique not null`
- `parent_id uuid fk product_categories(id) null`
- `active boolean default true`
- `sort_order int default 0`
- `created_at`, `updated_at`

### `products`
- `id uuid pk`
- `business_id uuid fk businesses(id)`
- `category_id uuid fk product_categories(id) null`
- `name varchar not null`
- `slug varchar not null`
- `description text`
- `base_price_cents int not null`
- `compare_at_price_cents int null`
- `currency char(3) default 'EUR'`
- `stock_quantity int not null default 0`
- `external_product_url text null`
- `active boolean default true`
- `average_rating decimal(3,2) default 0`
- `rating_count int default 0`
- `like_count int default 0`
- `view_count int default 0`
- `created_at`, `updated_at`, `deleted_at`

Constraints/indexes:
- Unique `(business_id, slug)`.
- `(business_id, active)`.
- `(category_id, active)`.
- Text search index on name/description.
- `base_price_cents >= 0`, `stock_quantity >= 0`.

### `product_images`
- `id uuid pk`
- `product_id uuid fk products(id) on delete cascade`
- `media_asset_id uuid fk media_assets(id)`
- `sort_order smallint not null`
- `created_at`

Constraints:
- Unique `(product_id, sort_order)`.
- Server rule: max 3 images per product.

### `product_variants`
- `id uuid pk`
- `product_id uuid fk products(id) on delete cascade`
- `sku varchar null`
- `size varchar null`
- `color_name varchar null`
- `color_hex char(7) null`
- `price_cents int null`
- `stock_quantity int not null default 0`
- `image_asset_id uuid fk media_assets(id) null`
- `active boolean default true`
- `created_at`, `updated_at`

Constraints:
- Unique `(product_id, sku)` where sku not null.
- Unique `(product_id, size, color_name)` where size/color not null.
- `stock_quantity >= 0`.

## Cart and Orders

### `carts`
- `id uuid pk`
- `consumer_profile_id uuid fk consumer_profiles(id)`
- `business_id uuid fk businesses(id) null`
- `created_at`, `updated_at`

Rule:
- MVP assumes one business per cart/order unless confirmed otherwise.

### `cart_items`
- `id uuid pk`
- `cart_id uuid fk carts(id) on delete cascade`
- `product_id uuid fk products(id)`
- `variant_id uuid fk product_variants(id) null`
- `quantity int not null`
- `created_at`, `updated_at`

Constraint:
- Unique `(cart_id, product_id, variant_id)`.
- `quantity > 0`.

### `consumer_addresses`
- `id uuid pk`
- `consumer_profile_id uuid fk consumer_profiles(id)`
- `label varchar`
- `full_name varchar`
- `phone varchar`
- `street varchar`
- `house_number varchar`
- `postal_code varchar`
- `city varchar`
- `country_code char(2) default 'NL'`
- `latitude decimal(9,6) null`
- `longitude decimal(9,6) null`
- `is_default boolean default false`
- `created_at`, `updated_at`, `deleted_at`

Indexes:
- `(consumer_profile_id)`.
- Partial unique default address per consumer.

### `orders`
- `id uuid pk`
- `order_number varchar unique not null`
- `consumer_profile_id uuid fk consumer_profiles(id)`
- `business_id uuid fk businesses(id)`
- `delivery_address_id uuid fk consumer_addresses(id) null`
- `delivery_address_snapshot jsonb not null`
- `status order_status not null default PENDING`
- `subtotal_cents int not null`
- `delivery_fee_cents int not null default 0`
- `platform_fee_cents int not null default 0`
- `total_cents int not null`
- `currency char(3) default 'EUR'`
- `payment_id uuid fk payments(id) null`
- `created_at`, `updated_at`, `confirmed_at`, `delivered_at`, `cancelled_at`

Indexes:
- `(consumer_profile_id, created_at desc)`.
- `(business_id, status)`.
- `(status, created_at)`.

### `order_items`
- `id uuid pk`
- `order_id uuid fk orders(id) on delete cascade`
- `product_id uuid fk products(id)`
- `variant_id uuid fk product_variants(id) null`
- `product_name_snapshot varchar not null`
- `variant_snapshot jsonb null`
- `unit_price_cents int not null`
- `quantity int not null`
- `total_cents int not null`
- `created_at`

Rules:
- Price and variant data are snapshots.
- Do not recalculate historical orders from current product price.

### `order_status_events`
- `id uuid pk`
- `order_id uuid fk orders(id) on delete cascade`
- `from_status order_status null`
- `to_status order_status not null`
- `changed_by_user_id uuid fk users(id) null`
- `reason text null`
- `created_at`

## Payments, Ledger, and Payouts

### `payments`
- `id uuid pk`
- `user_id uuid fk users(id) null`
- `business_id uuid fk businesses(id) null`
- `order_id uuid fk orders(id) null`
- `subscription_id uuid fk business_subscriptions(id) null`
- `workshop_booking_id uuid fk workshop_bookings(id) null`
- `purpose payment_purpose not null`
- `provider payment_provider not null`
- `provider_payment_id varchar null`
- `amount_cents int not null`
- `currency char(3) default 'EUR'`
- `payment_method payment_method null`
- `status payment_status not null`
- `checkout_url text null`
- `paid_at timestamptz null`
- `refunded_at timestamptz null`
- `created_at`, `updated_at`

Indexes:
- `(provider, provider_payment_id) unique where provider_payment_id is not null`.
- `(purpose, status)`.
- `(business_id, created_at)`.

### `payment_webhook_events`
- `id uuid pk`
- `provider payment_provider not null`
- `provider_event_id varchar not null`
- `event_type varchar not null`
- `payload jsonb not null`
- `processed boolean default false`
- `processed_at timestamptz null`
- `created_at`

Constraint:
- Unique `(provider, provider_event_id)`.

### `business_ledger_entries`
- `id uuid pk`
- `business_id uuid fk businesses(id)`
- `payment_id uuid fk payments(id) null`
- `order_id uuid fk orders(id) null`
- `workshop_booking_id uuid fk workshop_bookings(id) null`
- `payout_id uuid fk payouts(id) null`
- `type varchar not null`
- `amount_cents int not null`
- `currency char(3) default 'EUR'`
- `available_at timestamptz null`
- `created_at`

Indexes:
- `(business_id, created_at)`.
- `(business_id, available_at)`.

### `payout_accounts`
- `id uuid pk`
- `business_id uuid fk businesses(id) unique`
- `provider payment_provider null`
- `account_holder_name varchar`
- `iban_last4 varchar null`
- `provider_account_id varchar null`
- `status varchar not null default 'PENDING'`
- `created_at`, `updated_at`

### `payouts`
- `id uuid pk`
- `business_id uuid fk businesses(id)`
- `amount_cents int not null`
- `currency char(3) default 'EUR'`
- `status payout_status default PENDING`
- `requested_by_user_id uuid fk users(id)`
- `approved_by_user_id uuid fk users(id) null`
- `rejected_reason text null`
- `provider_reference varchar null`
- `requested_at timestamptz`
- `approved_at timestamptz null`
- `paid_at timestamptz null`
- `created_at`, `updated_at`

Rules:
- `approved_by_user_id` must be an admin.
- Business owners cannot approve/reject payouts.

## Workshops and Routes

### `workshops`
- `id uuid pk`
- `business_id uuid fk businesses(id)`
- `title varchar not null`
- `slug varchar not null`
- `description text`
- `price_cents int not null`
- `currency char(3) default 'EUR'`
- `capacity int not null`
- `booked_quantity int not null default 0`
- `location varchar`
- `latitude decimal(9,6) null`
- `longitude decimal(9,6) null`
- `start_at timestamptz not null`
- `end_at timestamptz not null`
- `image_asset_id uuid fk media_assets(id) null`
- `status workshop_status default DRAFT`
- `created_at`, `updated_at`, `deleted_at`

Constraints:
- Unique `(business_id, slug)`.
- `capacity >= 0`, `booked_quantity >= 0`, `booked_quantity <= capacity`.
- `end_at > start_at`.

### `workshop_bookings`
- `id uuid pk`
- `workshop_id uuid fk workshops(id)`
- `consumer_profile_id uuid fk consumer_profiles(id)`
- `quantity int not null`
- `amount_cents int not null`
- `currency char(3) default 'EUR'`
- `payment_id uuid fk payments(id) null`
- `status booking_status default PENDING`
- `created_at`, `updated_at`, `cancelled_at`

Indexes:
- `(workshop_id, status)`.
- `(consumer_profile_id, created_at desc)`.

### `shop_routes`
- `id uuid pk`
- `title varchar not null`
- `slug varchar unique not null`
- `description text null`
- `created_by_business_id uuid fk businesses(id) null`
- `created_by_user_id uuid fk users(id) null`
- `status route_status default DRAFT`
- `created_at`, `updated_at`, `deleted_at`

### `shop_route_stops`
- `id uuid pk`
- `route_id uuid fk shop_routes(id) on delete cascade`
- `business_id uuid fk businesses(id)`
- `sequence int not null`
- `latitude decimal(9,6) not null`
- `longitude decimal(9,6) not null`
- `description text null`
- `created_at`, `updated_at`

Constraints:
- Unique `(route_id, sequence)`.
- Unique `(route_id, business_id)`.

## Social and Moderation

### `shop_followers`
- `id uuid pk`
- `consumer_profile_id uuid fk consumer_profiles(id)`
- `business_id uuid fk businesses(id)`
- `created_at`

Constraint:
- Unique `(consumer_profile_id, business_id)`.

### `reviews`
- `id uuid pk`
- `consumer_profile_id uuid fk consumer_profiles(id)`
- `business_id uuid fk businesses(id)`
- `product_id uuid fk products(id) null`
- `workshop_id uuid fk workshops(id) null`
- `order_id uuid fk orders(id) null`
- `rating smallint not null`
- `title varchar null`
- `comment text null`
- `status review_status default PUBLISHED`
- `created_at`, `updated_at`, `deleted_at`

Constraints:
- Rating between 1 and 5.
- At least one target: business/product/workshop.
- Optional unique policy `(consumer_profile_id, product_id, order_id)` if one review per purchase.

### `review_images`
- `id uuid pk`
- `review_id uuid fk reviews(id) on delete cascade`
- `media_asset_id uuid fk media_assets(id)`
- `sort_order smallint`
- `created_at`

### `comments`
- `id uuid pk`
- `user_id uuid fk users(id)`
- `business_id uuid fk businesses(id)`
- `product_id uuid fk products(id) null`
- `workshop_id uuid fk workshops(id) null`
- `parent_comment_id uuid fk comments(id) null`
- `body text not null`
- `status varchar default 'PUBLISHED'`
- `created_at`, `updated_at`, `deleted_at`

Indexes:
- `(business_id, created_at)`.
- `(product_id, created_at)`.
- `(workshop_id, created_at)`.

### `reports`
- `id uuid pk`
- `reporter_user_id uuid fk users(id)`
- `target_type varchar not null`
- `target_id uuid not null`
- `reason varchar not null`
- `details text null`
- `status varchar default 'OPEN'`
- `resolved_by_user_id uuid fk users(id) null`
- `created_at`, `resolved_at`

## Media, Notifications, Audit

### `media_assets`
- `id uuid pk`
- `owner_user_id uuid fk users(id) null`
- `owner_type media_owner_type not null`
- `owner_id uuid null`
- `bucket varchar not null`
- `storage_path text not null unique`
- `public_url text null`
- `mime_type varchar not null`
- `size_bytes int not null`
- `width int null`
- `height int null`
- `alt_text varchar null`
- `created_at`

Rules:
- Validate MIME and file size before insert.
- Use signed/private URLs for private profile or review assets where appropriate.

### `notifications`
- `id uuid pk`
- `user_id uuid fk users(id)`
- `type notification_type`
- `title varchar`
- `body text`
- `data jsonb null`
- `read_at timestamptz null`
- `created_at`

Index:
- `(user_id, read_at, created_at desc)`.

### `audit_logs`
- `id uuid pk`
- `actor_user_id uuid fk users(id) null`
- `action varchar not null`
- `target_type varchar not null`
- `target_id uuid null`
- `metadata jsonb null`
- `ip_address inet null`
- `user_agent text null`
- `created_at`

## Assumptions
- Monetary amounts are stored in integer cents.
- Prisma soft deletion is implemented with `deleted_at` filters in services.
- Product categories and business categories are database-driven.
- `jsonb` is used only for feature flags, snapshots, provider payloads, and flexible audit metadata.
- One cart/order per business is recommended for MVP payout clarity.

## Unresolved Questions
- Should KVK be globally unique?
- Should businesses support multiple categories?
- Should route creation be business-only, admin-only, or both?
- Which provider-specific payout account fields are needed?
- Should review images have a max count?
- What exact platform fee/commission model should ledger entries support?

## Dependencies
- `01-PROJECT-REQUIREMENTS.md` for product rules.
- `07-API-SPEC.md` for endpoint shape.
- `08-AUTH-RBAC.md` for authorization checks.
- `09-SUBSCRIPTION-SPEC.md` for feature flags.
- `10-PAYMENT-SPEC.md` and `11-COMMERCE-SPEC.md` for payment/order rules.
