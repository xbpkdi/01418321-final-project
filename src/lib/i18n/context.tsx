"use client";

import * as React from "react";
import { dict, type Lang, type Dict } from "./dict";

const STORAGE_KEY = "rsl-hub-lang";
const CHANGE_EVENT = "rsl-hub-lang-change";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

/**
 * localStorage เป็น external store จึง subscribe ตรงๆ แทนการ setState ใน effect
 * ฟัง event ของ tab อื่น (storage) และของ tab นี้เอง (custom event)
 */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot(): Lang {
  // private window อ่าน localStorage ไม่ได้ จึงต้องห่อไว้
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en") return "en";
  } catch {
    // เงียบไว้ แล้วใช้ค่าเริ่มต้นแทน
  }
  return "th";
}

/** ฝั่ง server ยังไม่รู้ค่าที่ผู้ใช้เลือก ให้เริ่มที่ไทยเสมอ */
function getServerSnapshot(): Lang {
  return "th";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  React.useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = React.useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // จำไม่ได้ก็ยังใช้งานต่อได้ในหน้านี้
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
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
