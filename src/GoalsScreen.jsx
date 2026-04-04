import { useState, useEffect, useMemo } from "react";
import { getProfile, saveProfile, getGuestGoals, saveGuestGoals } from "./api";
import { useLocale } from "./locales/index.jsx";

const ACTIVITY_LEVELS = [
  { value: "sedentary", labelKey: "goals.activity.sedentary", descKey: "goals.activity.sedentaryDesc" },
  { value: "light", labelKey: "goals.activity.light", descKey: "goals.activity.lightDesc" },
  { value: "moderate", labelKey: "goals.activity.moderate", descKey: "goals.activity.moderateDesc" },
  { value: "active", labelKey: "goals.activity.active", descKey: "goals.activity.activeDesc" },
  { value: "very_active", labelKey: "goals.activity.veryActive", descKey: "goals.activity.veryActiveDesc" },
];

const GOAL_TYPES = [
  { value: "lose_weight", labelKey: "goals.goalType.lose", descKey: "goals.goalType.loseDesc" },
  { value: "maintain", labelKey: "goals.goalType.maintain", descKey: "goals.goalType.maintainDesc" },
  { value: "gain_muscle", labelKey: "goals.goalType.gain", descKey: "goals.goalType.gainDesc" },
];

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};
const MACRO_SPLITS = {
  lose_weight: { protein: 0.35, carbs: 0.35, fat: 0.30 },
  maintain:    { protein: 0.30, carbs: 0.40, fat: 0.30 },
  gain_muscle: { protein: 0.30, carbs: 0.45, fat: 0.25 },
};
const CALORIE_ADJUSTMENTS = { lose_weight: -500, maintain: 0, gain_muscle: 300 };

function calcMacros({ heightCm, weightKg, age, sex, activityLevel, goalType }) {
  if (!heightCm || !weightKg || !age || !sex || !activityLevel || !goalType) return null;
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  bmr += sex === "male" ? 5 : -161;
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55);
  const calories = Math.round(tdee + (CALORIE_ADJUSTMENTS[goalType] || 0));
  const split = MACRO_SPLITS[goalType] || MACRO_SPLITS.maintain;
  return {
    calories,
    proteinG: Math.round((calories * split.protein) / 4),
    carbsG: Math.round((calories * split.carbs) / 4),
    fatG: Math.round((calories * split.fat) / 9),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}

// Unit conversions
const cmToFt = (cm) => Math.floor(cm / 30.48);
const cmToIn = (cm) => Math.round((cm / 2.54) - (cmToFt(cm) * 12));
const ftInToCm = (ft, inches) => Math.round((ft * 30.48) + (inches * 2.54));
const kgToLbs = (kg) => Math.round(kg * 2.205);
const lbsToKg = (lbs) => +(lbs / 2.205).toFixed(1);

export default function GoalsScreen({ goals, onSave, isGuest }) {
  const { t, lang, setLang } = useLocale();
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goalType, setGoalType] = useState("");
  const [useImperial, setUseImperial] = useState(false);
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Load existing profile on mount
  useEffect(() => {
    (async () => {
      try {
        let profile;
        if (isGuest) {
          const stored = getGuestGoals();
          profile = stored?.profile;
        } else {
          profile = await getProfile();
        }
        if (profile && profile.heightCm) {
          setSex(profile.sex || "");
          setAge(profile.age?.toString() || "");
          setHeightCm(profile.heightCm?.toString() || "");
          setWeightKg(profile.weightKg?.toString() || "");
          setActivityLevel(profile.activityLevel || "");
          setGoalType(profile.goalType || "");
          // Also set imperial values
          if (profile.heightCm) {
            setHeightFt(cmToFt(profile.heightCm).toString());
            setHeightIn(cmToIn(profile.heightCm).toString());
          }
          if (profile.weightKg) {
            setWeightLbs(kgToLbs(profile.weightKg).toString());
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isGuest]);

  // Sync units when toggling imperial/metric
  const handleUnitToggle = () => {
    if (useImperial) {
      // Switching to metric — convert ft/in → cm, lbs → kg
      if (heightFt || heightIn) setHeightCm(ftInToCm(+heightFt || 0, +heightIn || 0).toString());
      if (weightLbs) setWeightKg(lbsToKg(+weightLbs).toString());
    } else {
      // Switching to imperial — convert cm → ft/in, kg → lbs
      if (heightCm) {
        setHeightFt(cmToFt(+heightCm).toString());
        setHeightIn(cmToIn(+heightCm).toString());
      }
      if (weightKg) setWeightLbs(kgToLbs(+weightKg).toString());
    }
    setUseImperial(!useImperial);
  };

  // Live calculation preview
  const preview = useMemo(() => {
    const h = useImperial ? ftInToCm(+heightFt || 0, +heightIn || 0) : +heightCm;
    const w = useImperial ? lbsToKg(+weightLbs) : +weightKg;
    return calcMacros({ heightCm: h, weightKg: w, age: +age, sex, activityLevel, goalType });
  }, [sex, age, heightCm, weightKg, heightFt, heightIn, weightLbs, activityLevel, goalType, useImperial]);

  const isComplete = sex && age && (useImperial ? (heightFt && weightLbs) : (heightCm && weightKg)) && activityLevel && goalType;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const h = useImperial ? ftInToCm(+heightFt || 0, +heightIn || 0) : +heightCm;
      const w = useImperial ? lbsToKg(+weightLbs) : +weightKg;
      const profileData = { heightCm: h, weightKg: w, age: +age, sex, activityLevel, goalType };

      if (isGuest) {
        const calculated = calcMacros(profileData);
        const goalsData = {
          calories: calculated.calories,
          proteinG: calculated.proteinG,
          carbsG: calculated.carbsG,
          fatG: calculated.fatG,
        };
        saveGuestGoals(profileData, goalsData);
        onSave(goalsData);
      } else {
        const result = await saveProfile(profileData);
        onSave({
          calories: result.goals.calories,
          proteinG: result.goals.proteinG,
          carbsG: result.goals.carbsG,
          fatG: result.goals.fatG,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || t("goals.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>{t("goals.loading")}</div>
      </div>
    );
  }

  const pillStyle = (active) => ({
    padding: "10px 16px", borderRadius: "12px", border: "none", cursor: "pointer",
    fontSize: "13px", fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
    background: active ? "rgba(232,200,114,0.15)" : "rgba(255,255,255,0.04)",
    color: active ? "#E8C872" : "rgba(255,255,255,0.4)",
    transition: "all 0.2s",
    outline: active ? "1px solid rgba(232,200,114,0.3)" : "1px solid transparent",
  });

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
    color: "#fff", fontSize: "16px", fontFamily: "'DM Sans',sans-serif",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block",
  };

  const sectionStyle = { marginBottom: "28px" };

  return (
    <div style={{ padding: "20px", animation: "fadeSlideIn 0.3s ease-out" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{
          fontFamily: "'Instrument Serif',serif", fontSize: "28px",
          color: "#fff", margin: 0, fontWeight: 400,
        }}>{t("goals.title")}</h2>
      </div>

      {/* Language toggle */}
      <div style={sectionStyle}>
        <label style={labelStyle}>{t("goals.language")}</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={() => setLang("en")} style={{
            flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", fontSize: "14px", fontWeight: 600,
            border: lang === "en" ? "1px solid #E8C872" : "1px solid rgba(255,255,255,0.1)",
            background: lang === "en" ? "rgba(232,200,114,0.1)" : "rgba(255,255,255,0.04)",
            color: lang === "en" ? "#E8C872" : "rgba(255,255,255,0.5)",
          }}>English</button>
          <button type="button" onClick={() => setLang("pt")} style={{
            flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", fontSize: "14px", fontWeight: 600,
            border: lang === "pt" ? "1px solid #E8C872" : "1px solid rgba(255,255,255,0.1)",
            background: lang === "pt" ? "rgba(232,200,114,0.1)" : "rgba(255,255,255,0.04)",
            color: lang === "pt" ? "#E8C872" : "rgba(255,255,255,0.5)",
          }}>Português</button>
        </div>
      </div>

      {/* Sex */}
      <div style={sectionStyle}>
        <label style={labelStyle}>{t("goals.sex")}</label>
        <div style={{ display: "flex", gap: "10px" }}>
          {[{ value: "male", label: t("goals.male") }, { value: "female", label: t("goals.female") }].map(s => (
            <button key={s.value} onClick={() => setSex(s.value)} style={{
              ...pillStyle(sex === s.value), flex: 1,
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Age */}
      <div style={sectionStyle}>
        <label style={labelStyle}>{t("goals.age")}</label>
        <input
          type="number" inputMode="numeric" placeholder="25"
          value={age} onChange={e => setAge(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Height + Weight with unit toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button onClick={handleUnitToggle} style={{
          background: "none", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px", padding: "4px 12px", cursor: "pointer",
          fontSize: "12px", color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans',sans-serif",
        }}>{useImperial ? t("goals.switchMetric") : t("goals.switchImperial")}</button>
      </div>

      <div style={{ display: "flex", gap: "12px", ...sectionStyle }}>
        {/* Height */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{useImperial ? t("goals.heightFtIn") : t("goals.heightCm")}</label>
          {useImperial ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="number" inputMode="numeric" placeholder="5" value={heightFt}
                onChange={e => setHeightFt(e.target.value)}
                style={{ ...inputStyle, textAlign: "center" }}
              />
              <input
                type="number" inputMode="numeric" placeholder="10" value={heightIn}
                onChange={e => setHeightIn(e.target.value)}
                style={{ ...inputStyle, textAlign: "center" }}
              />
            </div>
          ) : (
            <input
              type="number" inputMode="numeric" placeholder="178"
              value={heightCm} onChange={e => setHeightCm(e.target.value)}
              style={inputStyle}
            />
          )}
        </div>

        {/* Weight */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{useImperial ? t("goals.weightLbs") : t("goals.weightKg")}</label>
          {useImperial ? (
            <input
              type="number" inputMode="numeric" placeholder="175"
              value={weightLbs} onChange={e => setWeightLbs(e.target.value)}
              style={inputStyle}
            />
          ) : (
            <input
              type="number" inputMode="numeric" placeholder="80"
              value={weightKg} onChange={e => setWeightKg(e.target.value)}
              style={inputStyle}
            />
          )}
        </div>
      </div>

      {/* Activity Level */}
      <div style={sectionStyle}>
        <label style={labelStyle}>{t("goals.activityLevel")}</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ACTIVITY_LEVELS.map(a => (
            <button key={a.value} onClick={() => setActivityLevel(a.value)} style={{
              ...pillStyle(activityLevel === a.value),
              display: "flex", justifyContent: "space-between", alignItems: "center",
              textAlign: "left",
            }}>
              <span>{t(a.labelKey)}</span>
              <span style={{ fontSize: "11px", opacity: 0.6, fontWeight: 400 }}>{t(a.descKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Goal Type */}
      <div style={sectionStyle}>
        <label style={labelStyle}>{t("goals.goal")}</label>
        <div style={{ display: "flex", gap: "10px" }}>
          {GOAL_TYPES.map(g => (
            <button key={g.value} onClick={() => setGoalType(g.value)} style={{
              ...pillStyle(goalType === g.value),
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              padding: "14px 8px",
            }}>
              <span style={{ fontSize: "13px" }}>{t(g.labelKey)}</span>
              <span style={{ fontSize: "10px", opacity: 0.6, fontWeight: 400 }}>{t(g.descKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {preview && isComplete && (
        <div style={{
          background: "rgba(255,255,255,0.03)", borderRadius: "16px",
          padding: "20px", marginBottom: "28px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
            {t("goals.dailyTargets")}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[
              { label: t("macro.calories"), value: preview.calories, unit: t("macro.kcal"), color: "#E8C872" },
              { label: t("macro.protein"), value: preview.proteinG, unit: t("macro.g"), color: "#7BE0AD" },
              { label: t("macro.carbs"), value: preview.carbsG, unit: t("macro.g"), color: "#72B4E8" },
              { label: t("macro.fat"), value: preview.fatG, unit: t("macro.g"), color: "#E87272" },
            ].map(m => (
              <div key={m.label} style={{
                background: "rgba(255,255,255,0.03)", borderRadius: "12px",
                padding: "14px", textAlign: "center",
              }}>
                <div style={{ fontSize: "24px", fontWeight: 700, color: m.color, fontFamily: "'DM Sans',sans-serif" }}>
                  {m.value}
                </div>
                <div style={{ fontSize: "10px", color: m.color, opacity: 0.7, marginTop: "2px" }}>{m.unit}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: "14px", fontSize: "11px", color: "rgba(255,255,255,0.3)", textAlign: "center",
          }}>
            {t("goals.bmr")} {preview.bmr} {t("macro.kcal")} &middot; {t("goals.tdee")} {preview.tdee} {t("macro.kcal")}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: "10px", marginBottom: "16px",
          background: "rgba(232,114,114,0.1)", color: "#E87272", fontSize: "13px",
        }}>{error}</div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!isComplete || saving}
        style={{
          width: "100%", padding: "16px", borderRadius: "14px", border: "none",
          cursor: isComplete && !saving ? "pointer" : "default",
          background: isComplete ? (saved ? "rgba(123,224,173,0.15)" : "rgba(232,200,114,0.15)") : "rgba(255,255,255,0.04)",
          color: isComplete ? (saved ? "#7BE0AD" : "#E8C872") : "rgba(255,255,255,0.2)",
          fontSize: "15px", fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
          transition: "all 0.2s",
        }}
      >
        {saving ? t("goals.saving") : saved ? t("goals.saved") : t("goals.save")}
      </button>

      <div style={{ height: "80px" }} />
    </div>
  );
}
