"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppTableFeatures } from "@/components/shared/data-table";
import type { Product } from "@/types/product";

const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const col = createColumnHelper<AppTableFeatures, Product>();

export function productColumns(
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
      header: "สินค้า",
      meta: { label: "สินค้า" },
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
      header: "ซัพพลายเออร์",
      meta: { label: "ซัพพลายเออร์" },
      cell: (ctx) => (
        <span className="text-muted-foreground">{ctx.getValue()}</span>
      ),
    }),
    col.display({
      id: "reorder",
      header: () => <div className="text-right">เกณฑ์เติม</div>,
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {ctx.row.original.reorder_threshold} / {ctx.row.original.reorder_qty}
        </div>
      ),
    }),
    col.accessor("selling_price", {
      header: () => <div className="text-right">ราคาขาย</div>,
      meta: { label: "ราคาขาย" },
      cell: (ctx) => (
        <div data-numeric className="text-right">
          {baht.format(ctx.getValue())}
        </div>
      ),
    }),
    col.accessor("active", {
      header: "สถานะ",
      meta: { label: "สถานะ" },
      cell: (ctx) => (
        <Badge
          variant="secondary"
          className={
            ctx.getValue()
              ? "bg-status-success-bg text-status-success"
              : "bg-status-waiting-bg text-status-waiting"
          }
        >
          {ctx.getValue() ? "เปิดขาย" : "ปิดการขาย"}
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
            แก้ไข
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleActive(ctx.row.original)}
          >
            {ctx.row.original.active ? "ปิดการขาย" : "เปิดขาย"}
          </Button>
        </div>
      ),
    }),
  ]);
}
