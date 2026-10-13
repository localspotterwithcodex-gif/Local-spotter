---
name: localspotter-design
description: Implement Local Spotter frontend UI from the verified Figma design and project docs with strict visual fidelity, responsive behavior, component reuse, and mandatory screenshot QA. Use for Local Spotter UI, design system, responsive frontend, and Figma-to-code work; not for backend-only tasks.
---

# Local Spotter Design Implementation

Use this skill when implementing, reviewing, or refining Local Spotter UI. Act as a senior UI/UX designer, senior frontend engineer, design systems engineer, and responsive web designer.

The goal is to build Local Spotter, not a generic ecommerce, marketplace, or SaaS template.

## Required Context

Before Local Spotter UI implementation or visual review, read the current versions of:

- `PROMPT.md`
- `CLAUDE.md`
- `docs/01-PROJECT-REQUIREMENTS.md`
- `docs/02-FIGMA-DESIGN-SPEC.md`
- `docs/03-UI-UX-DESIGN-SYSTEM.md`
- `docs/04-PAGE-SCREEN-SPEC.md`
- `docs/17-RESPONSIVE-SPEC.md`
- `docs/21-DOCUMENTATION-AUDIT.md`

Inspect the actual Local Spotter Figma file whenever Figma access is available:

- File key: `Lr5Q9uBLcwnVgN92nyMJEI`
- Prompt node: `81:114`
- Verified pages from existing docs: `OLD VERSION`, `BUYER NEW`, `SELLER NEW`

If Figma access fails, use only the verified Figma evidence documented in `docs/02-FIGMA-DESIGN-SPEC.md` and `docs/03-UI-UX-DESIGN-SYSTEM.md`. Do not claim unverified screens were inspected.

## Source Of Truth Order

When sources disagree, use this order:

1. Actual accessible Figma frame for the screen being implemented.
2. `docs/02-FIGMA-DESIGN-SPEC.md` and `docs/03-UI-UX-DESIGN-SYSTEM.md`.
3. `docs/04-PAGE-SCREEN-SPEC.md` and `docs/17-RESPONSIVE-SPEC.md`.
4. `PROMPT.md` business and product requirements.
5. Existing implemented components and tokens.

If Figma conflicts with business, security, payment, or legal requirements, do not silently copy the unsafe design. Document the conflict and implement the safest approved behavior.

Known conflicts to respect:

- Figma may show USD-like placeholder prices, but Local Spotter must use EUR.
- Figma may show more than 3 product image slots, but `PROMPT.md` confirms max 3 product images unless the client approves otherwise.
- Figma shows XS in some size UI, while `PROMPT.md` confirms S, M, L, XL, XXL. Treat XS as unresolved until approved.
- Figma payment screens show card fields, but Local Spotter must not store card numbers, CVV, or sensitive payment details. Use provider-hosted or secure embedded payment UI.

## Non-Negotiable Visual Rules

- Do not create generic AI-generated SaaS designs.
- Do not invent a different brand.
- Do not randomly change colors.
- Do not use unnecessary gradients.
- Do not overuse glassmorphism.
- Do not use excessive rounded cards.
- Do not use random icons.
- Do not use placeholder lorem ipsum.
- Do not redesign Figma screens without a documented reason.
- Preserve Local Spotter's local-community marketplace identity.
- When Figma does not specify a state, create a state that feels native to the existing Local Spotter system.

## Visual Identity

Local Spotter uses a friendly but premium local-marketplace visual style:

- Pale pink brand surfaces and accents.
- Dark black/navy typography.
- Bright magenta action color.
- Golden rating accent.
- Clean white surfaces.
- Rounded modern UI without excessive pill shapes.
- Minimal visual clutter.
- Product, business, workshop, route, and community content as the visual focus.

Do not introduce a new palette, ornamental gradients, decorative blobs, generic marketing sections, or unrelated iconography.

## Figma-To-Code Implementation

For each screen:

1. Identify the matching Figma frame ID and route from `docs/04-PAGE-SCREEN-SPEC.md`.
2. Inspect the Figma node directly when tools are available.
3. Record the frame name, node ID, viewport size, and any unverified areas.
4. Extract layout, spacing, typography, colors, shadows, border radius, imagery, and component patterns.
5. Build using reusable React components and Tailwind tokens.
6. Use shadcn/ui only as accessible primitives. Override visible styling to match Local Spotter.
7. Use Lucide icons only where the symbol matches the Figma intent. Use exported Figma assets for logo and brand-specific marks.
8. Preserve Dutch wording from Figma where present unless localization requirements change.
9. Replace placeholder copy with realistic Local Spotter copy or seeded local-business data.
10. Keep implementation responsive without changing the mobile Figma composition.

Never implement a screen from memory if an accessible Figma frame exists.

## Typography

Use the verified type system:

- Mobile page titles: Rubik Medium, 20px.
- Card headings and prices: Manrope Bold, 16px.
- Form labels and section headings: Manrope Bold, 14px.
- Product titles: Manrope Bold, 13px, 150% line-height.
- Subheads/category text: Rubik Light, 14px.
- Captions/counters/metadata: Manrope Medium, 12px.
- Input values: Manrope Regular, 16px.
- Auth hero headline: Rubik Medium, 60px where the Figma auth header uses that scale.
- Success headline: Rubik Medium, 24px.
- Dashboard stat numbers: Rubik Medium, 32px.
- Product detail price: Manrope ExtraBold, 24px.

Do not scale font sizes with viewport width. Use responsive layout, wrapping, and content constraints instead.

## Colors

Use named design tokens. Do not scatter raw hex values through components.

- `color.brand.primary`: `#FAE2F0`
- `color.brand.secondary`: `#FA1EFF`
- `color.input.background`: `#EAEAEA`
- `color.background.app`: `#F9F9F9`
- `color.text.primary`: `#111111`
- `color.text.navy`: `#121F3E`
- `color.surface`: `#FFFFFF`
- `color.like`: `#ED4C5C`
- `color.rating`: `#D4B011`
- `color.pink.deep`: `#E482BC`
- `color.map.teal`: `#54D1CA`
- `color.purple.dark`: `#790166`
- `color.gray.300`: `#B7B7B7`
- `color.gray.400`: `#C4C4C4`
- `color.gray.200`: `#DADADA`

Dashboard status colors:

- Processing: background `#F2D9DE`, accent `#E54666`.
- Completed: background `#CBF5D5`, accent `#3B9B52`.
- On the way: background `#F0E9DF`, accent `#E8A74A`.
- Cancelled: background `#D9DFF2`, accent `#344DB1`.
- New orders/tickets: background `#E8D1ED`, accent `#C04BDA`.

Use EUR formatting in commerce UI. Do not display USD in production UI.

## Spacing

Use the verified mobile geometry as the baseline:

- Figma mobile reference width: 428px.
- Common horizontal margin: 16px to 19px.
- Product grid gap: 16px.
- Mobile header height: 120px.
- Mobile bottom nav height: 97px.
- Segmented switch: 394px wide, 68px high on the 428px reference frame.
- Product image: 190px by 190px on 428px mobile, with 8px radius.
- Product card height: about 296px in listing grids.

Use spacing tokens derived from these values. Avoid arbitrary spacing that makes screens feel detached from Figma.

## Grid And Layout

Mobile:

- Preserve the 428px Figma composition.
- Product listing uses two 190px columns with a 16px gap at 428px.
- At 375px/390px, keep two columns only if product text and controls remain readable. Use one column on dense/detail screens.
- Forms are full-width within the mobile margins.
- Map screens use a full-width map area with overlay shop cards.

Tablet:

- Use the same visual language with wider content constraints.
- Product grids may use 3 columns.
- Forms should usually be centered around 520px to 640px max width.
- Bottom navigation may become a side rail or top nav only after client-approved responsive behavior.

Laptop/Desktop:

- Public discovery uses a top navigation with logo, discovery modes, search/location, and account menu.
- Product grids may use 4 to 5 columns depending on viewport.
- Product detail uses image gallery left and purchase/details panel right, with reviews below.
- Business dashboards use sidebar plus content.
- Admin screens are desktop-first, table-heavy, and utilitarian because no admin Figma screens are verified.

Desktop/tablet layouts are derived requirements, not verified Figma. Mark them as implementation-derived during review.

## Containers

- App background is `#F9F9F9`.
- Cards and panels use white surfaces unless Figma shows a colored status card.
- Do not nest cards inside cards.
- Do not turn full page sections into floating decorative cards.
- Keep radius restrained. Use 8px for product images/cards unless Figma shows 20px on app chrome such as mobile banner or bottom nav.
- Use stable dimensions and responsive constraints to prevent layout shifts.

## Buttons

Primary button:

- Fill `#FA1EFF`.
- Text white.
- Manrope Bold 16px.
- Figma size reference: 124px by 48px.
- Labels observed: `NEXT`, `LOGIN`, `SIGN UP`, `CREATE`, `GO TO MY SHOP`.
- On forms, full-width responsive buttons are allowed if height, color, and type treatment remain faithful.

Secondary button:

- Fill `#FAE2F0`.
- Text `#FA1EFF`.
- Manrope Bold 16px.
- Figma size reference: 124px by 48px.
- Labels observed: `PREVIOUS`, `CHANGE`.

Rules:

- Use visible focus states.
- Use disabled and loading states that preserve layout.
- Do not invent decorative gradient buttons.
- Do not use random icons in buttons. Only use icons where Figma or common action semantics support them.

## Inputs And Forms

- Labels use Manrope Bold 14px.
- Filled input values use Manrope Regular 16px.
- Field background uses `#EAEAEA`.
- Preserve Figma field proportions and vertical rhythm.
- Use React Hook Form and Zod when implementing forms.
- Show validation errors with accessible text, not color alone.
- Do not use lorem ipsum or vague placeholder content.
- Keep mobile keyboards and input types correct for email, phone, price, stock, KVK, dates, and times.
- Payment fields must be provider-hosted or secure embedded fields when sensitive.

## Cards

Use cards only for individual content items, status metrics, dialogs, and framed tools. Avoid card-heavy SaaS dashboards unless the verified seller dashboard uses metric cards.

Shared card rules:

- Clean white surface.
- Restrained radius.
- Clear image/content hierarchy.
- Stable dimensions for repeated grid items.
- Text clamping where necessary.
- Real content or realistic seed data.

## Navigation

Mobile:

- Use verified banner and bottom navigation patterns.
- Header/banner height: 120px, pale pink `#FAE2F0`, bottom radius 20px.
- Bottom nav height: 97px, white surface, top radius 20px, shadow `0 -3px 6px rgba(0,0,0,0.06)`.
- Four icon slots with active dot indicators.
- Preserve status bar/home-indicator treatment only where appropriate for the web viewport mockup.

Desktop:

- Derive a top nav for public/consumer pages.
- Derive a sidebar for business owner and admin dashboards.
- Keep the Local Spotter logo and pale pink brand surface visible.

Do not invent final destination labels if unresolved. Use the current page spec and flag ambiguities.

## Product Cards

Product card pattern:

- Square image, 1:1 aspect ratio.
- 8px image radius.
- 190px image size at 428px mobile.
- Bottom overlay uses `rgba(250,226,240,0.5)` with light blur.
- Heart/like counter uses `#ED4C5C`.
- Seen counter uses dark icon treatment.
- Price row uses old price struck through and sale/current price bold where applicable.
- Title uses Manrope Bold 13px, 150% line-height.
- Rating row uses golden star `#D4B011`.

Do not invent product badges, sale ribbons, or ecommerce decoration unless Figma or requirements introduce them.

## Business Cards

Business/retailer cards must support:

- Business image/avatar.
- Business name.
- Category/shop type.
- Short description.
- Follower/like, product, rating, and review metrics where available.
- Click target to business profile.

Keep cards local-business focused. Do not make them look like generic vendor tiles.

## Profile Components

Business profile screens should preserve:

- Large hero/business image.
- Logo/avatar where present.
- Store name and shop type.
- Description.
- Address and KVK where shown.
- Stats such as rating, count, followers/likes, product count, and completion-like percentages where data exists.
- Segmented tabs for Products, Workshops, and Shoproutes where relevant.

Consumer profile/settings should preserve:

- Account settings menu structure.
- Delivery Address, Notifications, Language, Terms & Policy, Help & Support, Logout.

Do not expose private consumer address data outside authorized owner/admin order contexts.

## Maps And Shoproutes

Figma uses map imagery/placeholders. Implementation must use the selected real map provider after product approval.

Rules:

- Use explicit user-triggered browser geolocation permission.
- Do not continuously track consumer location.
- Do not persist consumer current location unless a requirement explicitly approves it.
- Show business markers, route stops, and current-location state consistently with the Figma route screens.
- Preserve route overlay cards and labels such as "Shopping Route" and "You are here" when applicable.
- Handle geolocation denied, map loading, and provider unavailable states.

## Reviews, Ratings, And Comments

Workshop-plan social UI must support:

- 1 to 5 star ratings.
- Review title/comment.
- Review images from object storage.
- Product review summaries: average rating, count, list, and images.
- Comment lists and moderation states where approved.

Visual rules:

- Rating stars use `#D4B011`.
- Empty review states must follow the card/list style.
- Moderation states must not look destructive unless an action is actually destructive.
- Do not copy Amazon, Flipkart, or other marketplace branding.

## Subscription Cards

Subscription screens must preserve:

- Three plans: Webshop, Shoproutes, Workshop.
- EUR 50, EUR 100, EUR 150 monthly pricing.
- Pale pink/magenta Local Spotter visual language.
- Clear NEXT action where shown.
- Feature summaries aligned to backend permission rules.

Do not hardcode plan behavior in UI. The backend and database-driven plan configuration are the source of truth.

## Checkout And Payment UI

Payment UI must support:

- iDEAL.
- PayPal.
- Tikkie.
- Business subscription payment.
- Consumer product/workshop payment when those flows are implemented.

Rules:

- Do not store card number, CVV, or sensitive payment details.
- Prefer provider-hosted redirects or secure provider components.
- If Figma card fields are implemented visually, they must map to provider-secure fields, not Local Spotter-owned inputs.
- Display EUR totals and Dutch/EU formatting.
- Include payment loading, failed, cancelled, and success states.
- Keep subscription payment and consumer checkout payment visually related but logically separate.

## Dashboard UI

Seller dashboard UI must preserve verified metric-card patterns:

- Orders Processing.
- Order Completed.
- On the way.
- Cancelled Orders.
- New Orders.
- Purchased Tickets.
- Cancelled Tickets.
- New Tickets Purchased.

Desktop business dashboards may use sidebar plus content, but color, typography, status cards, and spacing must remain Local Spotter-specific.

Admin dashboards have no verified Figma screens. Build them only from requirements and Local Spotter tokens, using practical table/detail layouts rather than decorative marketing UI.

## Modals

Verified category/search modals include:

- Product category search.
- Shoproutes city search.
- Workshop category search.
- Labels such as `Popular Categories`, `Search Category`, `Producten`, `Workshops`, `Shoproutes`.

Mobile modals should be bottom sheets or full-screen overlays when space is tight. Desktop modals may be centered dialogs or popovers using the same category grid and visual tokens.

## Tables

Tables are mainly for owner/admin details not fully represented in Figma.

Rules:

- Use tables for order lists, payout history, admin management, payment logs, and moderation queues.
- Keep them dense, readable, and plain.
- Use Local Spotter colors only for meaningful status accents.
- Do not wrap tables in decorative nested cards.
- Include empty, loading, error, pagination, sorting, and filtering states where data volume requires it.

## Empty States

Figma does not verify dedicated empty states. Create them from the existing visual language:

- Keep empty states quiet and helpful.
- Use real product language, not lorem ipsum.
- Examples: `No products yet.`, `No workshops yet.`, `No shop routes yet.`, `No reviews yet.`, `No orders yet.`
- Use the same surface, type, and spacing as nearby lists.
- Provide a clear action only when the user has permission to act.

## Loading States

Figma does not verify loading states. Add technical loading states that preserve layout:

- Skeleton product cards that match the final grid.
- Skeleton retailer/workshop cards.
- Skeleton profile hero/stats.
- Map loading overlay.
- Form submit loading without resizing buttons.
- Table row skeletons for dashboards/admin.

Avoid spinners as the only loading feedback on content-heavy pages.

## Error States

Figma does not verify error states. Add consistent error states for:

- Network failure.
- Validation failure.
- Unauthorized access.
- Subscription-locked action.
- Payment failure or cancellation.
- Geolocation denied.
- Map provider unavailable.
- Image upload failure.

Errors must be readable, actionable, and accessible. Do not cover persistent navigation unless the page is fully blocked.

## Responsive Behavior

Required breakpoints:

- 375px and 390px mobile targets.
- 428px Figma mobile reference.
- 768px tablet.
- 1024px laptop.
- 1440px desktop.

Rules:

- Mobile is canonical because verified Figma screens are mobile.
- Do not simply shrink desktop UI.
- Do not create desktop layouts that look like unrelated admin templates.
- Keep text from overlapping at 375px.
- Use responsive grids and max-width containers.
- Maintain product image aspect ratios.
- Ensure sticky CTAs never cover content.
- Map, checkout, booking, and long forms require special mobile checks.

## Mobile Navigation

- Preserve fixed bottom navigation for consumer mobile screens where Figma shows it.
- Keep bottom nav height and rounded top corners close to Figma.
- Use four destinations unless the client approves a different structure.
- Use active dot indicators.
- Do not show desktop sidebar on mobile.
- For owner mobile screens, use top bar plus collapsible/mobile navigation as specified in responsive docs.

## Accessibility

Every UI implementation must include:

- Semantic landmarks.
- Accessible names for icon buttons.
- Decorative icons hidden from assistive tech.
- Label, description, and error associations for inputs.
- Visible focus states.
- Keyboard navigability for cards, modals, menus, tabs, and forms.
- Touch targets at least 44px by 44px.
- Contrast checks against `#F9F9F9`, `#FAE2F0`, and white surfaces.
- Reduced-motion handling for non-essential animation.
- Descriptive image alt text from product/business/workshop data.

Do not sacrifice accessibility to match a static mockup exactly. Preserve the visual intent while making the implementation usable.

## Component Reuse

Build and reuse Local Spotter-specific components:

- App banner/header.
- Mobile bottom nav.
- Desktop top nav.
- Owner/admin sidebar.
- Segmented switch.
- Primary and secondary buttons.
- Form field.
- Product card.
- Retailer/business card.
- Workshop card.
- Subscription card.
- Payment method option.
- Map panel and marker card.
- Rating display.
- Review list item.
- Empty state.
- Loading skeleton.
- Status metric card.
- Data table.
- Modal/bottom sheet.

Avoid duplicated markup and one-off styling. Shared components must remain flexible enough for buyer, seller, and admin contexts without diluting the brand.

## Animation And Micro-Interactions

Use subtle motion only where it improves clarity:

- Button press/focus/disabled feedback.
- Tab/switch active-state transition.
- Modal/bottom-sheet enter and exit.
- Skeleton shimmer.
- Toast notifications.
- Map marker selection.
- Card hover/focus on desktop.

Avoid unnecessary animations, large page transitions, parallax, animated gradients, excessive spring effects, or motion that changes the Local Spotter identity. Respect `prefers-reduced-motion`.

## Mandatory Visual QA Process

Every implemented or modified Local Spotter screen must pass this process before final approval:

1. Figma: identify the exact Figma source frame or document that no frame exists.
2. Implementation: build the screen using Local Spotter tokens and reusable components.
3. Screenshot/render: run the app and capture screenshots of the implemented screen.
4. Compare: compare implementation screenshots against Figma or, for missing Figma screens, against the documented design system.
5. Identify differences: list spacing, typography, color, layout, image, icon, responsive, and state mismatches.
6. Fix: correct visual and interaction mismatches that are not justified by requirements.
7. Responsive check: verify at 375, 390, 428, 768, 1024, and 1440px where the screen applies.
8. Final approval: summarize what was matched, what was intentionally adapted, and what remains unverified.

Use Playwright screenshots or an equivalent browser-rendered screenshot workflow for implemented web UI. Do not rely only on code review for visual fidelity.

## Final Review Checklist

Before finishing Local Spotter UI work, verify:

- The implementation uses the Local Spotter palette and typography.
- The screen maps to a documented Figma frame or documented missing-Figma requirement.
- No generic SaaS/ecommerce styling was introduced.
- No unapproved gradients, glassmorphism, excessive rounding, or random icons were added.
- EUR is used for prices.
- Product images are limited according to approved requirements.
- Subscription-gated UI reflects backend feature rules.
- Loading, empty, and error states exist for data-driven views.
- Mobile navigation and responsive layouts work at required breakpoints.
- Accessibility basics are complete.
- The visual QA process was completed and documented in the final response.
