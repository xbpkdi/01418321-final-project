"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

/** ตารางรอพิมพ์ */
export function queueColumns(onPrint: (order: Order) => void) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("shipping_address", {
      header: "ที่อยู่จัดส่ง",
      meta: { label: "ที่อยู่จัดส่ง" },
      cell: (ctx) => (
        <span className="text-muted-foreground block max-w-[32ch] truncate">
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
            onClick={() => onPrint(ctx.row.original)}
          >
            พิมพ์ใบปะสินค้า
          </Button>
        </div>
      ),
    }),
  ]);
}

/** ตารางพิมพ์แล้ว */
export function printedColumns(onReprint: (order: Order) => void) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("order_status", {
      header: "สถานะ",
      meta: { label: "สถานะ" },
      cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
    }),
    col.display({
      id: "actions",
      cell: (ctx) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/reports/label/${ctx.row.original.order_id}`}>
              <FileText />
              ดูใบปะสินค้า
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReprint(ctx.row.original)}
          >
            พิมพ์ซ้ำ
          </Button>
        </div>
      ),
    }),
  ]);
}
