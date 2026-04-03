import { normalizeItem, mealTotals } from "../utils/meals";
import { resolveImageUrl } from "../api";

function mealFingerprint(meal) {
  return (meal.items || [])
    .map((i) => (i.name || "").trim().toLowerCase())
    .sort()
    .join("|");
}

function MealCard({ meal, onRelog, onToggleFavorite, isFav }) {
  const items = (meal.items || []).map(normalizeItem);
  const totals = mealTotals(items);
  const name = items.map((i) => i.name).join(", ");
  const id = meal.id || meal.localId;

  return (
    <div
      onClick={() => onRelog(meal)}
      style={{
        minWidth: "140px",
        maxWidth: "160px",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.03)",
        padding: "10px",
        cursor: "pointer",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      {meal.imageUrl ? (
        <img
          src={resolveImageUrl(meal.imageUrl)}
          alt=""
          style={{
            width: "100%",
            height: "70px",
            borderRadius: "6px",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "70px",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            color: "rgba(255,255,255,0.15)",
          }}
        >
          {items[0]?.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      <div
        style={{
          fontSize: "12px",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "11px", color: "#E8C872" }}>
          {totals.calories} cal
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(id);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            fontSize: "14px",
            color: isFav ? "#E8C872" : "rgba(255,255,255,0.2)",
            lineHeight: 1,
          }}
        >
          {isFav ? "★" : "☆"}
        </button>
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        P {Math.round(totals.protein_g)}g · C {Math.round(totals.carbs_g)}g · F{" "}
        {Math.round(totals.fat_g)}g
      </div>
    </div>
  );
}

function MealRow({ meal, onRelog, onToggleFavorite, isFav }) {
  const items = (meal.items || []).map(normalizeItem);
  const totals = mealTotals(items);
  const name = items.map((i) => i.name).join(", ");
  const id = meal.id || meal.localId;

  return (
    <div
      onClick={() => onRelog(meal)}
      style={{
        display: "flex",
        gap: "10px",
        padding: "10px 0",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: "pointer",
      }}
    >
      {meal.imageUrl ? (
        <img
          src={resolveImageUrl(meal.imageUrl)}
          alt=""
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "14px",
            color: "rgba(255,255,255,0.15)",
          }}
        >
          {items[0]?.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "2px",
          }}
        >
          {name}
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            fontSize: "10px",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          <span style={{ color: "#E8C872" }}>{totals.calories} cal</span>
          <span>P {Math.round(totals.protein_g)}g</span>
          <span>C {Math.round(totals.carbs_g)}g</span>
          <span>F {Math.round(totals.fat_g)}g</span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(id);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          fontSize: "16px",
          color: isFav ? "#E8C872" : "rgba(255,255,255,0.2)",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {isFav ? "★" : "☆"}
      </button>
    </div>
  );
}

const sectionHeaderStyle = {
  fontSize: "11px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.25)",
  textTransform: "uppercase",
  letterSpacing: "1px",
  marginBottom: "8px",
  fontFamily: "'DM Sans',sans-serif",
};

export default function QuickAddSection({
  favoriteMeals,
  recentMeals,
  onRelogMeal,
  onToggleFavorite,
}) {
  if (!favoriteMeals.length && !recentMeals.length) return null;

  // Build a set of favorite fingerprints to exclude from recents
  const favFingerprints = new Set(favoriteMeals.map(mealFingerprint));
  const filteredRecents = recentMeals
    .filter((m) => !favFingerprints.has(mealFingerprint(m)))
    .slice(0, 8);

  return (
    <div style={{ width: "100%", marginTop: "-8px" }}>
      {favoriteMeals.length > 0 && (
        <div>
          <div style={sectionHeaderStyle}>Favorites</div>
          <div
            style={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              paddingBottom: "8px",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            {favoriteMeals.map((meal, i) => (
              <MealCard
                key={meal.id || meal.localId || i}
                meal={meal}
                onRelog={onRelogMeal}
                onToggleFavorite={onToggleFavorite}
                isFav={true}
              />
            ))}
          </div>
        </div>
      )}

      {filteredRecents.length > 0 && (
        <div style={{ marginTop: favoriteMeals.length > 0 ? "12px" : 0 }}>
          <div style={sectionHeaderStyle}>Recent</div>
          {filteredRecents.map((meal, i) => (
            <MealRow
              key={meal.id || meal.localId || i}
              meal={meal}
              onRelog={onRelogMeal}
              onToggleFavorite={onToggleFavorite}
              isFav={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
