"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Dict } from "@/lib/i18n/dict";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

/** ตารางรอพิมพ์ */
export function queueColumns(t: Dict, onPrint: (order: Order) => void) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("shipping_address", {
      header: t.common.shippingAddress,
      meta: { label: t.common.shippingAddress },
      cell: (ctx) => (
        <span className="text-muted-foreground block max-w-[32ch] truncate">
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
            onClick={() => onPrint(ctx.row.original)}
          >
            {t.label.print}
          </Button>
        </div>
      ),
    }),
  ]);
}

/** ตารางพิมพ์แล้ว */
export function printedColumns(t: Dict, onReprint: (order: Order) => void) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("order_status", {
      header: t.common.status,
      meta: { label: t.common.status },
      cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
    }),
    col.display({
      id: "actions",
      cell: (ctx) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/reports/label/${ctx.row.original.order_id}`}>
              <FileText />
              {t.label.viewLabel}
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReprint(ctx.row.original)}
          >
            {t.label.reprint}
          </Button>
        </div>
      ),
    }),
  ]);
}
