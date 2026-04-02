import { useState, useEffect, useMemo } from "react";
import { getProfile, saveProfile, getGuestGoals, saveGuestGoals } from "./api";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Light", desc: "Exercise 1-3 days/week" },
  { value: "moderate", label: "Moderate", desc: "Exercise 3-5 days/week" },
  { value: "active", label: "Active", desc: "Exercise 6-7 days/week" },
  { value: "very_active", label: "Very Active", desc: "Physical job or 2x/day" },
];

const GOAL_TYPES = [
  { value: "lose_weight", label: "Lose Weight", desc: "~1 lb/week deficit" },
  { value: "maintain", label: "Maintain", desc: "Keep current weight" },
  { value: "gain_muscle", label: "Gain Muscle", desc: "Lean bulk surplus" },
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
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Loading profile...</div>
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
        }}>Your Goals</h2>
      </div>

      {/* Sex */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Sex</label>
        <div style={{ display: "flex", gap: "10px" }}>
          {["male", "female"].map(s => (
            <button key={s} onClick={() => setSex(s)} style={{
              ...pillStyle(sex === s), flex: 1, textTransform: "capitalize",
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Age */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Age</label>
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
        }}>{useImperial ? "Switch to metric" : "Switch to imperial"}</button>
      </div>

      <div style={{ display: "flex", gap: "12px", ...sectionStyle }}>
        {/* Height */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Height {useImperial ? "(ft/in)" : "(cm)"}</label>
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
          <label style={labelStyle}>Weight {useImperial ? "(lbs)" : "(kg)"}</label>
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
        <label style={labelStyle}>Activity Level</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ACTIVITY_LEVELS.map(a => (
            <button key={a.value} onClick={() => setActivityLevel(a.value)} style={{
              ...pillStyle(activityLevel === a.value),
              display: "flex", justifyContent: "space-between", alignItems: "center",
              textAlign: "left",
            }}>
              <span>{a.label}</span>
              <span style={{ fontSize: "11px", opacity: 0.6, fontWeight: 400 }}>{a.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Goal Type */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Goal</label>
        <div style={{ display: "flex", gap: "10px" }}>
          {GOAL_TYPES.map(g => (
            <button key={g.value} onClick={() => setGoalType(g.value)} style={{
              ...pillStyle(goalType === g.value),
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              padding: "14px 8px",
            }}>
              <span style={{ fontSize: "13px" }}>{g.label}</span>
              <span style={{ fontSize: "10px", opacity: 0.6, fontWeight: 400 }}>{g.desc}</span>
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
            Your Daily Targets
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[
              { label: "Calories", value: preview.calories, unit: "kcal", color: "#E8C872" },
              { label: "Protein", value: preview.proteinG, unit: "g", color: "#7BE0AD" },
              { label: "Carbs", value: preview.carbsG, unit: "g", color: "#72B4E8" },
              { label: "Fat", value: preview.fatG, unit: "g", color: "#E87272" },
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
            BMR: {preview.bmr} kcal &middot; TDEE: {preview.tdee} kcal
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
        {saving ? "Saving..." : saved ? "Saved!" : "Save Goals"}
      </button>

      <div style={{ height: "80px" }} />
    </div>
  );
}
