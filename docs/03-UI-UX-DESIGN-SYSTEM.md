# Local Spotter UI/UX Design System

## Purpose
This document turns verified Figma styles and reusable patterns into implementation-ready UI guidance. It preserves the Local Spotter visual language and does not redesign the product.

## Confirmed Requirements
- Figma is the visual source of truth.
- Visual direction: pale pink backgrounds/accents, dark navy/black typography, yellow/golden accent, pink secondary typography, rounded modern UI, clean cards, friendly local-business marketplace feel.
- Use Next.js, React, TypeScript, Tailwind CSS, shadcn/ui where appropriate, React Hook Form, Zod, TanStack Query, and Lucide icons when implementing after approval.
- UI must be responsive for desktop, laptop, tablet, and mobile browser, even though only mobile Figma frames are verified.
- UI must be i18n-ready. Dutch Figma text should be preserved where used.

## Verified Color Tokens
Use token names in code rather than hardcoding raw hex everywhere.

| Token | Hex | Source / Usage |
| --- | --- | --- |
| `color.brand.primary` | `#FAE2F0` | Figma paint style `primary color`; headers, tabs, secondary backgrounds. |
| `color.brand.secondary` | `#FA1EFF` | Figma paint style `seconday color`; primary buttons, highlights. |
| `color.input.background` | `#EAEAEA` | Figma paint style `input color`; form fields. |
| `color.background.app` | `#F9F9F9` | Screen background. |
| `color.text.primary` | `#111111` | Figma Grey / 100; primary copy. |
| `color.text.navy` | `#121F3E` | Home indicator, dark UI accents. |
| `color.surface` | `#FFFFFF` | Cards, bottom nav, form panels. |
| `color.like` | `#ED4C5C` | Heart/like counter. |
| `color.rating` | `#D4B011` | Star icon. |
| `color.pink.deep` | `#E482BC` | Nav active/secondary accent. |
| `color.map.teal` | `#54D1CA` | Map/start-route accent. |
| `color.purple.dark` | `#790166` | Workshop/date accent. |
| `color.gray.300` | `#B7B7B7` | Muted icons/text. |
| `color.gray.400` | `#C4C4C4` | Placeholder/disabled. |
| `color.gray.200` | `#DADADA` | Status bar/icon detail. |

## Verified Status Colors
- Product order dashboard uses soft cards with distinct colors:
  - Processing: `#F2D9DE` / `#E54666`.
  - Completed: `#CBF5D5` / `#3B9B52`.
  - On the way: `#F0E9DF` / `#E8A74A`.
  - Cancelled: `#D9DFF2` / `#344DB1`.
  - New orders/tickets: `#E8D1ED` / `#C04BDA`.

## Verified Typography Tokens

| Token | Font | Size | Weight | Line Height | Usage |
| --- | --- | --- | --- | --- | --- |
| `text.h1` | Rubik Medium | 20 | 500 | Auto | Mobile page titles. |
| `text.h2` | Manrope Bold | 16 | 700 | Auto | Prices, card headings, buttons. |
| `text.h3` | Manrope Bold | 14 | 700 | Auto | Form labels, section headings. |
| `text.h4` | Manrope Bold | 13 | 700 | 150% | Product titles. |
| `text.h5` | Rubik Light | 14 | 300 | Auto | Subhead/category text. |
| `text.caption` | Manrope Medium | 12 | 500 | Auto | Metadata, counters, body captions. |
| `text.input` | Manrope Regular | 16 | 400 | Auto | Filled input values. |

Additional observed styles:
- Auth headline: Rubik Medium 60.
- Success headline: Rubik Medium 24.
- Dashboard stat number: Rubik Medium 32.
- Product detail price: Manrope ExtraBold 24.
- Settings item: Manrope ExtraBold 15.
- Tiny counters: Poppins Medium 8.984.
- Map label: Inter Medium 12.
- Color picker labels: Proxima Nova Regular 16 and Bold 12, likely imported from a picker component and not core brand typography.

## Layout Rules From Figma
- Mobile frame width: 428px.
- Common side margin: 16px to 19px.
- Product two-column grid:
  - Column width: 190px.
  - Gap: 16px.
  - Left x: 16px.
  - Right x: 222px.
- Mobile header/banner:
  - Height: 120px.
  - Background: `#FAE2F0`.
  - Bottom-left and bottom-right radius: 20px.
  - Contains status bar, menu icon, logo, profile avatar.
- Bottom nav:
  - Height: 97px.
  - Background: white.
  - Top-left and top-right radius: 20px.
  - Shadow: `0 -3px 6px rgba(0,0,0,0.06)`.
  - Four icons with active dot indicators.
  - Home indicator width: 124px, height: 6px, radius: about 114px.
- Product image radius: 8px.
- Product card image size: 190 x 190.
- Product card total vertical content around 296px.
- Category tab/switch:
  - Width: 394px.
  - Height: 68px.
  - Background: `#F4F5FA`.
  - Active option: pale pink pill.
- Forms:
  - White cards/fields on `#F9F9F9`.
  - Field background uses `#EAEAEA`.
  - Labels use Manrope Bold 14.
  - Filled input text uses Manrope Regular 16.

## Component Specifications

### App Banner
- Use on consumer and seller mobile screens unless a specific screen has a standalone auth header.
- Elements:
  - Status bar at top.
  - Hamburger/menu icon at left.
  - Local Spotter logo centered-left.
  - Circular avatar at right.
- Desktop adaptation: transform into top navigation with logo, primary nav, search/location, and user menu.

### Bottom Navigation
- Verified in consumer screens.
- Four icon slots, active dot under each icon.
- Must map to final destinations after confirmation. Candidate destinations from Figma: products/discovery, shoproutes, profile/settings, more/settings.
- Desktop adaptation: sidebar or top nav depending on route type.

### Segmented Switch
- Labels: Producten, Workshops, Shoproutes.
- Used as primary local discovery mode switch and business profile tab switch.
- Active tab uses pale pink background.
- Must preserve Dutch labels unless localization decision changes.

### Primary Button
- Size: 124 x 48 in Figma.
- Fill: `#FA1EFF`.
- Text: white, Manrope Bold 16.
- Labels observed: NEXT, LOGIN, SIGN UP, CREATE, GO TO MY SHOP.
- Responsive implementation can allow full-width form buttons while preserving height and style.

### Secondary Button
- Size: 124 x 48 in Figma.
- Fill: `#FAE2F0`.
- Text: `#FA1EFF`, Manrope Bold 16.
- Labels observed: PREVIOUS, CHANGE.

### Product Card
- Image 190 x 190, 8px radius, object-cover.
- Overlay at bottom: `rgba(250,226,240,0.5)` with blur.
- Like counter: heart icon and red count.
- Seen counter: eye icon and count.
- Price row: old price struck through, current price bold.
- Title: Manrope Bold 13, 150% line height.
- Rating row: star, score, count.
- Must support real product image fallback and skeleton state.

### Retailer Card
- Business image/avatar.
- Business name.
- Business category.
- Short description.
- Like/follower/product metrics.
- Rating row.
- Click opens business profile.

### Workshop Card
- Date block with month/day.
- Time range.
- Image.
- Title.
- Price or ticket button depending context.
- Capacity and booking state should be added from requirements even where not visible.

### Form Field
- Label above field.
- Field uses input background.
- Rounded rectangle shape.
- Validation errors must use accessible red text and not rely only on border color.
- Required/optional state needs consistent helper text.

### Map Panel
- Figma uses static map-like imagery and gradients.
- Implementation must use a real map provider after provider decision.
- Marker card should preserve Figma shop-card style.
- Browser geolocation permission must be explicit and user-triggered.

## Interaction Requirements
- Product cards navigate to product details.
- Business cards navigate to business profile.
- Search opens/filters category or result views.
- Segmented switch changes discovery/profile content.
- Payment method selection updates checkout state.
- Forms validate on blur and submit.
- Map screens request geolocation only when user initiates route/location action.

## Accessibility Requirements
- All icons must have accessible labels or be hidden when decorative.
- Text contrast must be checked against `#F9F9F9`, `#FAE2F0`, and white surfaces.
- Product images need descriptive alt text from product/business data.
- Buttons and interactive cards need visible focus states.
- Forms must associate labels, errors, and descriptions.
- Touch targets should be at least 44 x 44px.

## States To Add Because Figma Does Not Define Them
- Loading: skeleton product cards, shimmer profile headers, map loading overlay, form submit loading.
- Empty: no products, no workshops, no shop routes, no followers, no reviews, no orders, no payout history.
- Error: network failure, validation failure, payment failure, geolocation denied, map provider unavailable, unauthorized feature.
- Disabled/locked: subscription-gated features unavailable.

## Assumptions
- Use Figma local styles as token source and map them to Tailwind theme variables during implementation.
- shadcn/ui can provide accessible primitives, but visible styling must match Figma.
- Lucide icons may replace generic icons only when the glyph clearly matches; exported Figma SVGs should be used for logo and brand-specific assets.

## Unresolved Questions
- Final desktop navigation pattern is not specified by Figma.
- Exact bottom nav destinations and active states need confirmation.
- Logo asset should be exported from Figma during implementation.
- Should social login icons be Google/Facebook only, or include other providers shown in Figma graphics?
- Should card/payment fields remain in UI if the provider redirects for iDEAL/PayPal/Tikkie?

## Dependencies
- `02-FIGMA-DESIGN-SPEC.md` for raw Figma evidence.
- `04-PAGE-SCREEN-SPEC.md` for route-level UI requirements.
- `17-RESPONSIVE-SPEC.md` for desktop/tablet adaptations.
- `18-TESTING-SPEC.md` for visual, responsive, and accessibility checks.
