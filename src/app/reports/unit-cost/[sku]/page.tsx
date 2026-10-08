"use client";

// รายงานที่ 2 — รายงานต้นทุนต่อหน่วย (rubric ข้อ 31) · เปิดจาก CostCalculatorScreen
// โครงสร้างอิงสูตร Q5.2 และผลที่บันทึกผ่าน Q5.3 (cost_calculation_log) ครั้งล่าสุด
// พร้อมประวัติการคำนวณย้อนหลัง

import { use } from "react";
import { notFound } from "next/navigation";
import { PrintToolbar } from "@/components/shared/print-toolbar";
import { useLanguage } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { formatBaht, formatDateTime } from "@/lib/format";
import { findProduct, findSupplier } from "@/lib/workflow";

export default function UnitCostReport({ params }: PageProps<"/reports/unit-cost/[sku]">) {
  const { sku } = use(params);
  const { lang, t } = useLanguage();
  const { state } = useStore();
  const product = findProduct(state, sku);
  if (!product) notFound();

  const r = t.reports;
  const logs = state.costLog.filter((l) => l.sku === sku);
  const latest = logs[logs.length - 1];
  const supplier = findSupplier(state, product.supplier_id);

  return (
    <div className="bg-muted min-h-[100dvh] py-8 print:bg-white print:py-0">
      <PrintToolbar title={r.costTitle} backHref="/products/cost" />

      <article className="mx-auto w-[210mm] max-w-[calc(100%-2rem)] bg-white p-10 shadow-sm print:w-auto print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold">{r.costTitle}</h1>
            <p className="mt-1 text-sm text-neutral-600">
              {product.product_name} · {product.variation}
            </p>
          </div>
          <div className="text-right text-xs text-neutral-600">
            <p>RSL Fulfillment Hub</p>
            <p>Colorado Co., Ltd.</p>
          </div>
        </header>

        {!latest ? (
          <p className="py-6 text-sm text-neutral-600">{r.noCost}</p>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4 border-b py-4 text-sm sm:grid-cols-4">
              <Field label="SKU" value={product.sku} />
              <Field label={t.common.supplier} value={supplier?.supplier_name ?? t.common.notSet} />
              <Field label={t.cost.calculatedAt} value={formatDateTime(latest.calculated_at, lang)} />
              <Field
                label={t.cost.exchangeRate}
                value={`${latest.components.exchange_rate} (${latest.components.currency} → THB)`}
              />
            </section>

            <section className="py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-neutral-600">
                    <th className="py-2 font-medium">{r.costItem}</th>
                    <th className="py-2 text-right font-medium">{r.costInBaht}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <Line
                    label={r.purchaseLine(
                      latest.components.purchase_price,
                      latest.components.currency,
                      latest.components.exchange_rate,
                    )}
                    value={latest.components.purchase_price * latest.components.exchange_rate}
                  />
                  <Line label={`${t.cost.intlFreight} ${r.perLot}`} value={latest.components.intl_freight} />
                  <Line label={`${t.cost.dutyFee} ${r.perLot}`} value={latest.components.duty_fee} />
                  <tr className="border-t-2 font-medium">
                    <td className="py-2">{r.lotSubtotal(latest.components.order_qty)}</td>
                    <td className="py-2 text-right">
                      {formatBaht(
                        (latest.components.purchase_price * latest.components.exchange_rate +
                          latest.components.intl_freight +
                          latest.components.duty_fee) /
                          latest.components.order_qty,
                      )}
                    </td>
                  </tr>
                  <Line label={`${t.cost.marketplaceFee} ${r.perPiece}`} value={latest.components.marketplace_fee} />
                  <Line label={`${t.cost.domesticShipping} ${r.perPiece}`} value={latest.components.domestic_shipping} />
                  <Line label={`${t.cost.rslCharge} ${r.perPiece}`} value={latest.components.rsl_charge} />
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black">
                    <td className="py-3 font-semibold">{t.cost.unitCost}</td>
                    <td className="py-3 text-right text-lg font-bold">{formatBaht(latest.unit_cost)}</td>
                  </tr>
                </tfoot>
              </table>
            </section>

            {product.selling_price !== null && (
              <section className="grid grid-cols-2 gap-4 border-t py-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">{t.cost.currentPrice}</span>
                  <span>{formatBaht(product.selling_price)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>{t.cost.marginPerUnit}</span>
                  <span>{formatBaht(product.selling_price - latest.unit_cost)}</span>
                </div>
              </section>
            )}

            {logs.length > 1 && (
              <section className="border-t py-4 text-sm">
                <h2 className="mb-2 text-xs font-semibold text-neutral-600">{r.history}</h2>
                <table className="w-full">
                  <tbody className="divide-y">
                    {[...logs].reverse().map((l) => (
                      <tr key={l.calculated_at}>
                        <td className="py-1.5">{formatDateTime(l.calculated_at, lang)}</td>
                        <td className="py-1.5 text-neutral-600">
                          {r.calculatedBy} {l.calculated_by}
                        </td>
                        <td className="py-1.5 text-right">{formatBaht(l.unit_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}

        <footer className="border-t pt-3 text-[10px] text-neutral-600">{r.formula}</footer>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-wide text-neutral-600 uppercase">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td className="py-2">{label}</td>
      <td className="py-2 text-right">{formatBaht(value)}</td>
    </tr>
  );
}
