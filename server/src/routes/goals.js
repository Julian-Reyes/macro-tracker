import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";
import { calculateMacros, VALID_ACTIVITY_LEVELS, VALID_GOAL_TYPES } from "../services/goals.js";

const prisma = new PrismaClient();
export const goalsRouter = Router();

goalsRouter.use(authenticate);

// GET /api/goals
goalsRouter.get("/", async (req, res) => {
  let goals = await prisma.dailyGoals.findUnique({
    where: { userId: req.userId },
  });

  if (!goals) {
    goals = await prisma.dailyGoals.create({
      data: { userId: req.userId },
    });
  }

  res.json(goals);
});

// PUT /api/goals
goalsRouter.put("/", async (req, res) => {
  const { calories, protein_g, carbs_g, fat_g } = req.body;

  const goals = await prisma.dailyGoals.upsert({
    where: { userId: req.userId },
    update: {
      ...(calories !== undefined && { calories }),
      ...(protein_g !== undefined && { proteinG: protein_g }),
      ...(carbs_g !== undefined && { carbsG: carbs_g }),
      ...(fat_g !== undefined && { fatG: fat_g }),
    },
    create: {
      userId: req.userId,
      calories: calories || 2200,
      proteinG: protein_g || 150,
      carbsG: carbs_g || 275,
      fatG: fat_g || 75,
    },
  });

  res.json(goals);
});

// GET /api/goals/profile
goalsRouter.get("/profile", async (req, res) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.userId },
    });
    res.json(profile || {});
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/goals/profile — save profile + auto-calculate and save goals
goalsRouter.put("/profile", async (req, res) => {
  try {
    const { heightCm, weightKg, age, sex, activityLevel, goalType } = req.body;

    if (!heightCm || !weightKg || !age || !sex || !activityLevel || !goalType) {
      return res.status(400).json({ error: "All profile fields are required" });
    }
    if (heightCm < 100 || heightCm > 250) return res.status(400).json({ error: "Height must be 100-250 cm" });
    if (weightKg < 30 || weightKg > 300) return res.status(400).json({ error: "Weight must be 30-300 kg" });
    if (age < 13 || age > 120) return res.status(400).json({ error: "Age must be 13-120" });
    if (!["male", "female"].includes(sex)) return res.status(400).json({ error: "Invalid sex value" });
    if (!VALID_ACTIVITY_LEVELS.includes(activityLevel)) return res.status(400).json({ error: "Invalid activity level" });
    if (!VALID_GOAL_TYPES.includes(goalType)) return res.status(400).json({ error: "Invalid goal type" });

    const profile = await prisma.userProfile.upsert({
      where: { userId: req.userId },
      update: { heightCm, weightKg, age, sex, activityLevel, goalType },
      create: { userId: req.userId, heightCm, weightKg, age, sex, activityLevel, goalType },
    });

    const calculated = calculateMacros({ heightCm, weightKg, age, sex, activityLevel, goalType });
    const goals = await prisma.dailyGoals.upsert({
      where: { userId: req.userId },
      update: { calories: calculated.calories, proteinG: calculated.proteinG, carbsG: calculated.carbsG, fatG: calculated.fatG },
      create: { userId: req.userId, calories: calculated.calories, proteinG: calculated.proteinG, carbsG: calculated.carbsG, fatG: calculated.fatG },
    });

    res.json({ profile, goals });
  } catch (err) {
    console.error("Save profile error:", err);
    res.status(500).json({ error: "Failed to save profile" });
  }
});
