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
import { useT } from "@/lib/i18n/context";
import type { Dict } from "@/lib/i18n/dict";
import { MOCK_COSTS, MOCK_PRODUCTS } from "@/mock/products";
import { calcUnitCost, type CostComponents } from "@/types/product";

type CostField = { key: keyof CostComponents; label: string; hint?: string };

function costFields(t: Dict): CostField[] {
  return [
    { key: "purchase_price", label: t.cost.purchasePrice },
    { key: "exchange_rate", label: t.cost.exchangeRate },
    { key: "intl_freight", label: t.cost.intlFreight, hint: t.cost.perLot },
    { key: "duty_fee", label: t.cost.dutyFee, hint: t.cost.perLot },
    { key: "order_qty", label: t.cost.orderQty },
    {
      key: "marketplace_fee",
      label: t.cost.marketplaceFee,
      hint: t.cost.perPiece,
    },
    {
      key: "domestic_shipping",
      label: t.cost.domesticShipping,
      hint: t.cost.perPiece,
    },
    { key: "rsl_charge", label: t.cost.rslCharge, hint: t.cost.perPiece },
  ];
}

const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export default function CostCalculatorScreen() {
  const t = useT();
  const FIELDS = costFields(t);
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
      setError(t.cost.errInvalid);
      return;
    }

    // Q5.2 แล้วบันทึกผลด้วย Q5.3
    const unitCost = calcUnitCost(form);
    setResult(unitCost);
    toast.success(t.cost.okCalculated);
  }

  const overSellingPrice =
    result !== null && product ? result > product.selling_price : false;

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.cost.title}
        description={t.cost.description}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="self-start rounded-lg border">
          <div className="border-b p-5">
            <Field>
              <FieldLabel htmlFor="sku">{t.cost.selectProduct}</FieldLabel>
              <Select value={sku} onValueChange={selectSku}>
                <SelectTrigger id="sku" className="w-full">
                  <SelectValue placeholder={t.cost.selectPlaceholder} />
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
              title={t.cost.noProductTitle}
              hint={t.cost.noProductHint}
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
                {t.cost.calculate}
              </Button>
            </div>
          )}
        </section>

        <section className="self-start rounded-lg border">
          <h2 className="border-b px-5 py-3.5 font-semibold">
            {t.cost.resultTitle}
          </h2>

          {result === null || !form ? (
            <EmptyState
              icon={Calculator}
              title={t.cost.noResultTitle}
              hint={t.cost.noResultHint}
            />
          ) : (
            <div className="grid gap-4 p-5">
              <div>
                <p className="text-muted-foreground text-sm">{t.cost.unitCost}</p>
                <p
                  data-numeric
                  className="text-primary mt-1 text-3xl font-semibold"
                >
                  {baht.format(result)}
                </p>
              </div>

              <dl className="grid gap-2 border-t pt-4 text-sm">
                <Line
                  label={t.cost.purchaseInBaht}
                  value={form.purchase_price * form.exchange_rate}
                />
                <Line label={t.cost.intlFreight} value={form.intl_freight} />
                <Line label={t.cost.dutyFee} value={form.duty_fee} />
                <Line
                  label={t.cost.dividedBy(form.order_qty)}
                  value={
                    (form.purchase_price * form.exchange_rate +
                      form.intl_freight +
                      form.duty_fee) /
                    form.order_qty
                  }
                />
                <Line
                  label={t.cost.marketplaceFee}
                  value={form.marketplace_fee}
                />
                <Line label={t.cost.domesticShipping} value={form.domestic_shipping} />
                <Line label={t.cost.rslCharge} value={form.rsl_charge} />
              </dl>

              {product && (
                <div className="border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.cost.currentPrice}
                    </span>
                    <span data-numeric>{baht.format(product.selling_price)}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-medium">
                    <span>{t.cost.marginPerUnit}</span>
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
                  {t.cost.errOverPrice}
                </p>
              )}

              <Button asChild variant="outline">
                <Link href={`/reports/unit-cost/${form.sku}`}>
                  <FileText />
                  {t.cost.viewReport}
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
