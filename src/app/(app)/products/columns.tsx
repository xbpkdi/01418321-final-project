"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppTableFeatures } from "@/components/shared/data-table";
import type { Dict } from "@/lib/i18n/dict";
import { formatBaht } from "@/lib/format";
import type { Product } from "@/types/product";

const col = createColumnHelper<AppTableFeatures, Product>();

export function productColumns(
  t: Dict,
  supplierName: (supplierId: string) => string,
  onEdit: (product: Product) => void,
  onToggleActive: (product: Product) => void,
  onDelete: (product: Product) => void,
) {
  return col.columns([
    col.accessor("sku", {
      header: "SKU",
      meta: { label: "SKU" },
      cell: (ctx) => (
        <div>
          <p className="font-medium">{ctx.getValue()}</p>
          <p className="text-muted-foreground text-xs">
            {ctx.row.original.channel_sku}
          </p>
        </div>
      ),
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
    col.accessor("supplier_id", {
      header: t.common.supplier,
      meta: { label: t.common.supplier },
      cell: (ctx) =>
        ctx.getValue() ? (
          <span className="text-muted-foreground">
            {supplierName(ctx.getValue())}
          </span>
        ) : (
          <span className="text-status-attention">
            {t.reorder.notConfigured}
          </span>
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
      cell: (ctx) => {
        const price = ctx.getValue();
        return (
          <div data-numeric className="text-right">
            {price === null ? (
              <span className="text-status-attention">{t.common.notSet}</span>
            ) : (
              formatBaht(price)
            )}
          </div>
        );
      },
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={t.common.moreActions}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onToggleActive(ctx.row.original)}
              >
                {ctx.row.original.active
                  ? t.products.inactive
                  : t.products.active}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(ctx.row.original)}
              >
                {t.products.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    }),
  ]);
}
