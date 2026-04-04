import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.js";
import { analyzeFood } from "../services/ai.js";

function inferMealType(date) {
  const hour = date.getHours();
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { error: "Too many analysis requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: "Too many import requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const prisma = new PrismaClient();
export const mealsRouter = Router();

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// POST /api/meals/analyze - AI analysis only, no auth, no DB save (guest mode)
mealsRouter.post("/analyze", analyzeLimiter, upload.single("image"), async (req, res) => {
  try {
    let base64, mediaType;

    if (req.file) {
      base64 = req.file.buffer.toString("base64");
      mediaType = req.file.mimetype;
    } else if (req.body.image) {
      base64 = req.body.image;
      mediaType = req.body.mediaType || "image/jpeg";
    } else {
      return res.status(400).json({ error: "No image provided" });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(mediaType)) {
      return res.status(400).json({ error: "Invalid image type. Allowed: JPEG, PNG, WebP, HEIC" });
    }

    const provider = req.body.provider || undefined;
    const description = req.body.description || undefined;
    const lang = req.body.lang || undefined;
    const { data: analysis, provider: usedProvider } = await analyzeFood(base64, mediaType, provider, description, lang);

    res.json({ analysis, provider: usedProvider });
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// All routes below require authentication
mealsRouter.use(authenticate);

// POST /api/meals/import - bulk import guest meals on registration
mealsRouter.post("/import", importLimiter, async (req, res) => {
  try {
    const { meals } = req.body;
    if (!Array.isArray(meals) || meals.length === 0) {
      return res.status(400).json({ error: "No meals to import" });
    }
    if (meals.length > 50) {
      return res.status(400).json({ error: "Import limited to 50 meals at a time" });
    }

    let imported = 0;
    for (const m of meals) {
      await prisma.meal.create({
        data: {
          userId: req.userId,
          mealNotes: m.meal_notes || null,
          provider: m.provider || "gemini",
          mealType: m.mealType || null,
          scannedAt: m.scannedAt ? new Date(m.scannedAt) : new Date(),
          items: {
            create: (m.items || []).map((item) => ({
              name: item.name,
              portion: item.portion,
              calories: item.calories,
              proteinG: item.protein_g ?? item.proteinG ?? 0,
              carbsG: item.carbs_g ?? item.carbsG ?? 0,
              fatG: item.fat_g ?? item.fatG ?? 0,
              fiberG: item.fiber_g ?? item.fiberG ?? 0,
              sugarG: item.sugar_g ?? item.sugarG ?? 0,
              multiplier: item.multiplier ?? 1.0,
            })),
          },
        },
      });
      imported++;
    }

    res.status(201).json({ imported });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ error: "Import failed" });
  }
});

// POST /api/meals - save a pre-analyzed meal (after user edits portions)
mealsRouter.post("/", async (req, res) => {
  try {
    const { items, meal_notes, image, mediaType, mealType, isFavorite } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    // Save image to disk if provided
    let imageUrl = null;
    if (image) {
      if (mediaType && !ALLOWED_IMAGE_TYPES.includes(mediaType)) {
        return res.status(400).json({ error: "Invalid image type. Allowed: JPEG, PNG, WebP, HEIC" });
      }
      const uploadDir = process.env.UPLOAD_DIR || "./uploads";
      await mkdir(uploadDir, { recursive: true });
      const filename = `${randomUUID()}.jpg`;
      await writeFile(join(uploadDir, filename), Buffer.from(image, "base64"));
      imageUrl = `/uploads/${filename}`;
    }

    const meal = await prisma.meal.create({
      data: {
        userId: req.userId,
        imageUrl,
        mealNotes: meal_notes || null,
        provider: req.body.provider || "gemini",
        mealType: mealType || inferMealType(new Date()),
        isFavorite: isFavorite || false,
        items: {
          create: items.map((item) => ({
            name: item.name,
            portion: item.portion,
            calories: item.calories,
            proteinG: item.protein_g ?? item.proteinG ?? 0,
            carbsG: item.carbs_g ?? item.carbsG ?? 0,
            fatG: item.fat_g ?? item.fatG ?? 0,
            fiberG: item.fiber_g ?? item.fiberG ?? 0,
            sugarG: item.sugar_g ?? item.sugarG ?? 0,
            multiplier: item.multiplier ?? 1.0,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json({ meal });
  } catch (err) {
    console.error("Save meal error:", err);
    res.status(500).json({ error: "Failed to save meal" });
  }
});

// POST /api/meals/scan - analyze a food photo and save
mealsRouter.post("/scan", analyzeLimiter, upload.single("image"), async (req, res) => {
  try {
    let base64, mediaType;

    if (req.file) {
      // Multipart upload
      base64 = req.file.buffer.toString("base64");
      mediaType = req.file.mimetype;
    } else if (req.body.image) {
      // Base64 in JSON body
      base64 = req.body.image;
      mediaType = req.body.mediaType || "image/jpeg";
    } else {
      return res.status(400).json({ error: "No image provided" });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(mediaType)) {
      return res.status(400).json({ error: "Invalid image type. Allowed: JPEG, PNG, WebP, HEIC" });
    }

    const provider = req.body.provider || undefined;

    // Analyze with AI
    const { data: analysis, provider: usedProvider } = await analyzeFood(base64, mediaType, provider);

    // Save image to disk
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}.jpg`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, Buffer.from(base64, "base64"));

    // Save to database
    const meal = await prisma.meal.create({
      data: {
        userId: req.userId,
        imageUrl: `/uploads/${filename}`,
        mealNotes: analysis.meal_notes || null,
        provider: usedProvider,
        items: {
          create: analysis.items.map((item) => ({
            name: item.name,
            portion: item.portion,
            calories: item.calories,
            proteinG: item.protein_g,
            carbsG: item.carbs_g,
            fatG: item.fat_g,
            fiberG: item.fiber_g || 0,
            sugarG: item.sugar_g || 0,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json({
      meal,
      totals: analysis.totals,
      meal_notes: analysis.meal_notes,
    });
  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ error: "Scan failed" });
  }
});

// GET /api/meals?date=2026-03-20 - list meals for a day
mealsRouter.get("/", async (req, res) => {
  try {
    const dateStr = req.query.date;
    let startOfDay, endOfDay;

    if (dateStr) {
      const tzOffset = parseInt(req.query.tz) || 0;
      startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      startOfDay.setMinutes(startOfDay.getMinutes() + tzOffset);
      endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);
    } else {
      // Default to today
      const now = new Date();
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);
    }

    const meals = await prisma.meal.findMany({
      where: {
        userId: req.userId,
        scannedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { items: true },
      orderBy: { scannedAt: "asc" },
    });

    // Calculate daily totals
    const totals = meals.reduce(
      (acc, meal) => {
        for (const item of meal.items) {
          acc.calories += item.calories;
          acc.protein_g += item.proteinG;
          acc.carbs_g += item.carbsG;
          acc.fat_g += item.fatG;
          acc.fiber_g += item.fiberG;
          acc.sugar_g += item.sugarG;
        }
        return acc;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 }
    );

    res.json({ meals, totals });
  } catch (err) {
    console.error("List meals error:", err);
    res.status(500).json({ error: "Failed to fetch meals" });
  }
});

// GET /api/meals/history/range?from=2026-03-01&to=2026-03-20
// Must be before /:id so Express doesn't match "history" as an id param
mealsRouter.get("/history/range", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: "from and to required" });

    const tzOffset = parseInt(req.query.tz) || 0;
    const startOfRange = new Date(`${from}T00:00:00.000Z`);
    startOfRange.setMinutes(startOfRange.getMinutes() + tzOffset);
    const endOfRange = new Date(`${to}T00:00:00.000Z`);
    endOfRange.setMinutes(endOfRange.getMinutes() + tzOffset);
    const endOfLastDay = new Date(endOfRange.getTime() + 86400000 - 1);

    const meals = await prisma.meal.findMany({
      where: {
        userId: req.userId,
        scannedAt: { gte: startOfRange, lte: endOfLastDay },
      },
      include: { items: true },
      orderBy: { scannedAt: "asc" },
    });

    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// GET /api/meals/favorites - all favorited meals
mealsRouter.get("/favorites", async (req, res) => {
  try {
    const meals = await prisma.meal.findMany({
      where: { userId: req.userId, isFavorite: true },
      include: { items: true },
      orderBy: { scannedAt: "desc" },
    });
    res.json(meals);
  } catch (err) {
    console.error("Favorites error:", err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// GET /api/meals/recent?days=14 - deduplicated recent meals
mealsRouter.get("/recent", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const meals = await prisma.meal.findMany({
      where: { userId: req.userId, scannedAt: { gte: since } },
      include: { items: true },
      orderBy: { scannedAt: "desc" },
    });

    // Deduplicate by sorted item name fingerprint
    const seen = new Set();
    const deduplicated = meals.filter((meal) => {
      const fp = meal.items
        .map((i) => i.name.trim().toLowerCase())
        .sort()
        .join("|");
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });

    res.json(deduplicated.slice(0, 20));
  } catch (err) {
    console.error("Recent meals error:", err);
    res.status(500).json({ error: "Failed to fetch recent meals" });
  }
});

// PATCH /api/meals/:id/favorite - toggle favorite status
mealsRouter.patch("/:id/favorite", async (req, res) => {
  try {
    const { isFavorite } = req.body;
    const existing = await prisma.meal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Meal not found" });

    const meal = await prisma.meal.update({
      where: { id: existing.id },
      data: { isFavorite: !!isFavorite },
    });
    res.json({ meal });
  } catch (err) {
    console.error("Toggle favorite error:", err);
    res.status(500).json({ error: "Failed to update favorite" });
  }
});

// GET /api/meals/:id - single meal detail
mealsRouter.get("/:id", async (req, res) => {
  const meal = await prisma.meal.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { items: true },
  });
  if (!meal) return res.status(404).json({ error: "Meal not found" });
  res.json(meal);
});

// PUT /api/meals/:id - update an existing meal
mealsRouter.put("/:id", async (req, res) => {
  try {
    const { items, mealType, meal_notes } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    const existing = await prisma.meal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Meal not found" });

    const meal = await prisma.$transaction(async (tx) => {
      await tx.mealItem.deleteMany({ where: { mealId: existing.id } });
      return tx.meal.update({
        where: { id: existing.id },
        data: {
          mealType: mealType ?? existing.mealType,
          mealNotes: meal_notes ?? existing.mealNotes,
          items: {
            create: items.map((item) => ({
              name: item.name,
              portion: item.portion,
              calories: item.calories,
              proteinG: item.protein_g ?? item.proteinG ?? 0,
              carbsG: item.carbs_g ?? item.carbsG ?? 0,
              fatG: item.fat_g ?? item.fatG ?? 0,
              fiberG: item.fiber_g ?? item.fiberG ?? 0,
              sugarG: item.sugar_g ?? item.sugarG ?? 0,
              multiplier: item.multiplier ?? 1.0,
            })),
          },
        },
        include: { items: true },
      });
    });

    res.json({ meal });
  } catch (err) {
    console.error("Update meal error:", err);
    res.status(500).json({ error: "Failed to update meal" });
  }
});

// DELETE /api/meals/:id
mealsRouter.delete("/:id", async (req, res) => {
  try {
    const meal = await prisma.meal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!meal) return res.status(404).json({ error: "Meal not found" });
    await prisma.mealItem.deleteMany({ where: { mealId: meal.id } });
    await prisma.meal.delete({ where: { id: meal.id } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});
