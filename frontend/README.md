# LocalSpotter.nl — Frontend Web Application MVP

This is the **Frontend Web Application** for **LocalSpotter.nl MVP**, built according to the approved product specifications, Figma design system, and page implementation map (`docs/22-PAGE-IMPLEMENTATION-MAP.md`).

---

## 🚀 Key Features Implemented

### 1. Public & Consumer Area
- **Discovery Home (`/`)**: Segmented switch (`Producten`, `Workshops`, `Shoproutes`), contextual search bar, popular categories modal, product grid, and local business cards.
- **Product Catalog (`/products`)**: Filterable 2-column mobile / 4-column desktop product grid with EUR pricing, compare-at strike-through, like/view counters, and rating stars.
- **Product Detail (`/products/[id]`)**: Product gallery (up to 3 images), size selector (S, M, L, XL, XXL), color swatch picker, quantity selector, add to cart CTA, and external webshop link.
- **Business Listing (`/businesses`)**: City/category filtered retailer cards.
- **Business Store Profile (`/businesses/[id]`)**: Cover hero, logo, stats row (rating, reviews, followers, products), KVK number, description, follow button, and subscription-gated tabs (`Products`, `Workshops`, `Map`, `Reviews`).
- **Workshops (`/workshops` & `/workshops/[id]`)**: Workshop cards with date badge, time, price, capacity check, and ticket booking UI.
- **Shoproutes (`/shoproutes` & `/shoproutes/[id]`)**: Interactive route map view with user location prompt ("You are here"), numbered route stops, and GPS navigation trigger.

### 2. Auth & Onboarding Area
- **Login (`/login`)**: Email/mobile + password form with Google & Facebook OAuth buttons.
- **Signup (`/signup`)**: Registration form with post-signup **Role Selection Modal** (`Consument` vs `Winkelier`).
- **Forgot & Reset Password (`/forgot-password`, `/reset-password`)**.
- **Business Store Info Onboarding (`/onboarding/business`)**: KVK, phone, address, store type, and description form.
- **Subscription Selection (`/onboarding/subscription`)**: 3 database-driven plan cards (`Webshop €50/mnd`, `Shoproutes €100/mnd`, `Workshop €150/mnd`).
- **Subscription Payment UI (`/onboarding/subscription/payment`)**: Summary breakdown + Dutch payment methods (`iDEAL`, `PayPal`, `Tikkie Zakelijk`). No raw card storage.
- **Onboarding Success (`/onboarding/success`)**: "Shop Created Successfully" confirmation screen.

### 3. Consumer Account Area
- **Account Hub (`/account`)**: Settings menu matching Figma `193:691`.
- **Profile Edit (`/account/profile`)**.
- **Delivery Addresses (`/account/addresses`)**: Address management.
- **Order History (`/account/orders`)**: Snapshot order list with color-coded status badges (`PREPARING`, `DELIVERED`, etc.).
- **Following (`/account/following`)**: Followed shops list.
- **Cart & Checkout (`/cart`, `/checkout`)**.

### 4. Business Owner Area (`/owner`)
- **Dashboard (`/owner`, `/owner/business`)**: Seller profile header, subscription badge, quick action buttons, and status metric cards (`Processing`, `Completed`, `On the way`, `Cancelled`, `New Orders`).
- **Add/Edit Product (`/owner/products/new`)**: Form with **strict 3-image maximum**, price, compare-at, stock, category, sizes, and external URL.
- **Add/Edit Workshop (`/owner/workshops/new`)**: Title, price, capacity, date/time pickers, location, description, and image.
- **Shoproute Location Update (`/owner/shoproutes/location`)**: Address form & map pin location update.
- **Product Orders (`/owner/orders`)**: Metric cards + order management with state transition actions.
- **Workshop Bookings (`/owner/workshop-bookings`)**: Purchased/Cancelled/New ticket metrics + booking list.
- **Payouts & Earnings (`/owner/payouts`)**: Available balance, pending balance, IBAN settings, and withdrawal request CTA.
- **Subscription Management (`/owner/subscription`)**.

### 5. Super Admin Area (`/admin`)
- **Admin Dashboard (`/admin`)**: Platform aggregate metrics.
- **Management Screens**: Users (`/admin/users`), Businesses & KVK Approval (`/admin/businesses`), Product Moderation (`/admin/products`), Orders (`/admin/orders`), Reviews Moderation (`/admin/reviews`), Payments Log (`/admin/payments`), Payout Approvals (`/admin/payouts`), Subscriptions (`/admin/subscriptions`).

---

## 🛠️ Architecture & Backend-Ready Boundary

- **API Boundary Client**: `src/lib/api/index.ts` exposes async methods (`getProducts`, `getBusinesses`, `createProduct`, `bookWorkshop`, `updateOrderStatus`, etc.) backed by typed mock data.
- **Domain Types**: Clean TypeScript models in `src/types/` (`product.ts`, `business.ts`, `order.ts`, `workshop.ts`, `shoproute.ts`, `user.ts`, `subscription.ts`, `review.ts`).
- **Mock Data Layer**: Structured data in `src/data/mock/` representing realistic Dutch local businesses, products, workshops, and shoproutes.
- **Dev Role Toggle**: Interactive banner at the top of the app (`DevRoleBar`) to seamlessly switch between `PUBLIC`, `CONSUMER`, `BUSINESS_OWNER`, and `SUPER_ADMIN` roles during testing.

---

## 🏃 Running Locally

```bash
# Navigate to frontend
cd frontend

# Install dependencies (if not already installed)
npm install --cache D:\npm-cache

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
