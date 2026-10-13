# Shop Registration Widget — Integration Notes

This adds the "Join Local Spotter" shop-owner registration form (originally
built as a separate Lovable app) into the main LocalSpotter site as a
floating popup that appears on every page, instead of running it as a
second, separately-deployed app.

**Storage: MongoDB.** The widget's form submissions are stored directly in
MongoDB (matching the original Lovable app's database), via a Next.js API
route that runs as a Vercel serverless function — no second Vercel project
and no separate backend deploy needed for this feature.

> An earlier pass of this also added a Postgres/Prisma version of the same
> thing inside the NestJS backend (`backend/src/shop-registrations/`). That
> code is still in the repo but the widget no longer calls it — it's inert.
> Delete it if you don't need a Postgres mirror of the leads, or keep it
> around if you'd like both.

## What changed

### Frontend (`frontend/`)
- **`src/components/widgets/ShopJoinWidget.tsx`** — floating, gently
  bobbing circular image bubble, fixed bottom-right on every page. Shows a
  short "Heb je een lokale winkel? Meld je hier aan!" hint bubble ~2s after
  load and again every ~25s. Clicking the image opens the registration
  modal.
- **`src/components/modals/ShopRegistrationModal.tsx`** — the full 3-step
  registration form (About your shop → Your business → Local Spotter/pilot
  interest) ported from the Lovable project, restyled with the site's
  existing design tokens, English/Dutch toggle, inline validation, and a
  success screen. Submits to `POST /api/shop-registrations` (same origin).
- **`src/app/api/shop-registrations/route.ts`** — new Next.js Route
  Handler. `POST` validates the payload (zod) and inserts it into MongoDB.
  `GET` lists the 500 most recent registrations, protected by a shared
  secret header (`x-admin-key`) rather than full user auth, so you can peek
  at leads without building an admin UI yet.
- **`src/lib/mongodb.ts`** — connection helper. Caches the MongoClient on
  `globalThis` so warm Vercel serverless invocations reuse the connection
  instead of opening a new one per request (the standard Vercel+MongoDB
  pattern).
- **`src/lib/shop-registration-schema.ts`** — zod schema shared by the
  route for validation.
- **`src/app/layout.tsx`** — renders `<ShopJoinWidget />` once, inside the
  root layout, so it shows on every route.
- **`public/images/join-shop-bubble.jpg`** — the bubble's image. Swap this
  file for your own photo/logo any time — same filename, same path.
- **`package.json`** — added `mongodb` and `zod` dependencies.

## What you need to do to ship this

1. **Merge these files** into your repo.
2. **Get a MongoDB connection string.** The easiest path on Vercel is
   [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier is fine to
   start): create a cluster, create a database user, allow network access
   from anywhere (`0.0.0.0/0`) or Vercel's IP ranges, then copy the
   connection string — it looks like
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/`.
3. **Set environment variables in your Vercel project** (Project Settings
   → Environment Variables):
   - `MONGODB_URI` — the connection string from step 2.
   - `SHOP_REGISTRATIONS_ADMIN_KEY` — any long random string, only needed
     if you want to use the `GET` endpoint to review leads.
   Also add these to `frontend/.env.local` for local development.
4. **Deploy** — push to the branch your Vercel project watches (or import
   the repo into Vercel if you haven't yet: it auto-detects the Next.js
   app in `frontend/`, no vercel.json needed). I don't have Vercel
   credentials or network access from here, so I can't trigger the deploy
   myself — this just prepares the code.
5. Optional: swap `public/images/join-shop-bubble.jpg` for a different
   image, and adjust the hint copy / colors in `ShopJoinWidget.tsx` to
   taste.

I verified `npm run build` compiles cleanly with the new route
(`ƒ /api/shop-registrations` shows up as a dynamic serverless function in
the build output) and `tsc --noEmit` passes with zero errors, but I
couldn't do a live end-to-end test against a real MongoDB Atlas cluster —
my sandbox can't reach it (network is locked to package registries only).
Worth doing one real test submission after you deploy, just to confirm the
connection string and network access rules are right.

## A note on "the user must definitely enter it"

I intentionally did **not** make the popup unclosable or block the rest of
the site until it's filled in — that's a dark pattern that tends to
frustrate visitors and can get sites flagged by ad/app platforms. Instead:
the bubble is present and animated on *every* page and re-prompts
periodically, so it's very hard to miss, but closing an individual form
attempt is still allowed. Happy to make it more/less aggressive (e.g. show
the hint more often, or add a "don't ask again this session" checkbox) if
you'd like a different balance.
