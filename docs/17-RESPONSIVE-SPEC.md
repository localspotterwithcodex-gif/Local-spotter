# Responsive Design Specification

## Purpose
This document defines how to adapt verified mobile Figma screens to tablet, laptop, and desktop without inventing a new visual style.

## Confirmed Requirements
- Supported web breakpoints:
  - Mobile: 375px and 390px minimum targets.
  - Figma mobile reference: 428px.
  - Tablet: 768px+.
  - Laptop: 1024px+.
  - Desktop: 1440px+.
- Do not simply shrink desktop UI.
- Create responsive layouts.
- Desktop dashboard should use sidebar + content.
- Mobile dashboard should use top bar + collapsible/mobile navigation.
- Product grid should use multiple columns on desktop and 1-2 columns on mobile depending Figma.

## Figma Verification
- All verified app frames are mobile width 428px.
- No desktop or tablet Figma layouts were accessible/verified.
- Responsive desktop/tablet layout must be derived from requirements and reviewed.

## Breakpoints
- `xs`: 375-427px.
- `mobile`: 428px reference.
- `tablet`: 768px.
- `laptop`: 1024px.
- `desktop`: 1440px.

## Mobile Rules
- Preserve Figma mobile composition.
- Header height 120px.
- Bottom nav height 97px.
- Product grid:
  - 428px: two columns of 190px with 16px gap.
  - 375/390px: use two smaller fluid columns only if text remains readable; otherwise one column for dense/detail views.
- Forms:
  - Full-width fields.
  - Sticky or bottom CTA only where it does not overlap content.
- Map:
  - Full-width map area with overlay shop card.
  - Explicit geolocation action.

## Tablet Rules
- Keep brand header but increase max content width.
- Product grids can use 3 columns.
- Discovery pages can use a two-column layout for search/categories and content if it remains close to Figma.
- Bottom nav can become a side rail or top nav after client review.
- Forms should be centered with max width around 520-640px.

## Laptop/Desktop Rules
- Public discovery:
  - Top navigation with logo, discovery tabs, search/location, auth/user menu.
  - Product grid 4-5 columns depending width.
  - Business/workshop cards in responsive grids.
- Business dashboard:
  - Sidebar navigation.
  - Main content max width with cards/tables.
  - Metrics cards in 2-4 columns.
- Admin:
  - Desktop-first sidebar/table layout.
  - Dense but clean interface.
- Product detail:
  - Image gallery left, details right.
  - Reviews below.
- Map:
  - Large map panel with side list of stops/businesses.

## Component Behavior
- `banner`:
  - Mobile: Figma header.
  - Desktop: top app nav with same pink brand surface.
- `navbar`:
  - Mobile: fixed bottom.
  - Desktop: top nav or sidebar; do not show mobile home indicator.
- `switch`:
  - Mobile: 394px segmented control.
  - Desktop: inline segmented tabs in content header.
- Product card:
  - Maintain image aspect ratio 1:1.
  - Text should not overflow; two-line clamp for titles.
- Forms:
  - Maintain consistent labels, field heights, button styles.
- Modals:
  - Mobile: bottom sheet or full-screen modal.
  - Desktop: centered dialog or popover with same category layout.

## Responsive States
- Loading skeletons must match final layout columns.
- Empty states centered within content area.
- Error states should not cover navigation unless blocking.
- Payment forms must avoid fixed bottom overlap on mobile.

## Accessibility
- Touch targets at least 44px.
- Focus states visible across breakpoints.
- No text overlap at 375px.
- Do not scale font size with viewport width.
- Use responsive containers and grid tracks rather than absolute positioning in implementation.

## Assumptions
- Mobile Figma is the canonical visual reference; desktop is an adaptation.
- Admin can be desktop-prioritized because no Figma admin exists and admin tasks are table-heavy.
- Consumer mobile bottom nav can become desktop top nav.

## Unresolved Questions
- Does client have desktop Figma designs?
- Final desktop navigation structure.
- Whether mobile bottom nav should remain on tablet.
- Which screens should have sticky CTAs?
- Should the consumer app be mobile-first only at MVP, or fully desktop-polished?

## Dependencies
- `02-FIGMA-DESIGN-SPEC.md` for mobile source frames.
- `03-UI-UX-DESIGN-SYSTEM.md` for component sizes and tokens.
- `04-PAGE-SCREEN-SPEC.md` for responsive route behavior.
- `18-TESTING-SPEC.md` for viewport test matrix.
