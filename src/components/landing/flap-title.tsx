"use client";

// หัวข้อแบบป้าย split-flap: ตอนโหลดตัวอักษรสุ่มวนแล้วหยุดทีละตัวจากซ้ายไปขวา
// ชี้เมาส์ที่หัวข้อเพื่อสุ่มใหม่อีกรอบ ชี้ตัวอักษรเดี่ยวแล้วตัวนั้นเด้ง
// ผู้ใช้ที่ตั้ง prefers-reduced-motion เห็นข้อความนิ่งทันที

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#";
const TICK_MS = 45;
// เวลาที่ตัวอักษรตัวแรกหยุด และระยะห่างระหว่างตัว (นับเป็นเวลา ไม่ใช่จำนวนรอบ
// เพราะแท็บที่ไม่ได้โฟกัสจะถูกหน่วง setInterval)
const SETTLE_MS = 280;
const STAGGER_MS = 70;

export function FlapTitle({
  text,
  className,
  suffix,
}: {
  text: string;
  className?: string;
  /** ของตกแต่งต่อท้ายคำสุดท้าย ไม่ถูกตัดขึ้นบรรทัดใหม่แยกจากคำ */
  suffix?: React.ReactNode;
}) {
  const still = usePrefersReducedMotion();
  const [shown, setShown] = useState(text);
  const timer = useRef<number | null>(null);

  const scramble = useCallback(() => {
    if (timer.current !== null) return;
    const start = performance.now();
    timer.current = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const next = [...text]
        .map((ch, i) => {
          if (ch === " " || elapsed > SETTLE_MS + i * STAGGER_MS) return ch;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setShown(next);
      if (next === text && timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    }, TICK_MS);
  }, [text]);

  useEffect(() => {
    if (!still) scramble();
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [still, scramble]);

  const chars = still ? text : shown;

  return (
    <h1
      aria-label={text}
      className={className}
      onPointerEnter={still ? undefined : scramble}
    >
      {text.split(" ").map((word, w, words) => {
        const start = words.slice(0, w).join(" ").length + (w > 0 ? 1 : 0);
        return (
          <span key={w} aria-hidden className="inline-block whitespace-nowrap">
            {[...word].map((_, i) => (
              <span key={i} className="flap-char">
                {chars[start + i]}
              </span>
            ))}
            {w < words.length - 1 ? " " : suffix}
          </span>
        );
      })}
    </h1>
  );
}
