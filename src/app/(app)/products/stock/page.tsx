// StockCheckScreen — UC 3S ตรวจสอบของสินค้าใน stock + RSL
// ข้อความและเกณฑ์ทั้งหมดมาจาก 00-use-case-descriptions.md

import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MOCK_STOCK } from "@/mock/products";

export default function StockCheckScreen() {
  // ทางเลือก #2: เรียงรายการที่ต่ำกว่าเกณฑ์ไว้บนสุด
  const rows = [...MOCK_STOCK]
    .map((s) => ({
      ...s,
      total: s.in_house_qty + s.rsl_qty,
      low: s.in_house_qty + s.rsl_qty <= s.reorder_threshold,
    }))
    .sort((a, b) => Number(b.low) - Number(a.low));

  const incomplete = rows.filter((r) => r.incomplete);

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="ตรวจสอบสต๊อก"
        description="ยอดรวมคิดจากคลังบริษัทบวกกับคลัง RSL แล้วเทียบกับเกณฑ์เติมสต๊อกของแต่ละ SKU"
      />

      {incomplete.length > 0 && (
        <p
          role="alert"
          className="border-status-attention/30 bg-status-attention-bg text-status-attention rounded-lg border px-4 py-3 text-sm"
        >
          ข้อมูลสต๊อกไม่ครบถ้วน กรุณาตรวจสอบแหล่งข้อมูล ·{" "}
          {incomplete.map((r) => r.sku).join(", ")}
        </p>
      )}

      <section className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs">
            <tr>
              <th className="px-5 py-2.5 text-left font-medium">SKU</th>
              <th className="px-5 py-2.5 text-left font-medium">สินค้า</th>
              <th className="px-5 py-2.5 text-right font-medium">คลังบริษัท</th>
              <th className="px-5 py-2.5 text-right font-medium">คลัง RSL</th>
              <th className="px-5 py-2.5 text-right font-medium">รวม</th>
              <th className="hidden px-5 py-2.5 text-right font-medium sm:table-cell">
                เกณฑ์เติม
              </th>
              <th className="px-5 py-2.5 text-left font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((row) => (
              <tr key={row.sku} className="hover:bg-muted/60">
                <td className="px-5 py-3 font-medium">{row.sku}</td>
                <td className="px-5 py-3">
                  <p>{row.product_name}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.variation}
                  </p>
                </td>
                <td data-numeric className="px-5 py-3 text-right">
                  {row.in_house_qty}
                </td>
                <td data-numeric className="px-5 py-3 text-right">
                  {row.incomplete ? (
                    <span className="text-muted-foreground">ไม่พบข้อมูล</span>
                  ) : (
                    row.rsl_qty
                  )}
                </td>
                <td data-numeric className="px-5 py-3 text-right font-medium">
                  {row.total}
                </td>
                <td
                  data-numeric
                  className="text-muted-foreground hidden px-5 py-3 text-right sm:table-cell"
                >
                  {row.reorder_threshold}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={
                        row.low
                          ? "bg-status-cancelled-bg text-status-cancelled rounded-md px-2 py-0.5 text-xs font-medium"
                          : "bg-status-success-bg text-status-success rounded-md px-2 py-0.5 text-xs font-medium"
                      }
                    >
                      {row.low ? "สต๊อกต่ำกว่าเกณฑ์" : "สต๊อกปกติ"}
                    </span>
                    {row.incomplete && (
                      <span className="bg-status-attention-bg text-status-attention inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
                        <AlertTriangle className="size-3" />
                        ข้อมูลไม่สมบูรณ์
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
