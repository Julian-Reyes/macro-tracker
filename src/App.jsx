import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import AuthScreen from "./AuthScreen";
import GoalsScreen from "./GoalsScreen";
import {
  getToken,
  clearToken,
  getMe,
  saveMeal,
  updateMeal,
  getMeals,
  getMealsRange,
  deleteMeal,
  getGoals,
  downscaleImage,
  analyzeMeal,
  getGuestMeals,
  getGuestMealsByDate,
  addGuestMeal,
  deleteGuestMeal,
  updateGuestMeal,
  searchNutrition,
  lookupBarcode,
  getRecentMeals,
  getFavoriteMeals,
  toggleMealFavorite,
  toggleGuestMealFavorite,
  getGuestFavoriteMeals,
  getGuestRecentMeals,
  getGuestGoals,
  clearGuestGoals,
} from "./api";
import { toLocalDateStr, inferMealType, getWeekStartMonday, getWeekDays } from "./utils/dates";
import { normalizeItem, computeDailyTotals } from "./utils/meals";
import BottomTabBar from "./components/BottomTabBar";
import CaptureView from "./views/CaptureView";
import ManualEntryView from "./views/ManualEntryView";
import WeeklyStatsView from "./views/WeeklyStatsView";
import DailyLogView from "./views/DailyLogView";
import BarcodeScannerView from "./views/BarcodeScannerView";

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
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
  });
  const [goals, setGoals] = useState({
    calories: 2200,
    proteinG: 150,
    carbsG: 275,
    fatG: 75,
  });
  const [view, setView] = useState("capture");
  const [mealDetailMode, setMealDetailMode] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);
  const [isEditingMeal, setIsEditingMeal] = useState(false);
  const [originalAnalysis, setOriginalAnalysis] = useState(null);
  const [scaledImageData, setScaledImageData] = useState(null);
  const [expandedItemIndex, setExpandedItemIndex] = useState(null);
  const [itemAdjustments, setItemAdjustments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateStr());
  const [selectedMealType, setSelectedMealType] = useState(() =>
    inferMealType(),
  );
  // Manual entry state
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [manualItems, setManualItems] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [manualGrams, setManualGrams] = useState(100);
  const [expandedManualIndex, setExpandedManualIndex] = useState(null);
  const [extraItems, setExtraItems] = useState([]);
  const [extraItemAdjustments, setExtraItemAdjustments] = useState([]);
  const [expandedExtraIndex, setExpandedExtraIndex] = useState(null);
  const [addingExtraItem, setAddingExtraItem] = useState(false);
  const [mealDescription, setMealDescription] = useState("");
  // Quick add (favorites + recents)
  const [recentMeals, setRecentMeals] = useState([]);
  const [favoriteMeals, setFavoriteMeals] = useState([]);
  // Barcode scanner state
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  // Weekly view state
  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyMetric, setWeeklyMetric] = useState("calories");
  const [deleteToast, setDeleteToast] = useState(null); // { mealIdOrIndex, timeoutId }
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const isGuest = !user;
  const todayStr = toLocalDateStr();
  const isToday = selectedDate === todayStr;
  const [weekStart, setWeekStart] = useState(() =>
    getWeekStartMonday(todayStr),
  );
  const isCurrentWeek = weekStart === getWeekStartMonday(todayStr);

  const changeDate = (delta) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d + delta);
    const newStr = toLocalDateStr(date);
    if (newStr <= todayStr) setSelectedDate(newStr);
  };

  const changeWeek = (delta) => {
    const [y, m, d] = weekStart.split("-").map(Number);
    const date = new Date(y, m - 1, d + delta * 7);
    const newStart = getWeekStartMonday(toLocalDateStr(date));
    if (newStart <= getWeekStartMonday(todayStr)) setWeekStart(newStart);
  };

  // If navigating away from the daily view or changing date, finalize any pending delete
  useEffect(() => {
    if (deleteToast) {
      clearTimeout(deleteToast.timeoutId);
      executeDelete(deleteToast.mealIdOrIndex);
      setDeleteToast(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, view]);

  // Check for existing auth on mount (non-blocking — app shows immediately)
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    getMe()
      .then((data) => setUser(data.user || data))
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
      setDailyTotals(
        data.totals || {
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          fiber_g: 0,
          sugar_g: 0,
        },
      );
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
      getGoals()
        .then((g) => setGoals(g))
        .catch(() => {});
    } else if (!authChecking) {
      const guestGoals = getGuestGoals();
      if (guestGoals?.goals) setGoals(guestGoals.goals);
    }
  }, [user, authChecking, refreshData]);

  // Load weekly data
  const loadWeeklyData = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const days = getWeekDays(weekStart);
      const dailyMap = {};
      for (const day of days) {
        dailyMap[day.date] = {
          ...day,
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
        };
      }

      let meals;
      if (user) {
        meals = await getMealsRange(days[0].date, days[6].date);
      } else {
        const allGuest = getGuestMeals();
        meals = allGuest.filter((m) => {
          const d = toLocalDateStr(new Date(m.scannedAt));
          return d >= days[0].date && d <= days[6].date;
        });
      }

      for (const meal of meals) {
        const dateStr = toLocalDateStr(new Date(meal.scannedAt));
        if (dailyMap[dateStr]) {
          for (const item of meal.items) {
            const n = normalizeItem(item);
            dailyMap[dateStr].calories += n.calories;
            dailyMap[dateStr].protein_g += n.protein_g;
            dailyMap[dateStr].carbs_g += n.carbs_g;
            dailyMap[dateStr].fat_g += n.fat_g;
          }
        }
      }
      setWeeklyData(
        days.map((d) => ({
          ...dailyMap[d.date],
          calories: Math.round(dailyMap[d.date].calories),
          protein_g: Math.round(dailyMap[d.date].protein_g),
          carbs_g: Math.round(dailyMap[d.date].carbs_g),
          fat_g: Math.round(dailyMap[d.date].fat_g),
        })),
      );
    } catch (err) {
      if (err.status === 401) setUser(null);
    } finally {
      setWeeklyLoading(false);
    }
  }, [weekStart, user]);

  useEffect(() => {
    if (view === "weekly") loadWeeklyData();
  }, [view, weekStart, loadWeeklyData]);

  // Load quick-add data (favorites + recents) when switching to capture view
  const loadQuickAddData = useCallback(async () => {
    try {
      if (user) {
        const [recents, favorites] = await Promise.all([
          getRecentMeals(),
          getFavoriteMeals(),
        ]);
        setRecentMeals(recents);
        setFavoriteMeals(favorites);
      } else {
        setRecentMeals(getGuestRecentMeals());
        setFavoriteMeals(getGuestFavoriteMeals());
      }
    } catch {
      // Quick add is a convenience — fail silently
    }
  }, [user]);

  useEffect(() => {
    if (view === "capture") loadQuickAddData();
  }, [view, loadQuickAddData]);

  // Initialize adjustments and meal type when analysis changes
  useEffect(() => {
    if (analysis) {
      if (!isEditingMeal) {
        setItemAdjustments(analysis.items.map(() => ({ multiplier: 1.0 })));
        setExpandedItemIndex(null);
        setExtraItems([]);
        setExtraItemAdjustments([]);
        setAddingExtraItem(false);
      }
      if (!mealDetailMode) setSelectedMealType(inferMealType());
    } else {
      setItemAdjustments([]);
    }
  }, [analysis, mealDetailMode, isEditingMeal]);

  // Compute adjusted items and totals based on multipliers
  const scaledImageUrl = scaledImageData
    ? `data:${scaledImageData.mediaType};base64,${scaledImageData.base64}`
    : null;

  const { adjustedItems, adjustedTotals } = useMemo(() => {
    if (!analysis || itemAdjustments.length !== analysis.items.length) {
      return {
        adjustedItems: analysis?.items ?? null,
        adjustedTotals: analysis?.totals ?? null,
      };
    }
    const items = analysis.items.map((item, i) => {
      const mult = itemAdjustments[i].multiplier;
      return {
        ...item,
        multiplier: mult,
        ...(mult !== 1.0 ? {
          calories: Math.round(item.calories * mult),
          protein_g: +((item.protein_g ?? 0) * mult).toFixed(1),
          carbs_g: +((item.carbs_g ?? 0) * mult).toFixed(1),
          fat_g: +((item.fat_g ?? 0) * mult).toFixed(1),
          fiber_g: +((item.fiber_g ?? 0) * mult).toFixed(1),
          sugar_g: +((item.sugar_g ?? 0) * mult).toFixed(1),
        } : {}),
      };
    });
    const adjustedExtras = extraItems.map((item, i) => {
      const mult = extraItemAdjustments[i]?.multiplier ?? 1.0;
      return {
        ...item,
        multiplier: mult,
        ...(mult !== 1.0 ? {
          calories: Math.round(item.calories * mult),
          protein_g: +((item.protein_g ?? 0) * mult).toFixed(1),
          carbs_g: +((item.carbs_g ?? 0) * mult).toFixed(1),
          fat_g: +((item.fat_g ?? 0) * mult).toFixed(1),
          fiber_g: +((item.fiber_g ?? 0) * mult).toFixed(1),
          sugar_g: +((item.sugar_g ?? 0) * mult).toFixed(1),
        } : {}),
      };
    });
    const allItems = [...items, ...adjustedExtras];
    const totals = allItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein_g: +(acc.protein_g + (item.protein_g ?? 0)).toFixed(1),
        carbs_g: +(acc.carbs_g + (item.carbs_g ?? 0)).toFixed(1),
        fat_g: +(acc.fat_g + (item.fat_g ?? 0)).toFixed(1),
        fiber_g: +(acc.fiber_g + (item.fiber_g ?? 0)).toFixed(1),
        sugar_g: +(acc.sugar_g + (item.sugar_g ?? 0)).toFixed(1),
      }),
      {
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
      },
    );
    return { adjustedItems: allItems, adjustedTotals: totals };
  }, [analysis, itemAdjustments, extraItems, extraItemAdjustments]);

  const updateItemMultiplier = (index, newMultiplier) => {
    setItemAdjustments((prev) =>
      prev.map((adj, i) =>
        i === index
          ? { ...adj, multiplier: Math.max(0.25, newMultiplier) }
          : adj,
      ),
    );
  };

  const updateExtraItemMultiplier = (index, newMultiplier) => {
    setExtraItemAdjustments((prev) =>
      prev.map((adj, i) =>
        i === index
          ? { ...adj, multiplier: Math.max(0.25, newMultiplier) }
          : adj,
      ),
    );
  };

  const removeAnalysisItem = (index) => {
    setAnalysis((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setItemAdjustments((prev) => prev.filter((_, i) => i !== index));
    setExpandedItemIndex(null);
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
      const scaled = await downscaleImage(
        imageData.base64,
        imageData.mediaType,
      );
      setScaledImageData(scaled);

      // Analyze only — save happens in addToDaily after user can edit portions
      const result = await analyzeMeal(scaled.base64, scaled.mediaType, mealDescription.trim() || undefined);
      setAnalysis({
        items: result.analysis.items,
        totals: result.analysis.totals,
        meal_notes: result.analysis.meal_notes,
      });
      setView("result");
    } catch (err) {
      if (err.status === 401) {
        setUser(null);
        return;
      }
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addToDaily = async () => {
    if (!adjustedItems) return;
    try {
      if (isGuest) {
        addGuestMeal({
          items: adjustedItems,
          meal_notes: analysis.meal_notes,
          provider: "gemini",
          imageUrl: scaledImageUrl,
          mealType: selectedMealType,
        });
      } else {
        await saveMeal(
          adjustedItems,
          analysis.meal_notes,
          scaledImageData?.base64,
          scaledImageData?.mediaType,
          selectedMealType,
        );
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
    setExtraItems([]);
    setExtraItemAdjustments([]);
    setAddingExtraItem(false);
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
    if (!query.trim()) {
      setManualResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setManualSearching(true);
      try {
        const results = await searchNutrition(query);
        setManualResults(results);
      } catch {
      } finally {
        setManualSearching(false);
      }
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
    setManualItems((prev) => [
      ...prev,
      {
        name: selectedFood.name,
        portion: `${manualGrams}g`,
        ...scaledFoodMacros,
      },
    ]);
    setSelectedFood(null);
    setManualQuery("");
    setManualResults([]);
  };

  const addExtraItemToScan = () => {
    if (!selectedFood || !scaledFoodMacros) return;
    setExtraItems((prev) => [
      ...prev,
      {
        name: selectedFood.name,
        portion: `${manualGrams}g`,
        ...scaledFoodMacros,
      },
    ]);
    setExtraItemAdjustments((prev) => [...prev, { multiplier: 1.0 }]);
    setSelectedFood(null);
    setManualQuery("");
    setManualResults([]);
    setAddingExtraItem(false);
  };

  const removeExtraItem = (index) => {
    setExtraItems((prev) => prev.filter((_, i) => i !== index));
    setExtraItemAdjustments((prev) => prev.filter((_, i) => i !== index));
    setExpandedExtraIndex(null);
  };

  const addManualToDaily = async () => {
    if (manualItems.length === 0) return;
    try {
      if (isGuest) {
        addGuestMeal({
          items: manualItems,
          meal_notes: null,
          provider: "manual",
          mealType: selectedMealType,
        });
      } else {
        await saveMeal(
          manualItems,
          null,
          null,
          null,
          selectedMealType,
          "manual",
        );
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

  const handleStartEdit = () => {
    setOriginalAnalysis(JSON.parse(JSON.stringify(analysis)));
    // Restore multipliers from saved items and compute base values
    const multipliers = analysis.items.map((item) => ({
      multiplier: item.multiplier ?? 1.0,
    }));
    setItemAdjustments(multipliers);
    setAnalysis((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        const mult = item.multiplier ?? 1.0;
        if (mult === 1.0) return item;
        return {
          ...item,
          calories: Math.round(item.calories / mult),
          protein_g: +((item.protein_g ?? 0) / mult).toFixed(1),
          carbs_g: +((item.carbs_g ?? 0) / mult).toFixed(1),
          fat_g: +((item.fat_g ?? 0) / mult).toFixed(1),
          fiber_g: +((item.fiber_g ?? 0) / mult).toFixed(1),
          sugar_g: +((item.sugar_g ?? 0) / mult).toFixed(1),
        };
      }),
    }));
    setIsEditingMeal(true);
  };

  const handleCancelEdit = () => {
    setAnalysis(originalAnalysis);
    setIsEditingMeal(false);
    setOriginalAnalysis(null);
    setExtraItems([]);
    setExtraItemAdjustments([]);
    setAddingExtraItem(false);
  };

  const handleSaveEdit = async () => {
    if (!adjustedItems || editingMealId == null) return;
    try {
      if (isGuest) {
        updateGuestMeal(editingMealId, {
          items: adjustedItems,
          meal_notes: analysis.meal_notes,
          mealType: selectedMealType,
        });
      } else {
        await updateMeal(
          editingMealId,
          adjustedItems,
          analysis.meal_notes,
          selectedMealType,
        );
      }
    } catch {
      setError("Failed to update meal");
      return;
    }
    setImage(null);
    setImageData(null);
    setAnalysis(null);
    setError(null);
    setScaledImageData(null);
    setMealDetailMode(false);
    setIsEditingMeal(false);
    setEditingMealId(null);
    setOriginalAnalysis(null);
    setExtraItems([]);
    setExtraItemAdjustments([]);
    setAddingExtraItem(false);
    setView("daily");
    refreshData();
  };

  const handleRelogMeal = (meal) => {
    const items = (meal.items || []).map(normalizeItem);
    const totals = items.reduce(
      (acc, it) => ({
        calories: acc.calories + it.calories,
        protein_g: +(acc.protein_g + it.protein_g).toFixed(1),
        carbs_g: +(acc.carbs_g + it.carbs_g).toFixed(1),
        fat_g: +(acc.fat_g + it.fat_g).toFixed(1),
        fiber_g: +(acc.fiber_g + it.fiber_g).toFixed(1),
        sugar_g: +(acc.sugar_g + it.sugar_g).toFixed(1),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 },
    );
    setAnalysis({ items, totals, meal_notes: meal.mealNotes || meal.meal_notes });
    setImage(meal.imageUrl || null);
    setScaledImageData(null);
    setMealDetailMode(false);
    setEditingMealId(null);
    setIsEditingMeal(false);
    setSelectedMealType(inferMealType());
    setView("result");
  };

  const handleToggleFavorite = async (mealIdOrLocalId) => {
    // Find the meal and its current favorite state before any updates
    const matchId = (m) =>
      (user ? m.id : m.localId) === mealIdOrLocalId;
    const target = dailyLog.find(matchId);
    const newFav = target ? !target.isFavorite : true;

    // Optimistically update dailyLog so star changes immediately
    setDailyLog(
      dailyLog.map((m) => (matchId(m) ? { ...m, isFavorite: newFav } : m)),
    );

    try {
      if (user) {
        await toggleMealFavorite(mealIdOrLocalId, newFav);
        loadQuickAddData();
      } else {
        toggleGuestMealFavorite(mealIdOrLocalId);
        setFavoriteMeals(getGuestFavoriteMeals());
        setRecentMeals(getGuestRecentMeals());
      }
    } catch {
      // Revert on failure
      setDailyLog(
        dailyLog.map((m) => (matchId(m) ? { ...m, isFavorite: !newFav } : m)),
      );
    }
  };

  const resetCapture = () => {
    setImage(null);
    setImageData(null);
    setAnalysis(null);
    setError(null);
    setScaledImageData(null);
    setMealDetailMode(false);
    setEditingMealId(null);
    setIsEditingMeal(false);
    setOriginalAnalysis(null);
    setMealDescription("");
    setManualQuery("");
    setManualResults([]);
    setManualItems([]);
    setSelectedFood(null);
    setExtraItems([]);
    setExtraItemAdjustments([]);
    setAddingExtraItem(false);
    setBarcodeScanning(false);
    setBarcodeLoading(false);
    setView("capture");
  };

  const handleBarcodeDetected = useCallback(async (code) => {
    setBarcodeScanning(false);
    setBarcodeLoading(true);
    try {
      const product = await lookupBarcode(code);
      setSelectedFood(product);
      setManualGrams(product.servingSize || 100);
      setManualQuery("");
      setManualResults([]);
      setView("manual");
    } catch (err) {
      setError(err.message || "Product not found");
      setView("capture");
    } finally {
      setBarcodeLoading(false);
    }
  }, []);

  const handleDeleteMeal = (e, mealIdOrIndex) => {
    e.stopPropagation();
    // If there's already a pending delete, execute it immediately before starting a new one
    if (deleteToast) {
      clearTimeout(deleteToast.timeoutId);
      executeDelete(deleteToast.mealIdOrIndex);
    }
    const timeoutId = setTimeout(() => {
      executeDelete(mealIdOrIndex);
      setDeleteToast(null);
    }, 4000);
    setDeleteToast({ mealIdOrIndex, timeoutId });
  };

  const executeDelete = async (mealIdOrIndex) => {
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

  const undoDelete = () => {
    if (deleteToast) {
      clearTimeout(deleteToast.timeoutId);
      setDeleteToast(null);
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setDailyLog([]);
    setDailyTotals({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
    });
    const guestGoals = getGuestGoals();
    setGoals(guestGoals?.goals || { calories: 2200, proteinG: 150, carbsG: 275, fatG: 75 });
    setView("capture");
  };

  // Auth checking splash
  if (authChecking) {
    return (
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          background: "#0C0C0E",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: "42px",
              fontWeight: 400,
              color: "#fff",
            }}
          >
            Macro<span style={{ color: "#E8C872" }}>.</span>
          </h1>
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              margin: "16px auto 0",
              width: "120px",
              background:
                "linear-gradient(90deg, transparent, #E8C872, transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        </div>
        <style>{`
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "#0C0C0E",
        minHeight: "100vh",
        color: "#fff",
        maxWidth: "480px",
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
        paddingBottom: ["capture", "daily", "weekly", "settings"].includes(view)
          ? "calc(72px + env(safe-area-inset-bottom, 0px))"
          : "0px",
      }}
    >
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
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{ position: "relative", width: "100%", maxWidth: "480px" }}
          >
            <button
              onClick={() => setShowAuth(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "36px",
                zIndex: 101,
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              ✕
            </button>
            <AuthScreen onAuth={handleAuth} />
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          onClick={resetCapture}
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "26px",
            fontWeight: 400,
            letterSpacing: "-0.5px",
            cursor: "pointer",
          }}
        >
          Macro-Tracker<span style={{ color: "#E8C872" }}>.</span>
        </h1>
        {user ? (
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.45)",
              fontSize: "12px",
              fontFamily: "'DM Sans',sans-serif",
              minHeight: "36px",
            }}
          >
            Log out
          </button>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              background: "rgba(232,200,114,0.12)",
              color: "#E8C872",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "'DM Sans',sans-serif",
              minHeight: "36px",
            }}
          >
            Login
          </button>
        )}
      </div>


      {/* Barcode Scanner */}
      {barcodeScanning && (
        <BarcodeScannerView
          onBarcodeDetected={handleBarcodeDetected}
          onClose={() => {
            setBarcodeScanning(false);
            setView("capture");
          }}
        />
      )}

      {/* Barcode loading */}
      {barcodeLoading && (
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              margin: "0 auto 16px",
              width: "200px",
              background:
                "linear-gradient(90deg, transparent, #E8C872, transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "13px",
              animation: "pulse 2s infinite",
            }}
          >
            Looking up product...
          </p>
        </div>
      )}

      {/* Capture View */}
      {(view === "capture" || view === "result") && !barcodeScanning && !barcodeLoading && (
        <CaptureView
          view={view}
          image={image}
          analysis={analysis}
          loading={loading}
          error={error}
          adjustedItems={adjustedItems}
          adjustedTotals={adjustedTotals}
          itemAdjustments={itemAdjustments}
          extraItems={extraItems}
          extraItemAdjustments={extraItemAdjustments}
          expandedItemIndex={expandedItemIndex}
          expandedExtraIndex={expandedExtraIndex}
          addingExtraItem={addingExtraItem}
          mealDetailMode={mealDetailMode}
          selectedMealType={selectedMealType}
          manualQuery={manualQuery}
          manualResults={manualResults}
          manualSearching={manualSearching}
          selectedFood={selectedFood}
          manualGrams={manualGrams}
          scaledFoodMacros={scaledFoodMacros}
          goals={goals}
          mealDescription={mealDescription}
          setMealDescription={setMealDescription}
          fileInputRef={fileInputRef}
          cameraInputRef={cameraInputRef}
          handleFile={handleFile}
          analyzeFood={analyzeFood}
          addToDaily={addToDaily}
          updateItemMultiplier={updateItemMultiplier}
          updateExtraItemMultiplier={updateExtraItemMultiplier}
          removeAnalysisItem={removeAnalysisItem}
          removeExtraItem={removeExtraItem}
          setExpandedItemIndex={setExpandedItemIndex}
          setExpandedExtraIndex={setExpandedExtraIndex}
          setAddingExtraItem={setAddingExtraItem}
          setSelectedMealType={setSelectedMealType}
          handleManualSearch={handleManualSearch}
          selectFood={selectFood}
          setSelectedFood={setSelectedFood}
          setManualGrams={setManualGrams}
          setManualQuery={setManualQuery}
          setManualResults={setManualResults}
          addExtraItemToScan={addExtraItemToScan}
          setView={setView}
          resetCapture={resetCapture}
          setError={setError}
          setMealDetailMode={setMealDetailMode}
          setAnalysis={setAnalysis}
          setImage={setImage}
          onBarcodeScan={() => setBarcodeScanning(true)}
          isEditing={isEditingMeal}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          recentMeals={recentMeals}
          favoriteMeals={favoriteMeals}
          onRelogMeal={handleRelogMeal}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* Manual Entry View */}
      {view === "manual" && (
        <ManualEntryView
          manualQuery={manualQuery}
          manualResults={manualResults}
          manualSearching={manualSearching}
          manualItems={manualItems}
          selectedFood={selectedFood}
          manualGrams={manualGrams}
          expandedManualIndex={expandedManualIndex}
          selectedMealType={selectedMealType}
          scaledFoodMacros={scaledFoodMacros}
          goals={goals}
          error={error}
          handleManualSearch={handleManualSearch}
          selectFood={selectFood}
          setSelectedFood={setSelectedFood}
          setManualResults={setManualResults}
          setManualQuery={setManualQuery}
          setManualGrams={setManualGrams}
          setExpandedManualIndex={setExpandedManualIndex}
          setManualItems={setManualItems}
          setSelectedMealType={setSelectedMealType}
          addManualItem={addManualItem}
          addManualToDaily={addManualToDaily}
          resetCapture={resetCapture}
        />
      )}

      {/* Weekly Stats View */}
      {view === "weekly" && (
        <WeeklyStatsView
          weeklyData={weeklyData}
          weeklyLoading={weeklyLoading}
          weeklyMetric={weeklyMetric}
          weekStart={weekStart}
          goals={goals}
          todayStr={todayStr}
          isCurrentWeek={isCurrentWeek}
          onWeekChange={changeWeek}
          onWeekReset={() => setWeekStart(getWeekStartMonday(todayStr))}
          onMetricChange={setWeeklyMetric}
          onDayClick={(dateStr) => {
            setSelectedDate(dateStr);
            setView("daily");
          }}
          onScan={resetCapture}
        />
      )}

      {/* Daily Log View */}
      {view === "daily" && (
        <DailyLogView
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          isToday={isToday}
          todayStr={todayStr}
          changeDate={changeDate}
          dailyTotals={dailyTotals}
          goals={goals}
          dailyLog={dailyLog}
          isGuest={!user}
          user={user}
          deleteToast={deleteToast}
          setShowAuth={setShowAuth}
          setView={setView}
          setAnalysis={setAnalysis}
          setImage={setImage}
          setMealDetailMode={setMealDetailMode}
          setEditingMealId={setEditingMealId}
          setSelectedMealType={setSelectedMealType}
          handleDeleteMeal={handleDeleteMeal}
          resetCapture={resetCapture}
          onToggleFavorite={handleToggleFavorite}
        />
      )}


      {/* Goals/Settings View */}
      {view === "settings" && (
        <GoalsScreen
          goals={goals}
          onSave={(newGoals) => setGoals(newGoals)}
          isGuest={!user}
        />
      )}

      {/* Delete undo toast */}
      {deleteToast && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            zIndex: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            animation: "fadeSlideIn 0.2s ease-out",
          }}
        >
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
            Meal deleted
          </span>
          <button
            onClick={undoDelete}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#E8C872",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: "'DM Sans',sans-serif",
              padding: "4px 8px",
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* Bottom Tab Bar */}
      {["capture", "daily", "weekly", "settings"].includes(view) && !barcodeScanning && (
        <BottomTabBar
          view={view}
          dailyLogCount={dailyLog.length}
          onTabChange={(tabId) => {
            if (tabId === "settings" && !user && view === "settings") return;
            setView(tabId);
            if (tabId === "daily") refreshData();
            if (tabId === "weekly") loadWeeklyData();
          }}
        />
      )}
    </div>
  );
}
