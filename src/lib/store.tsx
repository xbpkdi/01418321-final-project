"use client";

/**
 * ข้อมูลกลางของทั้งระบบ ใช้ร่วมกันทุกหน้า
 * ระหว่างยังไม่ต่อฐานข้อมูล เก็บใน localStorage เพื่อให้เดิน flow ข้ามหน้าได้ต่อเนื่อง
 * ทุก action ผ่าน run() ซึ่งรันงานของ System (Auto) ต่อให้ทันที แล้วแจ้งผลด้วย toast
 */

import * as React from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/lib/i18n/context";
import type { Dict } from "@/lib/i18n/dict";
import { createSeed, runAutomation, type AppState, type AutoEvent } from "@/lib/workflow";

const STORAGE_KEY = "rsl-hub-state-v1";

type StoreValue = {
  state: AppState;
  /** รัน action แล้วต่อด้วยงานอัตโนมัติ คืนผลลัพธ์ของ action ให้หน้าจอแสดงข้อความ */
  run: <R extends object = Record<never, never>>(fn: (s: AppState) => { state: AppState } & R) => R;
  reset: () => void;
  /** งานที่ยังไม่ได้บันทึก — ใช้ถามยืนยันก่อนออกจากระบบ (1A ขั้นตอนที่ 4) */
  setDirty: (key: string, dirty: boolean) => void;
  isDirty: () => boolean;
};

const StoreContext = React.createContext<StoreValue | null>(null);

function load(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    // private window หรือข้อมูลเสีย — เริ่มจากข้อมูลตั้งต้น
  }
  return runAutomation(createSeed()).state;
}

function save(state: AppState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // บันทึกไม่ได้ก็ยังใช้งานต่อได้ในหน้านี้
  }
}

/**
 * localStorage เป็น external store จึงอ่านผ่าน useSyncExternalStore (แบบเดียวกับ i18n/context)
 * ฝั่ง server ยังไม่มีข้อมูล จึงคืน null แล้วให้ browser โหลดเองตอน hydrate
 */
let snapshot: AppState | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): AppState {
  if (snapshot === null) snapshot = load();
  return snapshot;
}

function getServerSnapshot(): AppState | null {
  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const state = React.useSyncExternalStore<AppState | null>(subscribe, getSnapshot, getServerSnapshot);
  const dirty = React.useRef(new Set<string>());
  const tRef = React.useRef(t);
  React.useEffect(() => {
    tRef.current = t;
  }, [t]);

  const commit = React.useCallback((next: AppState) => {
    const auto = runAutomation(next);
    snapshot = auto.state;
    save(auto.state);
    listeners.forEach((l) => l());
    announce(tRef.current, auto.events);
  }, []);

  const run = React.useCallback(
    <R extends object = Record<never, never>>(fn: (s: AppState) => { state: AppState } & R): R => {
      const current = getSnapshot();
      const { state: next, ...result } = fn(current);
      if (next !== current) commit(next);
      return result as unknown as R;
    },
    [commit],
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

  if (!state) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

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
        toast.error(a.stockInsufficient, { description: a.orderRef(e.orderId) });
        break;
      case "stock-sync":
        toast.error(a.stockSync, { description: a.orderRef(e.orderId) });
        break;
    }
  }
}
