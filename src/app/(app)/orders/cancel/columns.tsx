"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Dict } from "@/lib/i18n/dict";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

export function cancelColumns(
  t: Dict,
  onCancel: (order: Order) => void,
  noteOf: (order: Order) => string | null,
) {
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
    col.accessor("qty", {
      header: () => <div className="text-right">{t.common.qty}</div>,
      meta: { label: t.common.qty },
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.getValue()}
        </div>
      ),
    }),
    col.accessor("order_status", {
      header: t.common.status,
      meta: { label: t.common.status },
      cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
    }),
    col.display({
      id: "note",
      header: t.cancel.note,
      cell: (ctx) => {
        const note = noteOf(ctx.row.original);
        return note ? (
          <span className="text-status-cancelled block max-w-[36ch] text-xs">
            {note}
          </span>
        ) : null;
      },
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
            {t.cancel.action}
          </Button>
        </div>
      ),
    }),
  ]);
}
