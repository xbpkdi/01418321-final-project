"use client";

/**
 * ข้อมูลกลางของทั้งระบบ ใช้ร่วมกันทุกหน้า
 * รับ snapshot ที่อ่านจาก PostgreSQL ใน Server Component.
 * Phase 4 ย้าย Order flows ไป Server Action แล้ว; การเขียนของ Phase 5-6
 * ยังใช้ state ชั่วคราวจนกว่า use case ของแต่ละ phase จะย้ายครบ.
 */

import * as React from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type { Dict } from "@/lib/i18n/dict";
import {
  createSeed,
  runAutomation,
  type AppState,
  type AutoEvent,
} from "@/lib/workflow";

type StoreValue = {
  state: AppState;
  /** รัน action แล้วต่อด้วยงานอัตโนมัติ คืนผลลัพธ์ของ action ให้หน้าจอแสดงข้อความ */
  run: <R extends object = Record<never, never>>(
    fn: (s: AppState) => { state: AppState } & R,
  ) => R;
  reset: () => void;
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
  const t = useT();
  const [state, setState] = React.useState(initialState);
  const dirty = React.useRef(new Set<string>());
  const tRef = React.useRef(t);
  React.useEffect(() => {
    tRef.current = t;
  }, [t]);

  const commit = React.useCallback((next: AppState) => {
    const auto = runAutomation(next);
    setState(auto.state);
    announce(tRef.current, auto.events);
  }, []);

  const run = React.useCallback(
    <R extends object = Record<never, never>>(
      fn: (s: AppState) => { state: AppState } & R,
    ): R => {
      const { state: next, ...result } = fn(state);
      if (next !== state) commit(next);
      return result as unknown as R;
    },
    [commit, state],
  );

  const reset = React.useCallback(() => {
    const seed = createSeed();
    commit(seed);
  }, [commit]);

  const setDirty = React.useCallback((key: string, value: boolean) => {
    if (value) dirty.current.add(key);
    else dirty.current.delete(key);
  }, []);
  const isDirty = React.useCallback(() => dirty.current.size > 0, []);

  return (
    <StoreContext.Provider value={{ state, run, reset, setDirty, isDirty }}>
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

/** แจ้งผลงานอัตโนมัติ (2S, 3S, 6S, 7S) ด้วยข้อความจาก use case description */
function announce(t: Dict, events: AutoEvent[]) {
  for (const e of events) {
    const a = t.auto;
    switch (e.code) {
      case "sku-matched":
        toast.success(a.skuMatched(e.count));
        break;
      case "sku-missing":
        toast.error(a.skuMissing, { description: a.orderRef(e.orderId) });
        break;
      case "sku-multiple":
        toast.error(a.skuMultiple, { description: a.orderRef(e.orderId) });
        break;
      case "sku-db":
        toast.error(a.skuDb, { description: a.orderRef(e.orderId) });
        break;
      case "stock-enough":
        toast.info(a.stockEnough(e.orderId));
        break;
      case "stock-low":
        toast.warning(a.stockLow(e.orderId));
        break;
      case "label-created":
        toast.success(a.labelCreated(e.count));
        break;
      case "label-no-address":
        toast.error(a.labelNoAddress, { description: a.orderRef(e.orderId) });
        break;
      case "label-no-template":
        toast.error(a.labelNoTemplate, { description: a.orderRef(e.orderId) });
        break;
      case "label-service":
        toast.error(a.labelService, { description: a.orderRef(e.orderId) });
        break;
      case "stock-deducted":
        toast.success(a.stockDeducted, { description: a.orderRef(e.orderId) });
        break;
      case "stock-insufficient":
        toast.error(a.stockInsufficient, {
          description: a.orderRef(e.orderId),
        });
        break;
      case "stock-sync":
        toast.error(a.stockSync, { description: a.orderRef(e.orderId) });
        break;
    }
  }
}
