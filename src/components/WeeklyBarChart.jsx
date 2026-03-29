export const METRIC_CONFIG = {
  calories: {
    key: "calories",
    color: "#E8C872",
    colorDark: "#D4A843",
    unit: "",
    label: "Calories",
  },
  protein_g: {
    key: "protein_g",
    color: "#7BE0AD",
    colorDark: "#4CB97A",
    unit: "g",
    label: "Protein",
  },
  carbs_g: {
    key: "carbs_g",
    color: "#72B4E8",
    colorDark: "#4A8FC0",
    unit: "g",
    label: "Carbs",
  },
  fat_g: {
    key: "fat_g",
    color: "#E87272",
    colorDark: "#C05050",
    unit: "g",
    label: "Fat",
  },
};

export default function WeeklyBarChart({
  data,
  goal,
  todayStr,
  onBarTap,
  metric = "calories",
}) {
  const cfg = METRIC_CONFIG[metric] || METRIC_CONFIG.calories;
  const chartH = 170,
    chartTop = 15,
    chartLeft = 10,
    chartRight = 430;
  const chartW = chartRight - chartLeft;
  const barW = 40,
    gap = (chartW - barW * 7) / 6;
  const values = data.map((d) => d[cfg.key] || 0);
  const maxVal = Math.max(goal || 0, ...values);
  const scaleMax = maxVal * 1.15 || 1;
  const hasGoal = goal > 0;
  const goalY = hasGoal ? chartTop + chartH - (goal / scaleMax) * chartH : 0;

  return (
    <svg viewBox="0 0 440 230" style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cfg.color} />
          <stop offset="100%" stopColor={cfg.colorDark} />
        </linearGradient>
      </defs>
      {/* Goal line */}
      {hasGoal && (
        <>
          <line
            x1={chartLeft}
            y1={goalY}
            x2={chartRight}
            y2={goalY}
            stroke={cfg.color}
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity={0.3}
          />
          <text
            x={chartRight + 4}
            y={goalY + 3}
            fill={cfg.color}
            fontSize="9"
            fontFamily="'DM Sans',sans-serif"
            opacity={0.4}
          >
            {goal}
            {cfg.unit}
          </text>
        </>
      )}
      {/* Bars */}
      {data.map((day, i) => {
        const x = chartLeft + i * (barW + gap);
        const isToday = day.date === todayStr;
        const isFuture = day.date > todayStr;
        const val = day[cfg.key] || 0;
        const h = val > 0 ? Math.max((val / scaleMax) * chartH, 4) : 3;
        const y = chartTop + chartH - h;
        return (
          <g
            key={day.date}
            onClick={() => !isFuture && onBarTap(day.date)}
            style={{ cursor: isFuture ? "default" : "pointer" }}
          >
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={3}
              fill={
                isFuture
                  ? "rgba(255,255,255,0.04)"
                  : val > 0
                    ? "url(#barGrad)"
                    : "rgba(255,255,255,0.06)"
              }
              stroke={isToday ? cfg.color : "none"}
              strokeWidth={isToday ? 1.5 : 0}
              opacity={isFuture ? 0.3 : 1}
            />
            <text
              x={x + barW / 2}
              y={y - 5}
              textAnchor="middle"
              fill={
                isFuture ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)"
              }
              fontSize="10"
              fontWeight="600"
              fontFamily="'DM Sans',sans-serif"
            >
              {isFuture ? "–" : val > 0 ? `${val}${cfg.unit}` : "–"}
            </text>
            <text
              x={x + barW / 2}
              y={chartTop + chartH + 18}
              textAnchor="middle"
              fill={isToday ? cfg.color : "rgba(255,255,255,0.35)"}
              fontSize="11"
              fontWeight={isToday ? 600 : 400}
              fontFamily="'DM Sans',sans-serif"
            >
              {day.dayLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
