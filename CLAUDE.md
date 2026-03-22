# Macro Tracker

## Project Overview
AI-powered food macro tracker. User takes a photo of food/drink → AI analyzes it → returns structured nutritional data (calories, protein, carbs, fat, fiber, sugar) per item with totals. Daily log accumulates meals with running totals. Designed for single-user now, multi-user later.

## Architecture

```
macro-tracker/
├── src/                  # React frontend (Vite)
│   ├── App.jsx           # Main app (auth flow, scan, daily log)
│   ├── AuthScreen.jsx    # Login/register UI
│   ├── api.js            # API client, token mgmt, image downscaling
│   └── main.jsx          # React entry
├── server/               # Express backend
│   ├── prisma/
│   │   └── schema.prisma # DB schema (SQLite via Prisma)
│   └── src/
│       ├── index.js      # Express entry, mounts routes, serves static build
│       ├── middleware/
│       │   └── auth.js   # JWT authenticate middleware + signToken
│       ├── routes/
│       │   ├── auth.js   # POST /register, /login, GET /me
│       │   ├── meals.js  # POST /scan, GET /, GET /history/range, GET /:id, DELETE /:id
│       │   ├── nutrition.js  # GET /lookup?food=...
│       │   └── goals.js  # GET /, PUT /
│       └── services/
│           ├── ai.js     # Multi-provider AI dispatcher (Anthropic, Gemini, OpenAI, Ollama)
│           └── nutrition.js  # USDA + Open Food Facts lookup with DB cache
├── index.html
├── vite.config.js        # Dev proxy: /api + /uploads → localhost:3001
├── Dockerfile            # Production build for Fly.io
├── fly.toml              # Fly.io deployment config
└── package.json          # Frontend deps
```

## Tech Stack
- **Frontend**: React 18 + Vite 6, inline styles, DM Sans + Instrument Serif
- **Backend**: Express, Node.js ES modules
- **Database**: SQLite via Prisma ORM (upgrade path: Neon Postgres when scaling)
- **Auth**: JWT (bcryptjs for passwords), username-based login, token stored in localStorage. Server requires `JWT_SECRET` env var (crashes if missing)
- **AI**: Multi-provider — Anthropic Claude, Google Gemini, OpenAI GPT-4o, Ollama local
- **Nutrition data**: USDA FoodData Central API + Open Food Facts (cached in DB)
- **Image storage**: Local disk (swap for Cloudflare R2 when scaling)
- **Image optimization**: Client-side canvas downscaling to max 1024px before upload
- **Hosting**: Fly.io (free tier) — serves Express + static React build from single instance

## Setup

### Frontend
```bash
npm install
npm run dev          # localhost:3000 (proxies /api → :3001)
```

### Backend
```bash
cd server
npm install
cp .env.example .env  # fill in JWT_SECRET, GEMINI_API_KEY
npx prisma db push    # create SQLite DB + tables
npm run dev           # localhost:3001
```

### Production Build
```bash
npm run build                    # builds React to /dist
node server/src/index.js         # serves both API + static build
```

### Deploy to Fly.io
```bash
fly launch                       # first time: creates app + volume
fly secrets set JWT_SECRET=... GEMINI_API_KEY=...
fly deploy
```

## API Endpoints

All authenticated routes require `Authorization: Bearer <token>` header. Guest endpoints (`/api/meals/analyze`) require no auth.

### Auth
- `POST /api/auth/register` — `{ username, password, name? }` → `{ token, user }` — username: 3-20 chars, alphanumeric + underscores; password: min 6 chars
- `POST /api/auth/login` — `{ username, password }` → `{ token, user }`
- `GET /api/auth/me` — returns current user

### Meals
- `POST /api/meals/analyze` — **no auth** — AI analysis only, returns result without saving (guest mode)
- `POST /api/meals/scan` — multipart image OR `{ image: base64, mediaType, provider? }` → analyzes + saves
- `POST /api/meals/import` — bulk import guest meals on registration `{ meals: [...] }`
- `GET /api/meals?date=2026-03-20` — list meals for a day with totals
- `GET /api/meals/history/range?from=...&to=...` — date range query
- `GET /api/meals/:id` — single meal with items
- `DELETE /api/meals/:id` — deletes meal + items

### Nutrition
- `GET /api/nutrition/lookup?food=chicken+breast` — USDA/OFF lookup with cache

### Goals
- `GET /api/goals` — current daily macro goals
- `PUT /api/goals` — `{ calories, protein_g, carbs_g, fat_g }`

## AI Provider System
The `services/ai.js` dispatches to the configured provider. Set `AI_PROVIDER` in .env or pass `provider` in the scan request body. Each provider has its own request format but returns the same JSON schema.

Providers: `anthropic`, `gemini`, `openai`, `ollama`

Gemini is the default (free tier, no billing needed). Ollama requires a local install with llama3.2-vision pulled.

## Design System
- **Background**: #0C0C0E (near-black)
- **Accent gold**: #E8C872 (calories, primary actions)
- **Protein green**: #7BE0AD
- **Carbs blue**: #72B4E8
- **Fat red**: #E87272
- **Typography**: Instrument Serif for logo, DM Sans for everything else
- **Layout**: Max-width 480px, mobile-first

## Current State

### What works
- Frontend: guest mode (try before sign up), login/register screens (shown as overlay), camera/gallery capture, base64 encoding + client-side downscaling, AI analysis via backend API, results display with macro rings and item breakdown, persistent daily log (localStorage for guests, DB for authenticated), delete meals, goals-based MacroRing max values, guest data migration to DB on registration, logo click navigates to fresh scan, scan state resets after adding meal to log, date-based daily view with prev/next navigation (meals and totals filtered per day for both guest and authenticated modes), meal detail view (click any logged meal to see full macro breakdown, image, item list, and notes), guest meal images persisted as downscaled data URLs in localStorage
- Backend: all routes working, SQLite via Prisma, AI multi-provider dispatcher, USDA + Open Food Facts lookup with DB caching, JWT auth (crashes if JWT_SECRET missing), rate limiting on analyze + scan endpoints, serves static React build in production, guest analyze endpoint (no auth), bulk import endpoint for guest data migration, sanitized error messages (generic errors to client, full details server-side only)
- Deployment: Dockerfile + fly.toml ready for Fly.io
- Dev access: Vite configured with `host: true` for LAN access (phone testing via local IP)

### What could be improved
- The nutrition lookup service exists but nothing in the scan flow uses it yet — future enhancement is to cross-reference AI estimates against USDA data
- No goals editing UI — PUT /api/goals endpoint exists but no frontend for it yet

## AI Response Schema
Every provider must return this exact JSON (enforced by system prompt):
```json
{
  "items": [
    {
      "name": "Grilled chicken breast",
      "portion": "6 oz",
      "calories": 280,
      "protein_g": 52.0,
      "carbs_g": 0.0,
      "fat_g": 6.2,
      "fiber_g": 0.0,
      "sugar_g": 0.0
    }
  ],
  "totals": {
    "calories": 280,
    "protein_g": 52.0,
    "carbs_g": 0.0,
    "fat_g": 6.2,
    "fiber_g": 0.0,
    "sugar_g": 0.0
  },
  "meal_notes": "High protein, low carb meal. Consider adding vegetables for fiber."
}
```

## Key Decisions & Context
- **Why Fly.io**: Free tier, always-on (no cold starts), persistent volumes for SQLite + uploads, single deployment for both frontend and backend
- **Why SQLite**: Zero cost, zero latency (same machine), Prisma makes it trivial to swap to Postgres later. Perfect for single-user
- **Why Gemini as default**: Free tier, no credit card, ~10 RPM — enough for personal use at zero cost
- **Why USDA + Open Food Facts**: USDA is the gold standard for US foods. OFF has better coverage for Brazilian products (important — the developer plans to market this in Brazil)
- **Why guest mode**: Better UX — users can try the app immediately without creating an account. Data stored in localStorage until they register, then migrated to DB via `/api/meals/import`
- **Why JWT over sessions**: Stateless, works with mobile/PWA, no session store needed
- **Why local disk for images**: Simplest starting point. Plan is Cloudflare R2 (10GB free) when deploying at scale. The image_url column stores a relative path that's easy to swap later
- **Ollama integration**: For fully local/free operation. User has an M1 Mac Mini (16GB) that can run llama3.2-vision (11B, Q4, ~7.9GB). Ollama serves an OpenAI-ish API at localhost:11434

## Scaling Path
When ready for more users:
1. **Database**: Change `provider = "sqlite"` → `"postgresql"` in schema.prisma, point at Neon (free tier)
2. **Images**: Swap local disk → Cloudflare R2 (~20 lines in meals.js)
3. **Server**: Run multiple Fly.io instances (JWT is already stateless)

## Guest Mode Flow
- **No login gate**: App loads directly into the main UI
- **Guest scans**: `POST /api/meals/analyze` (no auth) → result + downscaled image (data URL) stored in localStorage via `addGuestMeal()`
- **Guest daily log**: Reads from `getGuestMealsByDate(selectedDate)` (localStorage, filtered by local date)
- **Guest deletes**: Index-based `deleteGuestMeal(index)` on localStorage array
- **Registration**: AuthScreen shown as overlay → on success, `importMeals()` sends localStorage meals to DB → `clearGuestMeals()` → app switches to authenticated mode
- **Authenticated scans**: `POST /api/meals/scan` (with auth) → saved directly to DB
- **Authenticated daily log**: Reads from `GET /api/meals?date=...`
- **Sign-up prompt**: Banner shown in daily log for guests with meals

## Security
- **JWT_SECRET**: Required env var — server crashes on startup if not set. Use a random 32-byte hex string in production (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- **Helmet**: Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.) via `helmet` middleware
- **Rate limiting**: `/api/meals/analyze` and `/api/meals/scan` are rate-limited to 10 requests per 15 minutes per IP. `/api/auth/login` and `/api/auth/register` are rate-limited to 10 attempts per 15 minutes per IP. All via `express-rate-limit`
- **Gemini API key restrictions**: Key restricted to Generative Language API only in Google Cloud Console. Free tier quotas enforce 5 RPM and 20 requests/day for gemini-2.5-flash
- **CORS**: Currently open (`cors()` with no config) — restrict to your domain before deploying publicly
- **API key in .env**: Gemini key is server-side only, never sent to the browser. Gemini's API passes the key as a URL query param — be aware this can appear in server/proxy logs
- **Error messages**: Some routes send `err.message` to the client, which can leak internals from Prisma or AI providers — sanitize before public deployment
- **Input validation**: Username must be 3-20 chars (letters, numbers, underscores). Password must be at least 6 chars. Validated server-side in auth routes
- **Remaining hardening** (not yet implemented):
  - Validate uploaded file types (check mediaType is actually an image)
  - Cap `/api/meals/import` array size
  - ~~Sanitize error messages~~ ✅ All routes return generic error messages; full errors logged server-side only
  - Restrict CORS to specific origin via env var
  - Short-lived access tokens + refresh token rotation (currently 30-day JWTs with no revocation)
- **Future options for hardening `/analyze` (unauthenticated)**:
  - API key or CAPTCHA on guest analyze endpoint
  - Fingerprint-based rate limiting (harder to bypass than IP-based)
  - Require auth for all scan endpoints (remove guest mode)

## Known Gotchas
- Ollama's llama3.2-vision sometimes wraps JSON in markdown fences — the `cleaned` regex in ai.js handles this but may need hardening
- Gemini uses `systemInstruction` not `system` in the request body — already handled in ai.js
- Prisma field names use camelCase (proteinG) but the AI returns snake_case (protein_g) — the meals route maps between them when saving, and `normalizeItem()` in App.jsx maps back for display
- The multer upload and base64 JSON body are both supported in POST /scan — frontend uses base64 JSON
- The Vite dev proxy handles /api and /uploads routing to :3001 — in production Express serves everything from one port
- Guest meal images are stored as data URLs in localStorage (~50-200KB each). localStorage has a ~5MB limit, so this works for ~25-100 guest meals before hitting the cap — fine for "try before sign up" usage

## Planned Improvements
- [x] Connect frontend to backend API
- [x] Add login/register UI screens
- [x] Image downscaling before upload
- [x] Dockerfile for deployment
- [x] Guest mode (try before sign up) with localStorage + DB migration
- [x] Rate limiting on scan endpoint
- [x] Date-based daily view with navigation (prev/next day, "Today" quick-jump)
- [ ] PWA manifest + service worker for installable mobile app
- [ ] Swap image storage to Cloudflare R2 when scaling
- [ ] Weekly/monthly trends view with charts
- [ ] Portuguese language support
- [ ] Model switcher UI (dropdown in settings to pick AI provider)
- [ ] Goals editing UI
- [ ] Enhance accuracy: use AI for food identification + USDA for verified macros

## Enterprise Feature Roadmap

### Tier 1 — High impact, moderate effort
1. **Manual food entry / text search** — Let users type "chicken breast 6oz" and get macros. Leverage the existing USDA/OFF nutrition lookup service (`services/nutrition.js`) that's built but unused in the scan flow
2. **Meal type labels** — Categorize as Breakfast / Lunch / Dinner / Snack. Group meals visually in the daily log
3. **Goals editing UI** — The `PUT /api/goals` endpoint exists, just needs a settings screen with sliders/inputs for calorie and macro targets
4. **Weekly summary view** — Bar chart showing daily calories/protein over the past 7 days using the existing `/history/range` endpoint
5. **Favorite/recent meals** — Quick re-log common meals without re-scanning. Save templates from previous scans

### Tier 2 — Differentiating features
6. **Weight tracking** — Daily weigh-in log + trend line chart. Critical for users tracking cut/bulk progress
7. **Streak & consistency** — Show logging streak (e.g., "12 day streak"), daily check marks on a calendar heatmap
8. **Water intake tracker** — Simple +250ml button with daily target and progress ring
9. **Meal editing** — Adjust portion sizes or macros after AI analysis (AI is an estimate — users need to correct)
10. **Remaining macros** — Show "X calories left" / "X g protein left" prominently, not just totals vs. goals

### Tier 3 — Pro / monetization tier
11. **Barcode scanner** — Scan packaged food UPC, query Open Food Facts API for exact nutrition
12. **Progress photos** — Monthly body photos stored alongside weight data
13. **Macro distribution settings** — Different goals for training vs. rest days
14. **Export / share** — CSV export, share daily summary as image (Instagram-ready)
15. **AI meal suggestions** — "I have 400 cal and 35g protein left today" → AI suggests meals that fit

### Tier 4 — Scale & polish
16. **PWA + offline** — Service worker for installable mobile app, offline meal logging
17. **Push notifications** — Meal logging reminders
18. **Portuguese language** — Important for Brazil market
19. **Social / accountability** — Share streaks, compare with friends
20. **Multi-language AI prompts** — AI recognizes Brazilian dishes natively

## Conventions
- Frontend: inline React styles, split into components when complexity demands it (App.jsx, AuthScreen.jsx, api.js)
- Backend: ES modules, flat service layer, Prisma for all DB access
- Animations: CSS @keyframes in a <style> tag inside root component
- New backend routes go in server/src/routes/ with their own Router
- Keep AI provider logic in services/ai.js — add new providers there
- API client centralizes all fetch calls, token management, 401 handling, and guest localStorage helpers in src/api.js
- Guest mode: `analyzeMeal()` for no-auth scans, `getGuestMeals()`/`getGuestMealsByDate()`/`addGuestMeal()`/`deleteGuestMeal()`/`clearGuestMeals()` for localStorage, `importMeals()` for DB migration
- Date helpers: `toLocalDateStr()` for consistent YYYY-MM-DD in local timezone, `formatDisplayDate()` for user-facing date strings
