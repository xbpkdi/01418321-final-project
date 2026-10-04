"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import type { Dict } from "@/lib/i18n/dict";
import type { Product } from "@/types/product";

const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const col = createColumnHelper<AppTableFeatures, Product>();

export function productColumns(
  t: Dict,
  onEdit: (product: Product) => void,
  onToggleActive: (product: Product) => void,
) {
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
            {ctx.row.original.variation} · {ctx.row.original.sales_channel}
          </p>
        </div>
      ),
    }),
    col.accessor("supplier_name", {
      header: t.common.supplier,
      meta: { label: t.common.supplier },
      cell: (ctx) => (
        <span className="text-muted-foreground">{ctx.getValue()}</span>
      ),
    }),
    col.display({
      id: "reorder",
      header: () => (
        <div className="text-right">{t.common.reorderThreshold}</div>
      ),
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.row.original.reorder_threshold} / {ctx.row.original.reorder_qty}
        </div>
      ),
    }),
    col.accessor("selling_price", {
      header: () => <div className="text-right">{t.common.sellingPrice}</div>,
      meta: { label: t.common.sellingPrice },
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {baht.format(ctx.getValue())}
        </div>
      ),
    }),
    col.accessor("active", {
      header: t.common.status,
      meta: { label: t.common.status },
      cell: (ctx) => (
        <Badge
          variant="secondary"
          className={
            ctx.getValue()
              ? "bg-status-success-bg text-status-success"
              : "bg-status-waiting-bg text-status-waiting"
          }
        >
          {ctx.getValue() ? t.products.active : t.products.inactive}
        </Badge>
      ),
    }),
    col.display({
      id: "actions",
      cell: (ctx) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(ctx.row.original)}
          >
            <Pencil />
            {t.products.edit}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleActive(ctx.row.original)}
          >
            {ctx.row.original.active ? t.products.inactive : t.products.active}
          </Button>
        </div>
      ),
    }),
  ]);
}
