"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AppTableFeatures } from "@/components/shared/data-table";
import type { Dict } from "@/lib/i18n/dict";
import type { StockLevel } from "@/types/product";

export type StockRow = StockLevel & { total: number; low: boolean };

const col = createColumnHelper<AppTableFeatures, StockRow>();

export function stockColumns(t: Dict) {
  return col.columns([
    col.accessor("sku", {
      header: "SKU",
      meta: { label: "SKU" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("product_name", {
      header: t.common.product,
      meta: { label: t.common.product },
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
      header: () => <div className="text-right">{t.stock.inHouse}</div>,
      meta: { label: t.stock.inHouse },
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.getValue()}
        </div>
      ),
    }),
    col.accessor("rsl_qty", {
      header: () => <div className="text-right">{t.stock.rsl}</div>,
      meta: { label: t.stock.rsl },
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.row.original.incomplete ? (
            <span className="text-muted-foreground">{t.common.notFound}</span>
          ) : (
            ctx.getValue()
          )}
        </div>
      ),
    }),
    col.accessor("total", {
      header: () => <div className="text-right">{t.stock.total}</div>,
      meta: { label: t.stock.total },
      cell: (ctx) => (
        <div data-numeric className="text-right font-medium">
          {ctx.getValue()}
        </div>
      ),
    }),
    col.accessor("reorder_threshold", {
      header: () => <div className="text-right">{t.common.reorderThreshold}</div>,
      meta: { label: t.common.reorderThreshold },
      cell: (ctx) => (
        <div data-numeric className="text-muted-foreground text-right">
          {ctx.getValue()}
        </div>
      ),
    }),
    col.display({
      id: "status",
      header: t.common.status,
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
            {ctx.row.original.low ? t.stock.low : t.stock.normal}
          </Badge>
          {ctx.row.original.incomplete && (
            <Badge
              variant="secondary"
              className="bg-status-attention-bg text-status-attention"
            >
              <AlertTriangle />
              {t.stock.incomplete}
            </Badge>
          )}
        </div>
      ),
    }),
  ]);
}
