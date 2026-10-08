"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Dict } from "@/lib/i18n/dict";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

/** ตารางรอจับคู่ — รวม Order ที่หา SKU ใน RSL ไม่เจอ (รอดำเนินการด้วยตนเอง) ให้ลองใหม่ได้ */
export function queueColumns(
  t: Dict,
  onMatch: (order: Order) => void,
  workingId: string | null,
) {
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
    col.accessor("variation", {
      header: "Variation",
      meta: { label: "Variation" },
      cell: (ctx) => (
        <span className="text-muted-foreground">{ctx.getValue()}</span>
      ),
    }),
    col.accessor("order_status", {
      header: t.common.status,
      meta: { label: t.common.status },
      cell: (ctx) => (
        <div className="grid gap-1">
          <StatusBadge status={ctx.getValue()} />
          {ctx.row.original.manual_reason && (
            <span className="text-muted-foreground text-xs">
              {t.manualReason[ctx.row.original.manual_reason]}
            </span>
          )}
        </div>
      ),
    }),
    col.display({
      id: "actions",
      cell: (ctx) => (
        <div className="text-right">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMatch(ctx.row.original)}
            disabled={workingId === ctx.row.original.order_id}
          >
            {workingId === ctx.row.original.order_id && <Spinner />}
            {t.rslMatch.match}
          </Button>
        </div>
      ),
    }),
  ]);
}

/** ตารางจับคู่แล้ว ยังยกเลิกการจับคู่ได้จนกว่าจะพิมพ์ใบปะสินค้า */
export function matchedColumns(t: Dict, onUnmatch: (orderId: string) => void) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("rsl_reference_id", {
      header: t.rslMatch.rslReference,
      meta: { label: t.rslMatch.rslReference },
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
            variant="ghost"
            onClick={() => onUnmatch(ctx.row.original.order_id)}
          >
            <Link2Off />
            {t.rslMatch.unmatch}
          </Button>
        </div>
      ),
    }),
  ]);
}
