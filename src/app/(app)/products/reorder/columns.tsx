"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Dict, Lang } from "@/lib/i18n/dict";
import { formatDate } from "@/lib/format";
import type { PurchaseRow } from "@/lib/workflow";
import type { PurchaseOrder } from "@/types/product";

const col = createColumnHelper<AppTableFeatures, PurchaseRow>();

/** 6A ขั้นตอนที่ 2: รายการ SKU ในหน้า "รอสั่งซื้อเติมสต๊อก" */
export function purchaseColumns(t: Dict, onPurchase: (row: PurchaseRow) => void) {
  return col.columns([
    col.accessor("sku", {
      header: "SKU",
      meta: { label: "SKU" },
      cell: (ctx) => (
        <div>
          <p className="font-medium">{ctx.getValue()}</p>
          {ctx.row.original.retry && (
            <p className="text-status-cancelled text-xs">{t.reorder.retry}</p>
          )}
        </div>
      ),
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
    col.display({
      id: "supplier",
      header: t.common.supplier,
      cell: (ctx) =>
        ctx.row.original.supplier ? (
          <span className="text-muted-foreground">{ctx.row.original.supplier.supplier_name}</span>
        ) : (
          <span className="text-status-attention">{t.reorder.notConfigured}</span>
        ),
    }),
    col.display({
      id: "stock",
      header: () => <div className="text-right">{t.reorder.stockVsThreshold}</div>,
      cell: (ctx) => (
        <div
          data-numeric
          className={`text-right ${ctx.row.original.low ? "text-status-cancelled font-medium" : ""}`}
        >
          {ctx.row.original.total ?? "—"} / {ctx.row.original.threshold}
        </div>
      ),
    }),
    col.display({
      id: "orders",
      header: t.reorder.linkedOrders,
      cell: (ctx) => (
        <span className="text-muted-foreground text-xs">
          {ctx.row.original.orderIds.join(", ") || "—"}
        </span>
      ),
    }),
    col.display({
      id: "qty",
      header: () => <div className="text-right">{t.reorder.qtyToOrder}</div>,
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.row.original.decided_qty ?? ctx.row.original.reorder_qty}
        </div>
      ),
    }),
    col.display({
      id: "actions",
      cell: (ctx) => (
        <div className="text-right">
          <Button size="sm" variant="outline" onClick={() => onPurchase(ctx.row.original)}>
            {t.reorder.purchase}
          </Button>
        </div>
      ),
    }),
  ]);
}

const poCol = createColumnHelper<AppTableFeatures, PurchaseOrder>();

/** ผลการสั่งซื้อที่บันทึกไว้ (Q7.2) */
export function purchaseOrderColumns(t: Dict, lang: Lang, supplierName: (id: string) => string) {
  return poCol.columns([
    poCol.accessor("po_id", {
      header: t.reorder.poId,
      meta: { label: t.reorder.poId },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    poCol.accessor("sku", {
      header: "SKU",
      meta: { label: "SKU" },
      cell: (ctx) => <span className="text-muted-foreground">{ctx.getValue()}</span>,
    }),
    poCol.accessor("supplier_id", {
      header: t.common.supplier,
      meta: { label: t.common.supplier },
      cell: (ctx) => <span className="text-muted-foreground">{supplierName(ctx.getValue())}</span>,
    }),
    poCol.accessor("order_qty", {
      header: () => <div className="text-right">{t.common.qty}</div>,
      meta: { label: t.common.qty },
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.getValue()}
        </div>
      ),
    }),
    poCol.accessor("order_date", {
      header: t.reorder.orderDate,
      meta: { label: t.reorder.orderDate },
      cell: (ctx) => <span className="text-muted-foreground">{formatDate(ctx.getValue(), lang)}</span>,
    }),
    poCol.accessor("eta", {
      header: t.reorder.eta,
      meta: { label: t.reorder.eta },
      cell: (ctx) => (
        <span className="text-muted-foreground">{ctx.getValue() ? formatDate(ctx.getValue(), lang) : "—"}</span>
      ),
    }),
    poCol.accessor("status", {
      header: t.common.status,
      meta: { label: t.common.status },
      cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
    }),
  ]);
}
