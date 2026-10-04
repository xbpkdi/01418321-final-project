"use client";

// CostCalculatorScreen — UC 4S คำนวณ Cost ในการสั่งสินค้าเติม stock เอง
// สูตรและข้อความทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import Link from "next/link";
import { Calculator, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MOCK_COSTS, MOCK_PRODUCTS } from "@/mock/products";
import { calcUnitCost, type CostComponents } from "@/types/product";

const FIELDS: { key: keyof CostComponents; label: string; hint?: string }[] = [
  { key: "purchase_price", label: "ราคาซื้อต่อหน่วย" },
  { key: "exchange_rate", label: "อัตราแลกเปลี่ยน" },
  { key: "intl_freight", label: "ค่าขนส่งระหว่างประเทศ", hint: "ทั้งล็อต" },
  { key: "duty_fee", label: "ภาษีนำเข้า", hint: "ทั้งล็อต" },
  { key: "order_qty", label: "จำนวนที่สั่งต่อล็อต" },
  { key: "marketplace_fee", label: "ค่าธรรมเนียมมาร์เก็ตเพลส", hint: "ต่อชิ้น" },
  { key: "domestic_shipping", label: "ค่าส่งในประเทศ", hint: "ต่อชิ้น" },
  { key: "rsl_charge", label: "ค่าธรรมเนียม RSL", hint: "ต่อชิ้น" },
];

const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export default function CostCalculatorScreen() {
  const [sku, setSku] = useState<string>("");
  const [form, setForm] = useState<CostComponents | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const product = MOCK_PRODUCTS.find((p) => p.sku === sku);

  function selectSku(value: string) {
    setSku(value);
    setResult(null);
    setError(null);
    // Q5.1: ดึงองค์ประกอบต้นทุนของสินค้านั้น
    const found = MOCK_COSTS.find((c) => c.sku === value);
    setForm(
      found ?? {
        sku: value,
        purchase_price: 0,
        currency: "CNY",
        exchange_rate: 0,
        intl_freight: 0,
        duty_fee: 0,
        marketplace_fee: 0,
        domestic_shipping: 0,
        rsl_charge: 0,
        order_qty: 1,
      },
    );
  }

  function calculate() {
    if (!form) return;
    setError(null);

    // ตรวจสอบ: ข้อมูลที่กรอกต้องไม่เป็นค่าว่างหรือค่าลบ
    const invalid = FIELDS.some((f) => {
      const value = form[f.key];
      return typeof value !== "number" || Number.isNaN(value) || value < 0;
    });
    if (invalid || form.order_qty <= 0) {
      setError("กรุณากรอกข้อมูลต้นทุนให้ครบถ้วนและถูกต้อง");
      return;
    }

    // Q5.2 แล้วบันทึกผลด้วย Q5.3
    const unitCost = calcUnitCost(form);
    setResult(unitCost);
    toast.success("คำนวณต้นทุนต่อหน่วยแล้ว");
  }

  const overSellingPrice =
    result !== null && product ? result > product.selling_price : false;

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="คำนวณต้นทุนต่อหน่วย"
        description="รวมราคาซื้อ อัตราแลกเปลี่ยน ค่าขนส่ง ภาษี และค่าธรรมเนียมทุกตัวเป็นต้นทุนจริงต่อชิ้น"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="self-start rounded-lg border">
          <div className="border-b p-5">
            <Field>
              <FieldLabel htmlFor="sku">เลือกสินค้า</FieldLabel>
              <Select value={sku} onValueChange={selectSku}>
                <SelectTrigger id="sku" className="w-full">
                  <SelectValue placeholder="เลือก SKU ที่ต้องการคำนวณ" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_PRODUCTS.map((p) => (
                    <SelectItem key={p.sku} value={p.sku}>
                      {p.sku} · {p.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {!form ? (
            <EmptyState
              icon={Calculator}
              title="ยังไม่ได้เลือกสินค้า"
              hint="เลือก SKU ด้านบน ระบบจะดึงองค์ประกอบต้นทุนที่เคยบันทึกไว้มาให้แก้ไข"
            />
          ) : (
            <div className="grid gap-5 p-5">
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map((field) => (
                  <Field key={field.key}>
                    <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
                    <Input
                      id={field.key}
                      type="number"
                      min={0}
                      step="any"
                      value={form[field.key] as number}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [field.key]: Number(e.target.value),
                        })
                      }
                    />
                    {field.hint && (
                      <FieldDescription>{field.hint}</FieldDescription>
                    )}
                  </Field>
                ))}
              </FieldGroup>

              {error && (
                <p
                  role="alert"
                  className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-3 py-2.5 text-sm"
                >
                  {error}
                </p>
              )}

              <Button onClick={calculate} className="w-fit">
                คำนวณ
              </Button>
            </div>
          )}
        </section>

        <section className="self-start rounded-lg border">
          <h2 className="border-b px-5 py-3.5 font-semibold">ผลการคำนวณ</h2>

          {result === null || !form ? (
            <EmptyState
              icon={Calculator}
              title="ยังไม่มีผลการคำนวณ"
              hint="กรอกองค์ประกอบต้นทุนให้ครบแล้วกดคำนวณ"
            />
          ) : (
            <div className="grid gap-4 p-5">
              <div>
                <p className="text-muted-foreground text-sm">ต้นทุนต่อหน่วย</p>
                <p
                  data-numeric
                  className="text-primary mt-1 text-3xl font-semibold"
                >
                  {baht.format(result)}
                </p>
              </div>

              <dl className="grid gap-2 border-t pt-4 text-sm">
                <Line
                  label="ราคาซื้อคิดเป็นเงินบาท"
                  value={form.purchase_price * form.exchange_rate}
                />
                <Line label="ค่าขนส่งระหว่างประเทศ" value={form.intl_freight} />
                <Line label="ภาษีนำเข้า" value={form.duty_fee} />
                <Line
                  label={`หารด้วยจำนวนต่อล็อต (${form.order_qty})`}
                  value={
                    (form.purchase_price * form.exchange_rate +
                      form.intl_freight +
                      form.duty_fee) /
                    form.order_qty
                  }
                />
                <Line
                  label="ค่าธรรมเนียมมาร์เก็ตเพลส"
                  value={form.marketplace_fee}
                />
                <Line label="ค่าส่งในประเทศ" value={form.domestic_shipping} />
                <Line label="ค่าธรรมเนียม RSL" value={form.rsl_charge} />
              </dl>

              {product && (
                <div className="border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ราคาขายปัจจุบัน</span>
                    <span data-numeric>{baht.format(product.selling_price)}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-medium">
                    <span>กำไรต่อหน่วย</span>
                    <span data-numeric>
                      {baht.format(product.selling_price - result)}
                    </span>
                  </div>
                </div>
              )}

              {overSellingPrice && (
                <p
                  role="alert"
                  className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-3 py-2.5 text-sm"
                >
                  ต้นทุนต่อหน่วยสูงกว่าราคาขาย กรุณาตรวจสอบราคาขายหรือองค์ประกอบต้นทุน
                </p>
              )}

              <Button asChild variant="outline">
                <Link href={`/reports/unit-cost/${form.sku}`}>
                  <FileText />
                  ดูรายงานต้นทุนต่อหน่วย
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd data-numeric>{baht.format(value)}</dd>
    </div>
  );
}
