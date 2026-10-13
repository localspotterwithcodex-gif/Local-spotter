# LocalSpotter — Round 3 Fixes

Great sign from your screenshot: admin login now works end-to-end (Render + Vercel are correctly connected). This round fixes what you found on the admin portal + extends the same fixes to every portal.

## 1. Admin portal language toggle — only nav labels changed, content stayed Dutch
Real gap: the toggle mechanism itself was fine, but the admin sidebar and dashboard page had every string hardcoded in Dutch and never called `t(...)`. Fixed:
- `frontend/src/layouts/AdminLayout.tsx` — sidebar links, panel title, logout button.
- `frontend/src/app/(admin)/admin/page.tsx` — all dashboard headings, stat labels, card titles, buttons.
- Added ~25 new EN/NL dictionary entries under `admin.*` in `frontend/src/i18n/dictionaries.ts`.
- Also did the same for the **Owner** portal's sidebar (`OwnerSidebar.tsx`) — it already had unused `owner.*` dictionary keys from round 1 that were never actually wired in; now they are.

## 2. Redundant "Super Admin" pill
Removed. The account-avatar chip (previously showing "S Super Admin") is now hidden specifically for the `SUPER_ADMIN` role in both `TopNav` and `AppHeader`, since the black "Admin" button already goes to the same dashboard — no reason to show two links to the same place. Business owners and consumers still see their avatar chip as before.

## 3. Logout button not actually logging out / not redirecting
Found the real bug: `logout()` in `AuthContext` cleared the token and user state but never navigated anywhere — so if you were sitting on `/admin`, the already-rendered React page just stayed on screen with stale data until you manually clicked something else. Fixed by making `logout()` do a full `window.location.assign("/login")` after clearing state. This is a single fix in `AuthContext.tsx` that automatically corrects every logout button in every portal (admin sidebar, admin/owner headers, consumer account page) — no per-page changes needed.

## 4. Language toggle + logout across all portals
Covered by the fixes above — same `t()` pattern and same centralized `logout()` fix apply everywhere already (TopNav/AppHeader are shared across consumer, owner, and admin layouts).

## 5. Business owner + consumer test credentials
Added to `backend/prisma/seed.ts` (upserts existing seeded accounts, adding a short username + fixed password the same way the admin has):

| Role | Username | Password | Email (also works) |
|---|---|---|---|
| Business Owner | `owner` | `Owner@123` | eigenaar@boetiek-amsterdam.nl |
| Consumer | `consumer` | `Consumer@123` | sophie.vis@example.nl |

These reuse the existing seeded demo data (Boetiek Amsterdam with real products/workshops/reviews for the owner; a real order history hook for the consumer), so logging in immediately shows populated content instead of an empty account.

Run `npx prisma db seed` again to apply this — it's an upsert, so it's safe to re-run and won't duplicate anything. If you'd rather not re-run the seed, `backend/prisma/manual-supabase-admin-setup.sql` now also has two `UPDATE` statements you can paste into the Supabase SQL editor to set these two accounts' username/password directly (only works if those rows already exist from a prior seed run).

## Verified
`npm run build` in `frontend/` passes clean — 43 routes, zero TypeScript errors.

## Files touched this round
`frontend/src/features/auth/AuthContext.tsx`, `frontend/src/components/navigation/{TopNav.tsx,AppHeader.tsx,OwnerSidebar.tsx}`, `frontend/src/layouts/AdminLayout.tsx`, `frontend/src/app/(admin)/admin/page.tsx`, `frontend/src/i18n/dictionaries.ts`, `backend/prisma/seed.ts`, `backend/prisma/manual-supabase-admin-setup.sql`
