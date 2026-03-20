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
- **Auth**: JWT (bcryptjs for passwords), token stored in localStorage
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

All /api/meals, /api/nutrition, /api/goals routes require `Authorization: Bearer <token>` header.

### Auth
- `POST /api/auth/register` — `{ email, password, name? }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` — returns current user

### Meals
- `POST /api/meals/scan` — multipart image OR `{ image: base64, mediaType, provider? }` → analyzes + saves
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
- Frontend: login/register screens, camera/gallery capture, base64 encoding + client-side downscaling, AI analysis via backend API, results display with macro rings and item breakdown, persistent daily log from database, delete meals, goals-based MacroRing max values
- Backend: all routes working, SQLite via Prisma, AI multi-provider dispatcher, USDA + Open Food Facts lookup with DB caching, JWT auth, serves static React build in production
- Deployment: Dockerfile + fly.toml ready for Fly.io

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
- **Why JWT over sessions**: Stateless, works with mobile/PWA, no session store needed
- **Why local disk for images**: Simplest starting point. Plan is Cloudflare R2 (10GB free) when deploying at scale. The image_url column stores a relative path that's easy to swap later
- **Ollama integration**: For fully local/free operation. User has an M1 Mac Mini (16GB) that can run llama3.2-vision (11B, Q4, ~7.9GB). Ollama serves an OpenAI-ish API at localhost:11434

## Scaling Path
When ready for more users:
1. **Database**: Change `provider = "sqlite"` → `"postgresql"` in schema.prisma, point at Neon (free tier)
2. **Images**: Swap local disk → Cloudflare R2 (~20 lines in meals.js)
3. **Server**: Run multiple Fly.io instances (JWT is already stateless)

## Known Gotchas
- Ollama's llama3.2-vision sometimes wraps JSON in markdown fences — the `cleaned` regex in ai.js handles this but may need hardening
- Gemini uses `systemInstruction` not `system` in the request body — already handled in ai.js
- Prisma field names use camelCase (proteinG) but the AI returns snake_case (protein_g) — the meals route maps between them when saving, and `normalizeItem()` in App.jsx maps back for display
- The multer upload and base64 JSON body are both supported in POST /scan — frontend uses base64 JSON
- The Vite dev proxy handles /api and /uploads routing to :3001 — in production Express serves everything from one port

## Planned Improvements
- [x] Connect frontend to backend API
- [x] Add login/register UI screens
- [x] Image downscaling before upload
- [x] Dockerfile for deployment
- [ ] PWA manifest + service worker for installable mobile app
- [ ] Swap image storage to Cloudflare R2 when scaling
- [ ] Weekly/monthly trends view with charts
- [ ] Portuguese language support
- [ ] Model switcher UI (dropdown in settings to pick AI provider)
- [ ] Goals editing UI
- [ ] Enhance accuracy: use AI for food identification + USDA for verified macros
- [ ] Rate limiting on scan endpoint

## Conventions
- Frontend: inline React styles, split into components when complexity demands it (App.jsx, AuthScreen.jsx, api.js)
- Backend: ES modules, flat service layer, Prisma for all DB access
- Animations: CSS @keyframes in a <style> tag inside root component
- New backend routes go in server/src/routes/ with their own Router
- Keep AI provider logic in services/ai.js — add new providers there
- API client centralizes all fetch calls, token management, and 401 handling in src/api.js
