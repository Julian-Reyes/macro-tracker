import { normalizeItem } from "../utils/meals";

export default function ItemRow({
  item,
  index,
  expanded,
  multiplier,
  editable,
  onToggle,
  onMultiplierChange,
  onRemove,
}) {
  const macroBar = (val, max, color) => (
    <div
      style={{
        height: "3px",
        background: "rgba(255,255,255,0.06)",
        borderRadius: "2px",
        flex: 1,
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: "2px",
          background: color,
          width: `${Math.min((val / max) * 100, 100)}%`,
          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  );

  const isAdjusted = multiplier != null && multiplier !== 1.0;

  return (
    <div
      style={{
        position: "relative",
        background: expanded
          ? "rgba(232,200,114,0.03)"
          : "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        animation: `fadeSlideIn 0.4s ${index * 0.08}s both ease-out`,
        transition: "background 0.2s",
      }}
    >
      {expanded && editable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            position: "absolute",
            top: "5px",
            right: "8px",
            zIndex: 1,
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: "rgba(232,114,114,0.1)",
            color: "#E87272",
            fontSize: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      )}
      <div
        onClick={editable ? onToggle : undefined}
        style={{
          padding: "16px 20px",
          cursor: editable ? "pointer" : "default",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
              minWidth: 0,
              flex: 1,
            }}
          >
            <span style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>
              {item.name}
            </span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>
              {item.portion}
            </span>
            {isAdjusted && !expanded && (
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "rgba(232,200,114,0.15)",
                  color: "#E8C872",
                  fontSize: "10px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {parseFloat(multiplier.toFixed(2))}×
              </span>
            )}
          </div>
          <span
            style={{
              color: "#E8C872",
              fontSize: "14px",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
              marginLeft: "8px",
            }}
          >
            {item.calories} cal
          </span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{ width: "14px", fontSize: "10px", color: "#7BE0AD" }}
              >
                P
              </span>
              {macroBar(item.protein_g, 50, "#7BE0AD")}
              <span
                style={{
                  width: "28px",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.4)",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {item.protein_g}g
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{ width: "14px", fontSize: "10px", color: "#72B4E8" }}
              >
                C
              </span>
              {macroBar(item.carbs_g, 80, "#72B4E8")}
              <span
                style={{
                  width: "28px",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.4)",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {item.carbs_g}g
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{ width: "14px", fontSize: "10px", color: "#E87272" }}
              >
                F
              </span>
              {macroBar(item.fat_g, 40, "#E87272")}
              <span
                style={{
                  width: "28px",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.4)",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {item.fat_g}g
              </span>
            </div>
          </div>
        </div>
      </div>
      {expanded && editable && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            padding: "4px 20px 16px",
          }}
        >
          {onMultiplierChange && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMultiplierChange(Math.max(0.25, multiplier - 0.25));
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                −
              </button>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  minWidth: "50px",
                  textAlign: "center",
                  color: isAdjusted ? "#E8C872" : "rgba(255,255,255,0.5)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {parseFloat(multiplier.toFixed(2))}×
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMultiplierChange(multiplier + 0.25);
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                +
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
