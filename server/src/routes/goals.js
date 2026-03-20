import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";

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
