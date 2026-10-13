# Local Spotter Page and Screen Specification

## Purpose
This document maps confirmed product requirements and verified Figma frames into implementation-ready web routes. It does not invent unverified admin or desktop designs.

## Confirmed Requirements
- Build a responsive web app with consumer, business owner, and admin areas.
- Use Figma mobile designs as visual source of truth where screens exist.
- Backend APIs must power all data-driven pages.
- Feature availability depends on subscription and must be enforced server-side.

## Public / Consumer Screens

### Discovery Home
- Candidate routes: `/`, `/discover`.
- Figma evidence:
  - `193:932` product/category discovery.
  - `193:1061` shoproute discovery.
  - `236:2089` workshop discovery.
- Required content:
  - Local Spotter header.
  - Search by product, city, workshop.
  - Segmented switch: Producten, Workshops, Shoproutes.
  - Popular categories.
  - Featured/local businesses.
  - Product/workshop/shoproute sections.
- Required states:
  - Loading cards.
  - Empty results.
  - Search/filter error.

### Product Listing
- Route: `/products`.
- Figma evidence: `193:73`.
- Required content:
  - Product grid.
  - Search button.
  - Product cards with images, price, old price, title, like/seen counters, rating.
  - Bottom navigation on mobile.
- Data:
  - Product title, images, prices, average rating, rating count, like/view counts, stock status.

### Product Detail
- Route: `/products/[productId]`.
- Figma evidence: `193:750`, `219:1624`.
- Required content:
  - Product image.
  - Price.
  - Product name/category.
  - Product description.
  - Size selection.
  - Color selection.
  - Reviews preview.
  - Add to Cart.
- Requirement correction:
  - Figma shows `$1,250`; Local Spotter must display EUR.
  - Figma uses lorem ipsum; production must use real seeded/local copy.

### Business / Retailer Listing
- Route: `/businesses`.
- Figma evidence: `193:363`.
- Required content:
  - Retailer cards with name, category, description, metrics, rating.
  - Filters by category/location.

### Business / Retailer Detail
- Route: `/businesses/[businessId]`.
- Figma evidence:
  - `193:465`.
  - `476:934`.
  - `476:1551`.
  - `476:1661`.
- Required content:
  - Hero image/logo.
  - Business stats.
  - Name, category, description.
  - Address, KVK, rating.
  - Follow/unfollow when plan permits.
  - Product/workshop/shoproute tabs.
  - Map panel when Shoproutes/Workshop plan permits.
  - Reviews/comments when Workshop plan permits.

### Shoproutes
- Routes:
  - `/shoproutes`.
  - `/shoproutes/[routeId]`.
  - `/shoproutes/[routeId]/map`.
- Figma evidence:
  - `193:261`, `193:551`, `193:621`, `632:1367`.
- Required content:
  - Search/city/category filters.
  - Route cards or shop cards.
  - Map with "You are here" after permission.
  - Route stop card.
  - Start route action.

### Workshops
- Routes:
  - `/workshops`.
  - `/workshops/[workshopId]`.
  - `/workshops/[workshopId]/book`.
- Figma evidence:
  - `223:1836`, `236:2089`, `632:1540`.
- Required content:
  - Workshop list cards.
  - Date/time.
  - Ticket/booking action.
  - Capacity availability.
  - Workshop detail.

### Consumer Settings / Profile
- Routes:
  - `/account`.
  - `/account/profile`.
  - `/account/addresses`.
  - `/account/orders`.
  - `/account/following`.
  - `/account/reviews`.
- Figma evidence: `193:691`.
- Required content:
  - Account Information.
  - Delivery Address.
  - Notifications.
  - Language.
  - Terms & Policy.
  - Help & Support.
  - Logout.

### Cart and Checkout
- Routes:
  - `/cart`.
  - `/checkout`.
  - `/checkout/success`.
- Figma evidence:
  - No consumer cart/checkout frames verified.
  - Payment UI exists for subscriptions, not consumer product checkout.
- Implementation source:
  - Requirements and design system only. Must be client-reviewed because Figma screen is missing.

## Auth and Onboarding Screens

### Login
- Route: `/login`.
- Figma evidence: `476:2460`, `438:772`, variants `476:2955`, `457:3321`.
- Required content:
  - Email/mobile identifier.
  - Password.
  - Forgot password link required by prompt, not visible in verified Figma.
  - Login button.
  - Sign-up link.
  - Google/Facebook OAuth actions.

### Signup
- Route: `/signup`.
- Figma evidence: `476:2504`, `448:903`, variants `476:3007`, `457:3380`.
- Required content:
  - Name.
  - Email/mobile.
  - Password.
  - Confirm password.
  - Role selection after registration: Consumer or Business Owner.
  - OAuth signup.

### Forgot / Reset Password
- Routes:
  - `/forgot-password`.
  - `/reset-password`.
- Figma evidence: not verified.
- Implementation source:
  - Requirements and design system only.

### Business Store Info
- Route: `/onboarding/business`.
- Figma evidence: `476:2534`, `476:3053`, seller `454:1431`.
- Required content:
  - Store Name.
  - State.
  - City.
  - Street.
  - Phone Number.
  - KVK Number.
  - Shop Description.
  - Shop Type.
  - Profile image upload from requirements, not visibly confirmed in empty frame but image appears in populated variant.
  - GPS/location picker from requirements, not fully visible in store info frame.

### Subscription Selection
- Route: `/onboarding/subscription`.
- Figma evidence:
  - Buyer: `476:852`, `476:1855`, `476:1955`, `476:2055`.
  - Seller: `383:2237`, `476:3466`, `476:3583`, `476:3748`, `383:2792`, `383:2877`, `383:2962`, `476:3865`, `491:1353`.
- Required content:
  - Three plan cards.
  - Pricing.
  - Feature summary.
  - NEXT action.

### Subscription Payment
- Route: `/onboarding/subscription/payment`.
- Figma evidence:
  - `476:2156`, `476:2326`, `405:710`, `409:1004`, `478:4284`.
- Required content:
  - Plan summary.
  - Total payment.
  - Payment methods iDEAL, PayPal, Tikkie.
  - Provider-driven secure flow.
  - Do not store card details locally.

### Onboarding Success
- Route: `/onboarding/success`.
- Figma evidence: `476:2269`, `453:1248`.
- Required content:
  - "Shop Created Successfully".
  - "GO TO MY SHOP".

## Business Owner Screens

### Business Dashboard / Profile
- Routes:
  - `/owner`.
  - `/owner/business`.
- Figma evidence:
  - `383:2322`, `476:934`, `383:2487`, `383:2619`, `476:1551`, `476:1661`.
- Required content:
  - Business profile.
  - Products, workshops, shoproutes tabs.
  - Map when eligible.
  - Inactive workshop state.

### Add / Edit Product
- Routes:
  - `/owner/products/new`.
  - `/owner/products/[productId]/edit`.
- Figma evidence:
  - `454:1590`, `476:1104`, `476:2591`, `476:2729`.
- Required content:
  - Product name.
  - Price.
  - Stock.
  - Optional external product link.
  - Description.
  - Sizes.
  - Colors.
  - Product images.
  - Enforce maximum 3 images despite Figma populated variant showing four image rectangles; client confirmation required.

### Add / Edit Workshop
- Routes:
  - `/owner/workshops/new`.
  - `/owner/workshops/[workshopId]/edit`.
- Figma evidence:
  - `456:1987`, `476:1217`, `457:3210`, `476:2850`.
- Required content:
  - Name, price, capacity, location, date, description, image, start time, finish time.

### Add / Update Shoproute
- Routes:
  - `/owner/shoproutes/new`.
  - `/owner/shoproutes/location`.
- Figma evidence:
  - `457:2471`, `476:1489`, `457:2326`, `476:1313`.
- Required content:
  - State, city, street.
  - Address confirmation and change action.
  - GPS coordinates must be captured even if not visually shown.

### Product Orders
- Route: `/owner/orders`.
- Figma evidence: `457:3591`, `476:1357`.
- Required content:
  - Order metrics.
  - Orders Processing.
  - Order Completed.
  - On the way.
  - Cancelled Orders.
  - New Orders.
  - Detail list/table needs implementation design because only metric cards are verified.

### Workshop Ticket Orders
- Route: `/owner/workshop-bookings`.
- Figma evidence: `459:915`, `476:1427`.
- Required content:
  - Purchased Tickets.
  - Cancelled Tickets.
  - New Tickets Purchased.
  - Detail list/table needs implementation design.

### Payouts / Earnings
- Route: `/owner/payouts`.
- Figma evidence: not verified.
- Implementation source:
  - Requirements, payment spec, and design system.

## Admin Screens
- Routes:
  - `/admin`.
  - `/admin/users`.
  - `/admin/businesses`.
  - `/admin/products`.
  - `/admin/orders`.
  - `/admin/reviews`.
  - `/admin/reports`.
  - `/admin/payments`.
  - `/admin/payouts`.
  - `/admin/subscriptions`.
- Figma evidence: no admin screens verified.
- Implementation source:
  - Requirements only, styled with design system and reviewed before build.

## Assumptions
- Public discovery starts on a products/categories screen rather than a marketing landing page.
- Business owner screens are mobile-first dashboards that later adapt to desktop with sidebar navigation.
- Verified Figma subscription screens belong to business-owner onboarding, not consumer account upgrades.

## Unresolved Questions
- Which frame is canonical for each duplicate subscription/product/profile variant?
- Does consumer product checkout need a custom Figma design before implementation?
- Are the admin screens to be designed during implementation or supplied later?
- Should chat be removed, deferred, or repurposed?
- Should product detail support direct chat with a shop, as Figma says "Chat met Lizzy"?

## Dependencies
- `02-FIGMA-DESIGN-SPEC.md` for verified frame evidence.
- `03-UI-UX-DESIGN-SYSTEM.md` for shared components.
- `05-USER-FLOWS.md` for navigation flow.
- `07-API-SPEC.md` for screen data dependencies.
- `08-AUTH-RBAC.md` and `09-SUBSCRIPTION-SPEC.md` for access-gated routes.
