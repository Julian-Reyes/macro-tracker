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
  return apiFetch(`/meals?date=${dateStr}`);
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
export async function analyzeMeal(base64, mediaType) {
  const res = await fetch(`${API_BASE}/meals/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mediaType }),
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Analysis failed' };
  return data;
}

// --- Guest localStorage ---
const GUEST_MEALS_KEY = 'macro_guest_meals';

export function getGuestMeals() {
  const raw = localStorage.getItem(GUEST_MEALS_KEY);
  return raw ? JSON.parse(raw) : [];
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
  meals.push({ ...meal, scannedAt: new Date().toISOString() });
  localStorage.setItem(GUEST_MEALS_KEY, JSON.stringify(meals));
}

export function deleteGuestMeal(index) {
  const meals = getGuestMeals();
  meals.splice(index, 1);
  localStorage.setItem(GUEST_MEALS_KEY, JSON.stringify(meals));
}

export function clearGuestMeals() {
  localStorage.removeItem(GUEST_MEALS_KEY);
}

// --- Goals ---
export async function getGoals() {
  return apiFetch('/goals');
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
