"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

export function cancelColumns(onCancel: (order: Order) => void) {
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
    col.accessor("qty", {
      header: () => <div className="text-right">จำนวน</div>,
      meta: { label: "จำนวน" },
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.getValue()}
        </div>
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
            onClick={() => onCancel(ctx.row.original)}
          >
            ยกเลิก Order
          </Button>
        </div>
      ),
    }),
  ]);
}
