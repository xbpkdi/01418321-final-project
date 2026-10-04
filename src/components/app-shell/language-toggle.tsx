"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/context";

/**
 * ปุ่มสลับภาษา TH/EN — ต้องมีทุกหน้าตาม ui-design-brief.md ข้อ 3
 * เหตุผลทางธุรกิจ: ผู้ใช้งานจริงเป็นคนญี่ปุ่นที่ต้องการระบบภาษาอังกฤษ
 */
export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "th" ? "en" : "th")}
      aria-label={t.app.switchLanguage}
    >
      <Languages />
      <span className="font-medium">{t.app.langLabel}</span>
    </Button>
  );
}
