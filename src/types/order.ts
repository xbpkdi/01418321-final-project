import type { OrderStatus } from "@/lib/order-status";

/**
 * ช่องทางขาย — เฟส 1 มีแค่ Rakuten Ichiba (biz-requirement ข้อ 3 และ 14)
 * เก็บเป็น type ไว้เพื่อให้เพิ่มช่องทางในเฟสถัดไปได้โดยไม่ต้องรื้อ
 */
export type SalesChannel = "Rakuten Ichiba";
export const SALES_CHANNEL: SalesChannel = "Rakuten Ichiba";

/** สาเหตุที่ Order ตกไปอยู่ "รอดำเนินการด้วยตนเอง" — ใช้บอกว่าต้องไปแก้ที่หน้าไหน */
export type ManualReason =
  | "incomplete" // 2A ข้อมูลไม่ครบ
  | "sku-unregistered" // 4A ทางเลือก #2
  | "sku-rule" // 2S ไม่พบกฎ SKU
  | "rsl" // 1S ไม่พบ SKU ใน RSL
  | "template" // 6S / 9A ไม่พบ Label Template
  | "address" // 6S ข้อมูลที่อยู่ไม่ครบ
  | "price" // 5A ไม่พบราคาขาย
  | "supplier" // 6A ไม่พบข้อมูล Supplier หรือจำนวนสั่งซื้อ
  | "stock-deduct"; // 7S ยอดสต๊อกไม่พอตัด

/** สถานะจากผู้ให้บริการขนส่ง (Q8.3 carrier_tracking.delivery_status) */
export type DeliveryStatus = "in_transit" | "delivered" | "failed" | "returned";

/** แหล่งที่จัดส่งสินค้า (Q7S.1 fulfill_source) */
export type FulfillSource = "in_house" | "rsl";

/**
 * รูปร่างหลักตาม Q2A.1:
 *   SELECT order_id, marketplace_order_id, sales_channel, order_date, sku,
 *          variation, qty, shipping_address, shipping_method, order_status
 *   FROM orders WHERE order_id=$1
 * บวกคอลัมน์ที่ UC อื่นเขียนลงตาราง orders (Q2S.2, Q4.2, Q5A.3, Q8.2, Q9.2, Q10.1, Q7S.5)
 */
export type Order = {
  order_id: string;
  marketplace_order_id: string;
  sales_channel: SalesChannel;
  order_date: string;
  /** รหัสหน้าร้านใน Rakuten — 2S ใช้ค่านี้ค้นกฎ SKU (Q2S.1) */
  channel_sku: string;
  /** SKU ที่ร้านกำหนดใน RMS — 4A ใช้เช็คว่าลงทะเบียนแล้วหรือยัง, 2S เขียนทับด้วย SKU ตามกฎ (Q2S.2) */
  sku: string;
  product_name: string;
  variation: string;
  qty: number;
  shipping_address: string;
  shipping_method: string;
  order_status: OrderStatus;

  manual_reason?: ManualReason;
  /** งานอัตโนมัติล้มเหลวเพราะระบบภายนอก รอ retry (เก็บไว้เพื่อแจ้งเตือนครั้งเดียว) */
  auto_error?: string;
  /** ลูกค้ากดยกเลิกที่ Rakuten (2A "ถูกยกเลิกจากฝั่งลูกค้า", 7A ทางเลือก #3) */
  customer_cancel_request?: boolean;
  verified_at?: string;
  edit_log?: { field: string; by: string; at: string }[];
  sku_rule_id?: string;
  rsl_reference_id?: string;
  /** 5A */
  decision?: "คุ้มค่า" | "ไม่คุ้มค่า";
  decided_qty?: number;
  /** 6A: คำสั่งซื้อเติมสต๊อกที่ผูกกับ Order นี้ (7A ทางเลือก #2) */
  po_id?: string;
  /** 6S / 9A */
  parcel_total?: number;
  label_template?: string;
  label_printed_at?: string;
  reprint_log?: { by: string; at: string }[];
  /** 8A */
  fulfill_source: FulfillSource;
  tracking_number?: string;
  carrier_name?: string;
  dispatched_at?: string;
  delivery_status?: DeliveryStatus;
  /** 5S */
  tracking_notified?: boolean;
  tracking_notified_at?: string;
  notify_log?: { by: string; at: string }[];
  /** 7S */
  stock_deducted?: boolean;
  mp_stock_synced?: boolean;
  /** 7A */
  cancel_reason?: string;
  cancelled_at?: string;
};

/** ผลการเชื่อมต่อ Rakuten RMS ตาม UC 4A ทางเลือก #1 */
export type ChannelConnection = {
  channel: SalesChannel;
  connected: boolean;
  last_sync: string;
};
