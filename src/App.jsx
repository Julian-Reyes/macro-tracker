import { useState, useRef, useCallback, useEffect } from "react";
import AuthScreen from "./AuthScreen";
import { getToken, clearToken, getMe, scanMeal, getMeals, deleteMeal, getGoals, downscaleImage } from "./api";

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

function ItemRow({ item, index }) {
  const macroBar = (val, max, color) => (
    <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", flex: 1 }}>
      <div style={{
        height: "100%", borderRadius: "2px", background: color,
        width: `${Math.min((val / max) * 100, 100)}%`,
        transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)"
      }} />
    </div>
  );

  return (
    <div style={{
      padding: "16px 20px", background: "rgba(255,255,255,0.02)",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      animation: `fadeSlideIn 0.4s ${index * 0.08}s both ease-out`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
        <div>
          <span style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{item.name}</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginLeft: "8px" }}>{item.portion}</span>
        </div>
        <span style={{ color: "#E8C872", fontSize: "14px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
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
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dailyLog, setDailyLog] = useState([]);
  const [dailyTotals, setDailyTotals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 });
  const [goals, setGoals] = useState({ calories: 2200, proteinG: 150, carbsG: 275, fatG: 75 });
  const [view, setView] = useState("capture");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Check for existing auth on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthChecking(false); return; }
    getMe()
      .then(data => setUser(data.user || data))
      .catch(() => clearToken())
      .finally(() => setAuthChecking(false));
  }, []);

  // Fetch daily meals + goals when authenticated
  const fetchDailyData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = await getMeals(today);
      setDailyLog(data.meals || []);
      setDailyTotals(data.totals || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 });
    } catch (err) {
      if (err.status === 401) setUser(null);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDailyData();
      getGoals().then(g => setGoals(g)).catch(() => {});
    }
  }, [user, fetchDailyData]);

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
      const result = await scanMeal(scaled.base64, scaled.mediaType);

      setAnalysis({
        items: result.meal.items.map(normalizeItem),
        totals: result.totals,
        meal_notes: result.meal_notes || result.meal.mealNotes,
      });
      setView("result");
      fetchDailyData();
    } catch (err) {
      if (err.status === 401) { setUser(null); return; }
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addToDaily = () => {
    setView("daily");
    fetchDailyData();
  };

  const resetCapture = () => {
    setImage(null);
    setImageData(null);
    setAnalysis(null);
    setError(null);
    setView("capture");
  };

  const handleDeleteMeal = async (e, mealId) => {
    e.stopPropagation();
    try {
      await deleteMeal(mealId);
      fetchDailyData();
    } catch (err) {
      if (err.status === 401) setUser(null);
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setDailyLog([]);
    setDailyTotals({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 });
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

  // Not logged in
  if (!user) {
    return <AuthScreen onAuth={setUser} />;
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

      {/* Header */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "26px", fontWeight: 400, letterSpacing: "-0.5px" }}>
            Macro<span style={{ color: "#E8C872" }}>.</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <button onClick={handleLogout} style={{
            padding: "6px 12px", borderRadius: "20px", border: "none", cursor: "pointer",
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)",
            fontSize: "11px", fontFamily: "'DM Sans',sans-serif",
          }}>Log out</button>
          {["capture", "daily"].map(v => (
            <button key={v} onClick={() => { setView(v); if (v === "daily") fetchDailyData(); }} style={{
              padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 500, fontFamily: "'DM Sans',sans-serif",
              textTransform: "uppercase", letterSpacing: "0.5px",
              background: view === v || (v === "capture" && view === "result") ? "rgba(232,200,114,0.12)" : "transparent",
              color: view === v || (v === "capture" && view === "result") ? "#E8C872" : "rgba(255,255,255,0.3)",
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
          {!image ? (
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
            </div>
          ) : (
            <div>
              {/* Image preview */}
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
              {analysis && (
                <div style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
                  {/* Macro Rings */}
                  <div style={{
                    padding: "20px", display: "flex", justifyContent: "space-around",
                    background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)"
                  }}>
                    <MacroRing value={analysis.totals.calories} max={goals.calories} color="#E8C872" label="Calories" unit="kcal" />
                    <MacroRing value={analysis.totals.protein_g} max={goals.proteinG} color="#7BE0AD" label="Protein" unit="g" />
                    <MacroRing value={analysis.totals.carbs_g} max={goals.carbsG} color="#72B4E8" label="Carbs" unit="g" />
                    <MacroRing value={analysis.totals.fat_g} max={goals.fatG} color="#E87272" label="Fat" unit="g" />
                  </div>

                  {/* Extra stats */}
                  <div style={{ display: "flex", padding: "12px 20px", gap: "16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {analysis.totals.fiber_g !== undefined && (
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                        Fiber: <span style={{ color: "rgba(255,255,255,0.6)" }}>{analysis.totals.fiber_g}g</span>
                      </span>
                    )}
                    {analysis.totals.sugar_g !== undefined && (
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                        Sugar: <span style={{ color: "rgba(255,255,255,0.6)" }}>{analysis.totals.sugar_g}g</span>
                      </span>
                    )}
                  </div>

                  {/* Item Breakdown */}
                  <div>
                    <div style={{ padding: "16px 20px 8px", fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 500 }}>
                      Breakdown
                    </div>
                    {analysis.items.map((item, i) => (
                      <ItemRow key={i} item={item} index={i} />
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

                  {/* Actions */}
                  <div style={{ padding: "16px 20px 32px", display: "flex", gap: "12px" }}>
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
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Daily Log View */}
      {view === "daily" && (
        <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
          <div style={{
            padding: "24px 20px", background: "rgba(255,255,255,0.015)",
            borderBottom: "1px solid rgba(255,255,255,0.04)"
          }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px", fontWeight: 500 }}>
              Today's Totals
            </div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <MacroRing value={dailyTotals.calories} max={goals.calories} color="#E8C872" label="Calories" unit="kcal" />
              <MacroRing value={dailyTotals.protein_g} max={goals.proteinG} color="#7BE0AD" label="Protein" unit="g" />
              <MacroRing value={dailyTotals.carbs_g} max={goals.carbsG} color="#72B4E8" label="Carbs" unit="g" />
              <MacroRing value={dailyTotals.fat_g} max={goals.fatG} color="#E87272" label="Fat" unit="g" />
            </div>
          </div>

          {dailyLog.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "14px" }}>No meals logged yet today</p>
              <button onClick={() => setView("capture")} style={{
                marginTop: "16px", padding: "10px 24px", borderRadius: "10px", border: "none", cursor: "pointer",
                background: "rgba(232,200,114,0.1)", color: "#E8C872",
                fontSize: "13px", fontFamily: "'DM Sans',sans-serif"
              }}>Scan your first meal</button>
            </div>
          ) : (
            <div>
              <div style={{ padding: "16px 20px 8px", fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 500 }}>
                Meals
              </div>
              {dailyLog.map((entry, i) => {
                const totals = mealTotals(entry.items);
                const time = new Date(entry.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={entry.id} style={{
                    display: "flex", gap: "14px", padding: "14px 20px", alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    animation: `fadeSlideIn 0.3s ${i * 0.05}s both ease-out`, cursor: "pointer"
                  }} onClick={() => {
                    setAnalysis({
                      items: entry.items.map(normalizeItem),
                      totals,
                      meal_notes: entry.mealNotes,
                    });
                    setImage(entry.imageUrl || null);
                    setView("result");
                  }}>
                    {entry.imageUrl && (
                      <img src={entry.imageUrl} alt="" style={{ width: "52px", height: "52px", borderRadius: "10px", objectFit: "cover" }} />
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
                    <button onClick={(e) => handleDeleteMeal(e, entry.id)} style={{
                      width: "24px", height: "24px", borderRadius: "50%", border: "none", cursor: "pointer",
                      background: "rgba(232,114,114,0.1)", color: "#E87272", fontSize: "12px",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>✕</button>
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
