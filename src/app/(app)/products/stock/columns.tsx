"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { useT } from "@/lib/i18n/context";
import type { Dict } from "@/lib/i18n/dict";
import type { StockCheck } from "@/lib/workflow";

export type StockRow = Extract<StockCheck, { found: true }> & {
  product_name: string;
  variation: string;
};

const col = createColumnHelper<AppTableFeatures, StockRow>();

/** สีแดง = ต่ำกว่าเกณฑ์, สีเขียว = ปกติ ตามที่ UC 3S กำหนด */
export function StockBadge({ low }: { low: boolean }) {
  const t = useT();
  return (
    <Badge
      variant="secondary"
      className={low ? "bg-status-cancelled-bg text-status-cancelled" : "bg-status-success-bg text-status-success"}
    >
      {low ? t.stock.low : t.stock.normal}
    </Badge>
  );
}

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
          <p className="text-muted-foreground text-xs">{ctx.row.original.variation}</p>
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
          {ctx.getValue() === null ? (
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
    col.accessor("threshold", {
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
          <StockBadge low={ctx.row.original.low} />
          {(ctx.row.original.incomplete || ctx.row.original.partial) && (
            <Badge variant="secondary" className="bg-status-attention-bg text-status-attention">
              <AlertTriangle />
              {ctx.row.original.incomplete ? t.stock.incomplete : t.stock.partial}
            </Badge>
          )}
        </div>
      ),
    }),
  ]);
}
