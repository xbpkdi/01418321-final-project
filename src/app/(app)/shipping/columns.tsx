"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

/** ตารางรอส่งมอบ */
export function waitingColumns(onDispatch: (order: Order) => void) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("product_name", {
      header: "สินค้า",
      meta: { label: "สินค้า" },
      cell: (ctx) => (
        <span className="text-muted-foreground block max-w-[28ch] truncate">
          {ctx.getValue()}
        </span>
      ),
    }),
    col.accessor("shipping_method", {
      header: "วิธีจัดส่ง",
      meta: { label: "วิธีจัดส่ง" },
      cell: (ctx) => (
        <span className="text-muted-foreground">{ctx.getValue()}</span>
      ),
    }),
    col.accessor("order_status", {
      header: "สถานะ",
      meta: { label: "สถานะ" },
      cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
    }),
    col.display({
      id: "actions",
      cell: (ctx) => (
        <div className="text-right">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDispatch(ctx.row.original)}
          >
            ส่งมอบให้ Delivery
          </Button>
        </div>
      ),
    }),
  ]);
}

/** ตารางส่งมอบแล้ว */
export function shippedColumns(trackingOf: (order: Order) => string) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.display({
      id: "tracking_number",
      header: "หมายเลขติดตามพัสดุ",
      cell: (ctx) => (
        <span className="text-muted-foreground">
          {trackingOf(ctx.row.original)}
        </span>
      ),
    }),
    col.accessor("order_status", {
      header: "สถานะ",
      meta: { label: "สถานะ" },
      cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
    }),
  ]);
}
