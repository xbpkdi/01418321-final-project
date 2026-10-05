"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** ช่องค้นหาของตาราง ใช้ร่วมกันทุกหน้าที่เป็นรายการ ให้สำนวนเดียวกันหมด */
export function TableSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative max-w-sm">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
        aria-label={label}
        placeholder={placeholder}
      />
    </div>
  );
}
