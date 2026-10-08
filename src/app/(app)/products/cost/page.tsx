"use client";

// CostCalculatorScreen — UC 4S คำนวณ Cost ในการสั่งสินค้าเติม stock เอง
// สูตรและข้อความทั้งหมดมาจาก 00-use-case-descriptions.md (ดู calculateCost ใน lib/workflow.ts)

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionMessage } from "@/components/shared/section-message";
import { TableSearch } from "@/components/shared/table-search";
import { useLanguage } from "@/lib/i18n/context";
import { useStore, useUnsavedChanges } from "@/lib/store";
import { formatBaht, formatDateTime } from "@/lib/format";
import {
  calculateCost,
  costToForm,
  findProduct,
  findSupplier,
  isRateStale,
  type CostCalcResult,
  type CostForm,
} from "@/lib/workflow";
import { SEED_SUPPLIER_QUOTES } from "@/mock/products";
import { calcUnitCost, COST_KEYS, type CostKey } from "@/types/product";

export default function CostCalculatorScreen() {
  const { lang, t } = useLanguage();
  const { state, run } = useStore();
  const [sku, setSku] = useState<string>("");
  const [form, setForm] = useState<CostForm | null>(null);
  const [initial, setInitial] = useState<CostForm | null>(null);
  const [remember, setRemember] = useState(true);
  const [result, setResult] = useState<Extract<
    CostCalcResult,
    { ok: true }
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  useUnsavedChanges(
    "cost",
    form !== null && JSON.stringify(form) !== JSON.stringify(initial),
  );

  const LABEL: Record<CostKey, { label: string; hint: string }> = {
    purchase_price: { label: t.cost.purchasePrice, hint: t.cost.inCurrency },
    exchange_rate: { label: t.cost.exchangeRate, hint: "" },
    intl_freight: { label: t.cost.intlFreight, hint: t.cost.perLot },
    duty_fee: { label: t.cost.dutyFee, hint: t.cost.perLot },
    order_qty: { label: t.cost.orderQty, hint: "" },
    marketplace_fee: { label: t.cost.marketplaceFee, hint: t.cost.perPiece },
    domestic_shipping: {
      label: t.cost.domesticShipping,
      hint: t.cost.perPiece,
    },
    rsl_charge: { label: t.cost.rslCharge, hint: t.cost.perPiece },
  };

  const product = sku ? findProduct(state, sku) : undefined;
  const saved = state.costs.find((c) => c.sku === sku);
  const history = state.costLog
    .filter((l) => l.sku === sku)
    .slice()
    .reverse();

  // ขั้นตอนที่ 1: รายการสินค้าพร้อมช่องค้นหา/กรองตาม SKU หรือชื่อสินค้า
  const visible = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return state.products.filter(
      (p) =>
        !q ||
        p.sku.toLowerCase().includes(q) ||
        p.product_name.toLowerCase().includes(q),
    );
  }, [state.products, keyword]);

  // ขั้นตอนที่ 2: ดึงองค์ประกอบต้นทุน (Q5.1)
  function select(value: string) {
    const loaded = costToForm(
      state.costs.find((c) => c.sku === value),
      value,
    );
    setSku(value);
    setForm(loaded);
    setInitial(loaded);
    setResult(null);
    setError(null);
  }

  // ขั้นตอนที่ 3: กด "คำนวณ" (Q5.2 + Q5.3)
  function calculate() {
    if (!form) return;
    setError(null);
    const { result: r } = run((s) => {
      const out = calculateCost(s, sku, form, remember);
      return { state: out.state, result: out.result };
    });
    if (!r.ok) {
      setResult(null);
      setError(r.reason === "no-rate" ? t.cost.errNoRate : t.cost.errInvalid);
      return;
    }
    setResult(r);
    setInitial(form);
    toast.success(t.cost.okCalculated);
  }

  // องค์ประกอบที่ยังไม่เคยตั้งค่า (ทางเลือก #1) และอัตราแลกเปลี่ยน
  const missing = form
    ? COST_KEYS.filter((k) => form[k].trim() === "" && k !== "exchange_rate")
    : [];
  const noRate = form ? form.exchange_rate.trim() === "" : false;
  const stale =
    form &&
    saved &&
    form.exchange_rate === String(saved.exchange_rate) &&
    isRateStale(saved);

  // ทางเลือก #3: เปรียบเทียบซัพพลายเออร์ — ใช้องค์ประกอบปัจจุบัน เปลี่ยนเฉพาะราคาซื้อและค่าขนส่ง
  const quotes = SEED_SUPPLIER_QUOTES.filter((q) => q.sku === sku);
  const comparison = result
    ? [
        {
          supplier:
            findSupplier(state, product?.supplier_id ?? "")?.supplier_name ??
            t.common.notSet,
          current: true,
          currency: form?.currency ?? "",
          purchase_price: result.components.purchase_price,
          intl_freight: result.components.intl_freight,
          unit_cost: result.unit_cost,
        },
        ...quotes.map((q) => ({
          supplier:
            findSupplier(state, q.supplier_id)?.supplier_name ?? q.supplier_id,
          current: false,
          currency: q.currency,
          purchase_price: q.purchase_price,
          intl_freight: q.intl_freight,
          unit_cost: calcUnitCost({
            ...result.components,
            purchase_price: q.purchase_price,
            exchange_rate: q.exchange_rate,
            intl_freight: q.intl_freight,
          }),
        })),
      ]
    : [];

  return (
    <div className="grid gap-6 p-6">
      <PageHeader title={t.cost.title} description={t.cost.description} />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <Card className="min-w-0 self-start">
          <CardContent className="grid gap-3">
            <TableSearch
              value={keyword}
              onChange={setKeyword}
              label={t.cost.searchLabel}
              placeholder={t.cost.searchPlaceholder}
            />
            {visible.length === 0 ? (
              <EmptyState
                icon={Calculator}
                title={t.cost.emptySearchTitle}
                hint={t.cost.emptySearchHint}
              />
            ) : (
              <ul className="grid gap-1">
                {visible.map((p) => (
                  <li
                    key={p.sku}
                    // ชื่อสินค้าไว้บน ปุ่มไว้ล่าง — คอลัมน์แคบ วางแถวเดียวกันแล้วปุ่มล้นการ์ด
                    className={`grid gap-2 rounded-md px-2 py-2 ${p.sku === sku ? "bg-sidebar-selected" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.sku}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {p.product_name}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-fit"
                      onClick={() => select(p.sku)}
                    >
                      {t.cost.startCalc}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <section className="self-start rounded-lg border">
          {!form ? (
            <EmptyState
              icon={Calculator}
              title={t.cost.noProductTitle}
              hint={t.cost.noProductHint}
            />
          ) : (
            <div className="grid gap-5 p-5">
              <h2 className="font-semibold">{t.cost.formTitle(sku)}</h2>

              {noRate && (
                <SectionMessage appearance="error">
                  {t.cost.errNoRate}
                </SectionMessage>
              )}
              {stale && (
                <SectionMessage appearance="warning">
                  {t.cost.warnStaleRate}
                </SectionMessage>
              )}
              {missing.length > 0 && (
                <SectionMessage appearance="warning">
                  {t.cost.errInvalid} ·{" "}
                  {missing.map((k) => LABEL[k].label).join(", ")}
                </SectionMessage>
              )}

              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="currency">{t.cost.currency}</FieldLabel>
                  <Input
                    id="currency"
                    value={form.currency}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        currency: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </Field>
                {COST_KEYS.map((key) => (
                  <Field
                    key={key}
                    data-invalid={form[key].trim() === "" ? true : undefined}
                  >
                    <FieldLabel htmlFor={key}>{LABEL[key].label}</FieldLabel>
                    <Input
                      id={key}
                      type="number"
                      min={0}
                      step="any"
                      value={form[key]}
                      aria-invalid={form[key].trim() === "" ? true : undefined}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                    {key === "exchange_rate" &&
                    saved?.exchange_rate_updated_at ? (
                      <FieldDescription>
                        {t.cost.rateUpdated(
                          formatDateTime(saved.exchange_rate_updated_at, lang),
                        )}
                      </FieldDescription>
                    ) : (
                      LABEL[key].hint && (
                        <FieldDescription>{LABEL[key].hint}</FieldDescription>
                      )
                    )}
                  </Field>
                ))}
              </FieldGroup>

              {/* ทางเลือก #1: เสนอบันทึกค่าที่กรอกเองไว้ใช้ครั้งถัดไป */}
              <FieldLabel htmlFor="remember" className="font-normal">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                {t.cost.remember}
              </FieldLabel>

              {error && (
                <SectionMessage appearance="error">{error}</SectionMessage>
              )}

              <Button onClick={calculate} className="w-fit">
                {t.cost.calculate}
              </Button>
            </div>
          )}
        </section>

        <div className="grid content-start gap-6">
          <section className="rounded-lg border">
            <h2 className="border-b px-5 py-3.5 font-semibold">
              {t.cost.resultTitle}
            </h2>
            {!result || !form ? (
              <EmptyState
                icon={Calculator}
                title={t.cost.noResultTitle}
                hint={t.cost.noResultHint}
              />
            ) : (
              <div className="grid gap-4 p-5">
                <div>
                  <p className="text-muted-foreground text-sm">
                    {t.cost.unitCost}
                  </p>
                  <p
                    data-numeric
                    className="text-primary mt-1 text-3xl font-semibold"
                  >
                    {formatBaht(result.unit_cost)}
                  </p>
                </div>

                <dl className="grid gap-2 border-t pt-4 text-sm">
                  <Line
                    label={t.cost.purchaseInBaht}
                    value={
                      result.components.purchase_price *
                      result.components.exchange_rate
                    }
                  />
                  <Line
                    label={t.cost.intlFreight}
                    value={result.components.intl_freight}
                  />
                  <Line
                    label={t.cost.dutyFee}
                    value={result.components.duty_fee}
                  />
                  <Line
                    label={t.cost.dividedBy(result.components.order_qty)}
                    value={
                      (result.components.purchase_price *
                        result.components.exchange_rate +
                        result.components.intl_freight +
                        result.components.duty_fee) /
                      result.components.order_qty
                    }
                  />
                  <Line
                    label={t.cost.marketplaceFee}
                    value={result.components.marketplace_fee}
                  />
                  <Line
                    label={t.cost.domesticShipping}
                    value={result.components.domestic_shipping}
                  />
                  <Line
                    label={t.cost.rslCharge}
                    value={result.components.rsl_charge}
                  />
                </dl>

                {product && product.selling_price !== null && (
                  <div className="border-t pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.cost.currentPrice}
                      </span>
                      <span data-numeric>
                        {formatBaht(product.selling_price)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between font-medium">
                      <span>{t.cost.marginPerUnit}</span>
                      <span data-numeric>
                        {formatBaht(product.selling_price - result.unit_cost)}
                      </span>
                    </div>
                  </div>
                )}

                {/* ทางเลือก #2: ต้นทุนสูงกว่าราคาขาย (สีแดง) */}
                {result.overPrice && (
                  <SectionMessage appearance="error">
                    {t.cost.errOverPrice}
                  </SectionMessage>
                )}

                <Button asChild variant="outline">
                  <Link href={`/reports/unit-cost/${sku}`}>
                    <FileText />
                    {t.cost.viewReport}
                  </Link>
                </Button>
              </div>
            )}
          </section>

          {form && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t.cost.historyTitle}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1.5 text-sm">
                {history.length === 0 ? (
                  <p className="text-muted-foreground">{t.cost.historyEmpty}</p>
                ) : (
                  history.slice(0, 5).map((h) => (
                    <div
                      key={h.calculated_at}
                      className="flex justify-between gap-3"
                    >
                      <span className="text-muted-foreground">
                        {formatDateTime(h.calculated_at, lang)}
                      </span>
                      <span data-numeric>{formatBaht(h.unit_cost)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{t.cost.compareTitle}</CardTitle>
            <CardDescription>{t.cost.compareHint}</CardDescription>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t.cost.compareNone}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.supplier}</TableHead>
                    <TableHead className="text-right">
                      {t.cost.purchasePrice}
                    </TableHead>
                    <TableHead className="text-right">
                      {t.cost.intlFreight}
                    </TableHead>
                    <TableHead className="text-right">
                      {t.cost.unitCost}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.map((row) => {
                    const best =
                      Math.min(...comparison.map((c) => c.unit_cost)) ===
                      row.unit_cost;
                    return (
                      <TableRow key={row.supplier}>
                        <TableCell>
                          {row.supplier}
                          {row.current && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              {t.cost.compareCurrent}
                            </span>
                          )}
                        </TableCell>
                        <TableCell data-numeric className="text-right">
                          {row.purchase_price.toLocaleString("th-TH")}{" "}
                          {row.currency}
                        </TableCell>
                        <TableCell data-numeric className="text-right">
                          {formatBaht(row.intl_freight)}
                        </TableCell>
                        <TableCell
                          data-numeric
                          className={`text-right font-medium ${best ? "text-status-success" : ""}`}
                        >
                          {formatBaht(row.unit_cost)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd data-numeric>{formatBaht(value)}</dd>
    </div>
  );
}
