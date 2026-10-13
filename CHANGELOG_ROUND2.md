# LocalSpotter — Round 2 Fixes (this pass)

## The most important thing found this round

**Every login/signup/API call was failing for one root cause: the frontend was calling the wrong backend address entirely.**

`backend/.env.example` shows the real defaults: `PORT=4000`, `API_PREFIX=/api/v1` — so every endpoint actually lives at e.g. `http://localhost:4000/api/v1/auth/login`. The `apiClient` I wrote last round defaulted to `http://localhost:3001` with **no** `/api/v1` prefix — so every request was going to a URL that could never work, locally or deployed. This alone explains items 1 and 5 in your list (admin login failing, signup/login failing for every role). Fixed in `frontend/src/lib/api/client.ts`.

Two more contributing causes, also fixed:
- **CORS**: `backend/src/main.ts` only allowed a single hardcoded origin (`http://localhost:3000`). If you test the *deployed* Vercel site, the browser will silently block every API call unless the backend's `CORS_ORIGIN` includes that exact Vercel URL. Now supports a comma-separated list.
- **Case sensitivity**: typing `admin` (lowercase) didn't match the seeded username `Admin`. Login lookup is now case-insensitive for email and username.
- **Silent failures**: when the API is unreachable, `fetch()` throws before ever getting an HTTP response, and that error was being swallowed into a generic "Inloggen is mislukt." message. Now it surfaces a specific, actionable message: *"Kan geen verbinding maken met de server (‹url›). Controleer of de backend draait en of NEXT_PUBLIC_API_URL correct is ingesteld."*

### What you need to do for login to actually work
1. **Local testing**: run the backend (`cd backend && npm run start:dev`) and the frontend (`cd frontend && npm run dev`) together, with `frontend/.env.local` containing `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` (see the new `frontend/.env.example`). Testing against `local-spotter-ten.vercel.app` will **never** work unless the backend is also deployed publicly — a deployed frontend cannot reach `localhost` on your machine.
2. **Testing the live Vercel site**: deploy the backend somewhere public (Render/Railway/Fly.io/a Vercel serverless setup), set `NEXT_PUBLIC_API_URL` in the Vercel project's environment variables to that public URL + `/api/v1`, set the backend's `CORS_ORIGIN` to include `https://local-spotter-ten.vercel.app`, then redeploy both.

## Item-by-item

1. **Admin login failing** — root-caused and fixed above (wrong API URL + case sensitivity). Once your `NEXT_PUBLIC_API_URL` is set correctly and the backend is reachable from wherever you're testing, `Admin` / `Admin@123` (or lowercase `admin`) will work.
2. **Language toggle doing nothing** — real bug: I'd built the EN/NL toggle and dictionary last round but never actually called `t()` anywhere, so clicking it changed internal state with nothing rendering from it. Now wired into `TopNav`, `AppHeader`, the login page, and the signup page (nav labels, headings, form labels, buttons) — toggling EN/NL now visibly changes that chrome. Extend the same `t("key")` pattern to the remaining pages (products, account, owner sidebar, etc.) the same way.
3. **No visible "Logout" text while signed in** — added an explicit Logout button (icon + text) directly in both `TopNav` and `AppHeader`, always visible whenever `isAuthenticated` is true, in every portal.
4. **Buy icon not reflecting added products** — found the real bug: the cart *page* had its own separate hardcoded local state (a fake single item) completely disconnected from the `CartContext` the header badge reads. And the product page's "Add to Cart" button never touched any cart state at all — it just flashed a fake "added" animation. Both are now wired to the same shared `CartContext`: adding a product on the product page updates the header badge and shows up on the actual cart page.
5. **Can't sign up/log in as any role** — same root cause as item 1 (wrong API URL). Also worth noting: the "Wachtwoorden komen niet overeen" (passwords don't match) error in your screenshot is a real client-side check firing because the two password fields' contents genuinely differed — that part of the code is working correctly; just double check both fields when retyping.
6. **Site should show the login page first** — `frontend/src/middleware.ts` rewritten: previously only `/owner`, `/admin`, `/onboarding` required a session. Now the entire site requires being signed in — any link, including the homepage, redirects to `/login` if there's no session, except the auth pages themselves (`/login`, `/signup`, `/forgot-password`, `/reset-password`).

## Files touched this round
`frontend/src/lib/api/client.ts`, `frontend/.env.example` (new), `backend/src/main.ts`, `backend/.env.example`, `backend/src/auth/auth.service.ts`, `frontend/src/components/navigation/{TopNav.tsx,AppHeader.tsx}`, `frontend/src/app/(auth)/{login,signup}/page.tsx`, `frontend/src/app/products/[productId]/page.tsx`, `frontend/src/app/(consumer)/cart/page.tsx`, `frontend/src/middleware.ts`

Verified: `npm run build` in `frontend/` passes clean (43 routes, zero TypeScript errors) after all of the above.
