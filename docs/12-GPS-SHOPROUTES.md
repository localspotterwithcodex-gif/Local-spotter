# GPS and Shoproutes Specification

## Purpose
This document defines business location, consumer geolocation, map UI, shop routes, directions, and privacy constraints.

## Confirmed Requirements
- Shoproutes is a core feature.
- Businesses with Shoproutes or Workshop subscription can appear on a map.
- Business onboarding must store GPS coordinates.
- Features include shop location, consumer location with permission, directions, route stops, shop markers, and business profile images/icons where supported.
- Do not continuously track consumers without explicit permission.
- Ask browser location permission when required.

## Figma Evidence
- Route map screens:
  - `193:551`: Shopping Route with "You are here", shop card, and route/map imagery.
  - `193:621`: Shopping Route variant.
  - `478:4644`: seller route screen inventory verified, fine details not re-read after connector failure.
- Shoproutes discovery:
  - `193:261`: store cards and "Start de shoproute".
  - `193:1061`: city-focused prompt "In welke stad ga je winkelen?"
  - `632:1367`: category/city modal.
- Business map profile:
  - `476:1551`, `383:2487`: "Your store is here".
- Figma map uses static shapes/images, not an identified provider UI.

## Business Location
- Store latitude and longitude on `businesses`.
- Store structured address fields:
  - state.
  - city.
  - street.
  - house number.
  - postal code.
  - country code `NL`.
- Coordinates are required for public map presence under Shoproutes/Workshop plans.
- Business owners can update address and route location in verified screens:
  - Add Shoproutes.
  - Update Shoproutes.
  - CHANGE address action.

## Shop Route Model
- A shop route contains:
  - Title.
  - Description.
  - Creator.
  - Status.
  - Ordered stops.
- Each route stop contains:
  - Business.
  - Sequence.
  - Latitude.
  - Longitude.
  - Description.
- A route stop must reference a business with Shoproutes or Workshop capability.

## Consumer Map Flow
1. Consumer opens shoproute screen.
2. Consumer selects route/city/category.
3. Consumer taps start route.
4. Browser geolocation prompt appears.
5. If allowed, frontend sends approximate current coordinates to route/directions request.
6. Backend returns route metadata and eligible stops.
7. Map provider displays user marker, shop markers, and directions.

## Location Privacy
- Location permission must be explicit and contextual.
- Do not request location on page load unless user action clearly requires it.
- Do not store consumer live GPS by default.
- If storing a derived search location is needed, store coarse data or user address only with consent.
- Provide fallback when permission is denied:
  - Manual city search.
  - Route list without live directions.

## Map Provider Requirements
Provider must support:
- Web map rendering.
- Marker customization.
- Directions/routing.
- Geocoding or coordinate lookup.
- Netherlands coverage.
- Reasonable free/low-cost tier for MVP.

Candidate categories:
- Google Maps Platform.
- Mapbox.
- OpenStreetMap-compatible provider with routing.

Final provider is unresolved and should depend on credentials, cost, and route features.

## API Requirements
- `GET /maps/businesses`: returns eligible business markers.
- `GET /shop-routes`: list/search routes.
- `GET /shop-routes/:routeId`: route details.
- `POST /shop-routes`: create route, requires plan.
- `POST /shop-routes/:routeId/stops`: add stop.
- `PATCH /businesses/:businessId/location`: update business coordinates.

## Validation
- Latitude between -90 and 90.
- Longitude between -180 and 180.
- Coordinates required for active route stops.
- Route stop sequence unique within route.
- Business must be active and plan-eligible.
- Owner can only route/manage own business unless admin.

## UI Requirements
- Preserve Figma map-card styling:
  - Light app background.
  - Shop information card over map.
  - Rating and likes.
  - "You are here" marker/label.
  - Pale pink header and bottom nav on mobile.
- Loading state for map tiles/routes.
- Error state for provider failure.
- Empty state for no shops/routes in city/category.

## Assumptions
- Shop routes are initially created by business owners and/or admins, not consumers.
- Real-time turn-by-turn navigation is not required in MVP; provider directions/link-out can satisfy.
- Consumer location is ephemeral unless a route session feature is later specified.

## Unresolved Questions
- Final map provider.
- Who can create multi-business shop routes?
- Are route stops curated by Local Spotter admins or participating businesses?
- Should route optimization reorder stops, or must sequence be manual?
- Should routes support walking, cycling, driving, or all modes?
- Are business profile images used as marker icons in MVP?

## Dependencies
- `06-DATABASE-SCHEMA.md` for location and route tables.
- `07-API-SPEC.md` for map/shoproute endpoints.
- `09-SUBSCRIPTION-SPEC.md` for Shoproutes capability.
- `16-SECURITY-GDPR.md` for geolocation privacy.
- `17-RESPONSIVE-SPEC.md` for map layout adaptation.
