"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ปุ่มสลับภาษา TH/EN — ต้องมีทุกหน้าตาม ui-design-brief.md ข้อ 3
 * เหตุผลทางธุรกิจ: ผู้ใช้งานจริงเป็นคนญี่ปุ่นที่ต้องการระบบภาษาอังกฤษ
 * รอบนี้ทำเนื้อหาเต็มเฉพาะภาษาไทย ปุ่มจึงยังเป็นแค่ UI state
 */
export function LanguageToggle() {
  const [lang, setLang] = useState<"th" | "en">("th");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "th" ? "en" : "th")}
      aria-label="สลับภาษา"
    >
      <Languages />
      <span className="font-medium">{lang === "th" ? "ไทย" : "EN"}</span>
    </Button>
  );
}
