import type { Lang } from "@/lib/i18n/dict";

// รูปแบบตัวเลขและวันที่ใช้ร่วมกันทุกหน้า วันที่ต้องตามภาษาที่ผู้ใช้เลือก

const bahtFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBaht(n: number) {
  return bahtFormatter.format(n);
}

const locale = (lang: Lang) => (lang === "en" ? "en-GB" : "th-TH");

export function formatDate(iso: string, lang: Lang) {
  // วันที่ล้วน (yyyy-mm-dd) ให้ตีความเป็นเวลาท้องถิ่น ไม่ใช่ UTC
  const date = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return new Intl.DateTimeFormat(locale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
