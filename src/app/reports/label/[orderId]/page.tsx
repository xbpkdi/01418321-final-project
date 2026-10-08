"use client";

// รายงานที่ 1 — ใบปะสินค้า (rubric ข้อ 31) · เปิดจาก LabelPrintScreen
// โครงสร้างฟิลด์อิง Q6S.2 (label_template, rsl_no, parcel_seq, parcel_total, label_status, created_at)
// บวกข้อมูลผู้รับและรายการสินค้าจากตาราง orders — Multi-parcel พิมพ์แยกใบละกล่อง (6S, 9A ทางเลือก #4)

import { use } from "react";
import { notFound } from "next/navigation";
import { PrintToolbar } from "@/components/shared/print-toolbar";
import { useLanguage } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { findOrder } from "@/lib/workflow";

export default function ShippingLabelReport({
  params,
}: PageProps<"/reports/label/[orderId]">) {
  const { orderId } = use(params);
  const { lang, t } = useLanguage();
  const { state } = useStore();
  const order = findOrder(state, orderId);
  if (!order) notFound();

  const r = t.reports;
  const template = order.label_template;
  const parcels = order.parcel_total ?? 1;

  return (
    <div className="bg-muted min-h-[100dvh] py-8 print:bg-white print:py-0">
      <PrintToolbar title={r.labelTitle} backHref="/shipping/label" />

      {!template || !order.rsl_reference_id ? (
        <p className="text-muted-foreground mx-auto w-[148mm] max-w-[calc(100%-2rem)] text-sm">
          {r.noLabel}
        </p>
      ) : (
        <div className="grid gap-6 print:gap-0">
          {Array.from({ length: parcels }, (_, i) => (
            <article
              key={i}
              className="mx-auto w-[148mm] max-w-[calc(100%-2rem)] bg-white p-8 shadow-sm print:w-auto print:break-after-page print:shadow-none"
            >
              <header className="flex items-start justify-between border-b-2 border-black pb-3">
                <div>
                  <p className="text-xs tracking-wide uppercase">
                    {r.labelEyebrow}
                  </p>
                  <p className="text-xl font-bold">{template}</p>
                </div>
                <div className="text-right text-xs">
                  <p>RSL Fulfillment Hub</p>
                  <p>Colorado Co., Ltd.</p>
                </div>
              </header>

              <section className="grid grid-cols-2 gap-4 border-b border-black py-3 text-xs">
                <Field label="Order ID" value={order.order_id} />
                <Field label={r.rslReference} value={order.rsl_reference_id!} />
                <Field
                  label={t.common.salesChannel}
                  value={order.sales_channel}
                />
                <Field
                  label={r.marketplaceOrderId}
                  value={order.marketplace_order_id}
                />
                <Field
                  label={t.common.shippingMethod}
                  value={order.shipping_method}
                />
                <Field label={r.parcel} value={`${i + 1} / ${parcels}`} />
                <Field
                  label={r.labelStatus}
                  value={t.statusLabel[order.order_status]}
                />
                <Field
                  label={r.createdAt}
                  value={
                    order.label_printed_at
                      ? formatDateTime(order.label_printed_at, lang)
                      : "—"
                  }
                />
              </section>

              <section className="border-b border-black py-4">
                <p className="text-xs tracking-wide uppercase">{r.recipient}</p>
                <p className="mt-1.5 text-base leading-relaxed font-medium">
                  {order.shipping_address}
                </p>
              </section>

              <section className="py-4 text-sm">
                <p className="text-xs tracking-wide uppercase">{r.items}</p>
                <table className="mt-2 w-full">
                  <thead>
                    <tr className="border-b text-left text-xs">
                      <th className="py-1 font-medium">SKU</th>
                      <th className="py-1 font-medium">{t.common.product}</th>
                      <th className="py-1 text-right font-medium">
                        {t.common.qty}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 align-top">{order.sku}</td>
                      <td className="py-2 align-top">
                        {order.product_name}
                        <span className="block text-xs text-neutral-600">
                          {order.variation}
                        </span>
                      </td>
                      <td className="py-2 text-right align-top">
                        {/* แบ่งจำนวนสินค้าให้แต่ละกล่องเท่าๆ กัน เศษไปอยู่กล่องแรกๆ */}
                        {Math.floor(order.qty / parcels) +
                          (i < order.qty % parcels ? 1 : 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <footer className="border-t-2 border-black pt-3">
                {/* เลขอ้างอิงสำหรับสแกน: RSL + ลำดับกล่อง */}
                <p className="font-mono text-2xl tracking-[0.2em]">
                  {order.rsl_reference_id}-{String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 text-[10px] text-neutral-600">
                  {r.printedFrom(template)}
                </p>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-wide text-neutral-600 uppercase">
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
