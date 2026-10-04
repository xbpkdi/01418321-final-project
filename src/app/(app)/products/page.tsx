"use client";

// ProductScreen — UC 3A ตั้งกฎ SKU
// ข้อความและเงื่อนไขตรวจสอบทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import { Package, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

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

      <section className="rounded-lg border">
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="ยังไม่มีสินค้าในระบบ"
            hint="เพิ่มสินค้าและกำหนด SKU ก่อน เพื่อให้ Order ที่ดึงเข้ามาจับคู่ได้"
            action={<Button onClick={openCreate}>เพิ่มสินค้าใหม่</Button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">SKU</th>
                <th className="px-5 py-2.5 text-left font-medium">สินค้า</th>
                <th className="hidden px-5 py-2.5 text-left font-medium lg:table-cell">
                  ซัพพลายเออร์
                </th>
                <th className="px-5 py-2.5 text-right font-medium">เกณฑ์เติม</th>
                <th className="hidden px-5 py-2.5 text-right font-medium sm:table-cell">
                  ราคาขาย
                </th>
                <th className="px-5 py-2.5 text-left font-medium">สถานะ</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {products.map((p) => (
                <tr key={p.sku} className="hover:bg-muted/60">
                  <td className="px-5 py-3 font-medium">{p.sku}</td>
                  <td className="px-5 py-3">
                    <p>{p.product_name}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.variation} · {p.sales_channel}
                    </p>
                  </td>
                  <td className="text-muted-foreground hidden px-5 py-3 lg:table-cell">
                    {p.supplier_name}
                  </td>
                  <td data-numeric className="px-5 py-3 text-right">
                    {p.reorder_threshold} / {p.reorder_qty}
                  </td>
                  <td
                    data-numeric
                    className="hidden px-5 py-3 text-right sm:table-cell"
                  >
                    {baht.format(p.selling_price)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        p.active
                          ? "bg-status-success-bg text-status-success rounded-md px-2 py-0.5 text-xs font-medium"
                          : "bg-status-waiting-bg text-status-waiting rounded-md px-2 py-0.5 text-xs font-medium"
                      }
                    >
                      {p.active ? "เปิดขาย" : "ปิดการขาย"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil />
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive(p)}
                      >
                        {p.active ? "ปิดการขาย" : "เปิดขาย"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

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
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="product_name">ชื่อสินค้า</Label>
                <Input
                  id="product_name"
                  value={draft.product_name}
                  onChange={(e) =>
                    setDraft({ ...draft, product_name: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={draft.sku}
                    onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="variation">Variation</Label>
                  <Input
                    id="variation"
                    value={draft.variation}
                    onChange={(e) =>
                      setDraft({ ...draft, variation: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sales_channel">ช่องทางขาย</Label>
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier_name">ซัพพลายเออร์</Label>
                  <Input
                    id="supplier_name"
                    value={draft.supplier_name}
                    onChange={(e) =>
                      setDraft({ ...draft, supplier_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="reorder_threshold">เกณฑ์เติมสต๊อก</Label>
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reorder_qty">จำนวนที่สั่งเติม</Label>
                  <Input
                    id="reorder_qty"
                    type="number"
                    min={0}
                    value={draft.reorder_qty}
                    onChange={(e) =>
                      setDraft({ ...draft, reorder_qty: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="selling_price">ราคาขาย</Label>
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
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-3 py-2.5 text-sm"
                >
                  {error}
                </p>
              )}
            </div>
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
