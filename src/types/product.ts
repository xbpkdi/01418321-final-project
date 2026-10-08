import type { SalesChannel } from "./order";

/**
 * รูปร่างตาม Q13.1 (ตาราง products) รวมกับกฎ SKU ที่ 2S ใช้จับคู่ (Q2S.1)
 * channel_sku คือรหัสสินค้าฝั่ง Rakuten ที่ map เข้ากับ SKU ภายใน (3A ทางเลือก #3)
 */
export type Product = {
  sku: string;
  product_name: string;
  variation: string;
  sales_channel: SalesChannel;
  channel_sku: string;
  supplier_id: string;
  reorder_threshold: number;
  reorder_qty: number;
  /** null = ยังไม่ระบุราคาขาย (ใช้กับ 5A "ไม่พบราคาขายของสินค้านี้") */
  selling_price: number | null;
  active: boolean;
};

/** ตาราง suppliers ตาม Q7.1 */
export type Supplier = {
  supplier_id: string;
  supplier_name: string;
  contact_info: string;
  lead_time: number;
};

/** รูปร่างตาม Q3.1 (ตาราง stock) */
export type StockLevel = {
  sku: string;
  in_house_qty: number;
  /** null เมื่อข้อมูลจาก RSL ขาดหาย ตาม 3S ทางเลือก #1 */
  rsl_qty: number | null;
  updated_at: string;
};

/**
 * รูปร่างตาม Q5.1 (ตาราง product_cost)
 * purchase_price คือราคาซื้อทั้งล็อต เพราะสูตร Q5.2 หารผลรวมด้วย order_qty
 * ค่า null คือองค์ประกอบที่ยังไม่เคยตั้งค่า (4S ทางเลือก #1)
 */
export type CostComponents = {
  sku: string;
  purchase_price: number | null;
  currency: string;
  exchange_rate: number | null;
  exchange_rate_updated_at: string | null;
  intl_freight: number | null;
  duty_fee: number | null;
  marketplace_fee: number | null;
  domestic_shipping: number | null;
  rsl_charge: number | null;
  order_qty: number | null;
};

export type CompleteCost = {
  [K in keyof CostComponents]: NonNullable<CostComponents[K]>;
};

export const COST_KEYS = [
  "purchase_price",
  "exchange_rate",
  "intl_freight",
  "duty_fee",
  "order_qty",
  "marketplace_fee",
  "domestic_shipping",
  "rsl_charge",
] as const;

export type CostKey = (typeof COST_KEYS)[number];

export function isCompleteCost(c: CostComponents): c is CompleteCost {
  return COST_KEYS.every((k) => c[k] !== null) && c.exchange_rate_updated_at !== null;
}

/** สูตรตาม Q5.2 */
export function calcUnitCost(c: Pick<CompleteCost, CostKey>): number {
  return (
    (c.purchase_price * c.exchange_rate + c.intl_freight + c.duty_fee) /
      c.order_qty +
    c.marketplace_fee +
    c.domestic_shipping +
    c.rsl_charge
  );
}

/** ประวัติการคำนวณตาม Q5.3 (cost_calculation_log) */
export type CostLog = {
  sku: string;
  unit_cost: number;
  components: Pick<CompleteCost, CostKey> & { currency: string };
  calculated_at: string;
  calculated_by: string;
};

/** ตาราง purchase_orders ตาม Q7.2 */
export type PurchaseOrder = {
  po_id: string;
  sku: string;
  supplier_id: string;
  order_qty: number;
  order_date: string;
  /** วันที่คาดว่าจะได้รับ คำนวณจาก lead_time */
  eta: string;
  status: "สั่งซื้อแล้ว" | "รอส่งคำสั่งซื้อ" | "ยกเลิกแล้ว";
};
