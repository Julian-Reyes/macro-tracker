import MacroRing from "../components/MacroRing";
import { resolveImageUrl } from "../api";
import { toLocalDateStr, formatDisplayDate } from "../utils/dates";
import {
  normalizeItem,
  mealTotals,
  groupMealsByType,
  computeDailyTotals,
  MEAL_TYPE_LABELS,
} from "../utils/meals";

export default function DailyLogView({
  selectedDate,
  setSelectedDate,
  isToday,
  todayStr,
  changeDate,
  dailyTotals,
  goals,
  dailyLog,
  isGuest,
  user,
  deleteToast,
  setShowAuth,
  setView,
  setAnalysis,
  setImage,
  setMealDetailMode,
  setEditingMealId,
  setSelectedMealType,
  handleDeleteMeal,
  resetCapture,
  onToggleFavorite,
}) {
  return (
    <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
      {/* Date Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 20px 0",
          gap: "8px",
        }}
      >
        <button
          onClick={() => changeDate(-1)}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          ‹
        </button>
        <span
          style={{
            fontSize: "15px",
            fontWeight: 600,
            minWidth: "150px",
            textAlign: "center",
            color: isToday ? "#E8C872" : "rgba(255,255,255,0.7)",
          }}
        >
          {isToday ? "Today" : formatDisplayDate(selectedDate)}
        </span>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: isToday ? "transparent" : "rgba(255,255,255,0.04)",
            color: isToday
              ? "rgba(255,255,255,0.1)"
              : "rgba(255,255,255,0.5)",
            cursor: isToday ? "default" : "pointer",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          ›
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(todayStr)}
            style={{
              padding: "4px 12px",
              borderRadius: "12px",
              border: "none",
              background: "rgba(232,200,114,0.1)",
              color: "#E8C872",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Today
          </button>
        )}
      </div>

      <div
        style={{
          padding: "16px 20px 24px",
          background: "rgba(255,255,255,0.015)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <MacroRing
            value={dailyTotals.calories}
            max={goals.calories}
            color="#E8C872"
            label="Calories"
            unit="kcal"
          />
          <MacroRing
            value={dailyTotals.protein_g}
            max={goals.proteinG}
            color="#7BE0AD"
            label="Protein"
            unit="g"
          />
          <MacroRing
            value={dailyTotals.carbs_g}
            max={goals.carbsG}
            color="#72B4E8"
            label="Carbs"
            unit="g"
          />
          <MacroRing
            value={dailyTotals.fat_g}
            max={goals.fatG}
            color="#E87272"
            label="Fat"
            unit="g"
          />
        </div>
      </div>

      {/* Remaining macros — only on today with meals logged */}
      {isToday && dailyLog.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            padding: "12px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {[
            {
              label: "Calories",
              remaining: goals.calories - dailyTotals.calories,
              goal: goals.calories,
              color: "#E8C872",
              unit: "",
            },
            {
              label: "Protein",
              remaining: Math.round(goals.proteinG - dailyTotals.protein_g),
              goal: goals.proteinG,
              color: "#7BE0AD",
              unit: "g",
            },
            {
              label: "Carbs",
              remaining: Math.round(goals.carbsG - dailyTotals.carbs_g),
              goal: goals.carbsG,
              color: "#72B4E8",
              unit: "g",
            },
            {
              label: "Fat",
              remaining: Math.round(goals.fatG - dailyTotals.fat_g),
              goal: goals.fatG,
              color: "#E87272",
              unit: "g",
            },
          ].map(({ label, remaining, goal, color, unit }) => {
            const atGoal = goal > 0 && Math.abs(remaining) <= goal * 0.02;
            const over = remaining < 0 && !atGoal;
            return (
              <div key={label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: atGoal
                      ? color
                      : over
                        ? "rgba(232,114,114,0.7)"
                        : color,
                  }}
                >
                  {atGoal
                    ? "On target"
                    : `${Math.abs(Math.round(remaining))}${unit}`}
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    color: atGoal
                      ? color
                      : over
                        ? "rgba(232,114,114,0.7)"
                        : color,
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginTop: "2px",
                  }}
                >
                  {label}
                </div>
                {!atGoal && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: over
                        ? "rgba(232,114,114,0.4)"
                        : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {over ? "Over" : "Remaining"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Guest sign-up prompt */}
      {isGuest && dailyLog.length > 0 && (
        <div
          style={{
            margin: "16px 20px",
            padding: "14px 16px",
            borderRadius: "10px",
            background: "rgba(232,200,114,0.04)",
            border: "1px solid rgba(232,200,114,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.5)",
              margin: 0,
            }}
          >
            Create an account to save your data across devices
          </p>
          <button
            onClick={() => setShowAuth(true)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: "rgba(232,200,114,0.15)",
              color: "#E8C872",
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: "'DM Sans',sans-serif",
              whiteSpace: "nowrap",
              marginLeft: "12px",
            }}
          >
            Sign up
          </button>
        </div>
      )}

      {dailyLog.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "14px" }}>
            {isToday
              ? "No meals logged yet today"
              : `No meals on ${formatDisplayDate(selectedDate)}`}
          </p>
          <button
            onClick={() => setView("capture")}
            style={{
              marginTop: "16px",
              padding: "10px 24px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              background: "rgba(232,200,114,0.1)",
              color: "#E8C872",
              fontSize: "13px",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Scan your first meal
          </button>
        </div>
      ) : (
        <div>
          {groupMealsByType(dailyLog).map(({ type, meals: groupMeals }) => {
            const groupTotals = computeDailyTotals(groupMeals);
            return (
              <div key={type}>
                <div
                  style={{
                    padding: "16px 20px 8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.25)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontWeight: 500,
                    }}
                  >
                    {MEAL_TYPE_LABELS[type]}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.2)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {groupTotals.calories} cal
                  </span>
                </div>
                {groupMeals.map((entry, i) => {
                  const totals = mealTotals(entry.items);
                  const time = new Date(entry.scannedAt).toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" },
                  );
                  const mealKey = user ? entry.id : dailyLog.indexOf(entry);
                  const isPendingDelete =
                    deleteToast && deleteToast.mealIdOrIndex === mealKey;
                  if (isPendingDelete) return null;
                  return (
                    <div
                      key={entry.id || `${type}-${i}`}
                      style={{
                        display: "flex",
                        gap: "14px",
                        padding: "14px 20px",
                        alignItems: "center",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        animation: `fadeSlideIn 0.3s ${i * 0.05}s both ease-out`,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setAnalysis({
                          items: entry.items.map(normalizeItem),
                          totals,
                          meal_notes: entry.mealNotes || entry.meal_notes,
                        });
                        setImage(resolveImageUrl(entry.imageUrl) || null);
                        setMealDetailMode(true);
                        setEditingMealId(user ? entry.id : dailyLog.indexOf(entry));
                        setSelectedMealType(entry.mealType || entry.meal_type || "dinner");
                        setView("result");
                      }}
                    >
                      {entry.imageUrl ? (
                        <img
                          src={resolveImageUrl(entry.imageUrl)}
                          alt=""
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "10px",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            background: "rgba(255,255,255,0.04)",
                            fontSize: "18px",
                            color: "rgba(255,255,255,0.2)",
                          }}
                        >
                          {entry.items[0]?.name?.charAt(0)?.toUpperCase() ||
                            "?"}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            marginBottom: "4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {entry.items.map((it) => it.name).join(", ")}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            fontSize: "11px",
                            color: "rgba(255,255,255,0.35)",
                          }}
                        >
                          <span style={{ color: "#E8C872" }}>
                            {totals.calories} cal
                          </span>
                          <span>P {Math.round(totals.protein_g)}g</span>
                          <span>C {Math.round(totals.carbs_g)}g</span>
                          <span>F {Math.round(totals.fat_g)}g</span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "rgba(255,255,255,0.2)",
                          flexShrink: 0,
                          marginRight: "4px",
                        }}
                      >
                        {time}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(
                            user ? entry.id : entry.localId,
                          );
                        }}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          border: "none",
                          cursor: "pointer",
                          background: entry.isFavorite
                            ? "rgba(232,200,114,0.15)"
                            : "rgba(255,255,255,0.04)",
                          color: entry.isFavorite
                            ? "#E8C872"
                            : "rgba(255,255,255,0.2)",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginRight: "4px",
                        }}
                      >
                        {entry.isFavorite ? "★" : "☆"}
                      </button>
                      <button
                        onClick={(e) =>
                          handleDeleteMeal(e, user ? entry.id : i)
                        }
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          border: "none",
                          cursor: "pointer",
                          background: "rgba(232,114,114,0.1)",
                          color: "#E87272",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          padding: "20px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          onClick={resetCapture}
          style={{
            padding: "14px 32px",
            borderRadius: "50px",
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(135deg, #E8C872, #D4A843)",
            color: "#0C0C0E",
            fontSize: "14px",
            fontWeight: 700,
            fontFamily: "'DM Sans',sans-serif",
            boxShadow: "0 4px 24px rgba(232,200,114,0.2)",
          }}
        >
          + Scan Meal
        </button>
      </div>
    </div>
  );
}
