"use client";

/**
 * Read-only snapshot ของข้อมูลจาก PostgreSQL ที่ Server Component โหลดให้ทุกหน้า
 * ข้อมูลธุรกิจและ session ไม่ถูกเก็บในเบราว์เซอร์ (FR-016); ทุกการเปลี่ยนแปลงผ่าน
 * Server Action แล้ว layout โหลด snapshot ใหม่. เก็บเฉพาะสถานะ UI ชั่วคราว
 * (งานที่ยังไม่บันทึก) ไว้ในหน่วยความจำ.
 */

import * as React from "react";
import type { AppState } from "@/lib/workflow";

type StoreValue = {
  state: AppState;
  /** งานที่ยังไม่ได้บันทึก — ใช้ถามยืนยันก่อนออกจากระบบ (1A ขั้นตอนที่ 4) */
  setDirty: (key: string, dirty: boolean) => void;
  isDirty: () => boolean;
};

const StoreContext = React.createContext<StoreValue | null>(null);

export function StoreProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState: AppState;
}) {
  const dirty = React.useRef(new Set<string>());

  const setDirty = React.useCallback((key: string, value: boolean) => {
    if (value) dirty.current.add(key);
    else dirty.current.delete(key);
  }, []);
  const isDirty = React.useCallback(() => dirty.current.size > 0, []);

  return (
    <StoreContext.Provider value={{ state: initialState, setDirty, isDirty }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** ลงทะเบียนงานที่ยังไม่ได้บันทึก ล้างเองเมื่อหน้าถูกปิด */
export function useUnsavedChanges(key: string, dirty: boolean) {
  const { setDirty } = useStore();
  React.useEffect(() => {
    setDirty(key, dirty);
    return () => setDirty(key, false);
  }, [key, dirty, setDirty]);
}
