// Mifflin-St Jeor BMR → TDEE → macro split calculator

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,    // Little or no exercise
  light: 1.375,      // Light exercise 1-3 days/week
  moderate: 1.55,    // Moderate exercise 3-5 days/week
  active: 1.725,     // Hard exercise 6-7 days/week
  very_active: 1.9,  // Very hard exercise, physical job
};

const MACRO_SPLITS = {
  lose_weight: { protein: 0.35, carbs: 0.35, fat: 0.30 },
  maintain:    { protein: 0.30, carbs: 0.40, fat: 0.30 },
  gain_muscle: { protein: 0.30, carbs: 0.45, fat: 0.25 },
};

const CALORIE_ADJUSTMENTS = {
  lose_weight: -500,
  maintain: 0,
  gain_muscle: 300,
};

export const VALID_ACTIVITY_LEVELS = Object.keys(ACTIVITY_MULTIPLIERS);
export const VALID_GOAL_TYPES = Object.keys(MACRO_SPLITS);

export function calculateMacros({ heightCm, weightKg, age, sex, activityLevel, goalType }) {
  // BMR via Mifflin-St Jeor
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  bmr += sex === "male" ? 5 : -161;

  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55);
  const calories = Math.round(tdee + (CALORIE_ADJUSTMENTS[goalType] || 0));

  const split = MACRO_SPLITS[goalType] || MACRO_SPLITS.maintain;
  const proteinG = Math.round((calories * split.protein) / 4);
  const carbsG = Math.round((calories * split.carbs) / 4);
  const fatG = Math.round((calories * split.fat) / 9);

  return { calories, proteinG, carbsG, fatG, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}
