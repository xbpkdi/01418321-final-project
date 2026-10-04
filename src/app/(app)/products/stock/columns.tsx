"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AppTableFeatures } from "@/components/shared/data-table";
import type { StockLevel } from "@/types/product";

export type StockRow = StockLevel & { total: number; low: boolean };

const col = createColumnHelper<AppTableFeatures, StockRow>();

export const stockColumns = col.columns([
  col.accessor("sku", {
    header: "SKU",
    meta: { label: "SKU" },
    cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
  }),
  col.accessor("product_name", {
    header: "สินค้า",
    meta: { label: "สินค้า" },
    cell: (ctx) => (
      <div>
        <p>{ctx.getValue()}</p>
        <p className="text-muted-foreground text-xs">
          {ctx.row.original.variation}
        </p>
      </div>
    ),
  }),
  col.accessor("in_house_qty", {
    header: () => <div className="text-right">คลังบริษัท</div>,
    meta: { label: "คลังบริษัท" },
    cell: (ctx) => (
      <div data-numeric className="text-right">
        {ctx.getValue()}
      </div>
    ),
  }),
  col.accessor("rsl_qty", {
    header: () => <div className="text-right">คลัง RSL</div>,
    meta: { label: "คลัง RSL" },
    cell: (ctx) => (
      <div data-numeric className="text-right">
        {ctx.row.original.incomplete ? (
          <span className="text-muted-foreground">ไม่พบข้อมูล</span>
        ) : (
          ctx.getValue()
        )}
      </div>
    ),
  }),
  col.accessor("total", {
    header: () => <div className="text-right">รวม</div>,
    meta: { label: "รวม" },
    cell: (ctx) => (
      <div data-numeric className="text-right font-medium">
        {ctx.getValue()}
      </div>
    ),
  }),
  col.accessor("reorder_threshold", {
    header: () => <div className="text-right">เกณฑ์เติม</div>,
    meta: { label: "เกณฑ์เติม" },
    cell: (ctx) => (
      <div data-numeric className="text-muted-foreground text-right">
        {ctx.getValue()}
      </div>
    ),
  }),
  col.display({
    id: "status",
    header: "สถานะ",
    cell: (ctx) => (
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="secondary"
          className={
            ctx.row.original.low
              ? "bg-status-cancelled-bg text-status-cancelled"
              : "bg-status-success-bg text-status-success"
          }
        >
          {ctx.row.original.low ? "สต๊อกต่ำกว่าเกณฑ์" : "สต๊อกปกติ"}
        </Badge>
        {ctx.row.original.incomplete && (
          <Badge
            variant="secondary"
            className="bg-status-attention-bg text-status-attention"
          >
            <AlertTriangle />
            ข้อมูลไม่สมบูรณ์
          </Badge>
        )}
      </div>
    ),
  }),
]);
