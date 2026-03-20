# Macro.

AI-powered food macro tracker. Snap a photo → get instant nutritional breakdown.

Built with React + Vite, powered by Claude Sonnet's vision API.

## Setup

```bash
# Install dependencies
npm install

# Copy env and add your Anthropic API key
cp .env.example .env
# Edit .env with your key from https://console.anthropic.com/settings/keys

# Run dev server
npm run dev
```

Opens at `http://localhost:3000`

You can also skip the `.env` file and paste your API key directly in the app via the ⚙ button in the header.

## Build for production

```bash
npm run build
npm run preview
```

## How it works

1. Take a photo or upload from gallery
2. Claude Sonnet analyzes the image via the vision API
3. Returns structured JSON with per-item macros (calories, protein, carbs, fat, fiber, sugar)
4. Add to daily log to track running totals

## Cost

~$0.01 per scan using Sonnet. About $1-2/month for typical personal use.

## Notes

- The `anthropic-dangerous-direct-browser-access` header enables direct browser→API calls (CORS). Fine for personal use / prototyping, but for production you'd want a backend proxy.
- API key is stored in memory only (or via env var) — never persisted to disk or sent anywhere except Anthropic's API.
