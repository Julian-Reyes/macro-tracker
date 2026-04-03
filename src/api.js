const API_BASE = import.meta.env.VITE_API_URL || '/api';

// --- Token management ---
export function getToken() {
  return localStorage.getItem('macro_token');
}

export function setToken(token) {
  localStorage.setItem('macro_token', token);
}

export function clearToken() {
  localStorage.removeItem('macro_token');
}

// --- Core fetch wrapper ---
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (token) clearToken();
    throw { status: 401, message: data.error || 'Session expired. Please log in again.' };
  }

  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, message: data.error || `Request failed (${res.status})` };
  }
  return data;
}

// --- Auth ---
export async function register(username, password, name) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, name }),
  });
  setToken(data.token);
  return data.user;
}

export async function login(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function getMe() {
  return apiFetch('/auth/me');
}

// --- Meals (authenticated) ---
export async function scanMeal(base64, mediaType) {
  return apiFetch('/meals/scan', {
    method: 'POST',
    body: JSON.stringify({ image: base64, mediaType }),
  });
}

export async function getMeals(date) {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const tz = new Date().getTimezoneOffset();
  return apiFetch(`/meals?date=${dateStr}&tz=${tz}`);
}

export async function getMealsRange(from, to) {
  const tz = new Date().getTimezoneOffset();
  return apiFetch(`/meals/history/range?from=${from}&to=${to}&tz=${tz}`);
}

export async function saveMeal(items, mealNotes, imageBase64, mediaType, mealType, provider) {
  return apiFetch('/meals', {
    method: 'POST',
    body: JSON.stringify({ items, meal_notes: mealNotes, image: imageBase64, mediaType, mealType, provider }),
  });
}

// --- Nutrition search (no auth, guest-accessible) ---
export async function searchNutrition(query, limit = 5) {
  const res = await fetch(`${API_BASE}/nutrition/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Search failed' };
  return data.results;
}

// --- Barcode lookup (no auth, guest-accessible) ---
export async function lookupBarcode(code) {
  const res = await fetch(`${API_BASE}/nutrition/barcode?code=${encodeURIComponent(code)}`);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Barcode lookup failed' };
  return data.result;
}

export async function updateMeal(id, items, mealNotes, mealType) {
  return apiFetch(`/meals/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ items, meal_notes: mealNotes, mealType }),
  });
}

export async function getRecentMeals(days = 14) {
  return apiFetch(`/meals/recent?days=${days}`);
}

export async function getFavoriteMeals() {
  return apiFetch('/meals/favorites');
}

export async function toggleMealFavorite(id, isFavorite) {
  return apiFetch(`/meals/${id}/favorite`, {
    method: 'PATCH',
    body: JSON.stringify({ isFavorite }),
  });
}

export async function deleteMeal(id) {
  return apiFetch(`/meals/${id}`, { method: 'DELETE' });
}

export async function importMeals(meals) {
  return apiFetch('/meals/import', {
    method: 'POST',
    body: JSON.stringify({ meals }),
  });
}

// --- Meals (guest, no auth) ---
export async function analyzeMeal(base64, mediaType, description) {
  const res = await fetch(`${API_BASE}/meals/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mediaType, description: description || undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Analysis failed' };
  return data;
}

// --- Guest localStorage ---
const GUEST_MEALS_KEY = 'macro_guest_meals';

export function getGuestMeals() {
  const raw = localStorage.getItem(GUEST_MEALS_KEY);
  if (!raw) return [];
  const meals = JSON.parse(raw);
  // Backfill localId for older guest meals
  let changed = false;
  for (const m of meals) {
    if (!m.localId) {
      m.localId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      changed = true;
    }
  }
  if (changed) localStorage.setItem(GUEST_MEALS_KEY, JSON.stringify(meals));
  return meals;
}

export function getGuestMealsByDate(dateStr) {
  const meals = getGuestMeals();
  return meals.filter(m => {
    if (!m.scannedAt) return false;
    const d = new Date(m.scannedAt);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}` === dateStr;
  });
}

export function addGuestMeal(meal) {
  const meals = getGuestMeals();
  meals.push({
    ...meal,
    localId: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    scannedAt: new Date().toISOString(),
    isFavorite: meal.isFavorite || false,
  });
  localStorage.setItem(GUEST_MEALS_KEY, JSON.stringify(meals));
}

export function deleteGuestMeal(index) {
  const meals = getGuestMeals();
  meals.splice(index, 1);
  localStorage.setItem(GUEST_MEALS_KEY, JSON.stringify(meals));
}

export function updateGuestMeal(index, updatedMeal) {
  const meals = getGuestMeals();
  if (index >= 0 && index < meals.length) {
    meals[index] = { ...meals[index], ...updatedMeal };
    localStorage.setItem(GUEST_MEALS_KEY, JSON.stringify(meals));
  }
}

export function toggleGuestMealFavorite(localId) {
  const meals = getGuestMeals();
  const meal = meals.find(m => m.localId === localId);
  if (meal) {
    meal.isFavorite = !meal.isFavorite;
    localStorage.setItem(GUEST_MEALS_KEY, JSON.stringify(meals));
  }
}

export function getGuestFavoriteMeals() {
  return getGuestMeals().filter(m => m.isFavorite);
}

export function getGuestRecentMeals(days = 14) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const meals = getGuestMeals()
    .filter(m => new Date(m.scannedAt) >= cutoff)
    .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
  const seen = new Set();
  return meals.filter(m => {
    const fp = (m.items || []).map(i => i.name.trim().toLowerCase()).sort().join('|');
    if (seen.has(fp)) return false;
    seen.add(fp);
    return true;
  }).slice(0, 20);
}

export function clearGuestMeals() {
  localStorage.removeItem(GUEST_MEALS_KEY);
}

// --- Goals ---
export async function getGoals() {
  return apiFetch('/goals');
}

export async function getProfile() {
  return apiFetch('/goals/profile');
}

export async function saveProfile(profileData) {
  return apiFetch('/goals/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

// --- Guest Goals (localStorage) ---
const GUEST_GOALS_KEY = 'macro_guest_goals';

export function getGuestGoals() {
  const raw = localStorage.getItem(GUEST_GOALS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveGuestGoals(profile, goals) {
  localStorage.setItem(GUEST_GOALS_KEY, JSON.stringify({ profile, goals }));
}

export function clearGuestGoals() {
  localStorage.removeItem(GUEST_GOALS_KEY);
}

// --- Image downscaling ---
export function downscaleImage(base64, mediaType, maxDim = 1024) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve({ base64, mediaType });
        return;
      }
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve({
        base64: dataUrl.split(',')[1],
        mediaType: 'image/jpeg',
      });
    };
    img.src = `data:${mediaType};base64,${base64}`;
  });
}
