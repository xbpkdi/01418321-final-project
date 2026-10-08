"use client";

// การ์ดที่เอียงตามเมาส์เล็กน้อย และมีแสงขอบวิ่งตามตำแหน่งเมาส์
// JS แค่เซ็ต --mx/--my/--rx/--ry ส่วนภาพทั้งหมดอยู่ใน .tilt-card ที่ globals.css

import { useRef } from "react";
import { cn } from "@/lib/utils";

const MAX_DEG = 5;

export function TiltCard({
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
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--ry", `${(x - 0.5) * MAX_DEG * 2}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * MAX_DEG * 2}deg`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div className="tilt-stage">
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className={cn("tilt-card", className)}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
