// รายงานที่ 2 — รายงานต้นทุนต่อหน่วย (rubric ข้อ 31)
// โครงสร้างอิงสูตร Q5.2 และผลที่บันทึกผ่าน Q5.3

import { notFound } from "next/navigation";
import { MOCK_COSTS, MOCK_PRODUCTS } from "@/mock/products";
import { calcUnitCost } from "@/types/product";
import { PrintToolbar } from "@/components/shared/print-toolbar";

const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export default async function UnitCostReport({
  params,
}: PageProps<"/reports/unit-cost/[sku]">) {
  const { sku } = await params;
  const cost = MOCK_COSTS.find((c) => c.sku === sku);
  const product = MOCK_PRODUCTS.find((p) => p.sku === sku);
  if (!cost || !product) notFound();

  const lotTotal =
    cost.purchase_price * cost.exchange_rate + cost.intl_freight + cost.duty_fee;
  const perUnitFromLot = lotTotal / cost.order_qty;
  const unitCost = calcUnitCost(cost);
  const margin = product.selling_price - unitCost;

  return (
    <div className="bg-muted min-h-[100dvh] py-8 print:bg-white print:py-0">
      <PrintToolbar title="รายงานต้นทุนต่อหน่วย" backHref="/products/cost" />

      <article className="mx-auto w-[210mm] max-w-[calc(100%-2rem)] bg-white p-10 shadow-sm print:w-auto print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold">รายงานต้นทุนต่อหน่วย</h1>
            <p className="mt-1 text-sm text-neutral-600">
              {product.product_name} · {product.variation}
            </p>
          </div>
          <div className="text-right text-xs text-neutral-600">
            <p>RSL Fulfillment Hub</p>
            <p>Colorado Co., Ltd.</p>
          </div>
        </header>

        <section className="grid grid-cols-4 gap-4 border-b py-4 text-sm">
          <Field label="SKU" value={product.sku} />
          <Field label="ซัพพลายเออร์" value={product.supplier_name} />
          <Field label="สกุลเงินที่ซื้อ" value={cost.currency} />
          <Field
            label="จำนวนต่อล็อต"
            value={cost.order_qty.toLocaleString("th-TH")}
          />
        </section>

        <section className="py-4">
          <h2 className="text-sm font-semibold">องค์ประกอบต้นทุน</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-neutral-600">
                <th className="py-2 font-medium">รายการ</th>
                <th className="py-2 text-right font-medium">คิดเป็นเงินบาท</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <Line
                label={`ราคาซื้อต่อหน่วย ${cost.purchase_price} ${cost.currency} × อัตราแลกเปลี่ยน ${cost.exchange_rate}`}
                value={cost.purchase_price * cost.exchange_rate}
              />
              <Line label="ค่าขนส่งระหว่างประเทศ (ทั้งล็อต)" value={cost.intl_freight} />
              <Line label="ภาษีนำเข้า (ทั้งล็อต)" value={cost.duty_fee} />
              <tr className="border-t-2 font-medium">
                <td className="py-2">
                  รวมต้นทุนล็อต หารด้วย {cost.order_qty} ชิ้น
                </td>
                <td className="py-2 text-right">{baht.format(perUnitFromLot)}</td>
              </tr>
              <Line label="ค่าธรรมเนียมมาร์เก็ตเพลส (ต่อชิ้น)" value={cost.marketplace_fee} />
              <Line label="ค่าส่งในประเทศ (ต่อชิ้น)" value={cost.domestic_shipping} />
              <Line label="ค่าธรรมเนียม RSL (ต่อชิ้น)" value={cost.rsl_charge} />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black">
                <td className="py-3 font-semibold">ต้นทุนต่อหน่วย</td>
                <td className="py-3 text-right text-lg font-bold">
                  {baht.format(unitCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="grid grid-cols-2 gap-4 border-t py-4 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600">ราคาขายปัจจุบัน</span>
            <span>{baht.format(product.selling_price)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>กำไรต่อหน่วย</span>
            <span>{baht.format(margin)}</span>
          </div>
        </section>

        <footer className="border-t pt-3 text-[10px] text-neutral-600">
          สูตรคำนวณ: ((ราคาซื้อ × อัตราแลกเปลี่ยน) + ค่าขนส่งระหว่างประเทศ + ภาษีนำเข้า)
          ÷ จำนวนต่อล็อต + ค่าธรรมเนียมมาร์เก็ตเพลส + ค่าส่งในประเทศ + ค่าธรรมเนียม RSL
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
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td className="py-2">{label}</td>
      <td className="py-2 text-right">{baht.format(value)}</td>
    </tr>
  );
}
