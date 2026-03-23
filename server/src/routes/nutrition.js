import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.js";
import { lookupNutrition, searchNutritionMultiple } from "../services/nutrition.js";

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many search requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const nutritionRouter = Router();

// GET /api/nutrition/search?q=chicken+breast&limit=5 — no auth (guest-accessible)
nutritionRouter.get("/search", searchLimiter, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "q query param required" });

    const limit = Math.min(parseInt(req.query.limit) || 5, 10);
    const results = await searchNutritionMultiple(q, limit);
    res.json({ results });
  } catch (err) {
    console.error("Nutrition search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// All routes below require authentication
nutritionRouter.use(authenticate);

// GET /api/nutrition/lookup?food=chicken+breast
nutritionRouter.get("/lookup", async (req, res) => {
  try {
    const food = req.query.food;
    if (!food) return res.status(400).json({ error: "food query param required" });

    const result = await lookupNutrition(food);
    if (!result) {
      return res.status(404).json({ error: "No nutrition data found", query: food });
    }

    res.json(result);
  } catch (err) {
    console.error("Nutrition lookup error:", err);
    res.status(500).json({ error: "Lookup failed" });
  }
});
