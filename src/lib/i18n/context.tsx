"use client";

import * as React from "react";
import { dict, type Lang, type Dict } from "./dict";

const STORAGE_KEY = "rsl-hub-lang";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  // private window อ่าน localStorage ไม่ได้ จึงต้องห่อไว้
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "th" || stored === "en") return stored;
  } catch {
    // เงียบไว้ แล้วใช้ค่าเริ่มต้นแทน
  }
  return "th";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // เริ่มที่ไทยเสมอให้ตรงกับที่ server render ไว้ แล้วค่อยอ่านค่าที่จำไว้ตอน mount
  const [lang, setLangState] = React.useState<Lang>("th");

  React.useEffect(() => {
    const stored = readStoredLang();
    if (stored !== "th") setLangState(stored);
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = React.useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // จำไม่ได้ก็ยังใช้งานต่อได้ในหน้านี้
    }
  }, []);

  const value = React.useMemo(
    () => ({ lang, setLang, t: dict[lang] }),
    [lang, setLang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage ต้องอยู่ภายใต้ LanguageProvider");
  }
  return ctx;
}

/** ใช้เรียกข้อความอย่างเดียว เมื่อไม่ต้องสลับภาษาเอง */
export function useT(): Dict {
  return useLanguage().t;
}
