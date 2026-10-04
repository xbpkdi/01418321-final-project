"use client";

// ProductScreen — UC 3A ตั้งกฎ SKU
// ข้อความและเงื่อนไขตรวจสอบทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
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
import { productColumns } from "./columns";
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
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [draft, setDraft] = useState<Product | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
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
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // ตรวจสอบ: SKU ต้องไม่ซ้ำกับสินค้าอื่นในระบบ
    const duplicate = products.some(
      (p) => p.sku === draft.sku.trim() && p.sku !== editingSku,
    );
    if (duplicate) {
      setError("SKU นี้มีอยู่ในระบบแล้ว");
      return;
    }

    // ตรวจสอบ: Reorder Threshold และ Reorder Quantity ต้องเป็นจำนวนเต็มบวก
    if (
      !Number.isInteger(draft.reorder_threshold) ||
      draft.reorder_threshold < 0 ||
      !Number.isInteger(draft.reorder_qty) ||
      draft.reorder_qty < 0
    ) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // Q13.1: INSERT ... ON CONFLICT (sku) DO UPDATE
    setProducts((prev) =>
      editingSku
        ? prev.map((p) => (p.sku === editingSku ? { ...draft } : p))
        : [...prev, { ...draft }],
    );
    setDraft(null);
    toast.success("บันทึกข้อมูลสินค้าสำเร็จ");
  }

  const columns = productColumns(openEdit, toggleActive);

  // ทางเลือก #1: ลบไม่ได้ถ้ายังมีรายการที่เกี่ยวข้อง ให้เปลี่ยนเป็นปิดการขายแทน
  function toggleActive(product: Product) {
    const linked = MOCK_ORDERS.some((o) => o.sku === product.sku);
    if (product.active && linked) {
      toast.error("ไม่สามารถลบสินค้านี้ได้ เนื่องจากยังมีรายการที่เกี่ยวข้องอยู่", {
        description: "เปลี่ยนเป็นสถานะ ปิดการขาย แทน",
      });
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.sku === product.sku ? { ...p, active: !p.active } : p,
      ),
    );
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="ตั้งกฎ SKU และข้อมูลสินค้า"
        description="ข้อมูลที่นี่ใช้จับคู่ Order สต๊อก และการคำนวณต้นทุน ต้องตรงกันทุกระบบ"
        action={<Button onClick={openCreate}>เพิ่มสินค้าใหม่</Button>}
      />

      <DataTable
        data={products}
        columns={columns}
        getRowId={(row) => row.sku}
        emptyState={
          <EmptyState
            icon={Package}
            title="ยังไม่มีสินค้าในระบบ"
            hint="เพิ่มสินค้าและกำหนด SKU ก่อน เพื่อให้ Order ที่ดึงเข้ามาจับคู่ได้"
            action={<Button onClick={openCreate}>เพิ่มสินค้าใหม่</Button>}
          />
        }
      />

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSku ? "แก้ไขข้อมูลสินค้า" : "เพิ่มสินค้าใหม่"}
            </DialogTitle>
            <DialogDescription>
              SKU ที่กรอกจะถูกใช้จับคู่กับ Order สต๊อก และต้นทุนทั้งระบบ
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="product_name">ชื่อสินค้า</FieldLabel>
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
                  <FieldLabel htmlFor="sales_channel">ช่องทางขาย</FieldLabel>
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
                  <FieldLabel htmlFor="supplier_name">ซัพพลายเออร์</FieldLabel>
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
                    เกณฑ์เติมสต๊อก
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
                  <FieldLabel htmlFor="reorder_qty">จำนวนที่สั่งเติม</FieldLabel>
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
                  <FieldLabel htmlFor="selling_price">ราคาขาย</FieldLabel>
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
              ยกเลิก
            </Button>
            <Button onClick={save}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
