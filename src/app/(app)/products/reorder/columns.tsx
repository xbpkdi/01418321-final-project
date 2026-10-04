"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import type { Dict } from "@/lib/i18n/dict";
import { MOCK_PURCHASE_QUEUE } from "@/mock/products";

export type PurchaseQueueItem = (typeof MOCK_PURCHASE_QUEUE)[number];

const col = createColumnHelper<AppTableFeatures, PurchaseQueueItem>();

export function purchaseColumns(t: Dict, onPurchase: (sku: string) => void) {
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
    col.accessor("supplier_name", {
      header: t.common.supplier,
      meta: { label: t.common.supplier },
      cell: (ctx) =>
        ctx.getValue() ? (
          <span className="text-muted-foreground">{ctx.getValue()}</span>
        ) : (
          <span className="text-status-attention">
            {t.reorder.notConfigured}
          </span>
        ),
    }),
    col.display({
      id: "stock",
      header: () => (
        <div className="text-right">{t.reorder.stockVsThreshold}</div>
      ),
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.row.original.total_qty} / {ctx.row.original.reorder_threshold}
        </div>
      ),
    }),
    col.accessor("reorder_qty", {
      header: () => <div className="text-right">{t.reorder.qtyToOrder}</div>,
      meta: { label: t.reorder.qtyToOrder },
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.getValue()}
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
            onClick={() => onPurchase(ctx.row.original.sku)}
          >
            {t.reorder.purchase}
          </Button>
        </div>
      ),
    }),
  ]);
}
