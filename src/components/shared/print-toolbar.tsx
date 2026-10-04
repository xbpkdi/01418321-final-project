"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** แถบเครื่องมือของหน้ารายงาน — ซ่อนตอนสั่งพิมพ์ด้วย .no-print */
export function PrintToolbar({
  title,
  backHref,
}: {
  title: string;
  backHref: string;
}) {
  return (
    <div className="no-print mx-auto mb-6 flex w-[148mm] max-w-[calc(100%-2rem)] items-center justify-between gap-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={backHref}>
          <ArrowLeft />
          กลับ
        </Link>
      </Button>
      <span className="text-sm font-medium">{title}</span>
      <Button size="sm" onClick={() => window.print()}>
        <Printer />
        พิมพ์
      </Button>
    </div>
  );
}
