"use client";

// ProductScreen — UC 3A ตั้งกฎ SKU
// ข้อความและเงื่อนไขตรวจสอบทั้งหมดมาจาก 00-use-case-descriptions.md

import { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import { TableSearch } from "@/components/shared/table-search";
import { productColumns } from "./columns";
import { useT } from "@/lib/i18n/context";
import { MOCK_PRODUCTS } from "@/mock/products";
import { MOCK_ORDERS } from "@/mock/orders";
import type { Product } from "@/types/product";
import type { SalesChannel } from "@/types/order";

const CHANNELS: SalesChannel[] = [
  "Rakuten Ichiba",
  "Yahoo! Auctions",
  "Amazon",
];

const BLANK: Product = {
  sku: "",
  product_name: "",
  variation: "",
  sales_channel: "Rakuten Ichiba",
  supplier_id: "",
  supplier_name: "",
  reorder_threshold: 0,
  reorder_qty: 0,
  selling_price: 0,
  active: true,
};

export default function ProductScreen() {
  const t = useT();
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [draft, setDraft] = useState<Product | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setDraft({ ...BLANK });
    setEditingSku(null);
    setError(null);
  }

  function openEdit(product: Product) {
    setDraft({ ...product });
    setEditingSku(product.sku);
    setError(null);
  }

  function save() {
    if (!draft) return;

    // ตรวจสอบ: ชื่อสินค้าและ SKU ต้องไม่เป็นช่องว่าง
    if (!draft.product_name.trim() || !draft.sku.trim()) {
      setError(t.products.errIncomplete);
      return;
    }

    // ตรวจสอบ: SKU ต้องไม่ซ้ำกับสินค้าอื่นในระบบ
    const duplicate = products.some(
      (p) => p.sku === draft.sku.trim() && p.sku !== editingSku,
    );
    if (duplicate) {
      setError(t.products.errDuplicateSku);
      return;
    }

    // ตรวจสอบ: Reorder Threshold และ Reorder Quantity ต้องเป็นจำนวนเต็มบวก
    if (
      !Number.isInteger(draft.reorder_threshold) ||
      draft.reorder_threshold < 0 ||
      !Number.isInteger(draft.reorder_qty) ||
      draft.reorder_qty < 0
    ) {
      setError(t.products.errIncomplete);
      return;
    }

    // Q13.1: INSERT ... ON CONFLICT (sku) DO UPDATE
    setProducts((prev) =>
      editingSku
        ? prev.map((p) => (p.sku === editingSku ? { ...draft } : p))
        : [...prev, { ...draft }],
    );
    setDraft(null);
    toast.success(t.products.okSaved);
  }

  const columns = productColumns(t, openEdit, toggleActive);

  // ทางเลือก #1: ลบไม่ได้ถ้ายังมีรายการที่เกี่ยวข้อง ให้เปลี่ยนเป็นปิดการขายแทน
  function toggleActive(product: Product) {
    const linked = MOCK_ORDERS.some((o) => o.sku === product.sku);
    if (product.active && linked) {
      toast.error(t.products.errHasRelated, {
        description: t.products.errHasRelatedHint,
      });
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.sku === product.sku ? { ...p, active: !p.active } : p,
      ),
    );
  }

  // ค้นด้วย SKU ชื่อสินค้า หรือซัพพลายเออร์
  const visible = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.product_name.toLowerCase().includes(q) ||
        p.supplier_name.toLowerCase().includes(q),
    );
  }, [products, keyword]);

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.products.title}
        description={t.products.description}
        action={<Button onClick={openCreate}>{t.products.create}</Button>}
      />

      <DataTable
        data={visible}
        columns={columns}
        getRowId={(row) => row.sku}
        toolbar={
          <TableSearch
            value={keyword}
            onChange={setKeyword}
            label={t.products.searchLabel}
            placeholder={t.products.searchPlaceholder}
          />
        }
        emptyState={
          <EmptyState
            icon={Package}
            title={keyword ? t.products.emptySearchTitle : t.products.emptyTitle}
            hint={keyword ? t.products.emptySearchHint : t.products.emptyHint}
            action={
              keyword ? undefined : (
                <Button onClick={openCreate}>{t.products.create}</Button>
              )
            }
          />
        }
      />

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSku ? t.products.editTitle : t.products.create}
            </DialogTitle>
            <DialogDescription>{t.products.dialogHint}</DialogDescription>
          </DialogHeader>

          {draft && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="product_name">
                  {t.products.productName}
                </FieldLabel>
                <Input
                  id="product_name"
                  value={draft.product_name}
                  onChange={(e) =>
                    setDraft({ ...draft, product_name: e.target.value })
                  }
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="sku">SKU</FieldLabel>
                  <Input
                    id="sku"
                    value={draft.sku}
                    onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="variation">Variation</FieldLabel>
                  <Input
                    id="variation"
                    value={draft.variation}
                    onChange={(e) =>
                      setDraft({ ...draft, variation: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="sales_channel">
                    {t.common.salesChannel}
                  </FieldLabel>
                  <Select
                    value={draft.sales_channel}
                    onValueChange={(v) =>
                      setDraft({ ...draft, sales_channel: v as SalesChannel })
                    }
                  >
                    <SelectTrigger id="sales_channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="supplier_name">
                    {t.common.supplier}
                  </FieldLabel>
                  <Input
                    id="supplier_name"
                    value={draft.supplier_name}
                    onChange={(e) =>
                      setDraft({ ...draft, supplier_name: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="reorder_threshold">
                    {t.products.reorderThresholdField}
                  </FieldLabel>
                  <Input
                    id="reorder_threshold"
                    type="number"
                    min={0}
                    value={draft.reorder_threshold}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        reorder_threshold: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="reorder_qty">
                    {t.products.reorderQty}
                  </FieldLabel>
                  <Input
                    id="reorder_qty"
                    type="number"
                    min={0}
                    value={draft.reorder_qty}
                    onChange={(e) =>
                      setDraft({ ...draft, reorder_qty: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="selling_price">
                    {t.common.sellingPrice}
                  </FieldLabel>
                  <Input
                    id="selling_price"
                    type="number"
                    min={0}
                    value={draft.selling_price}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        selling_price: Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-3 py-2.5 text-sm"
                >
                  {error}
                </p>
              )}
            </FieldGroup>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={save}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
