import WeeklyBarChart from "../components/WeeklyBarChart";
import { formatWeekRange, getWeekStartMonday } from "../utils/dates";
import { useLocale } from "../locales/index.jsx";

export default function WeeklyStatsView({
  weeklyData,
  weeklyLoading,
  weeklyMetric,
  weekStart,
  goals,
  todayStr,
  isCurrentWeek,
  onWeekChange,
  onWeekReset,
  onMetricChange,
  onDayClick,
  onScan,
}) {
  const { t } = useLocale();
  return (
    <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
      {/* Week Navigation */}
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
          onClick={() => onWeekChange(-1)}
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
            minWidth: "180px",
            textAlign: "center",
            color: isCurrentWeek ? "#E8C872" : "rgba(255,255,255,0.7)",
          }}
        >
          {isCurrentWeek ? t("weekly.thisWeek") : formatWeekRange(weekStart)}
        </span>
        <button
          onClick={() => onWeekChange(1)}
          disabled={isCurrentWeek}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: isCurrentWeek
              ? "transparent"
              : "rgba(255,255,255,0.04)",
            color: isCurrentWeek
              ? "rgba(255,255,255,0.1)"
              : "rgba(255,255,255,0.5)",
            cursor: isCurrentWeek ? "default" : "pointer",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          ›
        </button>
        {!isCurrentWeek && (
          <button
            onClick={onWeekReset}
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
            {t("weekly.thisWeek")}
          </button>
        )}
      </div>

      {weeklyLoading ? (
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
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
            {t("weekly.loadingStats")}
          </p>
        </div>
      ) : weeklyData.length > 0 ? (
        <>
          {/* Bar Chart */}
          <div style={{ padding: "16px 10px 0" }}>
            <WeeklyBarChart
              data={weeklyData}
              goal={
                weeklyMetric === "calories"
                  ? goals.calories
                  : weeklyMetric === "protein_g"
                    ? goals.proteinG
                    : weeklyMetric === "carbs_g"
                      ? goals.carbsG
                      : goals.fatG
              }
              todayStr={todayStr}
              onBarTap={(dateStr) => onDayClick(dateStr)}
              metric={weeklyMetric}
            />
          </div>

          {/* Summary Stats */}
          {(() => {
            const daysLogged = weeklyData.filter((d) => d.calories > 0);
            const n = daysLogged.length || 1;
            const totals = weeklyData.reduce(
              (acc, d) => ({
                calories: acc.calories + d.calories,
                protein_g: acc.protein_g + d.protein_g,
                carbs_g: acc.carbs_g + d.carbs_g,
                fat_g: acc.fat_g + d.fat_g,
              }),
              { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
            );
            const atGoal = daysLogged.filter(
              (d) =>
                d.calories >= goals.calories * 0.9 &&
                d.calories <= goals.calories * 1.1,
            ).length;

            return (
              <div
                style={{
                  margin: "0 20px 16px",
                  padding: "16px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.25)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "12px",
                  }}
                >
                  {t("weekly.dailyAverages")}{" "}
                  <span style={{ color: "rgba(255,255,255,0.15)" }}>
                    ({n} {n > 1 ? t("weekly.days") : t("weekly.day")})
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-around",
                    marginBottom: "16px",
                  }}
                >
                  {[
                    {
                      label: t("macro.calories"),
                      value: Math.round(totals.calories / n),
                      color: "#E8C872",
                      metric: "calories",
                    },
                    {
                      label: t("macro.protein"),
                      value: `${Math.round(totals.protein_g / n)}g`,
                      color: "#7BE0AD",
                      metric: "protein_g",
                    },
                    {
                      label: t("macro.carbs"),
                      value: `${Math.round(totals.carbs_g / n)}g`,
                      color: "#72B4E8",
                      metric: "carbs_g",
                    },
                    {
                      label: t("macro.fat"),
                      value: `${Math.round(totals.fat_g / n)}g`,
                      color: "#E87272",
                      metric: "fat_g",
                    },
                  ].map(({ label, value, color, metric }) => (
                    <div
                      key={label}
                      onClick={() => onMetricChange(metric)}
                      style={{
                        textAlign: "center",
                        cursor: "pointer",
                        padding: "6px 8px",
                        borderRadius: "8px",
                        background:
                          weeklyMetric === metric
                            ? `${color}15`
                            : "transparent",
                        transition: "background 0.2s",
                      }}
                    >
                      <div
                        style={{ fontSize: "18px", fontWeight: 700, color }}
                      >
                        {value}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color:
                            weeklyMetric === metric
                              ? color
                              : "rgba(255,255,255,0.3)",
                          textTransform: "uppercase",
                          fontWeight: weeklyMetric === metric ? 600 : 400,
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: "12px",
                    display: "flex",
                    justifyContent: "space-around",
                  }}
                >
                  {[
                    {
                      label: t("weekly.totalCal"),
                      value: totals.calories.toLocaleString(),
                      color: "#E8C872",
                    },
                    {
                      label: t("weekly.totalProtein"),
                      value: `${totals.protein_g}g`,
                      color: "#7BE0AD",
                    },
                    {
                      label: t("weekly.daysLogged"),
                      value: daysLogged.length,
                      color: "rgba(255,255,255,0.6)",
                    },
                    {
                      label: t("weekly.atGoal"),
                      value: atGoal,
                      color:
                        atGoal > 0 ? "#7BE0AD" : "rgba(255,255,255,0.3)",
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div
                        style={{ fontSize: "14px", fontWeight: 600, color }}
                      >
                        {value}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color: "rgba(255,255,255,0.3)",
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "14px" }}>
            {t("weekly.noMeals")}
          </p>
          <button
            onClick={onScan}
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
            {t("weekly.scanFirst")}
          </button>
        </div>
      )}
    </div>
  );
}
