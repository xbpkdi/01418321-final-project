"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toneOf, type OrderStatus, type StatusTone } from "@/lib/order-status";
import { useT } from "@/lib/i18n/context";

const TONE_CLASS: Record<StatusTone, string> = {
  waiting: "bg-status-waiting-bg text-status-waiting",
  progress: "bg-status-progress-bg text-status-progress",
  success: "bg-status-success-bg text-status-success",
  attention: "bg-status-attention-bg text-status-attention",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
};

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  // ค่าสถานะที่ส่งเข้ามาเป็นค่าข้อมูลจริง ส่วนที่แสดงผลดึงจากดิกตามภาษาที่เลือก
  const t = useT();

  return (
    <Badge
      variant="secondary"
      className={cn(TONE_CLASS[toneOf(status)], className)}
    >
      {t.statusLabel[status]}
    </Badge>
  );
}
