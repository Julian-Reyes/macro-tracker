import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { authenticate } from "../middleware/auth.js";
import { analyzeFood } from "../services/ai.js";

const prisma = new PrismaClient();
export const mealsRouter = Router();

mealsRouter.use(authenticate);

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// POST /api/meals/scan - analyze a food photo and save
mealsRouter.post("/scan", upload.single("image"), async (req, res) => {
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
    res.status(500).json({ error: err.message || "Scan failed" });
  }
});

// GET /api/meals?date=2026-03-20 - list meals for a day
mealsRouter.get("/", async (req, res) => {
  try {
    const dateStr = req.query.date;
    let startOfDay, endOfDay;

    if (dateStr) {
      startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
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

    const meals = await prisma.meal.findMany({
      where: {
        userId: req.userId,
        scannedAt: {
          gte: new Date(`${from}T00:00:00.000Z`),
          lte: new Date(`${to}T23:59:59.999Z`),
        },
      },
      include: { items: true },
      orderBy: { scannedAt: "asc" },
    });

    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
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
