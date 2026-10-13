# Local Spotter Figma Design Specification

## Purpose
This document records verified Figma evidence only. It does not invent missing screens or redesign the product. Figma file inspected: `Lr5Q9uBLcwnVgN92nyMJEI/localspotter.nl--3-`, prompt node `81:114`.

## Confirmed Requirements
- Figma is the visual source of truth for the Local Spotter web UI.
- Every accessible page/frame should be inspected before frontend implementation.
- Screens that cannot be verified must not be invented.
- Figma documentation must identify page names, desktop/mobile layouts, navigation, reusable components, typography, colors, spacing, buttons, cards, forms, modals, product layouts, business layouts, dashboard layouts, map/location UI, subscription UI, checkout/payment UI, profile UI, and empty/loading/error states if present.
- The implementation must remain visually close to Figma while adding technical states only where the design is missing them.
- Verified Figma content is mobile-first; no accessible desktop/tablet frames were confirmed.

## Confirmed Figma Pages
- `0:1` - `OLD VERSION`, 12 top-level frames.
- `81:114` - `BUYER NEW`, 51 top-level children.
- `383:2236` - `SELLER NEW`, 37 top-level frames/components.

## Figma Access Notes
- The Figma connector successfully returned page inventory, detailed `BUYER NEW` summaries, detailed `SELLER NEW` summaries for most core frames, and a design-context render for `193:73`.
- Later calls began returning `INVALID_ARGUMENT`, so remaining fine-grain details were not forced or guessed.
- All verified app frames are mobile-sized, primarily `428 x 926`; no desktop or tablet Figma frames were verified.

## OLD VERSION Page Inventory
Treat this page as legacy reference unless a later client decision promotes it.

| ID | Name | Size | Notes |
| --- | --- | --- | --- |
| `2:3` | Products | 428 x 1955 | Legacy product listing. |
| `133:960` | Products | 428 x 1955 | Legacy product variant. |
| `133:1107` | Products | 428 x 1955 | Legacy product variant. |
| `5:26` | Retailers | 428 x 1955 | Legacy retailers. |
| `7:142` | Retailers | 428 x 1955 | Legacy retailers variant. |
| `5:216` | Route | 428 x 1955 | Legacy map/route. |
| `5:362` | Route | 428 x 1955 | Legacy map/route variant. |
| `7:30` | Settings | 428 x 1955 | Legacy settings. |
| `126:239` | iPhone 13 Pro Max - 1 | 428 x 1279 | Legacy detail/profile-like screen. |
| `126:350` | iPhone 13 Pro Max - 3 | 428 x 926 | Legacy chat-like screen. |
| `132:721` | Products | 428 x 1955 | Legacy product/category page. |
| `132:843` | Products | 428 x 1955 | Legacy product/category page. |

## BUYER NEW Page Inventory
Frame names are duplicated in Figma, so implementation references must use IDs plus purpose.

| ID | Figma Name | Verified Purpose |
| --- | --- | --- |
| `193:73` | Products | Product listing grid with two columns, product cards, banner, search, bottom nav. |
| `193:176` | Products | City/stores discovery list with city cards: Delft, Rotterdam, Utrecht, Den Bosch. |
| `193:261` | Products | Shoproutes discovery with stores and "Start de shoproute". |
| `223:1836` | Products | Workshop listing with date/time cards and "Buy Ticket". |
| `193:363` | Retailers | "Onze locals" retailer list cards with ratings, product count, likes. |
| `193:465` | Retailers | Retailer/store detail with large image, stats, rating, address-like content. |
| `193:551` | Route | Shopping Route map with "You are here" and shop card. |
| `193:621` | Route | Shopping Route map variant with route markers and shop card. |
| `193:691` | Settings | Account settings menu with delivery address, notifications, language, terms, support, logout. |
| `193:750` | iPhone 13 Pro Max - 1 | Product detail with price, size/color selection, reviews, chat, add to cart. |
| `193:861` | iPhone 13 Pro Max - 3 | Chat/location permission screen; text appears unrelated to Local Spotter and needs confirmation. |
| `193:932` | Products | Home/category discovery page with switch tabs, search modal/categories, locals, product rows. |
| `193:1061` | Products | Shoproute search page with city-focused prompt and locals section. |
| `236:2089` | Products | Workshop search/discovery page with workshop cards and locals section. |
| `219:1624` | iPhone 13 Pro Max - 4 | Product detail variant. |
| `236:2343` | switch | Reusable segmented tab component: Producten, Workshops, Shoproutes. |
| `476:852` | subscription | Subscription selection without primary button in visible text. |
| `476:934` | profile | Business/store profile with products tab. |
| `476:1104` | add product | Empty add product form. |
| `476:1217` | add workshop | Empty add workshop form. |
| `476:1313` | add workshop | Update Shoproutes address screen. |
| `476:1357` | order product | Business order dashboard metrics. |
| `476:1427` | order product | Workshop ticket/order metrics. |
| `476:1489` | add workshop | Add Shoproutes address form. |
| `476:1551` | Retailers | Business profile with shop location map. |
| `476:1661` | Retailers | Business profile with workshop list and inactive workshop state. |
| `476:1855` | subscription | Subscription selection with NEXT. |
| `476:1955` | subscription | Subscription selection variant. |
| `476:2055` | subscription | Subscription selection variant with graphic stack. |
| `476:2156` | subscription payment | Payment summary with iDEAL, PayPal, Tikkie. |
| `476:2269` | SUCCESS | Shop Created Successfully screen. |
| `476:2326` | PAYMENT SUB | Payment form with subscription methods and card fields. |
| `476:2458` | PRIMARY BTN | Primary button instance: NEXT. |
| `476:2459` | SECONDARY BTN | Secondary button instance: PREVIOUS. |
| `476:2460` | login | Login form: Hello, email, password, LOGIN, social separator. |
| `476:2504` | signup | Signup form: name, email, password, confirm password. |
| `476:2534` | info | Empty business/store information form. |
| `476:2591` | add product | Add product form with color picker. |
| `476:2729` | add product | Populated add product form with product images. |
| `476:2850` | add workshop | Populated add workshop form. |
| `476:2955` | subscription | Login variant with entered email. |
| `476:3007` | subscription | Signup variant with entered values. |
| `476:3053` | subscription | Store info variant with entered business details. |
| `476:3119` | edit-2 | Small edit icon frame. |
| `552:1421` | unsplash:tyfqOL1FAQc | Standalone image asset. |
| `552:1422` | unsplash:5raPrOhbKQo | Standalone image asset. |
| `588:3371` | Products | Category modal/product discovery screen. |
| `632:1367` | Shoproutes | Shoproutes category modal screen. |
| `628:1389` | Vector | Standalone vector. |
| `632:1540` | Workshops | Workshop category modal screen. |
| `632:1641` | Vector | Standalone vector. |

## SELLER NEW Page Inventory

| ID | Figma Name | Verified Purpose |
| --- | --- | --- |
| `383:2237` | subscription | Subscription selection. |
| `476:3466` | subscription | Subscription selection with NEXT. |
| `476:3583` | subscription | Subscription selection variant. |
| `476:3748` | subscription | Subscription selection variant. |
| `383:2322` | profile | Seller store profile with products. |
| `454:1590` | add product | Seller add product form, includes optional shop-system product link. |
| `456:1987` | add workshop | Seller add workshop form. |
| `457:2326` | add workshop | Update Shoproutes address screen. |
| `457:3591` | order product | Seller product order dashboard metrics. |
| `459:915` | order product | Seller ticket order metrics. |
| `457:2471` | add workshop | Add Shoproutes address form. |
| `383:2487` | Retailers | Seller profile with map. |
| `383:2619` | Retailers | Seller profile with workshops and inactive workshop. |
| `383:2792` | subscription | Subscription selection with NEXT. |
| `383:2877` | subscription | Subscription selection variant. |
| `383:2962` | subscription | Subscription selection variant. |
| `476:3865` | subscription | Subscription selection variant. |
| `405:710` | subscription payment | Payment summary with iDEAL, PayPal, Tikkie. |
| `453:1248` | SUCCESS | Shop Created Successfully screen. |
| `409:1004` | PAYMENT SUB | Subscription payment form with card fields. |
| `478:4284` | PAYMENT SUB | Populated payment form variant. |
| `412:1201` | PRIMARY BTN | Primary button component. |
| `412:1202` | SECONDARY BTN | Secondary button component. |
| `438:772` | login | Seller login form. |
| `448:903` | signup | Seller signup form. |
| `454:1431` | info | Seller store info form. Fine details not re-read after connector failure, but mirrored by buyer `476:2534` inventory. |
| `457:2871` | add product | Add product variant. Fine details not re-read after connector failure. |
| `457:3033` | add product | Populated add product variant. Fine details not re-read after connector failure. |
| `457:3210` | add workshop | Populated add workshop variant. Fine details not re-read after connector failure. |
| `457:3321` | subscription | Login/subscription flow variant. Fine details not re-read after connector failure. |
| `457:3380` | subscription | Signup/subscription flow variant. Fine details not re-read after connector failure. |
| `457:3459` | subscription | Store info/subscription flow variant. Fine details not re-read after connector failure. |
| `466:871` | edit-2 | Small edit icon frame. |
| `478:4452` | iPhone 13 Pro Max - 1 | Product detail-like seller page. Fine details not re-read after connector failure. |
| `478:4644` | Route | Seller route screen. Fine details not re-read after connector failure. |
| `485:1232` | Settings | Seller settings page. Fine details not re-read after connector failure. |
| `491:1353` | subscription | Additional subscription frame. Fine details not re-read after connector failure. |

## Verified Screen-Level Details

### Product Listing `193:73`
- Background: `#F9F9F9`.
- Header: 428 x 120 pale pink `#FAE2F0`, bottom corner radius 20.
- Title: "Producten", Rubik Medium 20, `#111111`.
- Product grid: two columns, cards at 190 x 296, x positions 16 and 222.
- Product image: 190 x 190, 8px radius.
- Image overlay: pale pink `rgba(250,226,240,0.5)`, blur 2px, bottom-only radius around 7.8px.
- Product title: Manrope Bold 13, line height 150%.
- Pricing row: original price struck through Manrope Medium 12, sale price Manrope Bold 16.
- Counters: heart icon with red `#ED4C5C`, seen count with black icon.
- Rating: 14px star in golden `#D4B011`, Manrope Bold/Medium 11.7-12.
- Bottom nav: 428 x 97 white, top radius 20, shadow `0 -3 6 rgba(0,0,0,0.06)`, navy home indicator `#121F3E`.

### Discovery/Category Screens
- Segmented switch: `Producten`, `Workshops`, `Shoproutes`, width 394, height 68, background `#F4F5FA`, active pill `#FAE2F0`.
- Search prompts:
  - "Welk product zoek je?"
  - "In welke stad ga je winkelen?"
  - "Welke workshop zoek je?"
- Modal/category screens include "Popular Categories", "Search Category", and category labels such as Dress, Trousers, Furniture, Jacket, Beauty, Interior, Makeup, Panties, Bag, Electronic.
- Shoproutes modal categories include city labels such as Amsterdam, Rotterdam, Delft, Leiden, Gouda, Arnhem, Nijmegen, Groningen, Meppel, Leeuwarden.
- Workshop modal categories include Sieraden, Schoenen, Hoedjes, Interieuritems, Jewelrystores, Make up.

### Retailer/Profile Screens
- Retailer cards show avatar/image, business name, category, short description, like count, product count, rating and review count.
- Business profile screens include hero image, stats such as `4.8`, `(3.1k)`, `2k`, `80%`, store name, shop type, description, address, KVK number, and tab switch.
- Seller/buyer profile variants show products, map, workshops, and inactive workshop state.

### Route/Map Screens
- Route screens show map imagery/gradient, "You are here", a shop marker/card, title "Shopping Route", shop name, address, rating, and likes.
- Map UI in seller profile includes "Your store is here".
- Exact map provider UI is not verified. Figma uses image/shape-based map placeholders.

### Auth/Onboarding Screens
- Login: "Hello", "Sign in to your account", "Don't have an account sign up here", Email, Password, LOGIN, social separator "or".
- Signup: "Hi...", "Let's create an account", "Have an account log in here", Name, Email, Password, Confirm Password, SIGN UP, "or".
- Store info: "Complete information about your store", Store Name, State, City, Street, Phone Number, KVK Number, Shop Description, Shop Type, NEXT.
- Populated store info includes Bag shop horn center, Limburg, Horn, Mussenberg 128, phone, KVK number, and Bag Shop.

### Subscription/Payment Screens
- Subscription selection shows Webshop, Shoproutes, Workshop with EUR 50/100/150 per month and explanatory cards.
- Payment summary shows `Payment`, `Total Payment`, selected plan prices, and payment methods `Ideal`, `Paypal`, `Tikkie`.
- Payment form variants also include Card Number, Card Holder, Valid Until, CVV, NEXT, PREVIOUS.
- Success screen shows "Shop Created Successfully" and "GO TO MY SHOP".

### Seller Management Screens
- Add product: Product Name, Price, Stock, optional product link, Product Description, Sizes, colors, Product Images, CREATE.
- Product sizes verified in Figma: S, XS, M, L, XL, XXL. Requirements mention S, M, L, XL, XXL; XS needs client confirmation.
- Add workshop: Workshop Name, Price, Workshop Capacity, Workshop Location, Date, Workshop Description, Workshop Image, Time Start, Time Finish, CREATE.
- Orders dashboard: metrics for Orders Processing, Order Completed, On the way, Cancelled Orders, New Orders.
- Ticket metrics: Purchased Tickets, Cancelled Tickets, New Tickets Purchased.

## Reusable Components Verified
- `banner`: pale pink mobile header with menu icon, Local Spotter logo, status bar, avatar.
- `navbar`: fixed bottom mobile navigation with four icons and active dot indicators.
- `switch`: three-tab segmented control for Producten, Workshops, Shoproutes.
- `PRIMARY BTN`: 124 x 48, magenta fill `#FA1EFF`, white bold text.
- `SECONDARY BTN`: 124 x 48, pale pink fill `#FAE2F0`, magenta text.
- `header sign up`: auth/onboarding header graphic component.
- `modal`: category/search modal used on product/shoproute/workshop category screens.
- Product card pattern: image, translucent bottom overlay, heart/seen counters, price row, title, rating.
- Retailer card pattern: business image/avatar, category, description, metrics, rating.
- Workshop card pattern: date block, time, image, title, ticket button.

## Empty, Loading, and Error States
- No dedicated empty, loading, error, or skeleton states were verified in Figma.
- These must be designed from the verified visual language during implementation and clearly documented as technical states rather than Figma-provided screens.

## Desktop/Tablet Verification
- No desktop or tablet Figma layouts were found in accessible pages.
- Responsive behavior must be derived from mobile designs plus product requirements, with client review before final polish.

## Assumptions
- `BUYER NEW` and `SELLER NEW` are the current sources of truth; `OLD VERSION` is legacy.
- Duplicate frame names represent design iterations or variants, not necessarily separate app routes.
- Seller and buyer Figma pages intentionally share some auth/subscription/payment screens.
- The chat/location screen is likely leftover or exploratory and is not MVP scope unless confirmed.

## Unresolved Questions
- Which duplicated product/subscription/profile variants should be treated as canonical?
- Should the mobile bottom nav have exactly four destinations, and what are their final route names?
- Is the chat screen part of Local Spotter, or legacy content to ignore?
- Should payment card fields remain if iDEAL/PayPal/Tikkie are redirect methods?
- Should XS be supported as a clothing size?
- Are admin screens intentionally absent from Figma?
- Are any desktop designs available outside the accessible pages?

## Dependencies
- `03-UI-UX-DESIGN-SYSTEM.md` converts verified design details into implementation tokens.
- `04-PAGE-SCREEN-SPEC.md` maps verified frames to product routes.
- `17-RESPONSIVE-SPEC.md` defines responsive behavior where Figma is mobile-only.
