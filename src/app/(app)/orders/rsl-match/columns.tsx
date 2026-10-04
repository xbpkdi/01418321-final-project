"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Order } from "@/types/order";
import type { OrderStatus } from "@/lib/order-status";

const col = createColumnHelper<AppTableFeatures, Order>();

/** ตารางรอจับคู่ — สถานะมาจาก state ที่หน้าถืออยู่ ไม่ใช่ค่าใน Order ตรงๆ */
export function queueColumns(
  statusOf: (order: Order) => OrderStatus,
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
    col.display({
      id: "status",
      header: "สถานะ",
      cell: (ctx) => <StatusBadge status={statusOf(ctx.row.original)} />,
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
            จับคู่กับ RSL
          </Button>
        </div>
      ),
    }),
  ]);
}

/** ตารางจับคู่แล้ว */
export function matchedColumns(
  referenceOf: (order: Order) => string | null,
  statusOf: (order: Order) => OrderStatus,
  onUnmatch: (orderId: string) => void,
) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.display({
      id: "rsl_reference_id",
      header: "หมายเลขอ้างอิง RSL",
      cell: (ctx) => (
        <span className="text-muted-foreground">
          {referenceOf(ctx.row.original)}
        </span>
      ),
    }),
    col.display({
      id: "status",
      header: "สถานะ",
      cell: (ctx) => <StatusBadge status={statusOf(ctx.row.original)} />,
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
            ยกเลิกการจับคู่
          </Button>
        </div>
      ),
    }),
  ]);
}
