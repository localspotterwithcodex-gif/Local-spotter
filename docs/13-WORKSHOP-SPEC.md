# Workshop Specification

## Purpose
This document defines workshop creation, discovery, detail, booking, capacity enforcement, payment, and subscription gating.

## Confirmed Requirements
- Workshop subscription enables business owners to create workshops.
- Workshop includes Webshop and Shoproutes features.
- Workshop fields:
  - Title/name.
  - Description.
  - Price.
  - Location.
  - Capacity.
  - Date.
  - Start time.
  - Finish time.
  - Image.
  - Business.
- Consumers can view workshop details and book where applicable.
- Capacity must be enforced server-side.

## Figma Evidence
- Workshop discovery/listing:
  - `223:1836`: workshop cards with May 4, 10AM-6PM, title, Buy Ticket.
  - `236:2089`: "Welke workshop zoek je?", "Join upcoming workshop", "Bekijk onze favoriete workshops!".
  - `632:1540`: workshop category modal.
- Business workshop management:
  - `456:1987`, `476:1217`: empty add workshop form.
  - `457:3210`, `476:2850`: populated add workshop variants.
  - `383:2619`, `476:1661`: business profile with active/inactive workshop content.
- Ticket order metrics:
  - `459:915`, `476:1427`.

## Workshop Management
- Business owner can create/edit/cancel workshops only for owned businesses.
- Requires active Workshop subscription.
- Required fields:
  - `title`.
  - `description`.
  - `price_cents`.
  - `capacity`.
  - `location`.
  - `start_at`.
  - `end_at`.
  - `image`.
- Optional fields:
  - latitude/longitude if workshop occurs at a specific location.
  - status draft/published.

## Workshop Booking
1. Consumer opens workshop detail.
2. Consumer selects quantity.
3. Backend verifies:
   - Consumer authenticated.
   - Workshop published.
   - Business active.
   - Business has active Workshop plan.
   - Start date is in the future.
   - Available capacity >= requested quantity.
4. Backend creates pending booking.
5. Payment is created if booking is paid.
6. Webhook confirms payment.
7. Booking status becomes `CONFIRMED`.
8. `booked_quantity` updates transactionally.

## Capacity Rules
- Do not allow booking above available capacity.
- Use database transaction and row lock or atomic update.
- On cancellation before policy cutoff, decrement booked quantity if booking was confirmed.
- Editing capacity below confirmed booked quantity is forbidden.

## Booking Statuses
- `PENDING`: booking/payment started.
- `CONFIRMED`: paid/reserved.
- `CANCELLED`: cancelled.
- `COMPLETED`: workshop completed.

## Workshop Payments
- Use same payment infrastructure as orders.
- Use `payment_purpose = WORKSHOP_BOOKING`.
- Workshop revenue appears in business ledger separately from product order revenue.
- Refund/cancellation rules are unresolved.

## Public Workshop UI
- Listing card:
  - Date block.
  - Time.
  - Image.
  - Title.
  - Buy Ticket button.
  - Rating appears in some cards; relationship to workshop reviews needs confirmation.
- Detail page:
  - Not fully verified in Figma.
  - Must follow product detail/profile card visual language.
- Empty states:
  - "No workshops yet."
  - "No upcoming workshops in this city."

## Business Owner UI
- Add Workshop form:
  - Workshop Name.
  - Price.
  - Workshop Capacity.
  - Workshop Location.
  - Date.
  - Workshop Description.
  - Workshop Image.
  - Time Start.
  - Time Finish.
  - CREATE.
- Order/ticket dashboard:
  - Purchased Tickets.
  - Cancelled Tickets.
  - New Tickets Purchased.

## Assumptions
- Workshop time is stored in UTC with Europe/Amsterdam used for local display.
- Workshop bookings are paid unless client confirms free/reservation-only workshops.
- Business owner cannot delete a workshop with confirmed bookings; they must cancel it.
- Workshop images follow same media validation as products.

## Unresolved Questions
- Are workshops always paid?
- What is the cancellation/refund policy for workshop tickets?
- Can consumers book multiple seats with attendee names?
- Does a workshop require address separate from business address?
- Are workshop reviews distinct from product/business reviews?
- Should waiting lists be supported? Recommended out of MVP.

## Dependencies
- `06-DATABASE-SCHEMA.md` for workshops/bookings.
- `07-API-SPEC.md` for workshop endpoints.
- `09-SUBSCRIPTION-SPEC.md` for Workshop plan gates.
- `10-PAYMENT-SPEC.md` for booking payments.
- `14-REVIEW-FOLLOWER-SPEC.md` for workshop reviews if enabled.
