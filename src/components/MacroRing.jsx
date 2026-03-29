export default function MacroRing({ value, max, color, label, unit }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="5"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 36 36)"
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        <text
          x="36"
          y="33"
          textAnchor="middle"
          fill="#fff"
          fontSize="14"
          fontWeight="700"
          fontFamily="'DM Sans',sans-serif"
        >
          {Math.round(value)}
        </text>
        <text
          x="36"
          y="45"
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="9"
          fontFamily="'DM Sans',sans-serif"
        >
          {unit}
        </text>
      </svg>
      <span
        style={{
          fontSize: "11px",
          color,
          fontWeight: 500,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}
