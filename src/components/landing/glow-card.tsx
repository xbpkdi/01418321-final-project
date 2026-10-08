"use client";

// การ์ดกระจกที่ขอบเรืองแสงตามตำแหน่งเมาส์ ตัวการ์ดอยู่นิ่ง (เอียงตามเมาส์แล้วมึนหัว)
// JS แค่เซ็ต --mx/--my ส่วนภาพทั้งหมดอยู่ใน .glow-card ที่ globals.css

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function GlowCard({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={cn("glow-card", className)}
      style={style}
    >
      {children}
    </div>
  );
}
