# Local Spotter — 22-Page Implementation Map

## Purpose

This document provides a complete page-by-page implementation specification for every route in the Local Spotter MVP. Each entry defines the route, user role, purpose, Figma reference, layout, components, data requirements, API endpoints, database entities, authentication, authorization, subscription gating, loading state, empty state, error state, mobile behavior, desktop behavior, navigation destinations, dependencies, and acceptance criteria.

Pages are organized by product area. No application code is included here.

---

## Notation

- **Figma**: verified frame IDs from `02-FIGMA-DESIGN-SPEC.md`. Unverified screens are marked `[NOT VERIFIED — design-system only]`.
- **Auth**: whether an authenticated session is required.
- **Sub**: subscription plan required for the feature to be accessible. `N/A` means no subscription enforced.
- **Role**: one of `PUBLIC`, `CONSUMER`, `BUSINESS_OWNER`, `SUPER_ADMIN`.

---

# SECTION 1 — PUBLIC PAGES

---

## PAGE 1: Discovery Home

| Field | Value |
|---|---|
| **Route** | `/` or `/discover` |
| **User Role** | PUBLIC (unauthenticated or any authenticated role) |
| **Purpose** | Primary entry point for consumers. Displays segmented discovery of products, workshops, and shoproutes with search, categories, and local business cards. |
| **Figma Reference** | `193:932` (home/category discovery), `193:73` (product listing grid), `193:1061` (shoproute discovery), `236:2089` (workshop discovery), `236:2343` (segmented switch component) |
| **Layout** | Mobile: pale pink header (`#FAE2F0`, 120px), fixed bottom nav (97px), single-column scrollable content. Desktop: top navigation bar with logo + search + auth menu; 4–5 column product grid; sidebar optional. |

### Components
- `AppHeader` — Local Spotter logo, menu icon, avatar.
- `SegmentedSwitch` — three tabs: Producten, Workshops, Shoproutes (width 394px, pill `#FAE2F0`, background `#F4F5FA`).
- `SearchBar` — contextual placeholder: "Welk product zoek je?" / "In welke stad ga je winkelen?" / "Welke workshop zoek je?".
- `CategoryModal` — bottom sheet or dialog with popular categories (Dress, Trousers, Furniture, Jacket, Beauty, Interior, Makeup, Bag, Electronic, etc.).
- `ProductCard` — image (190×190, 8px radius), translucent pink overlay, heart/seen counters, price row (strike-through + sale), rating star (`#D4B011`), title.
- `BusinessCard` — avatar, business name, category, short description, like count, product count, rating.
- `WorkshopCard` — date block, time, image, title, "Buy Ticket" button.
- `ShoprouteCard` — route name, city, shop count, "Start de shoproute" action.
- `BottomNav` — mobile only; four icons with active dot indicator.

### Data Required
- Active products (paginated, sorted by relevance/date).
- Featured/local businesses.
- Upcoming published workshops.
- Published shoproutes.
- Business categories and product categories.

### API Endpoints Required
- `GET /api/v1/products?limit=12&sort=new` — product feed.
- `GET /api/v1/businesses?limit=6&status=ACTIVE` — local businesses.
- `GET /api/v1/workshops?limit=6&status=PUBLISHED` — upcoming workshops.
- `GET /api/v1/shop-routes?limit=6&status=PUBLISHED` — published shoproutes.
- `GET /api/v1/product-categories` — category list.

### Database Entities Required
- `products`, `product_images`, `product_categories`, `businesses`, `business_categories`, `workshops`, `shop_routes`.

### Authentication Requirement
- Not required. Page is fully public.

### Authorization Requirement
- None. Backend returns only active/published entities.

### Subscription Requirement
- N/A for viewing. Businesses with Webshop or higher appear in product feeds. Businesses with Workshop appear in workshop/follower sections.

### Loading State
- Skeleton cards in product grid (two columns on mobile, four on desktop).
- Skeleton category chips.
- Skeleton business cards.

### Empty State
- Products tab: "Nog geen producten gevonden. Probeer een andere categorie." with search prompt.
- Workshops tab: "Er zijn momenteel geen workshops beschikbaar."
- Shoproutes tab: "Er zijn nog geen shoproutes in jouw buurt."

### Error State
- Toast or inline banner: "Er is een fout opgetreden. Probeer het opnieuw." with retry button.
- Category modal fails silently with fallback to typed search.

### Mobile Behavior
- Segmented switch is 394px wide, scrollable horizontally if needed.
- Bottom nav persists.
- Product grid: two columns.
- Category modal opens as full-screen bottom sheet.

### Desktop Behavior
- Segmented switch inline in content header.
- Product grid: 4–5 columns.
- Search in top nav.
- Category modal opens as centered dialog.
- Bottom nav replaced by top nav.

### Navigation Destinations
- Product card → `/products/[productId]`.
- Business card → `/businesses/[businessId]`.
- Workshop card → `/workshops/[workshopId]`.
- Shoproute card → `/shoproutes/[routeId]`.
- Search submit → filtered listing pages.
- Auth buttons → `/login`, `/signup`.

### Dependencies
- `03-UI-UX-DESIGN-SYSTEM.md` for tokens.
- `05-USER-FLOWS.md` for consumer discovery flow.
- `09-SUBSCRIPTION-SPEC.md` for public listing gating.

### Acceptance Criteria
- Segmented switch correctly loads different content per tab without full page reload.
- Product cards display EUR pricing with strike-through original price.
- Business cards only show active businesses with active subscriptions.
- Category modal opens on search bar tap.
- Geolocation is not requested on page load.
- Loading skeletons display while data fetches.
- Empty and error states render correctly per tab.

---

## PAGE 2: Product Listing

| Field | Value |
|---|---|
| **Route** | `/products` |
| **User Role** | PUBLIC |
| **Purpose** | Full product catalog with search, category filter, and paginated product grid. |
| **Figma Reference** | `193:73`, `588:3371` (category modal), `193:932` (category discovery context) |
| **Layout** | Mobile: two-column grid, pale pink header, bottom nav. Desktop: sidebar filters + 4–5 column grid. |

### Components
- `AppHeader`.
- `SearchBar` — "Welk product zoek je?".
- `CategoryFilter` — chips or sidebar filter by product category, price range, rating.
- `ProductCard` — image, price, strike-through, rating, counters.
- `PaginationControl` or infinite scroll sentinel.
- `CategoryModal` — `588:3371`.
- `BottomNav` (mobile).

### Data Required
- Products with images, price, compare-at price, rating, like count, view count, stock status, business name.
- Product categories for filter.

### API Endpoints Required
- `GET /api/v1/products?category=&q=&city=&minPrice=&maxPrice=&rating=&page=&limit=` — filterable paginated list.
- `GET /api/v1/product-categories` — category list.

### Database Entities Required
- `products`, `product_images`, `product_variants`, `product_categories`, `businesses`, `business_subscriptions`.

### Authentication Requirement
- Not required.

### Authorization Requirement
- Backend returns only products belonging to active businesses with Webshop or higher subscription.

### Subscription Requirement
- N/A for viewing.

### Loading State
- Two-column skeleton grid with shimmer placeholders per card.

### Empty State
- "Geen producten gevonden voor jouw zoekopdracht." with reset-filter button.

### Error State
- "Producten konden niet worden geladen." with retry action.

### Mobile Behavior
- Two-column grid. Filter opens as bottom sheet. Search in header.

### Desktop Behavior
- Sidebar filter panel left. Product grid right (4–5 columns). Breadcrumbs above grid.

### Navigation Destinations
- Product card → `/products/[productId]`.
- Business name link → `/businesses/[businessId]`.

### Dependencies
- `11-COMMERCE-SPEC.md`, `09-SUBSCRIPTION-SPEC.md`.

### Acceptance Criteria
- Filters update URL query params. Back button restores filter state.
- Products from businesses without active Webshop subscription do not appear.
- EUR prices displayed correctly. Strike-through on compare-at price.
- Page 1 is the default. Pagination or infinite scroll loads next batch without losing scroll position.

---

## PAGE 3: Product Detail

| Field | Value |
|---|---|
| **Route** | `/products/[productId]` |
| **User Role** | PUBLIC (view); CONSUMER (add to cart) |
| **Purpose** | Full product detail with images, variant selection (size/color), reviews preview, and add-to-cart action. |
| **Figma Reference** | `193:750`, `219:1624` (product detail variants) |
| **Layout** | Mobile: vertical scroll — image top, details below. Desktop: image gallery left, details right; reviews below full width. |

### Components
- `ProductImageGallery` — up to 3 images, swipeable on mobile.
- `PriceBlock` — EUR price, compare-at strike-through.
- `ProductTitle`, `ProductCategory`, `ProductDescription`.
- `SizeSelector` — S, M, L, XL, XXL buttons (XS pending client confirmation).
- `ColorSwatch` — selectable swatches with color_name and color_hex.
- `QuantityInput` — increment/decrement with stock limit.
- `AddToCartButton` — primary magenta CTA (`#FA1EFF`).
- `ExternalProductLink` — optional "Bekijk in winkel" link if external_product_url set.
- `ReviewsPreview` — rating aggregate, top 2–3 reviews, "See all" link (Workshop plan only).
- `BusinessMiniCard` — business name, logo, link to business profile.
- `BottomNav` (mobile).

### Data Required
- Product: name, description, base price, compare-at price, currency (EUR), stock, active status, external URL.
- Product images (up to 3).
- Product variants: size, color, price override, stock.
- Business: name, logo, subscription plan status.
- Reviews: average rating, rating count, first 2–3 review cards (Workshop plan).

### API Endpoints Required
- `GET /api/v1/products/:productId` — product detail.
- `GET /api/v1/products/:productId/reviews?limit=3` — reviews preview (Workshop plan check on backend).
- `POST /api/v1/cart/items` — add to cart (CONSUMER only, authenticated).

### Database Entities Required
- `products`, `product_images`, `product_variants`, `businesses`, `business_subscriptions`, `reviews`, `review_images`.

### Authentication Requirement
- Not required to view. Required to add to cart.

### Authorization Requirement
- Backend checks: product active, business active, business has Webshop or higher subscription.
- Unauthenticated "Add to Cart" redirects to `/login`.

### Subscription Requirement
- Product visible: Webshop or higher on owning business.
- Reviews visible: Workshop subscription on owning business.

### Loading State
- Image skeleton 190×190. Text block skeletons for title, price, description.

### Empty State
- N/A for this page (product either exists or 404).

### Error State
- Product not found (404): "Dit product bestaat niet meer." with link back to `/products`.
- Business inactive: "Dit product is niet meer beschikbaar." with link to `/businesses`.
- Add-to-cart failure: inline toast error.

### Mobile Behavior
- Swipeable image carousel at top.
- Size/color selectors in horizontal scrollable rows.
- Sticky "Add to Cart" button above bottom nav.

### Desktop Behavior
- Image gallery (thumbnail strip below main image) left column.
- All product details and selectors right column.
- Add to Cart button inline, not sticky.
- Reviews section full width below two-column layout.

### Navigation Destinations
- "Add to Cart" success → cart icon updates, optional drawer open.
- Business mini-card → `/businesses/[businessId]`.
- "See all reviews" → `/products/[productId]/reviews` (or on-page expand).

### Dependencies
- `11-COMMERCE-SPEC.md`, `14-REVIEW-FOLLOWER-SPEC.md`, `09-SUBSCRIPTION-SPEC.md`.

### Acceptance Criteria
- All prices in EUR. No USD values.
- Size/color selection updates selected variant and price if override exists.
- Stock limit enforced on quantity input; "Out of stock" shown when stock = 0.
- Max 3 images displayed.
- Reviews section only renders when business has Workshop plan.
- External product link opens in new tab when present.

---

## PAGE 4: Business Listing

| Field | Value |
|---|---|
| **Route** | `/businesses` |
| **User Role** | PUBLIC |
| **Purpose** | Browse and discover local businesses with category and location filters. |
| **Figma Reference** | `193:363` ("Onze locals" retailer list) |
| **Layout** | Mobile: single-column list of business cards, pink header, bottom nav. Desktop: filter sidebar + responsive card grid. |

### Components
- `AppHeader`.
- `SearchBar` — "Zoek een winkel…".
- `CategoryFilter` — business categories.
- `CityFilter` — Dutch city selector.
- `BusinessCard` — avatar/logo, business name, category, description, like count, product count, average rating, review count.
- `BottomNav` (mobile).

### Data Required
- Businesses: name, slug, logo, category, description, city, average rating, rating count, follower count, product count.
- Business categories.

### API Endpoints Required
- `GET /api/v1/businesses?q=&category=&city=&status=ACTIVE&page=&limit=`.
- `GET /api/v1/business-categories`.

### Database Entities Required
- `businesses`, `business_categories`, `business_subscriptions`.

### Authentication Requirement
- Not required.

### Authorization Requirement
- Only ACTIVE businesses with ACTIVE subscription returned by backend.

### Subscription Requirement
- N/A for listing view.

### Loading State
- Single-column skeleton business cards.

### Empty State
- "Geen winkels gevonden in jouw buurt. Pas je filters aan."

### Error State
- "Winkels konden niet worden geladen." with retry.

### Mobile Behavior
- Full-width cards. City/category filter opens as bottom sheet.

### Desktop Behavior
- Filter sidebar left. Business cards in 3-column grid.

### Navigation Destinations
- Business card → `/businesses/[businessId]`.

### Dependencies
- `02-FIGMA-DESIGN-SPEC.md` (`193:363`), `09-SUBSCRIPTION-SPEC.md`.

### Acceptance Criteria
- Only active businesses shown. Filters update URL params. Rating displayed with star icon.

---

## PAGE 5: Business Detail / Public Store Profile

| Field | Value |
|---|---|
| **Route** | `/businesses/[businessId]` |
| **User Role** | PUBLIC (view); CONSUMER (follow) |
| **Purpose** | Public-facing business profile showing products, workshops, map location, and reviews depending on subscription plan. |
| **Figma Reference** | `193:465`, `476:934`, `476:1551`, `476:1661` |
| **Layout** | Mobile: hero image/logo top, stats row, name/category/description, address/KVK, tabbed content (Products / Workshops / Shoproute / Reviews). Desktop: two-column hero area; tab content in full-width section below. |

### Components
- `BusinessHero` — cover image, logo overlay.
- `BusinessStatsRow` — average rating, review count, follower count (if Workshop), product count.
- `BusinessMeta` — name, shop type/category, description, address, KVK number, phone.
- `FollowButton` — follow/unfollow toggle (CONSUMER only; Workshop plan gate).
- `OpeningHours` — weekly schedule.
- `TabSwitch` — Products | Workshops (Workshop plan) | Map (Shoproutes+) | Reviews (Workshop plan).
- `ProductGrid` — condensed product cards under Products tab.
- `WorkshopList` — workshop cards under Workshops tab (Workshop plan only).
- `MapPanel` — business location map with "Your store is here" marker (Shoproutes+ only).
- `ReviewList` — published reviews under Reviews tab (Workshop plan only).
- `BottomNav` (mobile).

### Data Required
- Business: all public fields, opening hours, subscription plan slug.
- Products (Webshop+).
- Workshops (Workshop plan).
- Shop location coordinates (Shoproutes+).
- Reviews and rating aggregate (Workshop plan).
- Follower count (Workshop plan).
- Consumer's follow status (if authenticated).

### API Endpoints Required
- `GET /api/v1/businesses/:businessId`.
- `GET /api/v1/businesses/:businessId/products?limit=8`.
- `GET /api/v1/businesses/:businessId/workshops?limit=6`.
- `GET /api/v1/businesses/:businessId/reviews?limit=10`.
- `GET /api/v1/businesses/:businessId/followers/count`.
- `POST /api/v1/businesses/:businessId/follow` (authenticated CONSUMER).
- `DELETE /api/v1/businesses/:businessId/follow` (authenticated CONSUMER).

### Database Entities Required
- `businesses`, `business_hours`, `business_subscriptions`, `products`, `workshops`, `reviews`, `shop_followers`.

### Authentication Requirement
- Not required to view. Required to follow.

### Authorization Requirement
- Backend gates tabs and data by subscription plan of the business.
- Follow requires CONSUMER role.

### Subscription Requirement
- Products tab: Webshop or higher.
- Map tab: Shoproutes or higher.
- Workshops tab: Workshop.
- Reviews tab: Workshop.
- Follow button: Workshop.

### Loading State
- Skeleton hero block. Skeleton stats row. Skeleton product grid.

### Empty State
- Products tab: "Deze winkel heeft nog geen producten."
- Workshops tab: "Er zijn nog geen workshops gepland."
- Reviews tab: "Er zijn nog geen beoordelingen."
- Map tab: "Locatie niet beschikbaar." if coordinates missing.

### Error State
- Business not found (404): "Deze winkel bestaat niet meer."
- Inactive business: "Deze winkel is momenteel niet actief."

### Mobile Behavior
- Full-width hero. Tabbed content scrollable. Follow button in hero area.

### Desktop Behavior
- Cover image full width, logo + stats in two-column layout below. Tabs inline. Map panel shows alongside shop info.

### Navigation Destinations
- Product card → `/products/[productId]`.
- Workshop card → `/workshops/[workshopId]`.
- "Start de shoproute" → `/shoproutes` filtered to business.
- Follow → toggles in place.

### Dependencies
- `09-SUBSCRIPTION-SPEC.md`, `14-REVIEW-FOLLOWER-SPEC.md`, `12-GPS-SHOPROUTES.md`.

### Acceptance Criteria
- Tabs not shown when plan does not permit.
- Follow button only visible to authenticated consumers.
- Workshop plan not active → Workshops and Reviews tabs hidden.
- Map only shown when business has coordinates and Shoproutes+ plan.

---

# SECTION 2 — AUTHENTICATION PAGES

---

## PAGE 6: Login

| Field | Value |
|---|---|
| **Route** | `/login` |
| **User Role** | PUBLIC (unauthenticated only) |
| **Purpose** | Authenticate existing users via email/mobile + password or OAuth. |
| **Figma Reference** | `476:2460`, `438:772`, variants `476:2955`, `457:3321` |
| **Layout** | Mobile: centered form with brand header graphic, full-width fields, CTA bottom. Desktop: centered card max-width 480px. |

### Components
- `AuthHeaderGraphic` — `header sign up` component from Figma.
- `HeadingBlock` — "Hello", "Sign in to your account".
- `EmailOrMobileInput` — validated.
- `PasswordInput` — masked, toggle visibility.
- `ForgotPasswordLink` — `/forgot-password`.
- `PrimaryButton` — "LOGIN" (`#FA1EFF`).
- `OAuthSeparator` — "or" divider.
- `GoogleOAuthButton`.
- `FacebookOAuthButton`.
- `SignupLink` — "Don't have an account? Sign up here".

### Data Required
- None pre-loaded. Form submits credential data.

### API Endpoints Required
- `POST /api/v1/auth/login` — email/mobile + password.
- `GET /api/v1/auth/oauth/google/start`.
- `GET /api/v1/auth/oauth/facebook/start`.

### Database Entities Required
- `users`, `oauth_accounts`.

### Authentication Requirement
- Page accessible only to unauthenticated users. Authenticated users redirect to role-appropriate home.

### Authorization Requirement
- N/A.

### Subscription Requirement
- N/A.

### Loading State
- Button shows spinner while login request is in flight.

### Empty State
- N/A.

### Error State
- Invalid credentials: "E-mailadres of wachtwoord is onjuist." inline below form.
- Account suspended: "Je account is tijdelijk geblokkeerd."
- Rate limit exceeded: "Te veel pogingen. Probeer het later opnieuw."
- OAuth failure: toast "Inloggen via Google mislukt. Probeer het opnieuw."

### Mobile Behavior
- Full-width fields. CTA button full width. Keyboard pushes form up, no content overlap.

### Desktop Behavior
- Centered card with shadow. Max width 480px. Same visual language, no sidebar.

### Navigation Destinations
- Successful login → role-based: Consumer → `/`, Business Owner → `/owner`, Admin → `/admin`.
- Signup link → `/signup`.
- Forgot password link → `/forgot-password`.
- OAuth callbacks → `/auth/oauth/google/callback`, `/auth/oauth/facebook/callback`.

### Dependencies
- `08-AUTH-RBAC.md`, `02-FIGMA-DESIGN-SPEC.md`.

### Acceptance Criteria
- Login rate-limited on backend.
- Plaintext passwords never exposed in logs.
- Authenticated redirect fires before form renders.
- "Forgot password" link present.
- OAuth buttons functional.

---

## PAGE 7: Signup / Registration

| Field | Value |
|---|---|
| **Route** | `/signup` |
| **User Role** | PUBLIC (unauthenticated only) |
| **Purpose** | Create a new account, then select Consumer or Business Owner role. |
| **Figma Reference** | `476:2504`, `448:903`, variants `476:3007`, `457:3380` |
| **Layout** | Mobile: brand header, full-width form, CTA bottom. Desktop: centered card 480px. |

### Components
- `AuthHeaderGraphic`.
- `HeadingBlock` — "Hi…", "Let's create an account".
- `NameInput`.
- `EmailOrMobileInput`.
- `PasswordInput` — strength indicator.
- `ConfirmPasswordInput`.
- `PrimaryButton` — "SIGN UP".
- `OAuthSeparator`.
- `GoogleOAuthButton`, `FacebookOAuthButton`.
- `LoginLink` — "Have an account? Log in here".
- `RoleSelectionModal` — bottom sheet with "Consumer" and "Business Owner" options (appears after successful registration).

### Data Required
- None pre-loaded.

### API Endpoints Required
- `POST /api/v1/auth/register` — name, email/mobile, password, confirmPassword.
- `POST /api/v1/auth/select-role` — role selection after registration.
- `GET /api/v1/auth/oauth/google/start`, `GET /api/v1/auth/oauth/facebook/start`.

### Database Entities Required
- `users`, `consumer_profiles`, `business_owner_profiles`, `oauth_accounts`.

### Authentication Requirement
- Unauthenticated only. Role selection step requires the new session token.

### Authorization Requirement
- Backend validates role selection is allowed during onboarding state only.

### Subscription Requirement
- N/A.

### Loading State
- Button spinner during registration request.

### Empty State
- N/A.

### Error State
- Duplicate email/mobile: "Dit e-mailadres is al in gebruik."
- Password too weak: inline strength error.
- Passwords do not match: "Wachtwoorden komen niet overeen."
- OAuth account already linked: "Dit account is al gekoppeld aan een bestaand account."

### Mobile Behavior
- Keyboard-aware scrolling. Role selection as full-screen bottom sheet after registration.

### Desktop Behavior
- Centered card. Role selection as centered modal dialog.

### Navigation Destinations
- Consumer role → Discovery Home `/`.
- Business Owner role → Business Onboarding `/onboarding/business`.

### Dependencies
- `08-AUTH-RBAC.md`.

### Acceptance Criteria
- Password minimum 10 characters enforced.
- Role selection modal appears after successful account creation.
- Backend persists role; frontend cannot skip backend role validation.
- Duplicate email/mobile returns 409, not 500.

---

## PAGE 8: Forgot Password

| Field | Value |
|---|---|
| **Route** | `/forgot-password` |
| **User Role** | PUBLIC |
| **Purpose** | Allow user to request a password reset link via email or mobile. |
| **Figma Reference** | `[NOT VERIFIED — design-system only]` |
| **Layout** | Mobile/Desktop: centered card, minimal form. |

### Components
- `HeadingBlock` — "Wachtwoord vergeten".
- `EmailOrMobileInput`.
- `PrimaryButton` — "Verstuur link".
- `BackToLoginLink`.

### Data Required
- None.

### API Endpoints Required
- `POST /api/v1/auth/forgot-password` — rate-limited; does not reveal account existence.

### Database Entities Required
- `users`, `password_reset_tokens`.

### Authentication Requirement
- Unauthenticated only.

### Authorization Requirement
- N/A.

### Subscription Requirement
- N/A.

### Loading State
- Button spinner during submission.

### Empty State
- N/A.

### Error State
- Rate limit: "Te veel verzoeken. Probeer het over een paar minuten opnieuw."
- Success always shown (do not reveal account existence): "Als dit e-mailadres bij ons bekend is, ontvang je een link."

### Mobile Behavior
- Single field, full-width button.

### Desktop Behavior
- Centered card max-width 440px.

### Navigation Destinations
- Back to login → `/login`.
- After submit → stays on page with success message.

### Dependencies
- `08-AUTH-RBAC.md`.

### Acceptance Criteria
- Response time is constant regardless of account existence.
- Reset token expires in ≤1 hour.
- Rate limiting enforced per IP and per identifier.

---

## PAGE 9: Reset Password

| Field | Value |
|---|---|
| **Route** | `/reset-password?token=[token]` |
| **User Role** | PUBLIC (with valid token) |
| **Purpose** | Allow user to set a new password using a valid, unexpired reset token. |
| **Figma Reference** | `[NOT VERIFIED — design-system only]` |
| **Layout** | Mobile/Desktop: centered card. |

### Components
- `HeadingBlock` — "Nieuw wachtwoord instellen".
- `PasswordInput` (new password).
- `ConfirmPasswordInput`.
- `PrimaryButton` — "Wachtwoord opslaan".

### Data Required
- Token from query param.

### API Endpoints Required
- `POST /api/v1/auth/reset-password` — token, new password, confirm password.

### Database Entities Required
- `users`, `password_reset_tokens`.

### Authentication Requirement
- No active session required. Token from URL serves as credential.

### Authorization Requirement
- Backend validates token hash, expiry, and not-already-used status.

### Subscription Requirement
- N/A.

### Loading State
- Button spinner.

### Empty State
- N/A.

### Error State
- Token invalid or expired: "Deze link is verlopen. Vraag een nieuwe link aan." with link to `/forgot-password`.
- Token already used: "Deze link is al gebruikt."
- Password too weak: inline error.

### Mobile Behavior
- Full-width fields, bottom CTA.

### Desktop Behavior
- Centered card 440px.

### Navigation Destinations
- Successful reset → `/login` with success toast "Wachtwoord succesvol opgeslagen. Je kunt nu inloggen."

### Dependencies
- `08-AUTH-RBAC.md`.

### Acceptance Criteria
- Token is single-use; marked `used_at` after successful reset.
- Hashed token never exposed in response bodies.
- Redirect to login on success.

---

# SECTION 3 — CONSUMER PAGES

---

## PAGE 10: Consumer Account / Settings

| Field | Value |
|---|---|
| **Route** | `/account` |
| **User Role** | CONSUMER |
| **Purpose** | Consumer settings hub with navigation to profile, addresses, orders, following, reviews, and app preferences. |
| **Figma Reference** | `193:691` (settings menu) |
| **Layout** | Mobile: list menu with icons. Desktop: sidebar nav + content panel. |

### Components
- `AccountMenu` — list items: Account Information, Delivery Address, Notifications, Language, Terms & Policy, Help & Support, Logout.
- `UserAvatar` — profile image and display name at top.
- `BottomNav` (mobile).

### Data Required
- Consumer profile: display name, profile image URL.

### API Endpoints Required
- `GET /api/v1/consumers/me`.
- `POST /api/v1/auth/logout`.

### Database Entities Required
- `users`, `consumer_profiles`.

### Authentication Requirement
- Required (CONSUMER role).

### Authorization Requirement
- Consumer can only view/modify their own profile.

### Subscription Requirement
- N/A.

### Loading State
- Avatar skeleton, menu items skeleton.

### Empty State
- N/A.

### Error State
- Session expired → redirect to `/login`.

### Mobile Behavior
- Full-screen list. Tapping each item navigates to sub-page.

### Desktop Behavior
- Left sidebar with menu. Right panel renders selected section.

### Navigation Destinations
- Account Information → `/account/profile`.
- Delivery Address → `/account/addresses`.
- Orders → `/account/orders`.
- Following → `/account/following`.
- Reviews → `/account/reviews`.
- Terms & Policy → `/legal/privacy`.
- Help & Support → `/help`.
- Logout → clears session → `/`.

### Dependencies
- `08-AUTH-RBAC.md`, `02-FIGMA-DESIGN-SPEC.md` (`193:691`).

### Acceptance Criteria
- Logout correctly invalidates server-side session/token.
- Only CONSUMER role accesses this page. Business Owner redirected to `/owner`.

---

## PAGE 11: Consumer Profile Edit

| Field | Value |
|---|---|
| **Route** | `/account/profile` |
| **User Role** | CONSUMER |
| **Purpose** | View and edit consumer profile information including name, email, phone, and profile image. |
| **Figma Reference** | `[NOT VERIFIED — design-system only based on 193:691 context]` |
| **Layout** | Mobile: full-width form. Desktop: centered card in content panel. |

### Components
- `ProfileImageUploader` — current image + upload action.
- `FormField` — display name, first name, last name, phone.
- `ReadOnlyEmailField` — email (editable via separate security flow if needed).
- `PrimaryButton` — "Opslaan".

### Data Required
- Consumer profile: display_name, first_name, last_name, phone, profile_image_url.

### API Endpoints Required
- `GET /api/v1/consumers/me`.
- `PATCH /api/v1/consumers/me`.
- `POST /api/v1/media/upload-url` (for image upload).
- `POST /api/v1/media/complete`.

### Database Entities Required
- `consumer_profiles`, `media_assets`.

### Authentication Requirement
- Required (CONSUMER).

### Authorization Requirement
- Consumer can only modify own profile.

### Subscription Requirement
- N/A.

### Loading State
- Form field skeletons.

### Empty State
- N/A.

### Error State
- Save failure: "Profiel kon niet worden opgeslagen." with retry.
- Image upload failure: "Afbeelding uploaden mislukt."

### Mobile Behavior
- Full-width stacked form. Image upload at top.

### Desktop Behavior
- Profile image left, form fields right.

### Navigation Destinations
- Save → stays on page with success toast.
- Back → `/account`.

### Dependencies
- `06-DATABASE-SCHEMA.md` consumer_profiles section.

### Acceptance Criteria
- Image stored in object storage. URL saved in consumer_profiles.
- MIME type validated on backend. Non-image files rejected.

---

## PAGE 12: Consumer Addresses

| Field | Value |
|---|---|
| **Route** | `/account/addresses` |
| **User Role** | CONSUMER |
| **Purpose** | Manage saved delivery addresses. Add, edit, delete, and set default. |
| **Figma Reference** | `[NOT VERIFIED — design-system only]` |
| **Layout** | Mobile: stacked address cards with actions. Desktop: content panel with card list. |

### Components
- `AddressCard` — label, full name, street, city, postal code, country, phone. Edit / Delete / Set Default actions.
- `AddAddressButton`.
- `AddressFormModal` — label, full name, phone, street, house number, postal code, city, country (NL default).

### Data Required
- Consumer addresses list.

### API Endpoints Required
- `GET /api/v1/addresses`.
- `POST /api/v1/addresses`.
- `PATCH /api/v1/addresses/:addressId`.
- `DELETE /api/v1/addresses/:addressId`.
- `POST /api/v1/addresses/:addressId/default`.

### Database Entities Required
- `consumer_addresses`.

### Authentication Requirement
- Required (CONSUMER).

### Authorization Requirement
- Consumer can only access own addresses.

### Subscription Requirement
- N/A.

### Loading State
- Skeleton address cards.

### Empty State
- "Je hebt nog geen bezorgadressen opgeslagen." with Add Address CTA.

### Error State
- Delete failure: "Adres kon niet worden verwijderd."

### Mobile Behavior
- Full-width address cards. Add address opens as bottom sheet form.

### Desktop Behavior
- Card list in content panel. Add/edit opens as modal dialog.

### Navigation Destinations
- Back → `/account`.
- Used during checkout at `/checkout`.

### Dependencies
- `11-COMMERCE-SPEC.md` delivery address section.

### Acceptance Criteria
- NL default country. Exactly one address can be default. Deleting default address removes default status.

---

## PAGE 13: Consumer Order History

| Field | Value |
|---|---|
| **Route** | `/account/orders` |
| **User Role** | CONSUMER |
| **Purpose** | View past and active orders with status and order detail. |
| **Figma Reference** | `[NOT VERIFIED — design-system only]` |
| **Layout** | Mobile: list of order cards. Desktop: table view with row expand. |

### Components
- `OrderCard` — order number, business name, date, status badge, total, item count.
- `OrderStatusBadge` — color-coded by status (PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, REJECTED).
- `OrderDetailPanel` — items with snapshot name, variant, qty, price; delivery address; payment info.

### Data Required
- Orders: order_number, status, created_at, total_cents, business name, order items (name snapshot, qty, unit price).

### API Endpoints Required
- `GET /api/v1/consumers/me/orders?page=&limit=`.
- `GET /api/v1/orders/:orderId`.

### Database Entities Required
- `orders`, `order_items`, `businesses`, `payments`.

### Authentication Requirement
- Required (CONSUMER).

### Authorization Requirement
- Consumer sees only their own orders.

### Subscription Requirement
- N/A.

### Loading State
- Skeleton order cards.

### Empty State
- "Je hebt nog geen bestellingen geplaatst." with link to `/products`.

### Error State
- "Bestellingen konden niet worden geladen." with retry.

### Mobile Behavior
- Order card list. Tap opens detail in new view or bottom sheet.

### Desktop Behavior
- Table layout. Row expand or side panel for detail.

### Navigation Destinations
- Order card → detail view.
- Business name → `/businesses/[businessId]`.

### Dependencies
- `11-COMMERCE-SPEC.md`, `10-PAYMENT-SPEC.md`.

### Acceptance Criteria
- Order item prices are snapshots (not recalculated from current product prices).
- Status badge matches order lifecycle correctly.
- Cancelled/rejected orders visually distinct.

---

## PAGE 14: Consumer Following

| Field | Value |
|---|---|
| **Route** | `/account/following` |
| **User Role** | CONSUMER |
| **Purpose** | View and manage businesses the consumer follows. |
| **Figma Reference** | `[NOT VERIFIED — design-system only]` |
| **Layout** | Mobile: list of followed business cards. Desktop: grid in content panel. |

### Components
- `FollowedBusinessCard` — logo, name, category, follow date, Unfollow button.

### Data Required
- Followed businesses: name, logo, category, slug.

### API Endpoints Required
- `GET /api/v1/consumers/me/following?page=&limit=`.
- `DELETE /api/v1/businesses/:businessId/follow`.

### Database Entities Required
- `shop_followers`, `businesses`.

### Authentication Requirement
- Required (CONSUMER).

### Authorization Requirement
- Consumer sees only own followed businesses.

### Subscription Requirement
- N/A for viewing. Follow action was gated by Workshop plan at the business level.

### Loading State
- Skeleton business cards.

### Empty State
- "Je volgt nog geen winkels. Ontdek lokale winkels!" with link to `/businesses`.

### Error State
- Unfollow failure: toast "Ontvolgen mislukt."

### Mobile Behavior
- Single-column list.

### Desktop Behavior
- Three-column grid.

### Navigation Destinations
- Business card → `/businesses/[businessId]`.
- Unfollow → removes card with animation.

### Dependencies
- `14-REVIEW-FOLLOWER-SPEC.md`.

### Acceptance Criteria
- Only businesses that have Workshop plan appear (follow was only possible if plan was active).
- Unfollow removes record immediately with optimistic update.

---

# SECTION 4 — BUSINESS OWNER PAGES

---

## PAGE 15: Business Owner Dashboard / Store Profile

| Field | Value |
|---|---|
| **Route** | `/owner` and `/owner/business` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | Central hub for the business owner. Shows business profile, subscription status, and tabbed content (Products, Workshops, Map, Orders summary). |
| **Figma Reference** | `383:2322`, `476:934`, `383:2487`, `383:2619`, `476:1551`, `476:1661` |
| **Layout** | Mobile: business profile header, tab content below, bottom nav. Desktop: sidebar navigation + main content area with metrics and tabs. |

### Components
- `BusinessProfileHeader` — cover image, logo, business name, subscription badge.
- `SubscriptionStatusBadge` — plan name, status, renewal date.
- `TabSwitch` — Products | Workshops | Map | Orders (tabs gated by plan).
- `ProductGrid` — owner's products with edit action.
- `WorkshopList` — owner's workshops with edit action (Workshop plan).
- `MapPanel` — business location with "Your store is here" (Shoproutes+).
- `InactiveFeatureBanner` — shown when plan does not support a tab (e.g., "Upgrade naar Workshop voor workshops").
- `QuickActionButtons` — "Product toevoegen", "Workshop toevoegen".
- `OwnerSidebar` (desktop) — nav links: Dashboard, Products, Orders, Workshop Bookings, Shoproutes, Payouts, Settings.

### Data Required
- Business: name, logo, cover, description, status, subscription plan/status.
- Products list (Webshop+).
- Workshops list (Workshop).
- Business coordinates (Shoproutes+).

### API Endpoints Required
- `GET /api/v1/business-owners/me/businesses`.
- `GET /api/v1/businesses/:businessId`.
- `GET /api/v1/businesses/:businessId/products`.
- `GET /api/v1/businesses/:businessId/workshops`.
- `GET /api/v1/businesses/:businessId/subscription`.

### Database Entities Required
- `businesses`, `business_subscriptions`, `subscription_plans`, `products`, `workshops`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Owner can only access their own businesses.

### Subscription Requirement
- Workshop tab: Workshop plan.
- Map tab: Shoproutes or higher.
- Products tab: Webshop or higher.

### Loading State
- Skeleton profile header. Skeleton product grid.

### Empty State
- Products tab: "Je hebt nog geen producten. Voeg je eerste product toe." with CTA.
- Workshops tab: "Je hebt nog geen workshops gepland." with CTA.

### Error State
- Business not found: redirect to onboarding flow.
- Subscription expired: banner "Je abonnement is verlopen. Verleng je abonnement om door te gaan."

### Mobile Behavior
- Tabbed interface, bottom nav with owner-specific destinations. Cover/logo hero at top.

### Desktop Behavior
- Sidebar nav left. Profile header + tabs in main content. Metrics cards in 2–4 column grid.

### Navigation Destinations
- "Product toevoegen" → `/owner/products/new`.
- "Workshop toevoegen" → `/owner/workshops/new`.
- Product card edit → `/owner/products/[productId]/edit`.
- Workshop card edit → `/owner/workshops/[workshopId]/edit`.
- Orders tab → `/owner/orders`.
- Payouts link → `/owner/payouts`.
- Subscription card → `/owner/subscription`.

### Dependencies
- `09-SUBSCRIPTION-SPEC.md`, `12-GPS-SHOPROUTES.md`, `13-WORKSHOP-SPEC.md`.

### Acceptance Criteria
- Tabs not rendered for plans that do not support them.
- Inactive plan shows upgrade banner.
- Owner cannot see or modify another owner's business data.

---

## PAGE 16: Add / Edit Product

| Field | Value |
|---|---|
| **Route** | `/owner/products/new` and `/owner/products/[productId]/edit` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | Create or edit a product including images (max 3), name, price, stock, description, variants (size/color), category, and optional external link. |
| **Figma Reference** | `454:1590`, `476:1104`, `476:2591`, `476:2729` |
| **Layout** | Mobile: single-column form, sticky Create/Save button at bottom. Desktop: two-column form — images left, fields right. |

### Components
- `ProductImageUploader` — drag-and-drop or tap to upload; max 3 images; sort order; delete per image.
- `FormField` — Product Name.
- `PriceInput` — EUR, cents validation.
- `CompareAtPriceInput` — optional strike-through price.
- `StockInput` — non-negative integer.
- `ExternalLinkInput` — optional URL.
- `ProductDescriptionTextarea`.
- `CategorySelect` — database-driven product categories.
- `SizeSelector` — multi-select: S, M, L, XL, XXL (XS pending confirmation).
- `ColorPicker` — color swatches + hex input.
- `VariantList` — auto-generated or manually defined variant rows (size × color combinations).
- `PrimaryButton` — "CREATE" / "OPSLAAN".
- `SecondaryButton` — "ANNULEREN".

### Data Required
- Product categories.
- Existing product data (edit mode).
- Existing images and variants (edit mode).

### API Endpoints Required
- `POST /api/v1/businesses/:businessId/products` (create).
- `PATCH /api/v1/products/:productId` (edit).
- `POST /api/v1/products/:productId/images` (upload image).
- `DELETE /api/v1/products/:productId/images/:imageId`.
- `POST /api/v1/products/:productId/variants`.
- `PATCH /api/v1/products/:productId/variants/:variantId`.
- `DELETE /api/v1/products/:productId/variants/:variantId`.
- `POST /api/v1/media/upload-url`.
- `POST /api/v1/media/complete`.
- `GET /api/v1/product-categories`.

### Database Entities Required
- `products`, `product_images`, `product_variants`, `product_categories`, `media_assets`, `businesses`, `business_subscriptions`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Owner must own the business. Backend verifies ownership chain: product → business → owner.

### Subscription Requirement
- Webshop or higher required. Backend returns 403 if subscription insufficient.

### Loading State
- Form fields populated after data fetch in edit mode. Skeleton while loading.

### Empty State
- N/A.

### Error State
- Image count exceeds 3: "Je kunt maximaal 3 afbeeldingen uploaden."
- Invalid price: "Voer een geldig bedrag in."
- Subscription inactive: "Je abonnement is niet actief. Verleng om producten te beheren."
- Unauthorized access: redirect to `/owner`.

### Mobile Behavior
- Single-column stacked form. Image uploader at top. Sticky Create button at bottom.

### Desktop Behavior
- Two-column: image grid left, form fields right. Save button inline below form.

### Navigation Destinations
- Save success → `/owner/business` products tab.
- Cancel → `/owner/business`.

### Dependencies
- `11-COMMERCE-SPEC.md` product catalog section, `09-SUBSCRIPTION-SPEC.md`.

### Acceptance Criteria
- Max 3 images enforced on both frontend and backend.
- Price stored as cents. EUR displayed.
- Variants generated correctly for size × color matrix.
- Edit mode pre-fills all fields from existing data.
- Deleting an image removes it from object storage and database.

---

## PAGE 17: Add / Edit Workshop

| Field | Value |
|---|---|
| **Route** | `/owner/workshops/new` and `/owner/workshops/[workshopId]/edit` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | Create or edit a workshop including name, price, capacity, location, date/time, description, and image. |
| **Figma Reference** | `456:1987`, `476:1217`, `457:3210`, `476:2850` |
| **Layout** | Mobile: single-column form, sticky Create button. Desktop: form with image upload side. |

### Components
- `WorkshopImageUploader`.
- `FormField` — Workshop Name.
- `PriceInput` — EUR.
- `CapacityInput` — positive integer.
- `LocationInput` — text address.
- `DatePicker`.
- `TimePicker` — Time Start, Time Finish.
- `WorkshopDescriptionTextarea`.
- `PrimaryButton` — "CREATE".

### Data Required
- Existing workshop (edit mode).

### API Endpoints Required
- `POST /api/v1/businesses/:businessId/workshops` (create).
- `PATCH /api/v1/workshops/:workshopId` (edit).
- `DELETE /api/v1/workshops/:workshopId` (cancel).
- `POST /api/v1/media/upload-url`.
- `POST /api/v1/media/complete`.

### Database Entities Required
- `workshops`, `media_assets`, `businesses`, `business_subscriptions`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Owner must own the business. Backend validates Workshop plan.

### Subscription Requirement
- Workshop plan required. Backend returns 403 if plan insufficient.

### Loading State
- Form skeleton in edit mode.

### Empty State
- N/A.

### Error State
- End time before start time: "Eindtijd moet na begintijd zijn."
- Capacity below confirmed bookings (edit): "Capaciteit kan niet lager zijn dan het aantal bevestigde boekingen."
- Subscription inactive: 403 with plan upgrade prompt.

### Mobile Behavior
- Full-width single-column form. Date/time pickers as native or custom bottom sheet.

### Desktop Behavior
- Two-column: image + date/time left; name, price, capacity, description right.

### Navigation Destinations
- Save → `/owner/business` workshops tab.
- Cancel → `/owner/business`.

### Dependencies
- `13-WORKSHOP-SPEC.md`.

### Acceptance Criteria
- `end_at > start_at` enforced. Times stored UTC, displayed Europe/Amsterdam.
- Capacity decrease below confirmed bookings rejected with 422.
- Image follows same media validation as products.

---

## PAGE 18: Add / Update Shoproute Location

| Field | Value |
|---|---|
| **Route** | `/owner/shoproutes/new` and `/owner/shoproutes/location` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | Add or update the business's physical address and GPS location for participation in shoproutes and map discovery. |
| **Figma Reference** | `457:2471`, `476:1489`, `457:2326`, `476:1313` |
| **Layout** | Mobile: address form with map picker. Desktop: form left, map preview right. |

### Components
- `AddressFormFields` — State, City, Street, House Number, Postal Code.
- `GPSLocationPicker` — map widget to pin exact location (latitude/longitude).
- `ChangeAddressButton` — "WIJZIGEN" action.
- `ConfirmAddressButton` — "BEVESTIGEN".
- `PrimaryButton` — "OPSLAAN".

### Data Required
- Existing business address and coordinates (update mode).

### API Endpoints Required
- `PATCH /api/v1/businesses/:businessId` (update address fields).
- `PATCH /api/v1/businesses/:businessId/location` (update GPS coordinates).

### Database Entities Required
- `businesses`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Owner must own the business. Shoproutes or Workshop plan required.

### Subscription Requirement
- Shoproutes or higher. Backend returns 403 if Webshop-only.

### Loading State
- Map loads asynchronously; spinner until tiles render.

### Empty State
- Map defaults to Netherlands center if no coordinates set.

### Error State
- Invalid coordinates (out of bounds): "Ongeldige locatie. Kies een locatie in Nederland."
- Save failure: "Locatie kon niet worden opgeslagen."
- Plan insufficient: "Upgrade naar Shoproutes om op de kaart te verschijnen."

### Mobile Behavior
- Address form above, map widget below. GPS pin drop action.

### Desktop Behavior
- Address form left panel, map right panel (larger view).

### Navigation Destinations
- Save → `/owner/business` with map tab active.
- Cancel → `/owner/business`.

### Dependencies
- `12-GPS-SHOPROUTES.md`.

### Acceptance Criteria
- Coordinates stored as lat/lng decimal in businesses. Validated within NL bounds.
- Plan check enforced by backend.
- Map provider renders correctly with address geocoding.

---

## PAGE 19: Owner Product Orders

| Field | Value |
|---|---|
| **Route** | `/owner/orders` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | View and manage incoming product orders with status metrics and order list. |
| **Figma Reference** | `457:3591`, `476:1357` |
| **Layout** | Mobile: metric cards row, then scrollable order list. Desktop: metrics at top, table/list below with status filter tabs. |

### Components
- `OrderMetricCard` — Orders Processing, Order Completed, On the way, Cancelled Orders, New Orders.
- `OrderListTable` — order number, consumer, date, items, total, status, actions.
- `OrderStatusFilter` — tabs or dropdown for PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED.
- `OrderDetailModal` — order items with snapshots, delivery address, consumer contact, status update action.
- `StatusUpdateButton` — advances order to next valid state.

### Data Required
- Orders for owned business: order_number, status, created_at, total_cents, consumer name, items count.
- Status event history.
- Metric counts per status.

### API Endpoints Required
- `GET /api/v1/orders?businessId=:id&status=&page=&limit=`.
- `GET /api/v1/orders/:orderId`.
- `PATCH /api/v1/orders/:orderId/status`.
- `POST /api/v1/orders/:orderId/cancel`.

### Database Entities Required
- `orders`, `order_items`, `order_status_events`, `consumer_profiles`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Owner sees only orders for their own business. Backend validates ownership on every request.

### Subscription Requirement
- Webshop or higher.

### Loading State
- Skeleton metric cards. Skeleton order rows.

### Empty State
- "Je hebt nog geen bestellingen ontvangen."

### Error State
- Status transition invalid: "Deze statuswijziging is niet toegestaan."
- Order already terminal: "Deze bestelling is al afgerond."

### Mobile Behavior
- Horizontal-scrollable metric cards. Order list below. Tap order → full-screen detail.

### Desktop Behavior
- Metric cards in 5-column row. Order table with sorting and status filter tabs.

### Navigation Destinations
- Order detail modal/panel → status update actions.
- Back → `/owner/business`.

### Dependencies
- `11-COMMERCE-SPEC.md` order lifecycle, `08-AUTH-RBAC.md`.

### Acceptance Criteria
- Only allowed status transitions offered in UI. Backend enforces transition rules.
- Delivery address shown in detail from snapshot, not live consumer data.
- Metric counts match actual order states.

---

## PAGE 20: Owner Workshop Bookings

| Field | Value |
|---|---|
| **Route** | `/owner/workshop-bookings` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | View ticket/booking metrics and list of workshop bookings for owned workshops. |
| **Figma Reference** | `459:915`, `476:1427` |
| **Layout** | Mobile: metric cards, then booking list. Desktop: metrics row, booking table. |

### Components
- `WorkshopBookingMetricCard` — Purchased Tickets, Cancelled Tickets, New Tickets Purchased.
- `BookingListTable` — booking ID, workshop name, consumer, quantity, amount, status, date.
- `BookingStatusFilter`.
- `BookingDetailPanel`.

### Data Required
- Workshop bookings for owned workshops: booking_id, workshop_title, consumer name, quantity, amount, status, created_at.

### API Endpoints Required
- `GET /api/v1/businesses/:businessId/workshop-bookings?page=&limit=&status=`.
- `GET /api/v1/workshop-bookings/:bookingId`.
- `PATCH /api/v1/workshop-bookings/:bookingId/status`.

### Database Entities Required
- `workshop_bookings`, `workshops`, `consumer_profiles`, `payments`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Owner sees only bookings for their own workshops.

### Subscription Requirement
- Workshop plan.

### Loading State
- Skeleton metric cards and booking rows.

### Empty State
- "Er zijn nog geen ticketverkopen."

### Error State
- Data load failure: "Boekingen konden niet worden geladen."

### Mobile Behavior
- Metric cards scrollable horizontally. Booking list below.

### Desktop Behavior
- Metric cards in 3-column grid. Booking table below.

### Navigation Destinations
- Workshop name link → `/workshops/[workshopId]`.
- Back → `/owner/business`.

### Dependencies
- `13-WORKSHOP-SPEC.md`, `10-PAYMENT-SPEC.md`.

### Acceptance Criteria
- Metric counts accurate. Cancelled bookings do not inflate Purchased Tickets count.

---

## PAGE 21: Owner Payouts / Earnings

| Field | Value |
|---|---|
| **Route** | `/owner/payouts` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | View business earnings ledger, available balance, payout history, and request withdrawals. Configure payout account. |
| **Figma Reference** | `[NOT VERIFIED — requirements + design system only]` |
| **Layout** | Mobile: balance card, payout history list, request payout CTA. Desktop: two-column layout with ledger table. |

### Components
- `BalanceSummaryCard` — available balance (EUR), pending balance.
- `PayoutAccountForm` — account holder name, IBAN (masked), provider selection.
- `RequestPayoutButton` — amount input, submit withdrawal request.
- `PayoutHistoryTable` — payout_id, amount, status badge (PENDING/APPROVED/REJECTED/PAID), requested_at, approved_at.
- `LedgerEntryList` — credits from orders/workshops, debits from payouts.

### Data Required
- Business ledger entries: type, amount, available_at, created_at.
- Available balance (sum of eligible ledger entries minus pending payouts).
- Payout history.
- Payout account configuration.

### API Endpoints Required
- `GET /api/v1/businesses/:businessId/ledger`.
- `GET /api/v1/businesses/:businessId/payouts`.
- `POST /api/v1/businesses/:businessId/payouts` (withdrawal request).
- `POST /api/v1/businesses/:businessId/payout-account`.

### Database Entities Required
- `business_ledger_entries`, `payouts`, `payout_accounts`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Owner accesses only own business ledger. Cannot approve own payouts (admin-only).

### Subscription Requirement
- N/A for viewing ledger. Active subscription for business to have sales.

### Loading State
- Balance card skeleton. Table skeleton.

### Empty State
- Ledger empty: "Nog geen transacties."
- Payouts empty: "Nog geen uitbetalingen aangevraagd."

### Error State
- Insufficient balance: "Onvoldoende saldo om een uitbetaling aan te vragen."
- Duplicate pending payout: "Er loopt al een uitbetalingsverzoek."
- Payout account not configured: "Configureer je uitbetalingsrekening eerst."

### Mobile Behavior
- Balance card full-width at top. Request payout button below. Payout history scrollable.

### Desktop Behavior
- Balance + request widget left. Ledger and payout history table right.

### Navigation Destinations
- Back → `/owner/business`.
- Payout status updated by admin → reflected in payout history.

### Dependencies
- `10-PAYMENT-SPEC.md`, `17-PAYMENT-SPEC.md` payout section.

### Acceptance Criteria
- Balance calculated server-side only; frontend never sets payout amount without validation.
- Business owners cannot approve their own payouts.
- Pending payout blocks new withdrawal request.

---

## PAGE 22: Owner Subscription Management

| Field | Value |
|---|---|
| **Route** | `/owner/subscription` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | View current subscription plan, status, and renewal details. Change or cancel subscription. |
| **Figma Reference** | `476:1855`, `476:1955`, `476:2055`, `383:2237`, `476:3466` (selection screens) |
| **Layout** | Mobile: plan card, status info, action buttons. Desktop: plan card grid with current plan highlighted. |

### Components
- `CurrentPlanCard` — plan name, price, status, period end, auto-renew indicator.
- `PlanSelectionCards` — Webshop/Shoproutes/Workshop with feature comparison (Figma card style).
- `ChangePlanButton`.
- `CancelSubscriptionButton` — confirm modal.
- `RenewalInfo` — next billing date.

### Data Required
- Current subscription: plan name, status, current_period_end, cancel_at_period_end, auto_renew.
- All active subscription plans with prices and features.

### API Endpoints Required
- `GET /api/v1/businesses/:businessId/subscription`.
- `GET /api/v1/subscription-plans`.
- `POST /api/v1/businesses/:businessId/subscriptions/checkout` (change plan).
- `POST /api/v1/businesses/:businessId/subscription/cancel`.

### Database Entities Required
- `business_subscriptions`, `subscription_plans`, `payments`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Owner manages only own subscription.

### Subscription Requirement
- N/A (this manages the subscription itself).

### Loading State
- Plan card skeleton.

### Empty State
- No active subscription: "Je hebt nog geen actief abonnement." with plan selection CTA.

### Error State
- Checkout failure: "Betaling mislukt. Probeer het opnieuw."
- Cancellation failure: "Abonnement annuleren mislukt."

### Mobile Behavior
- Current plan card at top. Scrollable plan options below. Action buttons at bottom.

### Desktop Behavior
- Plan cards side by side (3 columns). Current plan highlighted. Actions at top right.

### Navigation Destinations
- Change plan → checkout flow `/onboarding/subscription/payment`.
- Cancel → confirmation modal → stay on page with updated status.

### Dependencies
- `09-SUBSCRIPTION-SPEC.md`, `10-PAYMENT-SPEC.md`.

### Acceptance Criteria
- Subscription status from webhook, not only from frontend payment redirect.
- Cancel sets cancel_at_period_end = true; features remain until period end.
- Plan upgrade/downgrade confirmed through provider webhook.

---

# SECTION 5 — ADMIN PAGES

---

## PAGE 23: Admin Overview / Dashboard

| Field | Value |
|---|---|
| **Route** | `/admin` |
| **User Role** | SUPER_ADMIN |
| **Purpose** | Platform-level metrics overview: users, businesses, subscriptions, orders, revenue, pending payouts, reported content, failed webhooks. |
| **Figma Reference** | `[NOT VERIFIED — requirements + design system only]` |
| **Layout** | Desktop-first: sidebar navigation + metric card grid + recent activity table. Mobile: functional but secondary. |

### Components
- `AdminSidebar` — nav: Overview, Users, Businesses, Products, Orders, Reviews, Reports, Payments, Payouts, Subscription Plans, Categories, Audit Logs.
- `MetricCard` — icon, label, count/value. Cards: Total Users, Active Businesses, Active Subscriptions, Total Orders, Revenue (EUR), Pending Payouts, Open Reports, Failed Webhooks.
- `RecentActivityTable` — latest orders, new business registrations, payout requests.

### Data Required
- Aggregate counts from all major entities.

### API Endpoints Required
- `GET /api/v1/admin/overview`.

### Database Entities Required
- `users`, `businesses`, `business_subscriptions`, `orders`, `payments`, `payouts`, `reports`, `payment_webhook_events`.

### Authentication Requirement
- Required (SUPER_ADMIN).

### Authorization Requirement
- SUPER_ADMIN only. AdminGuard enforced.

### Subscription Requirement
- N/A.

### Loading State
- Skeleton metric cards.

### Empty State
- Metric cards show 0 on fresh platform.

### Error State
- "Dashboard kon niet worden geladen." with retry.

### Mobile Behavior
- Collapsible sidebar. Metric cards in 2-column grid. Tables horizontally scrollable.

### Desktop Behavior
- Fixed sidebar. Metric cards in 4-column grid. Full-width tables.

### Navigation Destinations
- Metric cards → linked admin sections.
- Sidebar links → respective admin pages.

### Dependencies
- `15-ADMIN-SPEC.md`.

### Acceptance Criteria
- SUPER_ADMIN role required; redirect to `/login` for unauthenticated, 403 for unauthorized roles.
- Metrics reflect real database counts.

---

## PAGE 24: Admin User Management

| Field | Value |
|---|---|
| **Route** | `/admin/users` |
| **User Role** | SUPER_ADMIN |
| **Purpose** | View, filter, suspend, and manage all platform users (consumers and business owners). |
| **Figma Reference** | `[NOT VERIFIED — design system only]` |
| **Layout** | Desktop table with filters. Mobile: card list. |

### Components
- `UserFilterBar` — filter by role, status, date range, search by name/email.
- `UserTable` — id, name, email, role, status badge, created_at, actions.
- `UserDetailPanel` — profile, associated business/orders.
- `SuspendButton`, `ReactivateButton`, `ViewProfileButton`.

### Data Required
- Users: id, display_name, email, mobile, role, status, created_at, last_login_at.

### API Endpoints Required
- `GET /api/v1/admin/users?role=&status=&q=&page=&limit=`.
- `PATCH /api/v1/admin/users/:userId` (status change).

### Database Entities Required
- `users`, `consumer_profiles`, `business_owner_profiles`, `audit_logs`.

### Authentication Requirement
- Required (SUPER_ADMIN).

### Authorization Requirement
- Admin only.

### Subscription Requirement
- N/A.

### Loading State
- Table skeleton rows.

### Empty State
- "Geen gebruikers gevonden."

### Error State
- "Gebruikers konden niet worden geladen."

### Mobile Behavior
- Card list. Tap for detail. Actions as bottom sheet.

### Desktop Behavior
- Sortable table. Side panel detail.

### Navigation Destinations
- View business → `/admin/businesses/[businessId]`.
- View orders → `/admin/orders?userId=`.

### Dependencies
- `15-ADMIN-SPEC.md`, `08-AUTH-RBAC.md`.

### Acceptance Criteria
- Suspend logs to audit_logs with actor_user_id and reason. Role changes require explicit confirmation.

---

## PAGE 25: Admin Business Management

| Field | Value |
|---|---|
| **Route** | `/admin/businesses` |
| **User Role** | SUPER_ADMIN |
| **Purpose** | View, approve, disable, and manage all business profiles including subscription and KVK details. |
| **Figma Reference** | `[NOT VERIFIED — design system only]` |
| **Layout** | Desktop table + detail panel. |

### Components
- `BusinessFilterBar` — filter by status, category, city, subscription plan.
- `BusinessTable` — name, owner, KVK, city, subscription plan/status, business_status, created_at, actions.
- `BusinessDetailPanel` — full profile, subscription history, product/order/review counts.
- `ApproveButton`, `DisableButton`, `SuspendButton`.

### Data Required
- Businesses: id, name, owner, kvk_number, status, subscription plan, city, created_at.

### API Endpoints Required
- `GET /api/v1/admin/businesses?status=&category=&city=&page=&limit=`.
- `PATCH /api/v1/admin/businesses/:businessId/status`.

### Database Entities Required
- `businesses`, `business_owner_profiles`, `business_subscriptions`, `audit_logs`.

### Authentication Requirement
- Required (SUPER_ADMIN).

### Authorization Requirement
- Admin only.

### Subscription Requirement
- N/A.

### Loading State
- Table skeleton.

### Empty State
- "Geen bedrijven gevonden."

### Error State
- Status update failure: inline error.

### Mobile Behavior
- Card list with status badges.

### Desktop Behavior
- Table with sortable columns. Status change with confirmation dialog.

### Navigation Destinations
- View owner → `/admin/users/[userId]`.
- View products → `/admin/products?businessId=`.

### Dependencies
- `15-ADMIN-SPEC.md`.

### Acceptance Criteria
- Status change logged to audit_logs. Disabled businesses disappear from public discovery immediately.

---

## PAGE 26: Admin Payments

| Field | Value |
|---|---|
| **Route** | `/admin/payments` |
| **User Role** | SUPER_ADMIN |
| **Purpose** | View all payment records (subscription payments and consumer product/workshop payments) separated by purpose. |
| **Figma Reference** | `[NOT VERIFIED — design system only]` |
| **Layout** | Desktop table with tabs: Subscription Payments | Order Payments | Workshop Payments. |

### Components
- `PaymentPurposeTabs`.
- `PaymentTable` — payment_id, purpose, provider, amount_cents (EUR), method, status, paid_at, user/business link.
- `PaymentDetailPanel` — provider_payment_id, checkout_url, timestamps, linked order/subscription.
- `WebhookEventLog` — provider_event_id, event_type, processed status.

### Data Required
- Payments: all fields. Webhook events for failed/unprocessed events.

### API Endpoints Required
- `GET /api/v1/admin/payments?purpose=&status=&provider=&page=&limit=`.

### Database Entities Required
- `payments`, `payment_webhook_events`, `orders`, `business_subscriptions`.

### Authentication Requirement
- Required (SUPER_ADMIN).

### Authorization Requirement
- Admin only.

### Subscription Requirement
- N/A.

### Loading State
- Table skeleton.

### Empty State
- "Geen betalingen gevonden."

### Error State
- "Betalingen konden niet worden geladen."

### Mobile Behavior
- Tab-filtered card list.

### Desktop Behavior
- Tab-filtered table with side detail panel.

### Navigation Destinations
- Order link → `/admin/orders/[orderId]`.
- Business link → `/admin/businesses/[businessId]`.

### Dependencies
- `10-PAYMENT-SPEC.md`, `15-ADMIN-SPEC.md`.

### Acceptance Criteria
- Subscription and product payment revenue never mixed in same view. Provider payment ID shown but no card data.

---

## PAGE 27: Admin Payouts

| Field | Value |
|---|---|
| **Route** | `/admin/payouts` |
| **User Role** | SUPER_ADMIN |
| **Purpose** | View, approve, reject, and mark paid all business withdrawal/payout requests. |
| **Figma Reference** | `[NOT VERIFIED — design system only]` |
| **Layout** | Desktop table with filter tabs: Pending | Approved | Rejected | Paid. |

### Components
- `PayoutFilterTabs`.
- `PayoutTable` — payout_id, business_name, amount, status, requested_at, approved_at, paid_at.
- `PayoutDetailPanel` — business ledger, payout account info (masked IBAN), action buttons.
- `ApprovePayoutButton`, `RejectPayoutButton`, `MarkPaidButton`.
- `RejectReasonModal` — required reason input.

### Data Required
- Payouts: all fields. Business available balance.

### API Endpoints Required
- `GET /api/v1/admin/payouts?status=&page=&limit=`.
- `POST /api/v1/admin/payouts/:payoutId/approve`.
- `POST /api/v1/admin/payouts/:payoutId/reject`.
- `POST /api/v1/admin/payouts/:payoutId/mark-paid`.
- `GET /api/v1/businesses/:businessId/ledger`.

### Database Entities Required
- `payouts`, `payout_accounts`, `business_ledger_entries`, `audit_logs`.

### Authentication Requirement
- Required (SUPER_ADMIN).

### Authorization Requirement
- Admin only. Business owners cannot access this page.

### Subscription Requirement
- N/A.

### Loading State
- Table skeleton.

### Empty State
- "Geen uitbetalingsverzoeken gevonden."

### Error State
- Approve/reject failure: inline error with retry.

### Mobile Behavior
- Card list with approve/reject actions as swipe or bottom sheet.

### Desktop Behavior
- Table with filter tabs. Approve/reject in side detail panel.

### Navigation Destinations
- Business link → `/admin/businesses/[businessId]`.

### Dependencies
- `10-PAYMENT-SPEC.md`, `15-ADMIN-SPEC.md`.

### Acceptance Criteria
- Approve/reject logged to audit_logs with approved_by_user_id. Business owners cannot approve own payouts (enforced by backend).

---

# SECTION 6 — PAYMENT / ONBOARDING PAGES

---

## PAGE 28: Business Onboarding — Store Info

| Field | Value |
|---|---|
| **Route** | `/onboarding/business` |
| **User Role** | BUSINESS_OWNER (onboarding state) |
| **Purpose** | Collect business profile information: store name, address, GPS, phone, KVK, and description. |
| **Figma Reference** | `476:2534`, `476:3053`, `454:1431` |
| **Layout** | Mobile: single-column form with NEXT CTA. Desktop: centered card form 640px max. |

### Components
- `ProfileImageUploader` — business logo.
- `FormField` — Store Name, State, City, Street, Phone Number, KVK Number, Shop Description.
- `ShopTypeSelect` — business category selector.
- `GPSLocationPicker` — map widget for exact coordinates.
- `PrimaryButton` — "NEXT".
- `SecondaryButton` — "PREVIOUS" (if multi-step flow).

### Data Required
- Business categories (database-driven).

### API Endpoints Required
- `POST /api/v1/businesses` — create business profile.
- `GET /api/v1/business-categories`.
- `POST /api/v1/media/upload-url`.
- `POST /api/v1/media/complete`.

### Database Entities Required
- `businesses`, `business_owner_profiles`, `business_categories`, `media_assets`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Backend validates user has BUSINESS_OWNER role and is in onboarding state.

### Subscription Requirement
- N/A (onboarding precedes subscription).

### Loading State
- Form field skeletons while categories load.

### Empty State
- N/A.

### Error State
- KVK invalid format: "Voer een geldig KVK-nummer in."
- Phone invalid: "Voer een geldig telefoonnummer in."
- Address incomplete: per-field validation errors.
- GPS not set: "Stel de locatie van je winkel in."

### Mobile Behavior
- Stacked full-width form. Map picker below address fields. Sticky NEXT button.

### Desktop Behavior
- Two-column: image upload + map left, form fields right.

### Navigation Destinations
- NEXT (after success) → `/onboarding/subscription`.
- PREVIOUS → `/signup`.

### Dependencies
- `PROMPT.md` section 11, `01-PROJECT-REQUIREMENTS.md`.

### Acceptance Criteria
- All required fields validated on frontend and backend.
- GPS coordinates stored as lat/lng decimal.
- Business created in DRAFT status; becomes ACTIVE after admin approval or subscription payment depending policy.

---

## PAGE 29: Subscription Selection

| Field | Value |
|---|---|
| **Route** | `/onboarding/subscription` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | Select a subscription plan: Webshop (€50/m), Shoproutes (€100/m), or Workshop (€150/m). |
| **Figma Reference** | `476:1855`, `476:1955`, `476:2055`, `383:2237`, `476:3466`, `383:2792`, `383:2877`, `383:2962`, `476:3865`, `491:1353` |
| **Layout** | Mobile: vertically stacked plan cards, NEXT/PREVIOUS buttons. Desktop: three-column plan cards. |

### Components
- `PlanCard` — plan name, monthly price (EUR), feature list, selection indicator.
- `PrimaryButton` — "NEXT".
- `SecondaryButton` — "PREVIOUS".
- `FeatureComparisonTable` (desktop).

### Data Required
- Subscription plans: name, slug, monthly_price_cents, currency, features, active.

### API Endpoints Required
- `GET /api/v1/subscription-plans`.

### Database Entities Required
- `subscription_plans`.

### Authentication Requirement
- Required (BUSINESS_OWNER, onboarding state).

### Authorization Requirement
- Backend validates owner and active business context.

### Subscription Requirement
- N/A (this creates the subscription).

### Loading State
- Skeleton plan cards.

### Empty State
- N/A.

### Error State
- Plans load failure: "Abonnementen konden niet worden geladen."

### Mobile Behavior
- Stacked plan cards with radio-style selection. Scrollable. Sticky NEXT at bottom.

### Desktop Behavior
- Three-column plan cards. Selected plan highlighted. NEXT below.

### Navigation Destinations
- NEXT → `/onboarding/subscription/payment`.
- PREVIOUS → `/onboarding/business`.

### Dependencies
- `09-SUBSCRIPTION-SPEC.md`, `02-FIGMA-DESIGN-SPEC.md`.

### Acceptance Criteria
- Prices are database-driven. Hard-coded prices are not acceptable.
- Plan selection is stored in session; confirmed after payment webhook.
- Visual card matches Figma: white surface, pink highlight for selected plan.

---

## PAGE 30: Subscription Payment

| Field | Value |
|---|---|
| **Route** | `/onboarding/subscription/payment` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | Review subscription plan and pay using iDEAL, PayPal, or Tikkie to activate the subscription. |
| **Figma Reference** | `476:2156`, `476:2326`, `405:710`, `409:1004`, `478:4284` |
| **Layout** | Mobile: plan summary card, total, payment method selector, NEXT/PREVIOUS. Desktop: centered two-column: summary left, payment right. |

### Components
- `PlanSummaryCard` — selected plan name, price, billing cycle.
- `TotalPaymentDisplay` — EUR amount.
- `PaymentMethodSelector` — iDEAL, PayPal, Tikkie (radio or card selector).
- `ProviderRedirectNote` — "Je wordt doorgestuurd naar de betaalpagina."
- `PrimaryButton` — "NEXT" / "BETALEN".
- `SecondaryButton` — "PREVIOUS".
- `CardFormFields` — Card Number, Card Holder, Valid Until, CVV (if provider requires; no local storage).

### Data Required
- Selected plan (from previous step).
- Provider checkout URL (from backend).

### API Endpoints Required
- `POST /api/v1/businesses/:businessId/subscriptions/checkout` — creates provider checkout session; returns checkout_url.
- `POST /api/v1/webhooks/payments/subscriptions` — provider webhook (backend-side; not called by frontend).

### Database Entities Required
- `business_subscriptions`, `payments`, `payment_webhook_events`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Backend verifies business ownership and that no duplicate active subscription exists.

### Subscription Requirement
- N/A.

### Loading State
- Spinner while checkout URL is created.

### Empty State
- N/A.

### Error State
- Payment session creation failure: "Betaling kon niet worden gestart. Probeer het opnieuw."
- Payment failed (on return from provider): "Betaling mislukt. Selecteer een andere betaalmethode."
- Payment expired: "Je betaalsessie is verlopen. Begin opnieuw."

### Mobile Behavior
- Summary at top, payment method selector below, NEXT sticky at bottom.

### Desktop Behavior
- Summary left panel, payment form right panel.

### Navigation Destinations
- Payment success webhook → subscription activated → redirect to `/onboarding/success`.
- Payment failure → stay on page with error.
- PREVIOUS → `/onboarding/subscription`.

### Dependencies
- `10-PAYMENT-SPEC.md`, `09-SUBSCRIPTION-SPEC.md`.

### Acceptance Criteria
- Backend creates payment session. Frontend never sets or sends total amount.
- Subscription ACTIVE status set only after webhook confirmation, never on frontend redirect alone.
- Sensitive card data never stored; provider handles card processing.

---

## PAGE 31: Onboarding Success

| Field | Value |
|---|---|
| **Route** | `/onboarding/success` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | Confirm successful shop creation and subscription activation. Direct owner to their dashboard. |
| **Figma Reference** | `476:2269`, `453:1248` |
| **Layout** | Mobile: centered success screen with illustration. Desktop: centered card. |

### Components
- `SuccessIllustration` — brand success visual.
- `HeadingBlock` — "Shop Created Successfully".
- `PrimaryButton` — "GO TO MY SHOP".

### Data Required
- Business name (from session context).

### API Endpoints Required
- `GET /api/v1/auth/me` — confirm active session and subscription status.

### Database Entities Required
- `businesses`, `business_subscriptions`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- N/A.

### Subscription Requirement
- Active subscription expected (confirmed before redirecting here).

### Loading State
- None; static success screen.

### Empty State
- N/A.

### Error State
- If subscription not yet active (webhook delayed): "Je abonnement wordt verwerkt. Je ontvangt een e-mail wanneer het actief is." with manual refresh.

### Mobile Behavior
- Full-screen success layout.

### Desktop Behavior
- Centered card with illustration.

### Navigation Destinations
- "GO TO MY SHOP" → `/owner/business`.

### Dependencies
- `10-PAYMENT-SPEC.md`, `09-SUBSCRIPTION-SPEC.md`.

### Acceptance Criteria
- Page only reachable after subscription payment flow. Direct URL access redirects to `/owner` if subscription is already active.

---

# SECTION 7 — ORDER PAGES (CONSUMER)

---

## PAGE 32: Cart

| Field | Value |
|---|---|
| **Route** | `/cart` |
| **User Role** | CONSUMER |
| **Purpose** | Review items in cart, adjust quantities, remove items, and proceed to checkout. |
| **Figma Reference** | `[NOT VERIFIED — design system only; no consumer cart frame verified in Figma]` |
| **Layout** | Mobile: item list + order summary CTA. Desktop: two-column: items left, summary right. |

### Components
- `CartItemCard` — product image, name, selected variant (size/color), unit price (EUR), quantity stepper, remove button.
- `CartSummary` — subtotal, delivery fee placeholder, total.
- `EmptyCartIllustration`.
- `CheckoutButton` — "Afrekenen".
- `BusinessNameLabel` — indicates cart belongs to one business.
- `OutOfStockWarning` — if item stock dropped since adding.

### Data Required
- Cart items: product name, image, variant (size/color), unit_price_cents, quantity, stock_quantity.
- Business name for cart context.

### API Endpoints Required
- `GET /api/v1/cart`.
- `PATCH /api/v1/cart/items/:itemId` (quantity).
- `DELETE /api/v1/cart/items/:itemId`.

### Database Entities Required
- `carts`, `cart_items`, `products`, `product_variants`, `businesses`.

### Authentication Requirement
- Required (CONSUMER).

### Authorization Requirement
- Consumer accesses only own cart.

### Subscription Requirement
- Business must have Webshop or higher (validated at checkout, not cart view).

### Loading State
- Skeleton cart item rows.

### Empty State
- "Je winkelwagen is leeg." with link to `/products`.

### Error State
- Item no longer available: "Dit product is niet meer beschikbaar." with remove prompt.
- Cart load failure: "Winkelwagen kon niet worden geladen."

### Mobile Behavior
- Full-width item cards. Sticky checkout button above bottom nav.

### Desktop Behavior
- Item list left, order summary card right with sticky positioning.

### Navigation Destinations
- Checkout button → `/checkout`.
- Product link → `/products/[productId]`.
- Continue shopping → `/products`.

### Dependencies
- `11-COMMERCE-SPEC.md`.

### Acceptance Criteria
- Quantity updates recalculate totals server-side. Totals displayed from backend response.
- Out-of-stock items flagged before checkout.

---

## PAGE 33: Checkout

| Field | Value |
|---|---|
| **Route** | `/checkout` |
| **User Role** | CONSUMER |
| **Purpose** | Select delivery address, choose payment method, and place order. |
| **Figma Reference** | `[NOT VERIFIED — design system only]` |
| **Layout** | Mobile: step-by-step flow (address → payment). Desktop: two-column: details left, summary right. |

### Components
- `DeliveryAddressSelector` — select existing or add new address.
- `AddressFormInline` — add new address inline if none saved.
- `OrderSummaryCard` — items, quantities, subtotal, delivery fee, total (EUR).
- `PaymentMethodSelector` — iDEAL, PayPal, Tikkie.
- `PlaceOrderButton` — "Bestelling plaatsen".

### Data Required
- Cart summary (from server).
- Consumer addresses.
- Business name and logo.

### API Endpoints Required
- `GET /api/v1/cart`.
- `GET /api/v1/addresses`.
- `POST /api/v1/orders` — creates pending order from cart.
- `POST /api/v1/payments/orders/:orderId/checkout` — creates payment session.

### Database Entities Required
- `carts`, `cart_items`, `orders`, `order_items`, `payments`, `consumer_addresses`.

### Authentication Requirement
- Required (CONSUMER).

### Authorization Requirement
- Backend validates cart ownership, product availability, stock, and business subscription.

### Subscription Requirement
- Business must have active Webshop or higher.

### Loading State
- Address list skeleton. Order summary skeleton.

### Empty State
- Empty cart → redirect to `/cart`.

### Error State
- Insufficient stock: "Onvoldoende voorraad voor: [product name]."
- Address required: "Selecteer een bezorgadres."
- Payment session failure: "Betaling kon niet worden gestart."
- Business subscription inactive: "Dit bedrijf verkoopt momenteel niet via Local Spotter."

### Mobile Behavior
- Step flow with sticky "Bestelling plaatsen" button. Address modal as bottom sheet.

### Desktop Behavior
- One-page layout. Address section left column. Summary + place order right column.

### Navigation Destinations
- Payment redirect → provider checkout page.
- Back → `/cart`.
- Success (webhook confirmed) → `/checkout/success`.

### Dependencies
- `11-COMMERCE-SPEC.md`, `10-PAYMENT-SPEC.md`.

### Acceptance Criteria
- Order total computed server-side only. Frontend cannot manipulate amount.
- Stock decremented transactionally only after webhook confirms payment.
- Price snapshot stored in order_items at creation time.

---

## PAGE 34: Checkout Success / Order Confirmation

| Field | Value |
|---|---|
| **Route** | `/checkout/success` |
| **User Role** | CONSUMER |
| **Purpose** | Confirm successful order placement and payment. Show order number and next steps. |
| **Figma Reference** | `[NOT VERIFIED — design system only]` |
| **Layout** | Mobile/Desktop: centered success card. |

### Components
- `SuccessIllustration`.
- `OrderConfirmationBlock` — order number, business name, estimated note.
- `ViewOrderButton` — "Bekijk je bestelling".
- `ContinueShoppingButton` — secondary.

### Data Required
- Order number from URL param or session.

### API Endpoints Required
- `GET /api/v1/orders/:orderId`.

### Database Entities Required
- `orders`.

### Authentication Requirement
- Required (CONSUMER).

### Authorization Requirement
- Consumer can only view own order.

### Subscription Requirement
- N/A.

### Loading State
- Spinner while order details load.

### Empty State
- N/A.

### Error State
- Order ID invalid: redirect to `/account/orders`.

### Mobile Behavior
- Full-screen centered success message.

### Desktop Behavior
- Centered card max-width 480px.

### Navigation Destinations
- View order → `/account/orders/[orderId]`.
- Continue shopping → `/products`.

### Dependencies
- `11-COMMERCE-SPEC.md`.

### Acceptance Criteria
- Order status must be CONFIRMED (webhook confirmed) to show success. PENDING shows pending message instead.

---

# SECTION 8 — SHOP ROUTES

---

## PAGE 35: Shoproutes Listing

| Field | Value |
|---|---|
| **Route** | `/shoproutes` |
| **User Role** | PUBLIC |
| **Purpose** | Discover published shop routes. Search and filter by city or category. |
| **Figma Reference** | `193:261`, `193:1061`, `632:1367` |
| **Layout** | Mobile: search/filter, shoproute cards list. Desktop: filter sidebar + card grid. |

### Components
- `SearchBar` — "In welke stad ga je winkelen?".
- `CityFilter` — Amsterdam, Rotterdam, Delft, Leiden, Gouda, Arnhem, Nijmegen, Groningen, Meppel, Leeuwarden.
- `CategoryFilter`.
- `ShoprouteCard` — route title, city, shop count, cover image, "Start de shoproute" button.
- `CategoryModal` — `632:1367`.
- `BottomNav` (mobile).

### Data Required
- Shop routes: title, description, city, stop count, status=PUBLISHED.
- Cities and categories for filters.

### API Endpoints Required
- `GET /api/v1/shop-routes?city=&category=&status=PUBLISHED&page=&limit=`.
- `GET /api/v1/business-categories`.

### Database Entities Required
- `shop_routes`, `shop_route_stops`, `businesses`.

### Authentication Requirement
- Not required.

### Authorization Requirement
- Only PUBLISHED routes returned. Stops must reference businesses with Shoproutes or Workshop plan.

### Subscription Requirement
- Businesses in routes must have Shoproutes or higher.

### Loading State
- Skeleton route cards.

### Empty State
- "Er zijn nog geen shoproutes in deze stad. Probeer een andere stad."

### Error State
- "Shoproutes konden niet worden geladen."

### Mobile Behavior
- City filter as bottom sheet modal. Route cards single-column.

### Desktop Behavior
- Filter sidebar. Route cards in 3-column grid.

### Navigation Destinations
- Route card → `/shoproutes/[routeId]`.
- "Start de shoproute" → `/shoproutes/[routeId]/map`.

### Dependencies
- `12-GPS-SHOPROUTES.md`.

### Acceptance Criteria
- Only published routes with at least one stop from an active, plan-eligible business shown.

---

## PAGE 36: Shoproute Detail

| Field | Value |
|---|---|
| **Route** | `/shoproutes/[routeId]` |
| **User Role** | PUBLIC |
| **Purpose** | Display a full shop route: description, list of stops with business info, and start route action. |
| **Figma Reference** | `193:551`, `193:621` |
| **Layout** | Mobile: route info card + stop list + map preview. Desktop: map panel right, stop list left. |

### Components
- `RouteHeader` — title, city, stop count, description.
- `RouteStopCard` — sequence number, business name, address, rating, business logo.
- `MapPreview` — static map preview with stop markers.
- `StartRouteButton` — "Start de shoproute" → triggers geolocation and opens map.

### Data Required
- Route: title, description, stop count.
- Route stops: sequence, business name, address, rating, logo, lat/lng.

### API Endpoints Required
- `GET /api/v1/shop-routes/:routeId`.
- `GET /api/v1/shop-routes/:routeId/stops` (with business detail).

### Database Entities Required
- `shop_routes`, `shop_route_stops`, `businesses`.

### Authentication Requirement
- Not required.

### Authorization Requirement
- Route must be PUBLISHED.

### Subscription Requirement
- Each stop business must have Shoproutes or Workshop plan.

### Loading State
- Route header skeleton. Stop card skeletons.

### Empty State
- N/A (route must have stops to be published).

### Error State
- Route not found (404): "Deze route bestaat niet meer."
- No stops: "Deze route heeft nog geen stops."

### Mobile Behavior
- Stop list scrollable. Sticky "Start de shoproute" button at bottom.

### Desktop Behavior
- Stop list left panel. Map right panel. Start route button in header area.

### Navigation Destinations
- "Start de shoproute" → `/shoproutes/[routeId]/map`.
- Business card → `/businesses/[businessId]`.

### Dependencies
- `12-GPS-SHOPROUTES.md`.

### Acceptance Criteria
- Stops listed in correct sequence order. Business subscription validated on backend.

---

## PAGE 37: Shoproute Map / Live Navigation

| Field | Value |
|---|---|
| **Route** | `/shoproutes/[routeId]/map` |
| **User Role** | PUBLIC |
| **Purpose** | Interactive map view of the shoproute with "You are here" marker, shop markers, directions, and stop-by-stop navigation. |
| **Figma Reference** | `193:551`, `193:621` ("You are here", shop card, route markers) |
| **Layout** | Mobile: full-screen map with overlaid shop info card and back button. Desktop: map full main area, stop list sidebar. |

### Components
- `MapRenderer` — provider map tiles (Google Maps / Mapbox / OpenStreetMap).
- `UserLocationMarker` — "You are here" indicator.
- `ShopMarker` — business icon/logo on map per stop.
- `ShopInfoCard` — bottom overlay card: shop name, address, rating, likes.
- `RouteDirectionsOverlay` — drawn route path between stops.
- `GeolocationPromptBanner` — shown if location not yet granted.
- `ManualCityFallback` — shown if location denied.
- `BottomNav` (mobile, behind overlay).

### Data Required
- Route stops with lat/lng coordinates, business name, address, rating.
- Consumer current coordinates (from browser geolocation API, if granted).

### API Endpoints Required
- `GET /api/v1/shop-routes/:routeId`.
- `GET /api/v1/maps/businesses?routeId=` — stop markers.

### Database Entities Required
- `shop_routes`, `shop_route_stops`, `businesses`.

### Authentication Requirement
- Not required.

### Authorization Requirement
- Route must be published.

### Subscription Requirement
- Businesses must have Shoproutes or higher.

### Loading State
- Map tiles loading spinner overlay.

### Empty State
- N/A.

### Error State
- Location denied: "Locatietoegang geweigerd. Gebruik de zoekfunctie om een stad in te voeren."
- Map provider unavailable: "Kaart tijdelijk niet beschikbaar."
- No stops in range: "Geen winkels gevonden op deze route."

### Mobile Behavior
- Full-screen map. Shop info card overlaid at bottom. Back button top left. Geolocation prompt on page open.

### Desktop Behavior
- Large map panel main area. Route stop list sidebar left. Controls in top bar.

### Navigation Destinations
- Shop info card → `/businesses/[businessId]`.
- Back → `/shoproutes/[routeId]`.

### Dependencies
- `12-GPS-SHOPROUTES.md`.

### Acceptance Criteria
- Geolocation requested only on "Start de shoproute" action, not on page load.
- Consumer location not stored server-side.
- Fallback (manual city search) functional when location denied.
- Map provider renders stop markers correctly with business logos where available.

---

# SECTION 9 — WORKSHOPS

---

## PAGE 38: Workshop Listing

| Field | Value |
|---|---|
| **Route** | `/workshops` |
| **User Role** | PUBLIC |
| **Purpose** | Discover published workshops with date/time, category filter, and booking action. |
| **Figma Reference** | `223:1836`, `236:2089`, `632:1540` |
| **Layout** | Mobile: header, search, segmented switch active on Workshops, workshop cards. Desktop: filter sidebar + card grid. |

### Components
- `SearchBar` — "Welke workshop zoek je?".
- `CategoryFilter` — Sieraden, Schoenen, Hoedjes, Interieuritems, Jewelrystores, Make up (and others from database).
- `WorkshopCard` — date block (day/month), time range, image, title, business name, "Buy Ticket" button.
- `CategoryModal` — `632:1540`.
- `BottomNav` (mobile).

### Data Required
- Workshops: title, price, capacity, booked_quantity, start_at, end_at, image, business name, status=PUBLISHED.

### API Endpoints Required
- `GET /api/v1/workshops?status=PUBLISHED&category=&city=&page=&limit=`.
- `GET /api/v1/product-categories` (workshop categories may reuse or be separate).

### Database Entities Required
- `workshops`, `businesses`, `business_subscriptions`.

### Authentication Requirement
- Not required.

### Authorization Requirement
- Only workshops from businesses with active Workshop subscription returned.

### Subscription Requirement
- Business must have Workshop plan.

### Loading State
- Skeleton workshop cards (date block + image skeleton).

### Empty State
- "Geen workshops gevonden. Probeer een andere categorie of stad."

### Error State
- "Workshops konden niet worden geladen."

### Mobile Behavior
- Workshop cards single-column or two-column depending screen width.

### Desktop Behavior
- Filter sidebar + 3-column card grid.

### Navigation Destinations
- Workshop card title → `/workshops/[workshopId]`.
- "Buy Ticket" button → `/workshops/[workshopId]` (detail/book).

### Dependencies
- `13-WORKSHOP-SPEC.md`.

### Acceptance Criteria
- Only workshops with future start_at shown in default listing. Completed/cancelled workshops excluded.

---

## PAGE 39: Workshop Detail and Booking

| Field | Value |
|---|---|
| **Route** | `/workshops/[workshopId]` and `/workshops/[workshopId]/book` |
| **User Role** | PUBLIC (view); CONSUMER (book) |
| **Purpose** | Display full workshop information and allow authenticated consumers to book tickets. |
| **Figma Reference** | `223:1836` (card), `[NOT VERIFIED for detail — design system only]` |
| **Layout** | Mobile: image top, details below, booking form below. Desktop: image left, details and booking form right. |

### Components
- `WorkshopImage`.
- `WorkshopMeta` — title, date/time, location, capacity remaining, price (EUR).
- `BusinessMiniCard` — business name, logo, link.
- `WorkshopDescription`.
- `QuantityInput` — 1 to remaining capacity.
- `TotalPriceDisplay` — quantity × price.
- `BookTicketButton` — "Ticket kopen" (CONSUMER only; redirects to login if unauthenticated).
- `CapacityBadge` — "X plaatsen beschikbaar".
- `SoldOutBadge` — when capacity reached.

### Data Required
- Workshop: title, description, price, capacity, booked_quantity, start_at, end_at, location, image.
- Business: name, logo.

### API Endpoints Required
- `GET /api/v1/workshops/:workshopId`.
- `POST /api/v1/workshops/:workshopId/bookings` (CONSUMER).
- `POST /api/v1/payments/workshop-bookings/:bookingId/checkout`.

### Database Entities Required
- `workshops`, `workshop_bookings`, `businesses`, `business_subscriptions`, `payments`.

### Authentication Requirement
- Not required to view. Required to book.

### Authorization Requirement
- Backend validates: workshop published, business active, business has Workshop plan, future date, capacity >= requested quantity.

### Subscription Requirement
- Business must have Workshop plan.

### Loading State
- Workshop detail skeleton.

### Empty State
- N/A.

### Error State
- Sold out: "Deze workshop is uitverkocht."
- Workshop cancelled: "Deze workshop is geannuleerd."
- Workshop in the past: "De inschrijving voor deze workshop is gesloten."
- Payment failure: "Betaling mislukt."

### Mobile Behavior
- Image full-width at top. Booking form below. Sticky book button above bottom nav.

### Desktop Behavior
- Image left (60%). Booking form right (40%). Reviews below if applicable.

### Navigation Destinations
- "Ticket kopen" unauthenticated → `/login?redirect=/workshops/[workshopId]/book`.
- Payment → provider checkout.
- Success → `/account/orders` or booking confirmation screen.
- Business card → `/businesses/[businessId]`.

### Dependencies
- `13-WORKSHOP-SPEC.md`, `10-PAYMENT-SPEC.md`.

### Acceptance Criteria
- Capacity enforced transactionally; overbooking not possible.
- Booking confirmation only after webhook payment confirmation.
- Sold-out state dynamically reflects remaining capacity.

---

# SECTION 10 — REVIEWS / COMMUNITY

---

## PAGE 40: Product Reviews (on Product Detail)

> Reviews for products are rendered within the Product Detail page (`/products/[productId]`). This section specifies the review-specific implementation for that embedded component.

| Field | Value |
|---|---|
| **Route** | Embedded in `/products/[productId]` (expand or sub-section) |
| **User Role** | PUBLIC (read); CONSUMER with completed order (write) |
| **Purpose** | Display product rating aggregate, review list, review images. Allow eligible consumers to submit reviews. |
| **Figma Reference** | `193:750` (reviews preview block), `14-REVIEW-FOLLOWER-SPEC.md` |
| **Layout** | Mobile: rating summary, review cards, "See all" expand. Desktop: review column below product two-column. |

### Components
- `RatingAggregate` — star average, total count.
- `ReviewCard` — reviewer avatar, name, date, rating stars, title, comment, review images.
- `ReviewImageGrid`.
- `SubmitReviewForm` — rating (1–5 stars), title, comment, image upload (eligibility-gated).
- `SeeAllReviewsButton` — loads paginated reviews.

### Data Required
- Reviews: rating, title, comment, images, consumer display_name, profile_image, created_at.
- Product average_rating, rating_count.
- Consumer eligibility: completed order containing this product.

### API Endpoints Required
- `GET /api/v1/products/:productId/reviews?page=&limit=`.
- `POST /api/v1/reviews` (eligible CONSUMER only).
- `POST /api/v1/reviews/:reviewId/images`.

### Database Entities Required
- `reviews`, `review_images`, `orders`, `order_items`, `products`, `business_subscriptions`.

### Authentication Requirement
- Not required to read. Required to submit.

### Authorization Requirement
- Submit: consumer must have completed order containing the product. Business must have Workshop plan.

### Subscription Requirement
- Business must have Workshop plan for reviews to be enabled.

### Loading State
- Skeleton review cards.

### Empty State
- "Nog geen beoordelingen voor dit product."

### Error State
- Not eligible: "Je kunt dit product alleen beoordelen na een voltooide aankoop."
- Duplicate review: "Je hebt dit product al beoordeeld."
- Image upload failure: "Afbeelding uploaden mislukt."

### Mobile Behavior
- Compact reviews section; "See all" expands inline or navigates to reviews sub-view.

### Desktop Behavior
- Full review list below product two-column layout.

### Navigation Destinations
- Submit review → refreshes review list.

### Dependencies
- `14-REVIEW-FOLLOWER-SPEC.md`, `09-SUBSCRIPTION-SPEC.md`.

### Acceptance Criteria
- Reviews only visible when business has Workshop plan.
- Rating stored 1–5; validated server-side.
- One review per consumer per order-product combination (if policy confirmed).

---

## PAGE 41: Consumer Reviews (Account)

| Field | Value |
|---|---|
| **Route** | `/account/reviews` |
| **User Role** | CONSUMER |
| **Purpose** | View all reviews the consumer has submitted. Link to reviewed products/businesses. |
| **Figma Reference** | `[NOT VERIFIED — design system only]` |
| **Layout** | Mobile: list. Desktop: table in content panel. |

### Components
- `MyReviewCard` — product/business name, rating, date, comment snippet, edit/delete actions.

### Data Required
- Consumer's reviews: target type, target name, rating, comment, created_at, status.

### API Endpoints Required
- `GET /api/v1/reviews?consumerId=me&page=&limit=`.
- `PATCH /api/v1/reviews/:reviewId`.
- `DELETE /api/v1/reviews/:reviewId`.

### Database Entities Required
- `reviews`, `products`, `businesses`, `workshops`.

### Authentication Requirement
- Required (CONSUMER).

### Authorization Requirement
- Consumer sees only own reviews.

### Subscription Requirement
- N/A.

### Loading State
- Skeleton review cards.

### Empty State
- "Je hebt nog geen beoordelingen geschreven."

### Error State
- "Beoordelingen konden niet worden geladen."

### Mobile Behavior
- Single-column list.

### Desktop Behavior
- Content panel review list.

### Navigation Destinations
- Reviewed item link → product or business detail page.

### Dependencies
- `14-REVIEW-FOLLOWER-SPEC.md`.

### Acceptance Criteria
- Deleted review triggers rating aggregate recalculation.

---

# SECTION 11 — PROFILE / SETTINGS

---

## PAGE 42: Business Owner Profile Settings

| Field | Value |
|---|---|
| **Route** | `/owner/settings` |
| **User Role** | BUSINESS_OWNER |
| **Purpose** | Edit owner profile: display name, profile image, phone. Access account settings. |
| **Figma Reference** | `485:1232` (Seller settings — fine details not re-read after connector failure) |
| **Layout** | Mobile: settings menu list. Desktop: sidebar → content panel. |

### Components
- `OwnerProfileForm` — display_name, phone, profile image.
- `AccountSecuritySection` — change password, linked OAuth providers.
- `NotificationPreferences`.
- `LanguageSelector`.
- `LogoutButton`.

### Data Required
- Business owner profile: display_name, phone, profile_image_url.

### API Endpoints Required
- `GET /api/v1/business-owners/me`.
- `PATCH /api/v1/business-owners/me`.
- `POST /api/v1/media/upload-url`.
- `POST /api/v1/media/complete`.
- `POST /api/v1/auth/logout`.

### Database Entities Required
- `business_owner_profiles`, `media_assets`.

### Authentication Requirement
- Required (BUSINESS_OWNER).

### Authorization Requirement
- Owner modifies only own profile.

### Subscription Requirement
- N/A.

### Loading State
- Form skeleton.

### Empty State
- N/A.

### Error State
- Save failure: "Instellingen konden niet worden opgeslagen."

### Mobile Behavior
- Menu list first. Each section as full-screen sub-page.

### Desktop Behavior
- Sidebar + content panel. Active section highlighted in sidebar.

### Navigation Destinations
- Logout → `/`.
- Subscription section → `/owner/subscription`.
- Business profile section → `/owner/business`.

### Dependencies
- `08-AUTH-RBAC.md`.

### Acceptance Criteria
- Profile image upload validates MIME type and size server-side.

---

## PAGE 43: Admin Reviews and Moderation

| Field | Value |
|---|---|
| **Route** | `/admin/reviews` |
| **User Role** | SUPER_ADMIN |
| **Purpose** | View, hide, restore, and reject reviews and comments. Resolve user-submitted reports. |
| **Figma Reference** | `[NOT VERIFIED — design system only]` |
| **Layout** | Desktop-first table with filter tabs: Published | Pending | Hidden | Rejected. |

### Components
- `ReviewModerationTable` — review ID, consumer, business/product, rating, status, created_at, actions.
- `CommentModerationTable` — similar structure.
- `ReportTable` — report ID, reporter, target type/ID, reason, status.
- `HideButton`, `RestoreButton`, `RejectButton`.
- `ModerationReasonInput` — required for reject.

### Data Required
- Reviews: all fields, target info. Comments: all fields. Reports: reason, target.

### API Endpoints Required
- `GET /api/v1/admin/reviews?status=&page=&limit=`.
- `PATCH /api/v1/admin/reviews/:reviewId/moderation`.
- `GET /api/v1/admin/reports?status=&page=&limit=`.
- `PATCH /api/v1/admin/reports/:reportId`.
- `DELETE /api/v1/comments/:commentId` (admin).

### Database Entities Required
- `reviews`, `review_images`, `comments`, `reports`, `audit_logs`.

### Authentication Requirement
- Required (SUPER_ADMIN).

### Authorization Requirement
- Admin only.

### Subscription Requirement
- N/A.

### Loading State
- Table skeleton.

### Empty State
- "Geen beoordelingen gevonden."

### Error State
- Moderation action failure: inline error.

### Mobile Behavior
- Card list (functional). Desktop is the primary target.

### Desktop Behavior
- Tab-filtered table with side detail and action panel.

### Navigation Destinations
- Business link → `/admin/businesses/[businessId]`.
- User link → `/admin/users/[userId]`.

### Dependencies
- `14-REVIEW-FOLLOWER-SPEC.md`, `15-ADMIN-SPEC.md`.

### Acceptance Criteria
- Moderation actions logged to audit_logs. Rating aggregates updated after hide/reject. Restore returns review to published and updates aggregates.

---

## PAGE 44: Admin Subscription Plans

| Field | Value |
|---|---|
| **Route** | `/admin/subscriptions` |
| **User Role** | SUPER_ADMIN |
| **Purpose** | Create, edit, activate, and deactivate subscription plans. Manage plan feature configuration. |
| **Figma Reference** | `[NOT VERIFIED — design system only]` |
| **Layout** | Desktop: plan cards or table + edit form. |

### Components
- `PlanTable` — plan name, slug, price (EUR), features summary, active status, created_at, actions.
- `PlanEditForm` — name, description, monthly_price_cents, currency, feature flags (JSON), active toggle.
- `BreakingChangeWarning` — shown if editing a plan with active subscribers.

### Data Required
- Subscription plans: all fields. Count of active subscribers per plan.

### API Endpoints Required
- `GET /api/v1/admin/subscription-plans`.
- `POST /api/v1/admin/subscription-plans`.
- `PATCH /api/v1/admin/subscription-plans/:planId`.

### Database Entities Required
- `subscription_plans`, `business_subscriptions`.

### Authentication Requirement
- Required (SUPER_ADMIN).

### Authorization Requirement
- Admin only.

### Subscription Requirement
- N/A.

### Loading State
- Table skeleton.

### Empty State
- "Geen abonnementsplannen gevonden."

### Error State
- Breaking change on active plan: "Er zijn actieve abonnees op dit plan. Wijzigingen kunnen gevolgen hebben." with confirmation.

### Mobile Behavior
- Card list functional. Desktop primary.

### Desktop Behavior
- Plan table. Edit form in modal or side panel.

### Navigation Destinations
- Active subscriber count → `/admin/businesses?planId=`.

### Dependencies
- `09-SUBSCRIPTION-SPEC.md`, `15-ADMIN-SPEC.md`.

### Acceptance Criteria
- Price changes logged to audit_logs. Deactivating a plan does not affect existing active subscriptions.

---

# Summary Table

| # | Page | Route | Role | Auth | Subscription |
|---|---|---|---|---|---|
| 1 | Discovery Home | `/` | PUBLIC | No | N/A |
| 2 | Product Listing | `/products` | PUBLIC | No | Webshop+ (business) |
| 3 | Product Detail | `/products/[productId]` | PUBLIC / CONSUMER | View No / Cart Yes | Webshop+ |
| 4 | Business Listing | `/businesses` | PUBLIC | No | N/A |
| 5 | Business Detail | `/businesses/[businessId]` | PUBLIC / CONSUMER | View No / Follow Yes | Plan-gated tabs |
| 6 | Login | `/login` | PUBLIC | No | N/A |
| 7 | Signup | `/signup` | PUBLIC | No | N/A |
| 8 | Forgot Password | `/forgot-password` | PUBLIC | No | N/A |
| 9 | Reset Password | `/reset-password` | PUBLIC | Token | N/A |
| 10 | Consumer Account | `/account` | CONSUMER | Yes | N/A |
| 11 | Consumer Profile Edit | `/account/profile` | CONSUMER | Yes | N/A |
| 12 | Consumer Addresses | `/account/addresses` | CONSUMER | Yes | N/A |
| 13 | Consumer Orders | `/account/orders` | CONSUMER | Yes | N/A |
| 14 | Consumer Following | `/account/following` | CONSUMER | Yes | N/A |
| 15 | Owner Dashboard | `/owner` | BUSINESS_OWNER | Yes | Plan-gated tabs |
| 16 | Add/Edit Product | `/owner/products/new` | BUSINESS_OWNER | Yes | Webshop+ |
| 17 | Add/Edit Workshop | `/owner/workshops/new` | BUSINESS_OWNER | Yes | Workshop |
| 18 | Shoproute Location | `/owner/shoproutes/new` | BUSINESS_OWNER | Yes | Shoproutes+ |
| 19 | Owner Orders | `/owner/orders` | BUSINESS_OWNER | Yes | Webshop+ |
| 20 | Workshop Bookings | `/owner/workshop-bookings` | BUSINESS_OWNER | Yes | Workshop |
| 21 | Owner Payouts | `/owner/payouts` | BUSINESS_OWNER | Yes | N/A |
| 22 | Owner Subscription | `/owner/subscription` | BUSINESS_OWNER | Yes | N/A |
| 23 | Admin Dashboard | `/admin` | SUPER_ADMIN | Yes | N/A |
| 24 | Admin Users | `/admin/users` | SUPER_ADMIN | Yes | N/A |
| 25 | Admin Businesses | `/admin/businesses` | SUPER_ADMIN | Yes | N/A |
| 26 | Admin Payments | `/admin/payments` | SUPER_ADMIN | Yes | N/A |
| 27 | Admin Payouts | `/admin/payouts` | SUPER_ADMIN | Yes | N/A |
| 28 | Onboarding Store Info | `/onboarding/business` | BUSINESS_OWNER | Yes | N/A |
| 29 | Subscription Selection | `/onboarding/subscription` | BUSINESS_OWNER | Yes | N/A |
| 30 | Subscription Payment | `/onboarding/subscription/payment` | BUSINESS_OWNER | Yes | N/A |
| 31 | Onboarding Success | `/onboarding/success` | BUSINESS_OWNER | Yes | N/A |
| 32 | Cart | `/cart` | CONSUMER | Yes | Webshop+ (business) |
| 33 | Checkout | `/checkout` | CONSUMER | Yes | Webshop+ (business) |
| 34 | Checkout Success | `/checkout/success` | CONSUMER | Yes | N/A |
| 35 | Shoproutes Listing | `/shoproutes` | PUBLIC | No | Shoproutes+ (business) |
| 36 | Shoproute Detail | `/shoproutes/[routeId]` | PUBLIC | No | Shoproutes+ (business) |
| 37 | Shoproute Map | `/shoproutes/[routeId]/map` | PUBLIC | No | Shoproutes+ (business) |
| 38 | Workshop Listing | `/workshops` | PUBLIC | No | Workshop (business) |
| 39 | Workshop Detail/Book | `/workshops/[workshopId]` | PUBLIC / CONSUMER | View No / Book Yes | Workshop (business) |
| 40 | Product Reviews (embedded) | `/products/[productId]` (section) | PUBLIC / CONSUMER | Read No / Write Yes | Workshop (business) |
| 41 | My Reviews | `/account/reviews` | CONSUMER | Yes | N/A |
| 42 | Owner Profile Settings | `/owner/settings` | BUSINESS_OWNER | Yes | N/A |
| 43 | Admin Moderation | `/admin/reviews` | SUPER_ADMIN | Yes | N/A |
| 44 | Admin Subscription Plans | `/admin/subscriptions` | SUPER_ADMIN | Yes | N/A |

---

## Unresolved Questions Affecting Page Implementation

The following open questions from the project documentation affect specific pages. Implementation must block or branch on these until decisions are made.

1. **Payment provider** — affects Pages 30, 32, 33, 39: iDEAL/PayPal/Tikkie support, recurring subscription billing, webhook event names.
2. **Map provider** — affects Pages 5, 18, 35, 36, 37: Google Maps vs Mapbox vs OpenStreetMap.
3. **Multi-business cart** — affects Pages 32, 33: one business per cart or multi-business checkout.
4. **Business approval workflow** — affects Pages 23, 25, 28: does admin need to approve a business before it becomes public?
5. **Workshop payment** — affects Pages 38, 39: are workshops always paid, or can bookings be reservation-only?
6. **Review eligibility** — affects Page 40: exact policy for who can submit and when.
7. **Payout rules** — affects Pages 21, 27: holding period, minimum amount, fee.
8. **Admin design** — affects Pages 23–27, 43, 44: admin screens not in Figma; must be reviewed before implementation.
9. **Consumer checkout Figma** — affects Pages 32, 33: no consumer cart/checkout frames verified; requires client review.
10. **XS size** — affects Page 16: client confirmation needed for whether XS is included in clothing sizes.

---

## Dependencies

- [`02-FIGMA-DESIGN-SPEC.md`](./02-FIGMA-DESIGN-SPEC.md) — verified Figma frames.
- [`03-UI-UX-DESIGN-SYSTEM.md`](./03-UI-UX-DESIGN-SYSTEM.md) — design tokens, component sizes, colors.
- [`04-PAGE-SCREEN-SPEC.md`](./04-PAGE-SCREEN-SPEC.md) — route definitions.
- [`05-USER-FLOWS.md`](./05-USER-FLOWS.md) — navigation flows.
- [`06-DATABASE-SCHEMA.md`](./06-DATABASE-SCHEMA.md) — entities and relationships.
- [`07-API-SPEC.md`](./07-API-SPEC.md) — endpoint contracts.
- [`08-AUTH-RBAC.md`](./08-AUTH-RBAC.md) — guards and permission matrix.
- [`09-SUBSCRIPTION-SPEC.md`](./09-SUBSCRIPTION-SPEC.md) — plan feature gates.
- [`10-PAYMENT-SPEC.md`](./10-PAYMENT-SPEC.md) — payment flows.
- [`11-COMMERCE-SPEC.md`](./11-COMMERCE-SPEC.md) — product and order rules.
- [`12-GPS-SHOPROUTES.md`](./12-GPS-SHOPROUTES.md) — location and route spec.
- [`13-WORKSHOP-SPEC.md`](./13-WORKSHOP-SPEC.md) — workshop spec.
- [`14-REVIEW-FOLLOWER-SPEC.md`](./14-REVIEW-FOLLOWER-SPEC.md) — community spec.
- [`15-ADMIN-SPEC.md`](./15-ADMIN-SPEC.md) — admin operations.
- [`17-RESPONSIVE-SPEC.md`](./17-RESPONSIVE-SPEC.md) — responsive behavior.
