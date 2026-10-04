"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/components/shared/data-table";
import type { Dict } from "@/lib/i18n/dict";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

export function verifyColumns(t: Dict) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("sku", {
      header: "SKU",
      meta: { label: "SKU" },
      cell: (ctx) => (
        <span className="text-muted-foreground">{ctx.getValue()}</span>
      ),
    }),
    col.accessor("sales_channel", {
      header: t.common.salesChannel,
      meta: { label: t.common.salesChannel },
      cell: (ctx) => (
        <span className="text-muted-foreground">{ctx.getValue()}</span>
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
  ]);
}
