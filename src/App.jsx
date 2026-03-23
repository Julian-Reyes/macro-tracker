import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import AuthScreen from "./AuthScreen";
import {
  getToken, clearToken, getMe, saveMeal, getMeals, deleteMeal, getGoals,
  downscaleImage, analyzeMeal, getGuestMeals, getGuestMealsByDate, addGuestMeal, deleteGuestMeal,
  searchNutrition,
} from "./api";

// Normalize Prisma camelCase → snake_case for display components
function normalizeItem(item) {
  return {
    name: item.name,
    portion: item.portion,
    calories: item.calories,
    protein_g: item.proteinG ?? item.protein_g ?? 0,
    carbs_g: item.carbsG ?? item.carbs_g ?? 0,
    fat_g: item.fatG ?? item.fat_g ?? 0,
    fiber_g: item.fiberG ?? item.fiber_g ?? 0,
    sugar_g: item.sugarG ?? item.sugar_g ?? 0,
  };
}

function mealTotals(items) {
  return items.reduce((acc, it) => {
    const n = normalizeItem(it);
    acc.calories += n.calories;
    acc.protein_g += n.protein_g;
    acc.carbs_g += n.carbs_g;
    acc.fat_g += n.fat_g;
    return acc;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
}

function computeDailyTotals(meals) {
  return meals.reduce((acc, m) => {
    const t = mealTotals(m.items);
    acc.calories += t.calories;
    acc.protein_g += t.protein_g;
    acc.carbs_g += t.carbs_g;
    acc.fat_g += t.fat_g;
    return acc;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 });
}

function toLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function inferMealType(date = new Date()) {
  const hour = date.getHours();
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_TYPE_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

function groupMealsByType(meals) {
  const groups = {};
  for (const meal of meals) {
    const type = meal.mealType || meal.meal_type || inferMealType(new Date(meal.scannedAt));
    if (!groups[type]) groups[type] = [];
    groups[type].push(meal);
  }
  return MEAL_TYPE_ORDER.filter(t => groups[t]).map(t => ({ type: t, meals: groups[t] }));
}

function MealTypePicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "8px", justifyContent: "center", padding: "12px 20px" }}>
      {MEAL_TYPE_ORDER.map(type => (
        <button key={type} onClick={() => onChange(type)} style={{
          padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
          fontSize: "12px", fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
          background: value === type ? "rgba(232,200,114,0.15)" : "rgba(255,255,255,0.04)",
          color: value === type ? "#E8C872" : "rgba(255,255,255,0.3)",
          transition: "all 0.2s",
        }}>
          {MEAL_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}

function MacroRing({ value, max, color, label, unit }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
        <text x="36" y="33" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="'DM Sans',sans-serif">
          {Math.round(value)}
        </text>
        <text x="36" y="45" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="'DM Sans',sans-serif">
          {unit}
        </text>
      </svg>
      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function ItemRow({ item, index, expanded, multiplier, editable, onToggle, onMultiplierChange }) {
  const macroBar = (val, max, color) => (
    <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", flex: 1 }}>
      <div style={{
        height: "100%", borderRadius: "2px", background: color,
        width: `${Math.min((val / max) * 100, 100)}%`,
        transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)"
      }} />
    </div>
  );

  const isAdjusted = multiplier != null && multiplier !== 1.0;

  return (
    <div style={{
      background: expanded ? "rgba(232,200,114,0.03)" : "rgba(255,255,255,0.02)",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      animation: `fadeSlideIn 0.4s ${index * 0.08}s both ease-out`,
      transition: "background 0.2s",
    }}>
      <div
        onClick={editable ? onToggle : undefined}
        style={{
          padding: "16px 20px",
          cursor: editable ? "pointer" : "default",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", minWidth: 0, flex: 1 }}>
            <span style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{item.name}</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>{item.portion}</span>
            {isAdjusted && !expanded && (
              <span style={{
                padding: "1px 6px", borderRadius: "4px",
                background: "rgba(232,200,114,0.15)", color: "#E8C872",
                fontSize: "10px", fontWeight: 700, flexShrink: 0,
              }}>{parseFloat(multiplier.toFixed(2))}×</span>
            )}
          </div>
          <span style={{ color: "#E8C872", fontSize: "14px", fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0, marginLeft: "8px" }}>
            {item.calories} cal
          </span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "14px", fontSize: "10px", color: "#7BE0AD" }}>P</span>
              {macroBar(item.protein_g, 50, "#7BE0AD")}
              <span style={{ width: "28px", fontSize: "11px", color: "rgba(255,255,255,0.4)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{item.protein_g}g</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "14px", fontSize: "10px", color: "#72B4E8" }}>C</span>
              {macroBar(item.carbs_g, 80, "#72B4E8")}
              <span style={{ width: "28px", fontSize: "11px", color: "rgba(255,255,255,0.4)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{item.carbs_g}g</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "14px", fontSize: "10px", color: "#E87272" }}>F</span>
              {macroBar(item.fat_g, 40, "#E87272")}
              <span style={{ width: "28px", fontSize: "11px", color: "rgba(255,255,255,0.4)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{item.fat_g}g</span>
            </div>
          </div>
        </div>
      </div>
      {expanded && editable && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "20px", padding: "4px 20px 16px",
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onMultiplierChange(Math.max(0.25, multiplier - 0.25)); }}
            style={{
              width: "36px", height: "36px", borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
              color: "#fff", cursor: "pointer", fontSize: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >−</button>
          <span style={{
            fontSize: "18px", fontWeight: 700, minWidth: "50px", textAlign: "center",
            color: isAdjusted ? "#E8C872" : "rgba(255,255,255,0.5)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {parseFloat(multiplier.toFixed(2))}×
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onMultiplierChange(multiplier + 0.25); }}
            style={{
              width: "36px", height: "36px", borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
              color: "#fff", cursor: "pointer", fontSize: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >+</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dailyLog, setDailyLog] = useState([]);
  const [dailyTotals, setDailyTotals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 });
  const [goals, setGoals] = useState({ calories: 2200, proteinG: 150, carbsG: 275, fatG: 75 });
  const [view, setView] = useState("capture");
  const [mealDetailMode, setMealDetailMode] = useState(false);
  const [scaledImageData, setScaledImageData] = useState(null);
  const [expandedItemIndex, setExpandedItemIndex] = useState(null);
  const [itemAdjustments, setItemAdjustments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateStr());
  const [selectedMealType, setSelectedMealType] = useState(() => inferMealType());
  // Manual entry state
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [manualItems, setManualItems] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [manualGrams, setManualGrams] = useState(100);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const isGuest = !user;
  const todayStr = toLocalDateStr();
  const isToday = selectedDate === todayStr;

  const changeDate = (delta) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + delta);
    const newStr = toLocalDateStr(date);
    if (newStr <= todayStr) setSelectedDate(newStr);
  };

  // Check for existing auth on mount (non-blocking — app shows immediately)
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthChecking(false); return; }
    getMe()
      .then(data => setUser(data.user || data))
      .catch(() => clearToken())
      .finally(() => setAuthChecking(false));
  }, []);

  // Load guest data from localStorage (filtered by selected date)
  const loadGuestData = useCallback(() => {
    const meals = getGuestMealsByDate(selectedDate);
    setDailyLog(meals);
    setDailyTotals(computeDailyTotals(meals));
  }, [selectedDate]);

  // Fetch from DB for authenticated users
  const fetchDailyData = useCallback(async () => {
    try {
      const data = await getMeals(selectedDate);
      setDailyLog(data.meals || []);
      setDailyTotals(data.totals || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 });
    } catch (err) {
      if (err.status === 401) setUser(null);
    }
  }, [selectedDate]);

  // Load data based on auth state
  const refreshData = useCallback(() => {
    if (user) {
      fetchDailyData();
    } else if (!authChecking) {
      loadGuestData();
    }
  }, [user, authChecking, fetchDailyData, loadGuestData]);

  useEffect(() => {
    refreshData();
    if (user) {
      getGoals().then(g => setGoals(g)).catch(() => {});
    }
  }, [user, refreshData]);

  // Initialize adjustments and meal type when analysis changes
  useEffect(() => {
    if (analysis) {
      setItemAdjustments(analysis.items.map(() => ({ multiplier: 1.0 })));
      setExpandedItemIndex(null);
      if (!mealDetailMode) setSelectedMealType(inferMealType());
    } else {
      setItemAdjustments([]);
    }
  }, [analysis, mealDetailMode]);

  // Compute adjusted items and totals based on multipliers
  const scaledImageUrl = scaledImageData ? `data:${scaledImageData.mediaType};base64,${scaledImageData.base64}` : null;

  const { adjustedItems, adjustedTotals } = useMemo(() => {
    if (!analysis || itemAdjustments.length !== analysis.items.length) {
      return { adjustedItems: analysis?.items ?? null, adjustedTotals: analysis?.totals ?? null };
    }
    const items = analysis.items.map((item, i) => {
      const mult = itemAdjustments[i].multiplier;
      if (mult === 1.0) return item;
      return {
        ...item,
        calories: Math.round(item.calories * mult),
        protein_g: +((item.protein_g ?? 0) * mult).toFixed(1),
        carbs_g: +((item.carbs_g ?? 0) * mult).toFixed(1),
        fat_g: +((item.fat_g ?? 0) * mult).toFixed(1),
        fiber_g: +((item.fiber_g ?? 0) * mult).toFixed(1),
        sugar_g: +((item.sugar_g ?? 0) * mult).toFixed(1),
      };
    });
    const totals = items.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein_g: +(acc.protein_g + (item.protein_g ?? 0)).toFixed(1),
      carbs_g: +(acc.carbs_g + (item.carbs_g ?? 0)).toFixed(1),
      fat_g: +(acc.fat_g + (item.fat_g ?? 0)).toFixed(1),
      fiber_g: +(acc.fiber_g + (item.fiber_g ?? 0)).toFixed(1),
      sugar_g: +(acc.sugar_g + (item.sugar_g ?? 0)).toFixed(1),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 });
    return { adjustedItems: items, adjustedTotals: totals };
  }, [analysis, itemAdjustments]);

  const updateItemMultiplier = (index, newMultiplier) => {
    setItemAdjustments(prev => prev.map((adj, i) =>
      i === index ? { ...adj, multiplier: Math.max(0.25, newMultiplier) } : adj
    ));
  };

  const handleAuth = (authedUser) => {
    setUser(authedUser);
    setShowAuth(false);
  };

  const handleFile = useCallback((file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setAnalysis(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      setImageData({ base64, mediaType: file.type || "image/jpeg" });
    };
    reader.readAsDataURL(file);
  }, []);

  const analyzeFood = async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);

    try {
      const scaled = await downscaleImage(imageData.base64, imageData.mediaType);
      setScaledImageData(scaled);

      // Analyze only — save happens in addToDaily after user can edit portions
      const result = await analyzeMeal(scaled.base64, scaled.mediaType);
      setAnalysis({
        items: result.analysis.items,
        totals: result.analysis.totals,
        meal_notes: result.analysis.meal_notes,
      });
      setView("result");
    } catch (err) {
      if (err.status === 401) { setUser(null); return; }
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addToDaily = async () => {
    if (!adjustedItems) return;
    try {
      if (isGuest) {
        addGuestMeal({ items: adjustedItems, meal_notes: analysis.meal_notes, provider: "gemini", imageUrl: scaledImageUrl, mealType: selectedMealType });
      } else {
        await saveMeal(adjustedItems, analysis.meal_notes, scaledImageData?.base64, scaledImageData?.mediaType, selectedMealType);
      }
    } catch (err) {
      setError("Failed to save meal");
      return;
    }
    setImage(null);
    setImageData(null);
    setAnalysis(null);
    setError(null);
    setScaledImageData(null);
    setMealDetailMode(false);
    setView("daily");
    // New meals are always "today" — navigate there and refresh
    if (selectedDate !== todayStr) {
      setSelectedDate(todayStr);
    } else {
      if (user) fetchDailyData();
      else loadGuestData();
    }
  };

  // Manual food search (debounced)
  const handleManualSearch = (query) => {
    setManualQuery(query);
    setSelectedFood(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) { setManualResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setManualSearching(true);
      try {
        const results = await searchNutrition(query);
        setManualResults(results);
      } catch {}
      finally { setManualSearching(false); }
    }, 500);
  };

  const selectFood = (food) => {
    setSelectedFood(food);
    setManualGrams(food.servingSize || 100);
  };

  const scaledFoodMacros = useMemo(() => {
    if (!selectedFood) return null;
    const p = selectedFood.per100g;
    const factor = manualGrams / 100;
    return {
      calories: Math.round(p.calories * factor),
      protein_g: +(p.protein_g * factor).toFixed(1),
      carbs_g: +(p.carbs_g * factor).toFixed(1),
      fat_g: +(p.fat_g * factor).toFixed(1),
      fiber_g: +(p.fiber_g * factor).toFixed(1),
      sugar_g: +(p.sugar_g * factor).toFixed(1),
    };
  }, [selectedFood, manualGrams]);

  const addManualItem = () => {
    if (!selectedFood || !scaledFoodMacros) return;
    setManualItems(prev => [...prev, {
      name: selectedFood.name,
      portion: `${manualGrams}g`,
      ...scaledFoodMacros,
    }]);
    setSelectedFood(null);
    setManualQuery("");
    setManualResults([]);
  };

  const addManualToDaily = async () => {
    if (manualItems.length === 0) return;
    try {
      if (isGuest) {
        addGuestMeal({ items: manualItems, meal_notes: null, provider: "manual", mealType: selectedMealType });
      } else {
        await saveMeal(manualItems, null, null, null, selectedMealType, "manual");
      }
    } catch {
      setError("Failed to save meal");
      return;
    }
    setManualQuery("");
    setManualResults([]);
    setManualItems([]);
    setSelectedFood(null);
    setView("daily");
    if (selectedDate !== todayStr) {
      setSelectedDate(todayStr);
    } else {
      if (user) fetchDailyData();
      else loadGuestData();
    }
  };

  const resetCapture = () => {
    setImage(null);
    setImageData(null);
    setAnalysis(null);
    setError(null);
    setScaledImageData(null);
    setMealDetailMode(false);
    setManualQuery("");
    setManualResults([]);
    setManualItems([]);
    setSelectedFood(null);
    setView("capture");
  };

  const handleDeleteMeal = async (e, mealIdOrIndex) => {
    e.stopPropagation();
    if (user) {
      try {
        await deleteMeal(mealIdOrIndex);
        fetchDailyData();
      } catch (err) {
        if (err.status === 401) setUser(null);
      }
    } else {
      deleteGuestMeal(mealIdOrIndex);
      loadGuestData();
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setDailyLog([]);
    setDailyTotals({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 });
    setGoals({ calories: 2200, proteinG: 150, carbsG: 275, fatG: 75 });
    setView("capture");
  };

  // Auth checking splash
  if (authChecking) {
    return (
      <div style={{
        fontFamily: "'DM Sans', sans-serif", background: "#0C0C0E",
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "42px", fontWeight: 400, color: "#fff" }}>
            Macro<span style={{ color: "#E8C872" }}>.</span>
          </h1>
          <div style={{
            height: "3px", borderRadius: "2px", margin: "16px auto 0", width: "120px",
            background: "linear-gradient(90deg, transparent, #E8C872, transparent)",
            backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
          }} />
        </div>
        <style>{`
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: "#0C0C0E",
      minHeight: "100vh",
      color: "#fff",
      maxWidth: "480px",
      margin: "0 auto",
      position: "relative",
      overflow: "hidden"
    }}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Auth Overlay */}
      {showAuth && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "480px" }}>
            <button onClick={() => setShowAuth(false)} style={{
              position: "absolute", top: "12px", right: "36px", zIndex: 101,
              width: "32px", height: "32px", borderRadius: "50%",
              background: "rgba(255,255,255,0.1)", border: "none",
              color: "#fff", cursor: "pointer", fontSize: "16px",
            }}>✕</button>
            <AuthScreen onAuth={handleAuth} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 onClick={resetCapture} style={{ fontFamily: "'Instrument Serif', serif", fontSize: "26px", fontWeight: 400, letterSpacing: "-0.5px", cursor: "pointer" }}>
            Macro<span style={{ color: "#E8C872" }}>.</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {user ? (
            <button onClick={handleLogout} style={{
              padding: "6px 12px", borderRadius: "20px", border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)",
              fontSize: "11px", fontFamily: "'DM Sans',sans-serif",
            }}>Log out</button>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{
              padding: "6px 12px", borderRadius: "20px", border: "none", cursor: "pointer",
              background: "rgba(232,200,114,0.12)", color: "#E8C872",
              fontSize: "11px", fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
            }}>Sign up</button>
          )}
          {["capture", "daily"].map(v => (
            <button key={v} onClick={() => { setView(v); if (v === "daily") refreshData(); }} style={{
              padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 500, fontFamily: "'DM Sans',sans-serif",
              textTransform: "uppercase", letterSpacing: "0.5px",
              background: view === v || (v === "capture" && (view === "result" || view === "manual")) ? "rgba(232,200,114,0.12)" : "transparent",
              color: view === v || (v === "capture" && (view === "result" || view === "manual")) ? "#E8C872" : "rgba(255,255,255,0.3)",
              transition: "all 0.2s"
            }}>
              {v === "capture" ? "Scan" : `Log (${dailyLog.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Capture View */}
      {(view === "capture" || view === "result") && (
        <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
          {view === "capture" && !image ? (
            <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
              <div style={{
                width: "100%", aspectRatio: "4/3", borderRadius: "16px",
                border: "2px dashed rgba(255,255,255,0.08)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "16px", background: "rgba(255,255,255,0.015)"
              }}>
                <div style={{ fontSize: "48px", opacity: 0.2 }}>📸</div>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px", textAlign: "center", lineHeight: 1.5 }}>
                  Snap a photo of your meal<br />
                  <span style={{ fontSize: "12px", opacity: 0.6 }}>AI will estimate your macros instantly</span>
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                <button onClick={() => cameraInputRef.current?.click()} style={{
                  flex: 1, padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #E8C872, #D4A843)", color: "#0C0C0E",
                  fontSize: "14px", fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                  letterSpacing: "0.3px"
                }}>
                  📷 Camera
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)",
                  color: "#fff", fontSize: "14px", fontWeight: 500, fontFamily: "'DM Sans',sans-serif"
                }}>
                  🖼️ Gallery
                </button>
              </div>

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e => handleFile(e.target.files?.[0])} style={{ display: "none" }} />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} style={{ display: "none" }} />

              <button onClick={() => setView("manual")} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.4)", fontSize: "13px",
                fontFamily: "'DM Sans',sans-serif", padding: "4px",
              }}>or type it in</button>
            </div>
          ) : (
            <div>
              {/* Image preview (only if image exists) */}
              {image && (
                <div style={{ position: "relative" }}>
                  <img src={image} alt="Food" style={{
                    width: "100%", maxHeight: "280px", objectFit: "cover", display: "block"
                  }} />
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: "80px",
                    background: "linear-gradient(transparent, #0C0C0E)"
                  }} />
                  {!analysis && !loading && (
                    <button onClick={resetCapture} style={{
                      position: "absolute", top: "12px", right: "12px",
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
                      border: "none", color: "#fff", cursor: "pointer", fontSize: "16px"
                    }}>✕</button>
                  )}
                </div>
              )}

              {/* Action / Loading */}
              {!analysis && !loading && (
                <div style={{ padding: "20px", display: "flex", gap: "12px" }}>
                  <button onClick={resetCapture} style={{
                    padding: "14px 20px", borderRadius: "12px", cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                    color: "#fff", fontSize: "14px", fontFamily: "'DM Sans',sans-serif"
                  }}>Retake</button>
                  <button onClick={analyzeFood} style={{
                    flex: 1, padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #E8C872, #D4A843)", color: "#0C0C0E",
                    fontSize: "14px", fontWeight: 700, fontFamily: "'DM Sans',sans-serif"
                  }}>Analyze Meal →</button>
                </div>
              )}

              {loading && (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                  <div style={{
                    height: "3px", borderRadius: "2px", margin: "0 auto 16px", width: "200px",
                    background: "linear-gradient(90deg, transparent, #E8C872, transparent)",
                    backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite"
                  }} />
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", animation: "pulse 2s infinite" }}>
                    Analyzing your meal...
                  </p>
                </div>
              )}

              {error && (
                <div style={{ padding: "20px", textAlign: "center" }}>
                  <p style={{ color: "#E87272", fontSize: "13px", marginBottom: "12px" }}>{error}</p>
                  <button onClick={() => { setError(null); }} style={{
                    padding: "10px 24px", borderRadius: "10px", border: "1px solid rgba(232,114,114,0.3)",
                    background: "transparent", color: "#E87272", cursor: "pointer",
                    fontSize: "13px", fontFamily: "'DM Sans',sans-serif"
                  }}>Try Again</button>
                </div>
              )}

              {/* Results */}
              {analysis && adjustedTotals && (
                <div style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
                  {/* Macro Rings */}
                  <div style={{
                    padding: "20px", display: "flex", justifyContent: "space-around",
                    background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)"
                  }}>
                    <MacroRing value={adjustedTotals.calories} max={goals.calories} color="#E8C872" label="Calories" unit="kcal" />
                    <MacroRing value={adjustedTotals.protein_g} max={goals.proteinG} color="#7BE0AD" label="Protein" unit="g" />
                    <MacroRing value={adjustedTotals.carbs_g} max={goals.carbsG} color="#72B4E8" label="Carbs" unit="g" />
                    <MacroRing value={adjustedTotals.fat_g} max={goals.fatG} color="#E87272" label="Fat" unit="g" />
                  </div>

                  {/* Extra stats */}
                  <div style={{ display: "flex", padding: "12px 20px", gap: "16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {adjustedTotals.fiber_g !== undefined && (
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                        Fiber: <span style={{ color: "rgba(255,255,255,0.6)" }}>{adjustedTotals.fiber_g}g</span>
                      </span>
                    )}
                    {adjustedTotals.sugar_g !== undefined && (
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                        Sugar: <span style={{ color: "rgba(255,255,255,0.6)" }}>{adjustedTotals.sugar_g}g</span>
                      </span>
                    )}
                  </div>

                  {/* Item Breakdown */}
                  <div>
                    <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 500 }}>
                        Breakdown
                      </span>
                      {!mealDetailMode && (
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.15)" }}>tap to adjust</span>
                      )}
                    </div>
                    {(adjustedItems || analysis.items).map((item, i) => (
                      <ItemRow
                        key={i}
                        item={item}
                        index={i}
                        editable={!mealDetailMode}
                        expanded={expandedItemIndex === i}
                        multiplier={itemAdjustments[i]?.multiplier ?? 1.0}
                        onToggle={() => setExpandedItemIndex(expandedItemIndex === i ? null : i)}
                        onMultiplierChange={(val) => updateItemMultiplier(i, val)}
                      />
                    ))}
                  </div>

                  {/* Meal Notes */}
                  {analysis.meal_notes && (
                    <div style={{
                      margin: "16px 20px", padding: "14px 16px", borderRadius: "10px",
                      background: "rgba(232,200,114,0.04)", border: "1px solid rgba(232,200,114,0.08)"
                    }}>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, fontStyle: "italic" }}>
                        💡 {analysis.meal_notes}
                      </p>
                    </div>
                  )}

                  {/* Meal Type Picker (only for fresh scans) */}
                  {!mealDetailMode && (
                    <MealTypePicker value={selectedMealType} onChange={setSelectedMealType} />
                  )}

                  {/* Actions */}
                  <div style={{ padding: "16px 20px 32px", display: "flex", gap: "12px" }}>
                    {mealDetailMode ? (
                      <>
                        <button onClick={() => { setMealDetailMode(false); setAnalysis(null); setImage(null); setView("daily"); }} style={{
                          flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer",
                          border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                          color: "#fff", fontSize: "13px", fontFamily: "'DM Sans',sans-serif"
                        }}>← Back to Log</button>
                        <button onClick={resetCapture} style={{
                          flex: 1, padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer",
                          background: "linear-gradient(135deg, #E8C872, #D4A843)", color: "#0C0C0E",
                          fontSize: "13px", fontWeight: 700, fontFamily: "'DM Sans',sans-serif"
                        }}>New Scan</button>
                      </>
                    ) : (
                      <>
                        <button onClick={resetCapture} style={{
                          flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer",
                          border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                          color: "#fff", fontSize: "13px", fontFamily: "'DM Sans',sans-serif"
                        }}>New Scan</button>
                        <button onClick={addToDaily} style={{
                          flex: 1, padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer",
                          background: "linear-gradient(135deg, #7BE0AD, #4CB97A)", color: "#0C0C0E",
                          fontSize: "13px", fontWeight: 700, fontFamily: "'DM Sans',sans-serif"
                        }}>+ Add to Log</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Entry View */}
      {view === "manual" && (
        <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
          <div style={{ padding: "20px" }}>
            {/* Search bar */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => handleManualSearch(e.target.value)}
                placeholder="Search foods (e.g. chicken breast)"
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                  color: "#fff", fontSize: "14px", fontFamily: "'DM Sans',sans-serif",
                  outline: "none",
                }}
              />
              <button onClick={resetCapture} style={{
                padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer",
                fontSize: "16px", fontFamily: "'DM Sans',sans-serif",
              }}>✕</button>
            </div>

            {/* Searching indicator */}
            {manualSearching && (
              <div style={{
                height: "3px", borderRadius: "2px", marginBottom: "16px", width: "100%",
                background: "linear-gradient(90deg, transparent, #E8C872, transparent)",
                backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
              }} />
            )}

            {/* Search results */}
            {manualResults.length > 0 && !selectedFood && (
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 500 }}>
                  Results
                </span>
                {manualResults.map((food, i) => (
                  <div key={i} onClick={() => selectFood(food)} style={{
                    padding: "12px 14px", marginTop: "8px", borderRadius: "10px", cursor: "pointer",
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    transition: "background 0.2s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#fff" }}>{food.name}</span>
                      <span style={{ fontSize: "12px", color: "#E8C872", fontWeight: 600 }}>{Math.round(food.per100g?.calories || food.calories)} cal</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                      <span style={{
                        padding: "1px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: 600,
                        background: food.source === "usda" ? "rgba(123,224,173,0.1)" : "rgba(114,180,232,0.1)",
                        color: food.source === "usda" ? "#7BE0AD" : "#72B4E8",
                        textTransform: "uppercase",
                      }}>{food.source === "usda" ? "USDA" : "OFF"}</span>
                      <span>{Math.round(food.servingSize)}{food.servingUnit} serving</span>
                      <span>P {+(food.per100g?.protein_g ?? food.protein_g).toFixed(1)}g</span>
                      <span>C {+(food.per100g?.carbs_g ?? food.carbs_g).toFixed(1)}g</span>
                      <span>F {+(food.per100g?.fat_g ?? food.fat_g).toFixed(1)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected food panel with gram input */}
            {selectedFood && scaledFoodMacros && (
              <div style={{
                marginBottom: "16px", padding: "16px", borderRadius: "12px",
                background: "rgba(232,200,114,0.04)", border: "1px solid rgba(232,200,114,0.1)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>{selectedFood.name}</span>
                  <button onClick={() => { setSelectedFood(null); setManualResults([]); setManualQuery(""); }} style={{
                    background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "14px",
                  }}>✕</button>
                </div>
                {/* Gram input */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Amount:</label>
                  <input
                    type="number"
                    value={manualGrams}
                    onChange={(e) => setManualGrams(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: "80px", padding: "8px 12px", borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)",
                      color: "#fff", fontSize: "14px", fontWeight: 600, textAlign: "center",
                      fontFamily: "'DM Sans',sans-serif", outline: "none",
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>grams</span>
                </div>
                {/* Scaled macros */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                  {[
                    { label: "Cal", value: scaledFoodMacros.calories, color: "#E8C872" },
                    { label: "Protein", value: `${scaledFoodMacros.protein_g}g`, color: "#7BE0AD" },
                    { label: "Carbs", value: `${scaledFoodMacros.carbs_g}g`, color: "#72B4E8" },
                    { label: "Fat", value: `${scaledFoodMacros.fat_g}g`, color: "#E87272" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "16px", fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={addManualItem} style={{
                  width: "100%", padding: "10px", borderRadius: "10px", border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #E8C872, #D4A843)", color: "#0C0C0E",
                  fontSize: "13px", fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                }}>+ Add Item</button>
              </div>
            )}

            {/* Manual items list */}
            {manualItems.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 500 }}>
                  Your items ({manualItems.length})
                </span>
                {manualItems.map((item, i) => {
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px",
                      marginTop: "8px", borderRadius: "10px", background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500 }}>{item.name}</div>
                        <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                          <span style={{ color: "#E8C872" }}>{item.calories} cal</span>
                          <span>{item.portion}</span>
                          <span>P {item.protein_g}g</span>
                          <span>C {item.carbs_g}g</span>
                          <span>F {item.fat_g}g</span>
                        </div>
                      </div>
                      <button onClick={() => setManualItems(prev => prev.filter((_, j) => j !== i))} style={{
                        width: "24px", height: "24px", borderRadius: "50%", border: "none", cursor: "pointer",
                        background: "rgba(232,114,114,0.1)", color: "#E87272", fontSize: "12px",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>✕</button>
                    </div>
                  );
                })}
                {/* Running totals */}
                <div style={{
                  display: "flex", justifyContent: "space-around", padding: "12px 0", marginTop: "8px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}>
                  {(() => {
                    const t = manualItems.reduce((acc, it) => ({
                      calories: acc.calories + it.calories,
                      protein_g: +(acc.protein_g + it.protein_g).toFixed(1),
                      carbs_g: +(acc.carbs_g + it.carbs_g).toFixed(1),
                      fat_g: +(acc.fat_g + it.fat_g).toFixed(1),
                    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
                    return [
                      { label: "Cal", value: t.calories, color: "#E8C872" },
                      { label: "Protein", value: `${t.protein_g}g`, color: "#7BE0AD" },
                      { label: "Carbs", value: `${t.carbs_g}g`, color: "#72B4E8" },
                      { label: "Fat", value: `${t.fat_g}g`, color: "#E87272" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color }}>{value}</div>
                        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{label}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Meal type + save */}
            {manualItems.length > 0 && (
              <>
                <MealTypePicker value={selectedMealType} onChange={setSelectedMealType} />
                <button onClick={addManualToDaily} style={{
                  width: "100%", padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #7BE0AD, #4CB97A)", color: "#0C0C0E",
                  fontSize: "14px", fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                  marginTop: "8px",
                }}>Add to Log</button>
              </>
            )}

            {error && (
              <p style={{ color: "#E87272", fontSize: "13px", textAlign: "center", marginTop: "12px" }}>{error}</p>
            )}
          </div>
        </div>
      )}

      {/* Daily Log View */}
      {view === "daily" && (
        <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
          {/* Date Navigation */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px 20px 0", gap: "8px"
          }}>
            <button onClick={() => changeDate(-1)} style={{
              width: "32px", height: "32px", borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)",
              cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'DM Sans',sans-serif",
            }}>‹</button>
            <span style={{
              fontSize: "15px", fontWeight: 600, minWidth: "150px", textAlign: "center",
              color: isToday ? "#E8C872" : "rgba(255,255,255,0.7)",
            }}>
              {isToday ? "Today" : formatDisplayDate(selectedDate)}
            </span>
            <button onClick={() => changeDate(1)} disabled={isToday} style={{
              width: "32px", height: "32px", borderRadius: "50%", border: "none",
              background: isToday ? "transparent" : "rgba(255,255,255,0.04)",
              color: isToday ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)",
              cursor: isToday ? "default" : "pointer", fontSize: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'DM Sans',sans-serif",
            }}>›</button>
            {!isToday && (
              <button onClick={() => setSelectedDate(todayStr)} style={{
                padding: "4px 12px", borderRadius: "12px", border: "none",
                background: "rgba(232,200,114,0.1)", color: "#E8C872",
                cursor: "pointer", fontSize: "11px", fontWeight: 600,
                fontFamily: "'DM Sans',sans-serif",
              }}>Today</button>
            )}
          </div>

          <div style={{
            padding: "16px 20px 24px", background: "rgba(255,255,255,0.015)",
            borderBottom: "1px solid rgba(255,255,255,0.04)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <MacroRing value={dailyTotals.calories} max={goals.calories} color="#E8C872" label="Calories" unit="kcal" />
              <MacroRing value={dailyTotals.protein_g} max={goals.proteinG} color="#7BE0AD" label="Protein" unit="g" />
              <MacroRing value={dailyTotals.carbs_g} max={goals.carbsG} color="#72B4E8" label="Carbs" unit="g" />
              <MacroRing value={dailyTotals.fat_g} max={goals.fatG} color="#E87272" label="Fat" unit="g" />
            </div>
          </div>

          {/* Guest sign-up prompt */}
          {isGuest && dailyLog.length > 0 && (
            <div style={{
              margin: "16px 20px", padding: "14px 16px", borderRadius: "10px",
              background: "rgba(232,200,114,0.04)", border: "1px solid rgba(232,200,114,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                Create an account to save your data across devices
              </p>
              <button onClick={() => setShowAuth(true)} style={{
                padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: "rgba(232,200,114,0.15)", color: "#E8C872",
                fontSize: "11px", fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
                whiteSpace: "nowrap", marginLeft: "12px",
              }}>Sign up</button>
            </div>
          )}

          {dailyLog.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "14px" }}>
                {isToday ? "No meals logged yet today" : `No meals on ${formatDisplayDate(selectedDate)}`}
              </p>
              <button onClick={() => setView("capture")} style={{
                marginTop: "16px", padding: "10px 24px", borderRadius: "10px", border: "none", cursor: "pointer",
                background: "rgba(232,200,114,0.1)", color: "#E8C872",
                fontSize: "13px", fontFamily: "'DM Sans',sans-serif"
              }}>Scan your first meal</button>
            </div>
          ) : (
            <div>
              {groupMealsByType(dailyLog).map(({ type, meals: groupMeals }) => {
                const groupTotals = computeDailyTotals(groupMeals);
                return (
                  <div key={type}>
                    <div style={{
                      padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    }}>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 500 }}>
                        {MEAL_TYPE_LABELS[type]}
                      </span>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", fontVariantNumeric: "tabular-nums" }}>
                        {groupTotals.calories} cal
                      </span>
                    </div>
                    {groupMeals.map((entry, i) => {
                      const totals = mealTotals(entry.items);
                      const time = new Date(entry.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      return (
                        <div key={entry.id || `${type}-${i}`} style={{
                          display: "flex", gap: "14px", padding: "14px 20px", alignItems: "center",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          animation: `fadeSlideIn 0.3s ${i * 0.05}s both ease-out`, cursor: "pointer"
                        }} onClick={() => {
                          setAnalysis({
                            items: entry.items.map(normalizeItem),
                            totals,
                            meal_notes: entry.mealNotes || entry.meal_notes,
                          });
                          setImage(entry.imageUrl || null);
                          setMealDetailMode(true);
                          setView("result");
                        }}>
                          {entry.imageUrl ? (
                            <img src={entry.imageUrl} alt="" style={{ width: "52px", height: "52px", borderRadius: "10px", objectFit: "cover" }} />
                          ) : (
                            <div style={{
                              width: "52px", height: "52px", borderRadius: "10px", display: "flex",
                              alignItems: "center", justifyContent: "center", flexShrink: 0,
                              background: "rgba(255,255,255,0.04)", fontSize: "18px", color: "rgba(255,255,255,0.2)",
                            }}>
                              {entry.items[0]?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {entry.items.map(it => it.name).join(", ")}
                            </div>
                            <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                              <span style={{ color: "#E8C872" }}>{totals.calories} cal</span>
                              <span>P {Math.round(totals.protein_g)}g</span>
                              <span>C {Math.round(totals.carbs_g)}g</span>
                              <span>F {Math.round(totals.fat_g)}g</span>
                            </div>
                          </div>
                          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", flexShrink: 0, marginRight: "8px" }}>{time}</span>
                          <button onClick={(e) => handleDeleteMeal(e, user ? entry.id : i)} style={{
                            width: "24px", height: "24px", borderRadius: "50%", border: "none", cursor: "pointer",
                            background: "rgba(232,114,114,0.1)", color: "#E87272", fontSize: "12px",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
            <button onClick={resetCapture} style={{
              padding: "14px 32px", borderRadius: "50px", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #E8C872, #D4A843)", color: "#0C0C0E",
              fontSize: "14px", fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
              boxShadow: "0 4px 24px rgba(232,200,114,0.2)"
            }}>+ Scan Meal</button>
          </div>
        </div>
      )}
    </div>
  );
}
