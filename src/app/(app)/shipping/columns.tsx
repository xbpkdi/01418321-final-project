"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Dict } from "@/lib/i18n/dict";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

/** ตารางรอส่งมอบ */
export function waitingColumns(t: Dict, onDispatch: (order: Order) => void) {
  return col.columns([
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
    col.accessor("shipping_method", {
      header: t.common.shippingMethod,
      meta: { label: t.common.shippingMethod },
      cell: (ctx) => (
        <span className="text-muted-foreground">{ctx.getValue()}</span>
      ),
    }),
    col.accessor("order_status", {
      header: t.common.status,
      meta: { label: t.common.status },
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
            {t.shipping.dispatch}
          </Button>
        </div>
      ),
    }),
  ]);
}

/** ตารางส่งมอบแล้ว */
export function shippedColumns(t: Dict, trackingOf: (order: Order) => string) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.display({
      id: "tracking_number",
      header: t.shipping.trackingNumber,
      cell: (ctx) => (
        <span className="text-muted-foreground">
          {trackingOf(ctx.row.original)}
        </span>
      ),
    }),
    col.accessor("order_status", {
      header: t.common.status,
      meta: { label: t.common.status },
      cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
    }),
  ]);
}
