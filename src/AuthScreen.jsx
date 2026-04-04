import { useState } from "react";
import { login, register, getGuestMeals, importMeals, clearGuestMeals, getGuestGoals, saveProfile, clearGuestGoals } from "./api";
import { useLocale } from "./locales/index.jsx";

export default function AuthScreen({ onAuth }) {
  const { t } = useLocale();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = mode === "login"
        ? await login(username, password)
        : await register(username, password, name || undefined);

      // Migrate guest meals to DB
      const guestMeals = getGuestMeals();
      if (guestMeals.length > 0) {
        try {
          await importMeals(guestMeals);
          clearGuestMeals();
        } catch (importErr) {
          console.error("Guest meal migration failed:", importErr);
        }
      }

      // Migrate guest goals to DB
      const guestGoals = getGuestGoals();
      if (guestGoals?.profile) {
        try {
          await saveProfile(guestGoals.profile);
          clearGuestGoals();
        } catch (goalsErr) {
          console.error("Guest goals migration failed:", goalsErr);
        }
      }

      onAuth(user);
    } catch (err) {
      setError(err.message || t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
    color: "#fff", fontSize: "14px", fontFamily: "'DM Sans',sans-serif",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: "#0C0C0E",
      minHeight: "100vh",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "380px",
        padding: "0 24px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "42px",
            fontWeight: 400,
            letterSpacing: "-0.5px",
            margin: 0,
          }}>
            Macro<span style={{ color: "#E8C872" }}>.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "8px" }}>
            {t("app.tagline")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {mode === "register" && (
            <input
              type="text"
              placeholder={t("auth.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="text"
            placeholder={t("auth.usernamePlaceholder")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <p style={{ color: "#E87272", fontSize: "13px", margin: 0, textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "14px", borderRadius: "12px", border: "none", cursor: loading ? "wait" : "pointer",
              background: loading ? "rgba(232,200,114,0.3)" : "linear-gradient(135deg, #E8C872, #D4A843)",
              color: "#0C0C0E", fontSize: "15px", fontWeight: 700,
              fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.3px",
              marginTop: "4px",
            }}
          >
            {loading ? t("auth.pleaseWait") : mode === "login" ? t("auth.logIn") : t("auth.createAccount")}
          </button>
        </form>

        {/* Toggle */}
        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
          {mode === "login" ? `${t("auth.noAccount")} ` : `${t("auth.hasAccount")} `}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            style={{
              background: "none", border: "none", color: "#E8C872",
              cursor: "pointer", fontSize: "13px", fontFamily: "'DM Sans',sans-serif",
              textDecoration: "underline", padding: 0,
            }}
          >
            {mode === "login" ? t("auth.register") : t("auth.loginLink")}
          </button>
        </p>
      </div>
    </div>
  );
}
