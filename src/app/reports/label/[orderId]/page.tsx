// รายงานที่ 1 — ใบปะสินค้า (rubric ข้อ 31)
// โครงสร้างฟิลด์อิง Q6S.2 ที่ INSERT ลงตาราง label บวกข้อมูลผู้รับจากตาราง orders

import { notFound } from "next/navigation";
import { MOCK_ORDERS } from "@/mock/orders";
import { LABEL_TEMPLATES } from "@/mock/delivery";
import { PrintToolbar } from "@/components/shared/print-toolbar";

export default async function ShippingLabelReport({
  params,
}: PageProps<"/reports/label/[orderId]">) {
  const { orderId } = await params;
  const order = MOCK_ORDERS.find((o) => o.order_id === orderId);
  if (!order) notFound();

  const template = LABEL_TEMPLATES[order.shipping_method] ?? "RSL-STD-A6";
  const rslRef = `RSL-${order.order_id.replace("ORD-", "")}`;

  return (
    <div className="bg-muted min-h-[100dvh] py-8 print:bg-white print:py-0">
      <PrintToolbar title="ใบปะสินค้า" backHref="/shipping/label" />

      <article className="mx-auto w-[148mm] bg-white p-8 shadow-sm print:w-auto print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-black pb-3">
          <div>
            <p className="text-xs tracking-wide uppercase">Shipping Label</p>
            <p className="text-xl font-bold">{template}</p>
          </div>
          <div className="text-right text-xs">
            <p>RSL Fulfillment Hub</p>
            <p>Colorado Co., Ltd.</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 border-b border-black py-3 text-xs">
          <Field label="Order ID" value={order.order_id} />
          <Field label="RSL Reference" value={rslRef} />
          <Field label="ช่องทางขาย" value={order.sales_channel} />
          <Field
            label="เลขคำสั่งซื้อช่องทางขาย"
            value={order.marketplace_order_id}
          />
          <Field label="วิธีจัดส่ง" value={order.shipping_method} />
          <Field label="ลำดับกล่อง" value="1 / 1" />
        </section>

        <section className="border-b border-black py-4">
          <p className="text-xs tracking-wide uppercase">ผู้รับ</p>
          <p className="mt-1.5 text-base leading-relaxed font-medium">
            {order.shipping_address}
          </p>
        </section>

        <section className="py-4 text-sm">
          <p className="text-xs tracking-wide uppercase">รายการสินค้า</p>
          <table className="mt-2 w-full">
            <thead>
              <tr className="border-b text-left text-xs">
                <th className="py-1 font-medium">SKU</th>
                <th className="py-1 font-medium">สินค้า</th>
                <th className="py-1 text-right font-medium">จำนวน</th>
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
                <td className="py-2 text-right align-top">{order.qty}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="border-t-2 border-black pt-3">
          <p className="font-mono text-2xl tracking-[0.2em]">{rslRef}</p>
          <p className="mt-1 text-[10px] text-neutral-600">
            พิมพ์จากระบบ RSL Fulfillment Hub · รูปแบบ {template}
          </p>
        </footer>
      </article>
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
