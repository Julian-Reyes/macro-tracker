import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- USDA FoodData Central ---
async function searchUSDA(query) {
  const key = process.env.USDA_API_KEY;
  if (!key) return null;

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(query)}&pageSize=1&dataType=Survey%20(FNDDS)`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const food = data.foods?.[0];
  if (!food) return null;

  const get = (name) => food.foodNutrients?.find((n) => n.nutrientName === name)?.value || 0;

  return {
    source: "usda",
    fdcId: food.fdcId,
    name: food.description,
    servingSize: food.servingSize || 100,
    servingUnit: food.servingSizeUnit || "g",
    calories: get("Energy"),
    protein_g: get("Protein"),
    carbs_g: get("Carbohydrate, by difference"),
    fat_g: get("Total lipid (fat)"),
    fiber_g: get("Fiber, total dietary"),
    sugar_g: get("Sugars, total including NLEA"),
  };
}

// --- Open Food Facts (no key needed, good for Brazilian products) ---
async function searchOpenFoodFacts(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=1`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const product = data.products?.[0];
  if (!product?.nutriments) return null;

  const n = product.nutriments;
  return {
    source: "openfoodfacts",
    name: product.product_name || query,
    servingSize: product.serving_quantity || 100,
    servingUnit: "g",
    calories: n["energy-kcal_100g"] || 0,
    protein_g: n.proteins_100g || 0,
    carbs_g: n.carbohydrates_100g || 0,
    fat_g: n.fat_100g || 0,
    fiber_g: n.fiber_100g || 0,
    sugar_g: n.sugars_100g || 0,
  };
}

// --- Combined lookup with cache ---
export async function lookupNutrition(foodName) {
  const normalized = foodName.toLowerCase().trim();

  // Check cache first
  const cached = await prisma.nutritionCache.findFirst({
    where: { foodName: normalized },
  });
  if (cached) return cached.data;

  // Try USDA first, fall back to Open Food Facts
  let result = await searchUSDA(normalized);
  if (!result) {
    result = await searchOpenFoodFacts(normalized);
  }
  if (!result) return null;

  // Cache the result
  await prisma.nutritionCache.upsert({
    where: { foodName_source: { foodName: normalized, source: result.source } },
    update: { data: result },
    create: { foodName: normalized, source: result.source, data: result },
  });

  return result;
}
