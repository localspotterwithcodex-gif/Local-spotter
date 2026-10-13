# LOCAL SPOTTER MVP — MASTER ENGINEERING PROMPT

## ROLE

You are acting as a **Senior AI Full-Stack Engineer, Senior Frontend Engineer, Backend Architect, Database Architect, UI/UX Implementation Engineer, Security Engineer and DevOps Engineer**.

Your responsibility is to design and build the **Local Spotter MVP** as a production-quality responsive web application.

Do not behave like a code generator that immediately starts creating files.

First understand the product, inspect the provided design, establish the architecture, define the data model and application flows, and then implement the system incrementally.

You must think about:

* Product requirements
* User experience
* UI/UX fidelity
* Responsive design
* Frontend architecture
* Backend architecture
* Database normalization
* Authentication and authorization
* Subscription-based feature access
* Payment processing
* Orders
* Business owners
* Consumers
* Product management
* Reviews and ratings
* Followers
* GPS/location
* Shop routes
* Workshops
* Image uploads
* Security
* API design
* Testing
* Deployment
* Future Android/iOS compatibility

The final architecture must allow the same backend/API to be reused later for Android and iOS applications.

---

# 1. PROJECT

Project name:

**Local Spotter**

The application is intended for the Netherlands market.

The MVP is a:

**Local business discovery + local shopping + shop routes + workshops platform**

The platform connects:

1. Consumers
2. Local business owners
3. Local Spotter platform administrators

Business owners can subscribe to different plans.

Consumers can discover businesses/products and interact with features depending on the business owner's subscription.

---

# 2. IMPORTANT FIGMA DESIGN REFERENCE

The Figma design is the primary visual reference.

Figma Design:

https://www.figma.com/design/Lr5Q9uBLcwnVgN92nyMJEI/localspotter.nl--3-?node-id=81-114&t=za389ayH20J1Ak1l-1

Figma prototype:

https://www.figma.com/proto/Lr5Q9uBLcwnVgN92nyMJEI/localspotter.nl--3-?node-id=81-114&t=HdiOT1v9X5y6zgjx-1

Figma embed:

https://embed.figma.com/design/Lr5Q9uBLcwnVgN92nyMJEI/localspotter.nl--3-?node-id=81-114&embed-host=share

## Figma is the visual source of truth.

Before implementing the frontend:

1. Inspect the Figma design.
2. Understand all available screens.
3. Identify page hierarchy.
4. Identify navigation.
5. Identify reusable components.
6. Identify desktop layouts.
7. Identify mobile layouts/responsive behavior.
8. Identify typography.
9. Identify spacing.
10. Identify colors.
11. Identify cards.
12. Identify buttons.
13. Identify forms.
14. Identify maps/location components.
15. Identify product cards.
16. Identify profile components.
17. Identify subscription/payment screens.
18. Identify dashboard layouts.
19. Identify empty states.
20. Identify error/loading states.

Do NOT invent a completely different design.

The implementation should be visually close to the Figma design while improving usability where the design does not specify technical states.

If Figma cannot be accessed programmatically, do NOT hallucinate its contents.

Instead:

* inspect available Figma metadata/screens,
* use provided screenshots/assets if available,
* clearly identify inaccessible sections,
* continue using the known requirements without pretending that unavailable screens were inspected.

---

# 3. BRAND / VISUAL DIRECTION

Local Spotter uses a modern local-community marketplace visual identity.

Primary visual direction:

* Pale pink background/accents
* Dark navy/black typography
* Yellow/golden accent
* Pink secondary typography
* Rounded modern UI
* Clean cards
* Modern geometric typography
* Minimal visual clutter
* Friendly local-business feeling
* Premium but approachable

The Local Spotter logo contains a magnifying-glass/location-inspired visual element.

Do not create generic AI-looking UI.

Do not use excessive gradients.

Do not use random glassmorphism.

Do not use unnecessary animations.

Do not change the visual identity just because another design system is easier to implement.

---

# 4. MVP SCOPE

IMPORTANT:

This phase is ONLY:

## Responsive Web Application

Supported:

* Desktop
* Laptop
* Tablet
* Mobile browser

Do NOT build:

* Native Android application
* Native iOS application
* React Native application
* Flutter application

However, design the backend/API so Android and iOS can be added later without rebuilding the backend.

---

# 5. RECOMMENDED TECH STACK

Use the following stack unless there is a strong technical reason to change it.

## Frontend

* Next.js
* TypeScript
* React
* Tailwind CSS
* shadcn/ui where appropriate
* React Hook Form
* Zod
* TanStack Query
* Lucide icons

Use Next.js App Router.

Use reusable components.

Avoid putting the entire application into a few huge components.

---

# 6. BACKEND

Use:

* NestJS
* TypeScript
* REST API
* Swagger/OpenAPI
* Prisma ORM

Backend responsibilities:

* Authentication
* Authorization
* Users
* Roles
* Business owners
* Businesses
* Subscriptions
* Products
* Product variants
* Orders
* Reviews
* Followers
* Workshops
* Shop routes
* Payments
* Payouts
* Notifications
* File/image metadata
* GPS/location data
* Admin operations

The frontend must communicate with the backend through APIs.

Do not tightly couple business logic to Next.js UI components.

---

# 7. DATABASE

Use:

**PostgreSQL**

Preferred development/production option:

**Supabase PostgreSQL**

Use Prisma for database access.

Use UUID primary keys.

Use:

* Foreign keys
* Unique constraints
* Indexes
* Timestamps
* Proper relationships
* Enums where appropriate
* Soft deletion where appropriate

Do not create an unstructured JSON database for the core business data.

---

# 8. STORAGE

Use Supabase Storage or equivalent object storage.

Images that need storage include:

* Consumer profile images
* Business profile/logo
* Business cover image
* Product images
* Review images
* Workshop images
* Shop route images if required

Never store large image binaries directly inside PostgreSQL.

Store:

* storage path
* public/signed URL when appropriate
* metadata
* owner/entity relationship

---

# 9. USER TYPES

The MVP contains:

## 1. Consumer

Consumers can:

* Register
* Login
* Browse businesses
* Search products
* Browse categories
* View products
* View businesses
* Follow businesses
* View shop locations
* View shop routes
* Purchase products
* View orders
* View delivery information
* Review eligible businesses/products
* Give ratings
* Add review images
* Comment where subscription permits
* View workshops
* Book workshops where applicable
* View profile
* Manage addresses

## 2. Business Owner

Business owners can:

* Register
* Create business profile
* Add store information
* Add GPS coordinates
* Select subscription
* Pay subscription
* Manage products
* Upload product images
* Manage inventory
* Manage orders
* Manage followers
* View reviews
* View ratings
* Create shop routes depending on plan
* Create workshops depending on plan
* Manage payment/payout details
* Request withdrawals
* View earnings

## 3. Super Admin

Super Admin can:

* Manage consumers
* Manage business owners
* Manage businesses
* Manage subscriptions
* Manage products
* Manage orders
* Manage reviews
* Manage reported content
* Manage payouts
* Approve/reject withdrawals
* View payments
* View platform activity

---

# 10. AUTHENTICATION

The login page should follow the Figma design.

Consumers and business owners should use the same authentication foundation but have different application permissions.

Login requirements:

* Email/mobile identifier
* Password
* Forgot password
* Reset password

Social signup/login:

* Google OAuth
* Facebook OAuth

After registration, the user should be able to select:

* Business Owner
* Consumer

Do not trust the frontend role selection.

Role assignment must be validated and persisted by the backend.

Implement secure authentication.

Do not store plaintext passwords.

Use secure password hashing.

Use secure session/token handling.

---

# 11. BUSINESS OWNER ONBOARDING

When a user chooses:

**Business Owner**

collect:

* Profile image
* Store name
* State/province
* City
* Street
* GPS coordinates
* Phone number
* KVK number

Fields must be validated.

GPS should allow the owner to set the exact shop location.

The backend stores:

* latitude
* longitude

The UI should provide an appropriate map/location picker.

The KVK number should be treated as business information and validated appropriately.

After successful business registration:

→ subscription selection

---

# 12. BUSINESS SUBSCRIPTIONS

There are three plans.

## Webshop

Purpose:

Allow a business owner to publish products on Local Spotter.

Capabilities:

* Business profile
* Product listing
* Product images
* Product details
* Inventory
* Product purchasing

## Shoproutes

Includes Webshop features.

Additional capabilities:

* Shop location
* GPS location
* Map presence
* Shop directions
* Shop route functionality
* Location-focused discovery

## Workshop

Includes:

* Webshop
* Shoproutes

Additional capabilities:

* Workshops
* Followers
* Reviews
* Ratings
* Comments
* Consumer-generated review images
* Product reviews
* Community/social interaction
* Workshop discovery/booking where applicable

The subscription system must enforce feature access at the backend level.

DO NOT only hide UI elements.

For example:

If a Webshop owner calls:

POST /reviews

the backend must reject the operation if that business does not have the required subscription.

---

# 13. SUBSCRIPTION PRICING

The current business concept contains:

* Webshop — €50/month
* Shoproutes — €100/month
* Workshop — €150/month

Implement pricing through database-driven subscription plans rather than hardcoding prices throughout the application.

Example:

subscription_plans

Fields:

* id
* name
* slug
* description
* monthly_price
* currency
* feature configuration
* active
* created_at
* updated_at

Currency:

EUR

---

# 14. SUBSCRIPTION AUTO-RENEWAL

Subscriptions should support automatic monthly renewal.

Store provider subscription information.

Example fields:

* provider
* provider_customer_id
* provider_subscription_id
* status
* current_period_start
* current_period_end
* cancel_at_period_end
* auto_renew

Use payment-provider webhooks to keep subscription status synchronized.

Never trust only the frontend payment success page.

---

# 15. PAYMENT METHODS

The Netherlands market is important.

Required payment options from the project requirements:

* iDEAL
* PayPal
* Tikkie

Use a payment provider/integration capable of supporting the required Dutch payment methods.

Do NOT store:

* card numbers
* CVV
* sensitive card data

Store only provider references and transaction metadata.

Example:

payments

* id
* user_id
* business_id
* order_id
* subscription_id
* provider
* provider_payment_id
* amount
* currency
* payment_method
* status
* paid_at
* refunded_at
* created_at

---

# 16. IMPORTANT PAYMENT SEPARATION

There are two fundamentally different payment flows.

## A. Business Owner Subscription Payment

Business owner pays Local Spotter:

€50 / €100 / €150 monthly.

## B. Consumer Product Purchase

Consumer buys a product from a business.

These must be represented separately in business logic.

Do not mix subscription revenue and consumer order revenue.

Design the payment architecture so accounting remains understandable.

---

# 17. BUSINESS OWNER PAYOUTS

Business owners should be able to configure payout/payment details.

When consumers purchase products:

* order is created
* payment is processed
* payment is recorded
* business owner balance is updated
* funds become eligible for withdrawal according to the platform's rules

Business owner can request withdrawal.

Withdrawal must require admin approval.

Example:

payouts

* id
* business_id
* amount
* currency
* status
* requested_at
* approved_at
* approved_by
* paid_at
* provider_reference

Statuses:

* PENDING
* APPROVED
* REJECTED
* PAID

Do not allow business owners to approve their own payouts.

---

# 18. BUSINESS PROFILE

Business profile should include:

* Logo/profile image
* Store name
* Description
* Phone
* Email if applicable
* KVK
* Category
* Address
* City
* State
* Postal code if required
* Latitude
* Longitude
* Opening hours
* Subscription status
* Rating
* Followers

Consumers should be able to open a business profile and view its content.

---

# 19. PRODUCT CREATION

Business owners can create products.

Product fields:

* Up to 3 images
* Product name
* Price
* Description
* Stock
* Optional shop product link
* Category

Product categories should support the Local Spotter use case.

Examples:

* Men
* Women
* Kids
* Home
* Fashion
* Accessories
* Local products
* Other relevant categories from the Figma/project requirements

Do not blindly hardcode categories if they should be admin-managed.

---

# 20. PRODUCT VARIANTS

If the product is clothing/fashion, support:

### Color

Examples:

* Black
* White
* Blue
* Pink

Allow color/reference image when required.

### Size

Support:

* S
* M
* L
* XL
* XXL

Design product variants properly.

Do not put variants into one unstructured text field.

Example:

product_variants

* id
* product_id
* sku
* size
* color
* price
* stock_quantity
* image_url

---

# 21. PRODUCT IMAGE LIMIT

Maximum:

**3 product images per product**

Validate this on:

* frontend
* backend

Do not rely only on frontend validation.

---

# 22. PRODUCT ORDERING

Consumers can:

* Browse products
* Open product details
* Select variants where applicable
* Select quantity
* Add to cart
* Checkout
* Provide/select delivery address
* Pay
* View order

Business owners can:

* See new orders
* Accept/process orders
* Update order status
* View customer delivery information

---

# 23. ORDER STATUS

Use a controlled order lifecycle.

Recommended:

PENDING

→ CONFIRMED

→ PREPARING

→ READY

→ OUT_FOR_DELIVERY

→ DELIVERED

Alternative terminal states:

* CANCELLED
* REJECTED

There is:

**NO PRODUCT RETURN OPTION**

Do not implement a customer return workflow.

However, cancellation/refund logic should be kept separate from product returns.

---

# 24. DELIVERY ADDRESS

Consumers should maintain addresses.

Example:

consumer_addresses

* id
* consumer_id
* label
* full_name
* phone
* street
* house_number
* postal_code
* city
* country
* latitude
* longitude
* is_default

Country:

Netherlands

Business owners should see the necessary delivery information for an order.

Do not expose unnecessary private consumer information.

---

# 25. FOLLOW BUSINESS

Consumers can follow businesses.

Use a many-to-many relationship:

shop_followers

* id
* consumer_id
* business_id
* created_at

Constraint:

unique consumer + business

Consumers can:

* Follow
* Unfollow
* View followed businesses
* See follower-related content where applicable

Business owners can see:

* follower count
* follower list where appropriate

---

# 26. REVIEWS

Reviews are available according to subscription permissions.

A review can include:

* Rating
* Title
* Comment
* Images
* Consumer profile
* Date

Review images should be stored using object storage.

Example:

reviews

* id
* consumer_id
* business_id
* product_id
* rating
* title
* comment
* status
* created_at
* updated_at

review_images

* id
* review_id
* image_url
* created_at

Support:

1–5 star rating.

Validate rating server-side.

---

# 27. PRODUCT REVIEWS

Where Workshop subscription enables community functionality:

Consumers can review products similar to marketplace platforms.

A product review can contain:

* Rating
* Written review
* Images
* Consumer profile
* Date

Display:

* average rating
* rating count
* review list
* review images

Do not copy Amazon/Flipkart branding or UI.

Use only the functional concept.

---

# 28. COMMENTS

Comments are enabled for businesses with the appropriate subscription.

Consumers can comment on eligible content.

Business owners should be able to moderate their content where required.

Implement:

* create comment
* list comments
* delete own comment
* business moderation
* admin moderation

Prevent unauthorized deletion/modification.

---

# 29. SHOP ROUTES

Shoproutes is an important feature.

A business with Shoproutes or Workshop subscription can appear on a map.

A shop route may contain:

* Route name
* Description
* Business stops
* Sequence
* GPS coordinates
* Shop icons
* Business profile images

Example:

shop_routes

* id
* title
* description
* created_by
* status
* created_at

shop_route_stops

* id
* route_id
* business_id
* sequence
* latitude
* longitude
* description

---

# 30. GPS / MAP

Use a suitable map provider.

Possible options:

* Google Maps Platform
* Mapbox

Use the provider selected during implementation based on project credentials and cost.

Features:

* Shop location
* Consumer location where permission is granted
* Directions
* Route stops
* Shop marker
* Business profile image/icon where supported

Do not continuously track the consumer's location without explicit permission.

Ask for browser location permission when required.

---

# 31. WORKSHOPS

Workshop subscription allows business owners to create workshops.

Workshop fields:

* Title/name
* Description
* Price
* Location
* Capacity
* Date
* Start time
* Finish time
* Image
* Business

Example:

workshops

* id
* business_id
* title
* description
* price
* capacity
* location
* latitude
* longitude
* start_at
* end_at
* image_url
* status
* created_at
* updated_at

Consumers can view workshop details.

Where required, consumers can book workshops.

---

# 32. WORKSHOP BOOKINGS

Use:

workshop_bookings

* id
* workshop_id
* consumer_id
* quantity
* amount
* payment_id
* status
* created_at

Statuses:

* PENDING
* CONFIRMED
* CANCELLED
* COMPLETED

Prevent booking above available capacity.

Capacity must be enforced server-side.

---

# 33. CONSUMER HOME PAGE

The consumer home page should follow the Figma visual structure.

Possible content:

* Local Spotter branding
* Search
* Location
* Categories
* Featured/local products
* Businesses
* Workshops
* Shop routes
* Recommended local businesses
* Followed businesses/content
* Product cards

Use realistic local-business data for development.

Do not fill the UI with lorem ipsum.

---

# 34. CATEGORIES

Consumer discovery should support categories such as:

* Men
* Women
* Kids
* Home
* Fashion
* Accessories
* Local products
* Workshops
* Other business categories from the design

Categories should be database-driven where appropriate.

---

# 35. CONSUMER PROFILE

Consumer profile should contain:

* Profile image
* Name
* Email
* Phone
* Addresses
* Followed shops
* Orders
* Reviews
* Workshop bookings

Profile image should be visible in relevant community/review contexts.

---

# 36. BUSINESS OWNER DASHBOARD

Create a responsive dashboard following the Figma design direction.

Dashboard should show:

* Business profile
* Subscription
* Products
* Orders
* Followers
* Reviews
* Ratings
* Workshops
* Shop routes
* Earnings
* Payouts

Feature access should depend on subscription.

For example:

Webshop:

Products + Orders

Shoproutes:

Products + Orders + Routes + Location

Workshop:

Products + Orders + Routes + Workshops + Followers + Reviews + Ratings + Comments

---

# 37. ADMIN DASHBOARD

Create a separate protected admin area.

Admin should be able to manage:

### Users

* Consumers
* Business owners

### Businesses

* Approve/manage
* Disable
* View details

### Products

* View
* Moderate
* Disable

### Orders

* Monitor

### Reviews

* Moderate
* Remove inappropriate content

### Payments

* Subscription payments
* Consumer order payments

### Payouts

* Pending requests
* Approve
* Reject
* Mark paid

### Subscriptions

* Plans
* Pricing
* Active subscriptions
* Status

---

# 38. AUTHORIZATION

Implement proper RBAC.

Suggested roles:

* SUPER_ADMIN
* BUSINESS_OWNER
* CONSUMER

If staff management becomes necessary, design the architecture so:

BUSINESS_STAFF

can be added later.

Never trust:

* role from frontend
* business_id from client without authorization
* user_id from request body

Always derive authenticated user identity from secure authentication context.

---

# 39. BUSINESS OWNERSHIP SECURITY

A business owner must only be able to modify businesses they own.

Example:

Business A owner must NOT be able to:

* edit Business B
* edit Business B products
* see Business B orders
* modify Business B payout
* modify Business B reviews

Enforce this in backend services and database queries.

---

# 40. API ARCHITECTURE

Organize API modules clearly.

Suggested:

/auth

/users

/consumers

/businesses

/business-owners

/subscriptions

/products

/product-variants

/categories

/cart

/orders

/order-items

/reviews

/review-images

/followers

/shop-routes

/workshops

/workshop-bookings

/payments

/payouts

/addresses

/notifications

/admin

/media

Use RESTful conventions.

Generate Swagger/OpenAPI documentation.

---

# 41. DATABASE RELATIONSHIP OVERVIEW

Core relationship:

User

├── Consumer Profile

│   ├── Addresses

│   ├── Orders

│   ├── Reviews

│   ├── Followers

│   └── Workshop Bookings

│

└── Business Owner Profile

```
└── Businesses

    ├── Subscription

    ├── Products

    │   ├── Images

    │   └── Variants

    ├── Orders

    ├── Reviews

    ├── Followers

    ├── Shop Routes

    ├── Workshops

    └── Payouts
```

Keep the schema normalized.

Avoid duplicated user/business information.

---

# 42. NOTIFICATIONS

Design a notification system.

Potential notifications:

Consumer:

* Order confirmed
* Order preparing
* Order delivered
* Workshop booking confirmation
* Followed shop updates

Business owner:

* New order
* New follower
* New review
* Payout status
* Subscription status

Admin:

* New payout request
* Important moderation events

Start with in-app notifications.

Email notifications can be integrated where practical.

---

# 43. SEARCH

Consumers should be able to search:

* Products
* Businesses
* Categories
* Workshops

Search should support:

* text matching
* category filtering
* location filtering where applicable

Start simple for MVP.

Do not introduce Elasticsearch unless it is genuinely necessary.

PostgreSQL search is sufficient for the initial MVP.

---

# 44. RESPONSIVE DESIGN

The application must work properly on:

### Desktop

1440px+

### Laptop

1024px+

### Tablet

768px+

### Mobile

375px+

### Mobile

390px+

Do not simply shrink desktop UI.

Create responsive layouts.

Examples:

Desktop dashboard:

sidebar + content

Mobile dashboard:

top bar + collapsible navigation / mobile navigation

Product grid:

desktop → multiple columns

mobile → 1 or 2 columns depending on Figma

---

# 45. UI COMPONENT ARCHITECTURE

Create reusable components.

Examples:

components/

├── ui/

├── layout/

├── navigation/

├── auth/

├── products/

├── businesses/

├── subscriptions/

├── payments/

├── reviews/

├── workshops/

├── shop-routes/

├── maps/

├── orders/

├── profile/

└── admin/

Avoid duplicated markup.

---

# 46. DESIGN IMPLEMENTATION RULES

When implementing a Figma screen:

1. Inspect layout.
2. Identify container width.
3. Identify spacing.
4. Identify typography.
5. Identify colors.
6. Identify border radius.
7. Identify shadows.
8. Identify images.
9. Identify responsive behavior.
10. Build reusable components.
11. Compare implementation against Figma.
12. Fix visual mismatches.

Do not randomly redesign screens.

---

# 47. LOADING / ERROR / EMPTY STATES

Every major data-driven page must have:

* Loading state
* Error state
* Empty state

Examples:

No products:

"No products yet."

No followers:

"No followers yet."

No orders:

"No orders yet."

No reviews:

"No reviews yet."

Use proper skeleton loaders where appropriate.

---

# 48. FORM VALIDATION

Use:

React Hook Form + Zod

Frontend validation.

Backend validation must also exist.

Validate:

* email
* phone
* password
* KVK
* price
* stock
* rating
* coordinates
* subscription
* product image count
* workshop capacity
* dates
* order quantities

Never depend exclusively on client-side validation.

---

# 49. SECURITY

Implement:

* Password hashing
* Authentication guards
* RBAC
* Ownership checks
* Input validation
* Rate limiting where appropriate
* Secure HTTP headers
* CSRF protection where applicable
* Secure cookies/tokens
* File upload validation
* Image MIME validation
* File size limits
* API authorization
* SQL injection protection through Prisma
* XSS protection
* Environment variable secrets

Never commit:

* API keys
* OAuth secrets
* database passwords
* payment secrets

to Git.

---

# 50. ENVIRONMENT VARIABLES

Use:

.env.local

.env.example

Example categories:

DATABASE_URL

DIRECT_URL

NEXT_PUBLIC_API_URL

AUTH_SECRET

GOOGLE_CLIENT_ID

GOOGLE_CLIENT_SECRET

FACEBOOK_CLIENT_ID

FACEBOOK_CLIENT_SECRET

PAYMENT_SECRET_KEY

PAYMENT_WEBHOOK_SECRET

MAP_PROVIDER_KEY

STORAGE credentials

EMAIL credentials

Never put actual secrets into source code.

---

# 51. DEVELOPMENT ENVIRONMENT

The application should run locally using:

* Node.js
* npm/pnpm
* Next.js
* NestJS
* PostgreSQL/Supabase
* Prisma

Provide clear setup documentation.

---

# 52. TESTING

Implement tests for important business logic.

At minimum test:

Authentication

Authorization

Business ownership

Subscription access

Product creation

Product image limit

Product variants

Order creation

Order total calculation

Stock validation

Review permissions

Follower relationships

Workshop capacity

Payment webhook handling

Payout authorization

Admin approval

Do not consider the project complete simply because the frontend renders.

---

# 53. PAYMENT WEBHOOK SAFETY

Payment webhooks must be idempotent.

Create a mechanism for tracking processed provider events.

Example:

payment_webhook_events

* id
* provider
* provider_event_id
* event_type
* processed
* processed_at
* created_at

Unique constraint:

provider + provider_event_id

Do not process the same payment event twice.

---

# 54. ORDER PRICE SNAPSHOT

When an order is created:

store the purchased product price at that moment.

Do NOT calculate old orders using the current product price.

order_items should include:

* product_id
* quantity
* unit_price
* total
* variant information snapshot where required

---

# 55. INVENTORY

When an order is successfully confirmed:

validate stock.

Prevent:

negative stock.

Use transactional logic where required to prevent race conditions.

---

# 56. NO PRODUCT RETURN

The MVP must NOT contain:

* Return product button
* Return request page
* Return shipping workflow
* Product return status

If cancellation/refund is needed, implement it as a separate flow.

---

# 57. DATA PRIVACY

Because this application targets users in the Netherlands/EU:

Design with GDPR principles in mind.

Examples:

* collect only required data
* minimize personal data exposure
* protect consumer addresses
* provide account deletion capability where practical
* protect location data
* require consent/permission for browser geolocation
* avoid exposing private customer data publicly

Do not claim legal compliance automatically.

Implement privacy-conscious engineering.

---

# 58. SEED DATA

Create development seed data.

Include:

### Consumers

5–10 demo users.

### Businesses

Several local businesses.

### Products

Multiple categories.

### Reviews

Realistic reviews.

### Workshops

Several workshops.

### Shop routes

Several route examples.

### Orders

Demo orders in different states.

Do not use:

"Lorem ipsum"

for product/business descriptions.

Use realistic Dutch/local-business examples.

---

# 59. LANGUAGE

The client is based in the Netherlands.

The initial application can use English internally during development.

However, UI text should be structured so Dutch localization can be added easily.

Do not hardcode every user-facing string directly into deeply nested components.

Prepare an i18n-friendly architecture.

Where the Figma design already uses Dutch terminology, preserve the intended Dutch wording.

---

# 60. CURRENCY

Use:

EUR (€)

Do not use USD in user-facing commerce UI.

Prices should be formatted according to Dutch/EU conventions where appropriate.

---

# 61. COUNTRY

Default country:

Netherlands

Country code:

NL

Use European date/time conventions.

Be careful with timezone handling.

Use Europe/Amsterdam where business-local date/time matters.

---

# 62. BUSINESS HOURS

Design business opening hours in a structured way.

Example:

business_hours

* business_id
* day_of_week
* open_time
* close_time
* closed

Support future holiday/exception handling.

---

# 63. IMPORTANT MVP BOUNDARY

Do not overbuild.

Do NOT add unnecessary:

* AI recommendation engines
* complex chat systems
* Elasticsearch
* microservices
* Kubernetes
* event buses
* blockchain
* unnecessary Redis infrastructure

unless a real MVP requirement requires them.

Use a clean modular monolith.

The architecture should be scalable without being unnecessarily complex.

---

# 64. RECOMMENDED ARCHITECTURE

Use:

```
                LOCAL SPOTTER WEB

                     │
                     ▼

                Next.js Frontend

                     │
                     ▼

                 REST API

                     │
                     ▼

                NestJS Backend

         ┌───────────┼────────────┐
         ▼           ▼            ▼
    PostgreSQL     Storage      Payments
     Supabase      Supabase      Provider

         │
         ▼

    Business Logic

         │
  ┌──────┼──────┐
  ▼      ▼      ▼
Maps   Email  Notifications
```

Future:

```
                NestJS API
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
   Next.js       Android         iOS
     Web           App            App
```

Do not rebuild the backend for Phase 2.

---

# 65. PROJECT DIRECTORY

Use a clean structure similar to:

local-spotter/

├── apps/

│   ├── web/

│   │   ├── app/

│   │   ├── components/

│   │   ├── lib/

│   │   ├── hooks/

│   │   ├── services/

│   │   └── types/

│   │
│   └── api/

│       ├── src/

│       │   ├── auth/
│       │   ├── users/
│       │   ├── consumers/
│       │   ├── businesses/
│       │   ├── subscriptions/
│       │   ├── products/
│       │   ├── orders/
│       │   ├── reviews/
│       │   ├── followers/
│       │   ├── workshops/
│       │   ├── shop-routes/
│       │   ├── payments/
│       │   ├── payouts/
│       │   ├── notifications/
│       │   └── admin/
│
├── packages/

│   ├── types/
│   ├── validation/
│   └── config/

├── prisma/

│   ├── schema.prisma
│   └── seed.ts

├── docs/

├── scripts/

├── .env.example

└── README.md

You may adapt this structure if a better monorepo structure is technically justified.

---

# 66. CLAUDE CLI DEVELOPMENT PROCESS

IMPORTANT:

Do NOT implement everything in one uncontrolled step.

Use this sequence.

## PHASE 0 — DISCOVERY

Before writing application code:

1. Inspect repository.
2. Inspect existing files.
3. Inspect Figma.
4. Inspect project requirements.
5. Identify missing requirements.
6. Identify technical risks.
7. Create project architecture document.
8. Create database design.
9. Create API design.
10. Create implementation plan.

Output:

docs/PROJECT_PLAN.md

---

# PHASE 1 — FOUNDATION

Implement:

* repository structure
* Next.js
* NestJS
* Prisma
* PostgreSQL
* environment configuration
* shared types
* API client
* basic layout
* error handling
* logging
* linting
* formatting

Do not implement every feature yet.

---

# PHASE 2 — AUTHENTICATION

Implement:

* registration
* login
* logout
* forgot password
* reset password
* Google OAuth
* Facebook OAuth
* role selection
* authentication guards
* RBAC

Test thoroughly.

---

# PHASE 3 — BUSINESS OWNER

Implement:

* owner onboarding
* business profile
* GPS
* KVK
* business categories
* subscription selection
* subscription payment
* subscription status

---

# PHASE 4 — PRODUCT SYSTEM

Implement:

* categories
* product creation
* image upload
* 3-image limit
* variants
* stock
* product listing
* product details
* product editing/deleting

---

# PHASE 5 — CONSUMER DISCOVERY

Implement:

* home
* categories
* search
* business listing
* business details
* product discovery
* product details
* profiles

---

# PHASE 6 — ORDERS

Implement:

* cart
* checkout
* addresses
* payment
* order creation
* order status
* business order management
* consumer order history

---

# PHASE 7 — SHOPROUTES / GPS

Implement:

* map
* shop markers
* business location
* routes
* route stops
* directions
* location permissions

---

# PHASE 8 — WORKSHOP

Implement:

* workshop creation
* workshop listing
* workshop detail
* workshop booking
* capacity validation
* workshop payment

---

# PHASE 9 — SOCIAL FEATURES

Implement:

* follow/unfollow
* follower count
* reviews
* ratings
* review images
* comments
* moderation

Only enable these according to subscription permissions.

---

# PHASE 10 — PAYOUTS

Implement:

* business payout details
* earnings
* payout request
* admin approval
* payout status

---

# PHASE 11 — ADMIN

Implement:

* admin dashboard
* user management
* business management
* product moderation
* review moderation
* subscription management
* payment management
* payout approval

---

# PHASE 12 — POLISH

Perform:

* Figma comparison
* responsive testing
* accessibility
* loading states
* error states
* empty states
* performance optimization
* security review

---

# PHASE 13 — TESTING

Run:

* unit tests
* integration tests
* API tests
* authentication tests
* authorization tests
* payment tests
* responsive checks
* production build

Fix all blocking issues.

---

# PHASE 14 — DEPLOYMENT

Prepare:

Frontend:

Vercel or suitable hosting.

Backend:

Railway / Render / AWS / suitable production hosting.

Database:

Supabase PostgreSQL.

Storage:

Supabase Storage.

Use environment variables.

Never commit production secrets.

---

# 67. CLAUDE CLI RULES

You must follow these rules.

### RULE 1

Do not start coding before understanding the architecture.

### RULE 2

Do not invent Figma screens that you cannot inspect.

### RULE 3

Do not replace the Figma design with a generic template.

### RULE 4

Do not create fake backend functionality while claiming it is production-ready.

### RULE 5

Do not put secrets in source code.

### RULE 6

Do not trust frontend authorization.

### RULE 7

Do not duplicate business logic between frontend and backend.

### RULE 8

Do not create unnecessary dependencies.

### RULE 9

Do not create huge monolithic React components.

### RULE 10

Do not create huge NestJS services.

### RULE 11

Use reusable modules.

### RULE 12

Write maintainable TypeScript.

### RULE 13

Use strict typing.

### RULE 14

Handle errors explicitly.

### RULE 15

Every important feature must have tests.

### RULE 16

When a requirement is ambiguous, identify the ambiguity before implementing a risky assumption.

### RULE 17

Never silently change business requirements.

### RULE 18

If a design requirement conflicts with technical/business requirements, document the conflict and propose the safest implementation.

---

# 68. AI MODEL USAGE

Development is being performed through Claude CLI with OpenRouter models.

Available models:

* minimax/minimax-m3:free
* inclusionai/ling-3.0-flash-fin:free
* nvidia/nemotron-3-ultra-550b-a55b:free

The model should work efficiently with the available context.

Do not repeatedly reread the entire repository unnecessarily.

Maintain concise project documentation.

Keep architectural decisions documented.

When implementing a complex feature:

1. understand
2. plan
3. inspect existing code
4. implement
5. test
6. review
7. fix
8. document

Do not blindly generate hundreds of files in one operation.

---

# 69. CONTEXT MANAGEMENT

Maintain these documents:

docs/

├── PROJECT_PLAN.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── UI_IMPLEMENTATION.md
├── SECURITY.md
├── TESTING.md
└── DECISIONS.md

Update them when major architectural decisions change.

Use them as project memory for future Claude CLI sessions.

---

# 70. ARCHITECTURE DECISION RULE

For every major decision, consider:

* simplicity
* maintainability
* security
* cost
* performance
* scalability
* developer experience
* future mobile compatibility

Choose the simplest architecture that satisfies the requirement.

---

# 71. DEFINITION OF DONE

A feature is NOT complete when:

"the page renders."

A feature is complete only when:

* UI implemented
* Responsive layout implemented
* API implemented
* Database implemented
* Validation implemented
* Authorization implemented
* Error handling implemented
* Loading state implemented
* Empty state implemented
* Tests implemented
* Security reviewed
* Figma compared
* Documentation updated

where applicable.

---

# 72. FINAL QUALITY CHECK

Before considering Local Spotter MVP complete, perform a senior-engineer review.

Check:

## UI

* Does it match Figma?
* Is spacing consistent?
* Are typography and colors correct?
* Does mobile work?
* Does desktop work?

## Backend

* Are APIs structured?
* Is authorization correct?
* Are ownership checks implemented?
* Are errors handled?

## Database

* Are relationships correct?
* Are foreign keys present?
* Are indexes present?
* Are duplicate relationships prevented?

## Payments

* Are subscription payments separated from order payments?
* Are webhook events idempotent?
* Are secrets protected?
* Is payout approval protected?

## Commerce

* Is inventory safe?
* Are historical prices preserved?
* Is there no product-return workflow?

## Social

* Are reviews permission-controlled?
* Are images limited/validated?
* Are followers unique?
* Are comments protected?

## GPS

* Is location permission handled correctly?
* Is exact business GPS stored?
* Are directions functional?

## Security

* Can a business owner access another business?
* Can a consumer access another consumer's address?
* Can a user change their role?
* Can a business owner approve their own payout?
* Can an unauthenticated user access protected APIs?

## Production

* Does production build succeed?
* Are environment variables documented?
* Are migrations reproducible?
* Are logs useful?
* Are errors observable?

---

# 73. FIRST TASK

Do NOT immediately build the whole application.

Your first task is:

## "Analyze → Plan → Validate"

Perform these actions:

1. Inspect the repository.
2. Inspect the Figma design/reference.
3. Identify all available screens.
4. Map screens to user journeys.
5. Map user journeys to backend modules.
6. Design the database.
7. Design API modules.
8. Identify subscription permissions.
9. Identify payment flows.
10. Identify security risks.
11. Identify missing/ambiguous requirements.
12. Create:

docs/PROJECT_PLAN.md

docs/ARCHITECTURE.md

docs/DATABASE.md

docs/API.md

docs/UI_IMPLEMENTATION.md

docs/SECURITY.md

docs/TESTING.md

13. Do NOT start implementing the complete application until this analysis is complete.

At the end of Phase 0, provide a concise implementation summary containing:

* confirmed requirements
* assumptions
* unresolved questions
* architecture
* database entities
* API modules
* page list
* implementation phases
* technical risks

Then proceed to Phase 1.

---

# 74. MOST IMPORTANT PRINCIPLE

Build **Local Spotter**, not a generic ecommerce template.

The application is a combination of:

**Local Business Discovery**

*

**Marketplace / Webshop**

*

**Shop Routes**

*

**Workshops**

*

**Community / Reviews**

*

**Subscription-based Business Features**

*

**GPS / Local Discovery**

The Figma design defines the visual experience.

The requirements define the business behavior.

The backend/database define the source of truth.

Security defines who can perform each operation.

The architecture must support future Android and iOS applications.

Build the MVP professionally, incrementally, and maintainably.

Do not optimize for generating the most code.

Optimize for:

**correctness → maintainability → security → UX → scalability → delivery.**

# END OF MASTER PROMPT
