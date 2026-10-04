// StockCheckScreen — UC 3S ตรวจสอบของสินค้าใน stock + RSL
// ข้อความและเกณฑ์ทั้งหมดมาจาก 00-use-case-descriptions.md

import { PageHeader } from "@/components/shared/page-header";
import { StockTable } from "./stock-table";
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

      <StockTable data={rows} />
    </div>
  );
}
