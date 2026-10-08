"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Dict } from "@/lib/i18n/dict";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

/** ตารางรอส่งมอบ — เลือกหลายรายการแล้วส่งมอบพร้อมกัน (8A ขั้นตอนที่ 2) */
export function waitingColumns(
  t: Dict,
  selected: string[],
  onToggle: (orderId: string) => void,
) {
  return col.columns([
    col.display({
      id: "select",
      cell: (ctx) => (
        <Checkbox
          aria-label={ctx.row.original.order_id}
          checked={selected.includes(ctx.row.original.order_id)}
          onCheckedChange={() => onToggle(ctx.row.original.order_id)}
        />
      ),
    }),
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("product_name", {
      header: t.common.product,
      meta: { label: t.common.product },
      cell: (ctx) => (
        <span className="text-muted-foreground block max-w-[28ch] truncate">
          {ctx.getValue()}
        </span>
      ),
    }),
    col.accessor("parcel_total", {
      header: () => <div className="text-right">{t.label.parcels}</div>,
      meta: { label: t.label.parcels },
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.getValue() ?? 1}
        </div>
      ),
    }),
    col.accessor("order_status", {
      header: t.common.status,
      meta: { label: t.common.status },
      cell: (ctx) => (
        <div className="grid gap-1">
          <StatusBadge status={ctx.getValue()} />
          {ctx.getValue() === "รอส่งมอบ" && (
            <span className="text-status-cancelled text-xs">
              {t.shipping.errNoTracking}
            </span>
          )}
        </div>
      ),
    }),
  ]);
}

/** ตารางส่งมอบแล้ว — ติดตามสถานะจากขนส่ง (Q8.3) และแจ้งเลขติดตามให้ลูกค้า (5S) */
export function shippedColumns(t: Dict, onNotify: (order: Order) => void) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("tracking_number", {
      header: t.shipping.trackingNumber,
      meta: { label: t.shipping.trackingNumber },
      cell: (ctx) => (
        <div>
          <p data-numeric>{ctx.getValue()}</p>
          <p className="text-muted-foreground text-xs">
            {ctx.row.original.carrier_name}
          </p>
        </div>
      ),
    }),
    col.accessor("delivery_status", {
      header: t.shipping.carrierStatus,
      meta: { label: t.shipping.carrierStatus },
      cell: (ctx) => (
        <span className="text-muted-foreground">
          {ctx.getValue() ? t.deliveryStatus[ctx.getValue()!] : "—"}
        </span>
      ),
    }),
    col.accessor("order_status", {
      header: t.common.status,
      meta: { label: t.common.status },
      cell: (ctx) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={ctx.getValue()} />
          {ctx.row.original.stock_deducted &&
            ctx.row.original.mp_stock_synced === false && (
              <Badge
                variant="secondary"
                className="bg-status-attention-bg text-status-attention"
              >
                {t.shipping.syncPending}
              </Badge>
            )}
        </div>
      ),
    }),
    col.display({
      id: "notify",
      header: t.shipping.notifyStatus,
      cell: (ctx) => {
        const o = ctx.row.original;
        const canNotify = [
          "อยู่ระหว่างจัดส่ง",
          "รอแจ้งเลขติดตาม",
          "จัดส่งสำเร็จ",
        ].includes(o.order_status);
        return (
          <div className="flex items-center justify-end gap-2">
            <span className="text-muted-foreground text-xs">
              {o.tracking_notified
                ? t.shipping.notified
                : t.shipping.notNotified}
            </span>
            {canNotify && (
              <Button
                size="sm"
                variant={o.tracking_notified ? "ghost" : "outline"}
                onClick={() => onNotify(o)}
              >
                {t.shipping.notify}
              </Button>
            )}
          </div>
        );
      },
    }),
  ]);
}
