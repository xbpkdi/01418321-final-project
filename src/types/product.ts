import type { SalesChannel } from "./order";

/** รูปร่างตาม Q13.1 (ตาราง products) + กฎ SKU ที่ใช้จับคู่ */
export type Product = {
  sku: string;
  product_name: string;
  variation: string;
  sales_channel: SalesChannel;
  supplier_id: string;
  supplier_name: string;
  reorder_threshold: number;
  reorder_qty: number;
  selling_price: number;
  active: boolean;
};

/** รูปร่างตาม Q3.1 (ตาราง stock) — ยอดรวมคำนวณจาก in_house + rsl */
export type StockLevel = {
  sku: string;
  product_name: string;
  variation: string;
  in_house_qty: number;
  rsl_qty: number;
  reorder_threshold: number;
  /** true เมื่อดึงข้อมูลจาก RSL ไม่ได้ ตาม 3S ทางเลือก #1 และ #3 */
  incomplete: boolean;
};

/** รูปร่างตาม Q5.1 (ตาราง product_cost) */
export type CostComponents = {
  sku: string;
  purchase_price: number;
  currency: string;
  exchange_rate: number;
  intl_freight: number;
  duty_fee: number;
  marketplace_fee: number;
  domestic_shipping: number;
  rsl_charge: number;
  order_qty: number;
};

/** สูตรตาม Q5.2 */
export function calcUnitCost(c: CostComponents): number {
  return (
    (c.purchase_price * c.exchange_rate + c.intl_freight + c.duty_fee) /
      c.order_qty +
    c.marketplace_fee +
    c.domestic_shipping +
    c.rsl_charge
  );
}

/** ข้อมูลประกอบการตัดสินใจตาม Q5A.1 */
export type ReorderCandidate = {
  order_id: string;
  sku: string;
  product_name: string;
  variation: string;
  qty: number;
  unit_cost: number;
  /** null เมื่อไม่พบราคาขาย ตาม 5A ขั้นตอนที่ 2 */
  selling_price: number | null;
  reorder_qty: number;
  supplier_name: string;
  lead_time_days: number;
  /** true เมื่อมีคำสั่งซื้อ SKU นี้ค้างอยู่ ตาม 5A และ 6A ทางเลือก #4 */
  has_pending_po: boolean;
  pending_po_eta?: string;
};
