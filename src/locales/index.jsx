import { createContext, useContext, useState, useCallback } from "react";
import en from "./en.json";
import pt from "./pt.json";

const strings = { en, pt };
const STORAGE_KEY = "macro_lang";

function detectLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && strings[saved]) return saved;
  return navigator.language?.startsWith("pt") ? "pt" : "en";
}

const LocaleContext = createContext();

export function LocaleProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  const setLang = useCallback((l) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  const t = useCallback((key) => {
    return strings[lang]?.[key] || strings.en[key] || key;
  }, [lang]);

  return (
    <LocaleContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
