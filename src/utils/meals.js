import { inferMealType } from "./dates.js";

// Normalize Prisma camelCase → snake_case for display components
export function normalizeItem(item) {
  return {
    name: item.name,
    portion: item.portion,
    calories: item.calories,
    protein_g: item.proteinG ?? item.protein_g ?? 0,
    carbs_g: item.carbsG ?? item.carbs_g ?? 0,
    fat_g: item.fatG ?? item.fat_g ?? 0,
    fiber_g: item.fiberG ?? item.fiber_g ?? 0,
    sugar_g: item.sugarG ?? item.sugar_g ?? 0,
    multiplier: item.multiplier ?? 1.0,
  };
}

export function mealTotals(items) {
  return items.reduce(
    (acc, it) => {
      const n = normalizeItem(it);
      acc.calories += n.calories;
      acc.protein_g += n.protein_g;
      acc.carbs_g += n.carbs_g;
      acc.fat_g += n.fat_g;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function computeDailyTotals(meals) {
  return meals.reduce(
    (acc, m) => {
      const t = mealTotals(m.items);
      acc.calories += t.calories;
      acc.protein_g += t.protein_g;
      acc.carbs_g += t.carbs_g;
      acc.fat_g += t.fat_g;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 },
  );
}

export const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];
export const MEAL_TYPE_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function groupMealsByType(meals) {
  const groups = {};
  for (const meal of meals) {
    const type =
      meal.mealType ||
      meal.meal_type ||
      inferMealType(new Date(meal.scannedAt));
    if (!groups[type]) groups[type] = [];
    groups[type].push(meal);
  }
  return MEAL_TYPE_ORDER.filter((t) => groups[t]).map((t) => ({
    type: t,
    meals: groups[t],
  }));
}
