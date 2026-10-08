import type { DeliveryStatus } from "@/types/order";

/**
 * ข้อมูลผู้ให้บริการขนส่งตาม Q8.1:
 *   SELECT tracking_number, carrier_name, pickup_date
 *   FROM delivery_partners WHERE order_id=$1
 */
export type DeliveryInfo = {
  order_id: string;
  tracking_number: string;
  carrier_name: string;
  pickup_date: string;
};

/** Order ที่ผู้ให้บริการขนส่งยังไม่ออกหมายเลขติดตาม — 8A ทางเลือก #1 */
const NOT_PICKED_UP = new Set(["ORD-24177"]);

/**
 * ผู้ให้บริการขนส่งออกหมายเลขให้ทุก Order ที่รับพัสดุแล้ว
 * หมายเลขคิดจาก order_id เพื่อให้ได้ค่าเดิมทุกครั้งที่ดึง
 */
export function findTracking(orderId: string): DeliveryInfo | undefined {
  if (NOT_PICKED_UP.has(orderId)) return undefined;
  const digits = orderId.replace(/\D/g, "").padStart(4, "0").slice(-4);
  return {
    order_id: orderId,
    tracking_number: `4418-2291-${digits}`,
    carrier_name: "Yamato Transport",
    pickup_date: new Date().toISOString().slice(0, 10),
  };
}

/**
 * สถานะจากระบบติดตามของผู้ให้บริการขนส่งตาม Q8.3:
 *   SELECT delivery_status, last_location, updated_at
 *   FROM carrier_tracking WHERE tracking_number=$1
 * หมายเลขที่ไม่มีในรายการถือว่ายังอยู่ระหว่างทาง
 */
export const MOCK_CARRIER_TRACKING: Record<
  string,
  { delivery_status: DeliveryStatus; last_location: string }
> = {
  "4418-2290-1102": { delivery_status: "in_transit", last_location: "新潟ベース" },
  // ที่อยู่ไม่ถูกต้อง — 8A ทางเลือก #2
  "4418-2290-1103": { delivery_status: "failed", last_location: "札幌ベース" },
  // ลูกค้าปฏิเสธรับ — 8A ทางเลือก #3 และ 7S ทางเลือก #2
  "4418-2290-1104": { delivery_status: "returned", last_location: "金沢ベース" },
};

export function trackCarrier(trackingNumber: string) {
  return (
    MOCK_CARRIER_TRACKING[trackingNumber] ?? {
      delivery_status: "in_transit" as DeliveryStatus,
      last_location: "羽田クロノゲート",
    }
  );
}

/**
 * รูปแบบใบปะสินค้าตาม Q6.1 / Q6S.1 (shipping_rules)
 * max_items_per_parcel ใช้แยกพัสดุ (Multi-parcel) ตาม 6S และ 9A ทางเลือก #4
 * วิธีจัดส่ง "จัดส่งเอง" ไม่มีรูปแบบ — ใช้ทดสอบ "ไม่พบรูปแบบใบปะสินค้าที่เหมาะสม"
 */
export const SHIPPING_RULES: {
  shipping_method: string;
  sales_channel: string;
  label_template: string;
  max_items_per_parcel: number;
}[] = [
  { shipping_method: "RSL ปกติ", sales_channel: "Rakuten Ichiba", label_template: "RSL-STD-A6", max_items_per_parcel: 5 },
  { shipping_method: "RSL ขนาดใหญ่", sales_channel: "Rakuten Ichiba", label_template: "RSL-LARGE-A5", max_items_per_parcel: 1 },
];

export const SHIPPING_METHODS = ["RSL ปกติ", "RSL ขนาดใหญ่", "จัดส่งเอง"];

export function findShippingRule(shippingMethod: string, salesChannel: string) {
  return SHIPPING_RULES.find(
    (r) => r.shipping_method === shippingMethod && r.sales_channel === salesChannel,
  );
}
