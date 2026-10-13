# Reviews, Ratings, Followers, and Comments Specification

## Purpose
This document defines Local Spotter community features and their subscription gating.

## Confirmed Requirements
- Followers, reviews, ratings, comments, consumer-generated review images, and product reviews are enabled by Workshop subscription.
- Consumers can follow/unfollow businesses.
- Followers use a many-to-many relationship with unique consumer + business.
- Reviews can include rating, title, comment, images, consumer profile, date.
- Product reviews are supported where Workshop subscription enables community functionality.
- Comments can be created, listed, deleted by owner, moderated by business owner/admin.
- Rating must be 1-5 and validated server-side.
- Review images stored in object storage.

## Figma Evidence
- Product cards show rating rows, like/seen counters.
- Retailer/profile screens show average rating `4.8`, review count `(3.1k)`, follower-like counts such as `2k`, `80%`.
- Product detail screens show `Reviews product`, review preview cards, `See all`, reviewer names, `4.4`.
- No standalone review submission form was verified.
- No follower list screen was verified.
- No comment list/editor screen was verified.

## Followers
- Consumers can follow active businesses with Workshop plan.
- Unique constraint: `(consumer_profile_id, business_id)`.
- Business profile shows follower count.
- Business owner can view follower count and follower list where appropriate.
- Unfollow deletes or soft-deletes the relationship depending analytics needs.

## Reviews
- Review target can be:
  - Business.
  - Product.
  - Workshop, if enabled.
- Required:
  - `rating` 1-5.
- Optional:
  - `title`.
  - `comment`.
  - images.
- Eligibility should be enforced:
  - Product review requires completed order containing product.
  - Business review may require completed order or completed workshop booking.
  - Workshop review requires completed booking.

## Product Reviews
- Enabled only when target business has Workshop subscription.
- Display:
  - Average rating.
  - Rating count.
  - Review list.
  - Review images.
- Do not copy marketplace brand UI; use Local Spotter Figma style.

## Comments
- Comments are enabled only for eligible Workshop-plan businesses.
- Consumers can create comments.
- Users can delete their own comments.
- Business owner can moderate comments on owned business content.
- Admin can moderate all comments.
- Prevent unauthorized edit/delete.

## Moderation
- Review/comment statuses:
  - PENDING.
  - PUBLISHED.
  - HIDDEN.
  - REJECTED.
- Admin can hide/remove inappropriate content.
- Business owner can hide comments/reviews on owned business content, but destructive deletion should be admin-only unless policy says otherwise.
- Reports table tracks user-reported content.

## Rating Aggregates
- Store aggregate rating and count on products/businesses for fast listing.
- Update aggregates transactionally when review status changes.
- Only published reviews count.
- Scheduled reconciliation job recommended for data integrity.

## Image Rules
- Store review image metadata in `review_images`.
- Validate MIME type, size, dimensions.
- Client confirmation needed for max review images.
- Review images may be public when review is public.

## API Requirements
- `POST /businesses/:businessId/follow`.
- `DELETE /businesses/:businessId/follow`.
- `GET /businesses/:businessId/followers/count`.
- `POST /reviews`.
- `GET /reviews`.
- `PATCH /reviews/:reviewId`.
- `DELETE /reviews/:reviewId`.
- `POST /reviews/:reviewId/images`.
- `POST /comments`.
- `GET /comments`.
- `DELETE /comments/:commentId`.
- Admin moderation endpoints.

## Assumptions
- Likes on product cards are not the same as following a shop. A separate product-like entity may be added if like interactions are required.
- Seen/view counters are analytics counters and do not require social permissions.
- Reviews are public by default unless moderation policy requires pending status.
- One consumer can submit one review per purchased product/order combination.

## Unresolved Questions
- Are product likes required as a real feature or only display counters?
- Exact review eligibility rules.
- Max review image count.
- Can business owners reply to reviews?
- Are ratings enabled for Webshop/Shoproutes businesses as read-only aggregate, or completely hidden until Workshop?
- Should comments attach to products, workshops, business posts, or all?

## Dependencies
- `06-DATABASE-SCHEMA.md` for followers/reviews/comments.
- `07-API-SPEC.md` for endpoints.
- `08-AUTH-RBAC.md` for permissions.
- `09-SUBSCRIPTION-SPEC.md` for Workshop feature gates.
- `16-SECURITY-GDPR.md` for image and profile privacy.
