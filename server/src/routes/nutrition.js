import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { lookupNutrition } from "../services/nutrition.js";

export const nutritionRouter = Router();

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
