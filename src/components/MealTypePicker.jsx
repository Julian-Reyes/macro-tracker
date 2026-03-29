import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from "../utils/meals";

export default function MealTypePicker({ value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        justifyContent: "center",
        padding: "12px 20px",
      }}
    >
      {MEAL_TYPE_ORDER.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          style={{
            padding: "6px 14px",
            borderRadius: "20px",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: "'DM Sans',sans-serif",
            background:
              value === type
                ? "rgba(232,200,114,0.15)"
                : "rgba(255,255,255,0.04)",
            color: value === type ? "#E8C872" : "rgba(255,255,255,0.3)",
            transition: "all 0.2s",
          }}
        >
          {MEAL_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
