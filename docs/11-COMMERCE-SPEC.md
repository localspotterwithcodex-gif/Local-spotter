# Commerce Specification

## Purpose
This document defines product catalog, variants, cart, checkout, orders, stock, delivery addresses, and commerce boundaries for Local Spotter.

## Confirmed Requirements
- Business owners with Webshop or higher can publish products.
- Product fields:
  - Up to 3 images.
  - Product name.
  - Price.
  - Description.
  - Stock.
  - Optional shop product link.
  - Category.
- Clothing/fashion variants must support color and size.
- Consumers can browse, view product detail, select variants and quantity, add to cart, checkout, provide/select delivery address, pay, and view order.
- Business owners can see new orders, accept/process orders, update order status, and view necessary delivery information.
- No product return option in MVP.
- Order item prices and variant details must be snapshotted.
- Stock must not go negative and must be transaction-safe.

## Product Catalog
- Products belong to a business.
- Products require an active Webshop-or-higher subscription for public listing/purchasing.
- Categories are database-driven.
- Suggested categories from requirements/Figma:
  - Men.
  - Women.
  - Kids.
  - Home.
  - Fashion.
  - Accessories.
  - Local products.
  - Dress.
  - Trousers.
  - Furniture.
  - Jacket.
  - Beauty.
  - Interior.
  - Makeup.
  - Bag.
  - Electronic.
- Admin should manage categories.

## Product Images
- Requirement: max 3 images per product.
- Validate on frontend and backend.
- Store media in object storage.
- Store metadata in `product_images` and `media_assets`.
- Figma populated add-product frame shows four image rectangles; requirement wins unless client confirms raising the limit.

## Product Variants
- Supported sizes from requirements: S, M, L, XL, XXL.
- Figma also shows XS. Client confirmation required.
- Colors:
  - Figma shows selectable color swatches and a color picker.
  - Store `color_name` and optional `color_hex`.
- Variants can override price and stock.
- Variant SKU must be unique within product when provided.

## Cart
- Cart belongs to a consumer profile.
- MVP assumption: one business per cart to simplify fulfillment and payouts.
- Cart item uniqueness: `(cart_id, product_id, variant_id)`.
- Cart totals are recalculated server-side.
- Cart display must handle out-of-stock or deleted products.

## Checkout
1. Validate authenticated consumer.
2. Validate cart is not empty.
3. Validate all products are active and business subscription is active.
4. Validate variant selections.
5. Validate stock.
6. Validate delivery address.
7. Create pending order with snapshots.
8. Create payment session.
9. Confirm order only after webhook confirms payment.

## Order Lifecycle
- `PENDING`: order/payment created but not confirmed.
- `CONFIRMED`: payment confirmed and stock reserved/decremented.
- `PREPARING`: business is preparing order.
- `READY`: ready for pickup/delivery handoff.
- `OUT_FOR_DELIVERY`: delivery in progress.
- `DELIVERED`: terminal success.
- `CANCELLED`: terminal cancellation.
- `REJECTED`: terminal owner/admin rejection.

Allowed transitions should be explicit:
- `PENDING -> CONFIRMED`, `CANCELLED`, `REJECTED`.
- `CONFIRMED -> PREPARING`, `CANCELLED`.
- `PREPARING -> READY`, `CANCELLED`.
- `READY -> OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`.
- `OUT_FOR_DELIVERY -> DELIVERED`.
- Terminal states cannot transition except admin correction with audit log.

## Delivery Address
- Consumers manage addresses.
- Required fields:
  - label.
  - full name.
  - phone.
  - street.
  - house number.
  - postal code.
  - city.
  - country.
- Default country: Netherlands (`NL`).
- Latitude/longitude optional for delivery optimization.
- Business owners see only delivery snapshot necessary for fulfillment.

## Business Order Management
- Business owner can list orders for owned businesses only.
- Order dashboard metrics are verified in Figma:
  - Orders Processing.
  - Order Completed.
  - On the way.
  - Cancelled Orders.
  - New Orders.
- Detailed order list/table is not verified in Figma and must follow the design system.

## Product Detail UI
- Figma product detail includes:
  - Product image.
  - Price.
  - Product name/category.
  - Description.
  - Size buttons.
  - Color swatches.
  - Reviews preview.
  - Add to Cart.
- Figma price uses USD in one detail frame; implementation must use EUR.

## Business Rules
- Product public listing requires business active and subscription active.
- Product purchase requires Webshop or higher.
- Order totals are not accepted from frontend.
- Stock decrement must be inside a database transaction.
- If payment succeeds but stock validation fails, mark order/payment for exception handling and refund/cancel according policy.
- Product returns are not implemented.

## Assumptions
- Delivery is merchant-managed, not platform-managed, because no delivery provider is specified.
- Pickup may be added later if client confirms.
- One order belongs to one business.
- External product link is optional and not a replacement for Local Spotter checkout unless client changes the model.

## Unresolved Questions
- Multi-business cart support.
- Delivery fee model and who sets delivery fee.
- Pickup vs delivery support.
- Refund/cancellation deadlines.
- Product approval/moderation before public visibility.
- Final size list, including XS.
- Commission/platform fee model.

## Dependencies
- `06-DATABASE-SCHEMA.md` for commerce entities.
- `07-API-SPEC.md` for cart/order/product endpoints.
- `09-SUBSCRIPTION-SPEC.md` for Webshop capability.
- `10-PAYMENT-SPEC.md` for checkout/payment.
- `14-REVIEW-FOLLOWER-SPEC.md` for product review eligibility.
