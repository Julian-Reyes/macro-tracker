import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- USDA FoodData Central ---
async function searchUSDA(query) {
  const key = process.env.USDA_API_KEY;
  if (!key) return null;

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(query)}&pageSize=1&dataType=Survey%20(FNDDS),Foundation,SR%20Legacy`;
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
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&lc=en&cc=us&search_simple=1&action=process&json=1&page_size=1`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const product = data.products?.[0];
  if (!product?.nutriments) return null;

  const n = product.nutriments;
  return {
    source: "openfoodfacts",
    name: product.product_name || query,
    servingSize: Math.round(product.serving_quantity || 100),
    servingUnit: "g",
    calories: Math.round(n["energy-kcal_100g"] || 0),
    protein_g: +(n.proteins_100g || 0).toFixed(1),
    carbs_g: +(n.carbohydrates_100g || 0).toFixed(1),
    fat_g: +(n.fat_100g || 0).toFixed(1),
    fiber_g: +(n.fiber_100g || 0).toFixed(1),
    sugar_g: +(n.sugars_100g || 0).toFixed(1),
  };
}

// --- Helper: normalize macros to per-100g ---
function toPer100g(result) {
  const s = result.servingSize || 100;
  // OFF data is already per 100g; USDA is per serving
  if (result.source === "openfoodfacts") {
    return {
      calories: result.calories,
      protein_g: result.protein_g,
      carbs_g: result.carbs_g,
      fat_g: result.fat_g,
      fiber_g: result.fiber_g,
      sugar_g: result.sugar_g,
    };
  }
  const factor = 100 / s;
  return {
    calories: Math.round(result.calories * factor),
    protein_g: +(result.protein_g * factor).toFixed(1),
    carbs_g: +(result.carbs_g * factor).toFixed(1),
    fat_g: +(result.fat_g * factor).toFixed(1),
    fiber_g: +(result.fiber_g * factor).toFixed(1),
    sugar_g: +(result.sugar_g * factor).toFixed(1),
  };
}

// --- Multi-result search (for manual food entry) ---
export async function searchNutritionMultiple(query, limit = 5) {
  const normalized = query.toLowerCase().trim();
  const key = process.env.USDA_API_KEY;

  // Try USDA first with multiple results
  if (key) {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(normalized)}&pageSize=${limit}&dataType=Survey%20(FNDDS),Foundation,SR%20Legacy`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.foods?.length > 0) {
        return data.foods.map((food) => {
          const get = (name) => food.foodNutrients?.find((n) => n.nutrientName === name)?.value || 0;
          const result = {
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
          result.per100g = toPer100g(result);
          return result;
        });
      }
    }
  }

  // Fall back to Open Food Facts
  const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(normalized)}&lc=en&cc=us&search_simple=1&action=process&json=1&page_size=${limit}`;
  const offRes = await fetch(offUrl);
  if (!offRes.ok) return [];

  const offData = await offRes.json();
  if (!offData.products?.length) return [];

  return offData.products
    .filter((p) => {
      if (!p.nutriments) return false;
      const name = p.product_name?.trim();
      if (!name) return false;
      const n = p.nutriments;
      const hasData = (n["energy-kcal_100g"] || 0) + (n.proteins_100g || 0) + (n.carbohydrates_100g || 0) + (n.fat_100g || 0) > 0;
      return hasData;
    })
    .map((product) => {
      const n = product.nutriments;
      const result = {
        source: "openfoodfacts",
        name: product.product_name || normalized,
        servingSize: Math.round(product.serving_quantity || 100),
        servingUnit: "g",
        calories: Math.round(n["energy-kcal_100g"] || 0),
        protein_g: +(n.proteins_100g || 0).toFixed(1),
        carbs_g: +(n.carbohydrates_100g || 0).toFixed(1),
        fat_g: +(n.fat_100g || 0).toFixed(1),
        fiber_g: +(n.fiber_100g || 0).toFixed(1),
        sugar_g: +(n.sugars_100g || 0).toFixed(1),
      };
      result.per100g = toPer100g(result);
      return result;
    });
}

// --- Barcode lookup via Open Food Facts ---
export async function searchByBarcode(barcode) {
  // Check cache first
  const cached = await prisma.nutritionCache.findFirst({
    where: { foodName: barcode, source: "barcode_off" },
  });
  if (cached) return cached.data;

  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== 1 || !data.product?.nutriments) return null;

  const product = data.product;
  const n = product.nutriments;

  const name = product.product_name?.trim();
  if (!name) return null;

  const hasData =
    (n["energy-kcal_100g"] || 0) + (n.proteins_100g || 0) +
    (n.carbohydrates_100g || 0) + (n.fat_100g || 0) > 0;
  if (!hasData) return null;

  const per100g = {
    calories: Math.round(n["energy-kcal_100g"] || 0),
    protein_g: +(n.proteins_100g || 0).toFixed(1),
    carbs_g: +(n.carbohydrates_100g || 0).toFixed(1),
    fat_g: +(n.fat_100g || 0).toFixed(1),
    fiber_g: +(n.fiber_100g || 0).toFixed(1),
    sugar_g: +(n.sugars_100g || 0).toFixed(1),
  };

  const result = {
    source: "barcode_off",
    barcode,
    name,
    brand: product.brands || null,
    imageUrl: product.image_front_small_url || null,
    servingSize: Math.round(product.serving_quantity || 100),
    servingUnit: "g",
    ...per100g,
    per100g,
  };

  await prisma.nutritionCache.upsert({
    where: { foodName_source: { foodName: barcode, source: "barcode_off" } },
    update: { data: result },
    create: { foodName: barcode, source: "barcode_off", data: result },
  });

  return result;
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
