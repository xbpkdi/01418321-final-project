"use client";

// ตัวเลขที่นับขึ้นจาก 0 ตอนแสดงครั้งแรก (ease-out) ผู้ใช้ที่ขอลด animation เห็นค่าจริงทันที

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const DURATION_MS = 900;

export function CountUp({ value, pad = 2 }: { value: number; pad?: number }) {
  const still = usePrefersReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (still) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION_MS);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, still]);

  return <>{String(still ? value : n).padStart(pad, "0")}</>;
}
