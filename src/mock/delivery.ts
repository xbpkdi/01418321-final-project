import type { DeliveryStatus, FulfillSource } from "@/types/order";

/**
 * ข้อมูลผู้ให้บริการขนส่งตาม Q8A.1:
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
 * สถานะจากระบบติดตามของผู้ให้บริการขนส่งตาม Q8A.3:
 *   SELECT delivery_status, last_location, updated_at
 *   FROM carrier_tracking WHERE tracking_number=$1
 * หมายเลขที่ไม่มีในรายการถือว่ายังอยู่ระหว่างทาง
 */
export const MOCK_CARRIER_TRACKING: Record<
  string,
  { delivery_status: DeliveryStatus; last_location: string }
> = {
  "4418-2290-1102": {
    delivery_status: "in_transit",
    last_location: "新潟ベース",
  },
  // ที่อยู่ไม่ถูกต้อง — 8A ทางเลือก #2
  "4418-2290-1103": { delivery_status: "failed", last_location: "札幌ベース" },
  // ลูกค้าปฏิเสธรับ — 8A ทางเลือก #3 และ 7S ทางเลือก #2
  "4418-2290-1104": {
    delivery_status: "returned",
    last_location: "金沢ベース",
  },
  // ส่งถึงลูกค้าแล้ว หลัง 5S และ 7S เสร็จ (ORD-24166) — 8A, FR-004
  "4418-2290-1105": {
    delivery_status: "delivered",
    last_location: "横浜ベース",
  },
  // ส่งถึงลูกค้าก่อน 5S/7S เสร็จ (ORD-24165) — FR-005 Order ต้องรอจนกดส่งเลขติดตาม
  "4418-2290-1106": {
    delivery_status: "delivered",
    last_location: "仙台ベース",
  },
  // Order ที่ปิดแล้ว (ORD-23012, ORD-24168): ขนส่งยังตอบ delivered — FR-015 ต้องไม่ถูกเขียนทับ
  "4418-1001-0012": {
    delivery_status: "delivered",
    last_location: "東京ベース",
  },
  "4418-2290-0168": {
    delivery_status: "delivered",
    last_location: "高松ベース",
  },
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
 * รูปแบบใบปะสินค้าตาม Q9A.1 / Q6S.1 (shipping_rules)
 * max_items_per_parcel ใช้แยกพัสดุ (Multi-parcel) ตาม 6S และ 9A ทางเลือก #4
 * เลือกรูปแบบตามแหล่งที่จัดส่ง (fulfill_source ที่ 3S บันทึก):
 * - rsl: เลือกตามวิธีจัดส่ง วิธี "จัดส่งเอง" ไม่มีรูปแบบของ RSL
 *   ใช้ทดสอบ "ไม่พบรูปแบบใบปะสินค้าที่เหมาะสม"
 * - in_house: บริษัทจัดส่งเองจากคลังบริษัท ใช้รูปแบบของบริษัทรูปแบบเดียว
 *   ไม่ขึ้นกับวิธีจัดส่ง และไม่มีเลข RSL
 */
export const SHIPPING_RULES: {
  fulfill_source: FulfillSource;
  shipping_method: string;
  sales_channel: string;
  label_template: string;
  max_items_per_parcel: number;
}[] = [
  {
    fulfill_source: "rsl",
    shipping_method: "RSL ปกติ",
    sales_channel: "Rakuten Ichiba",
    label_template: "RSL-STD-A6",
    max_items_per_parcel: 5,
  },
  {
    fulfill_source: "rsl",
    shipping_method: "RSL ขนาดใหญ่",
    sales_channel: "Rakuten Ichiba",
    label_template: "RSL-LARGE-A5",
    max_items_per_parcel: 1,
  },
  {
    fulfill_source: "in_house",
    shipping_method: "จัดส่งเอง",
    sales_channel: "Rakuten Ichiba",
    label_template: "INHOUSE-YAMATO-A6",
    max_items_per_parcel: 5,
  },
];

export const SHIPPING_METHODS = ["RSL ปกติ", "RSL ขนาดใหญ่", "จัดส่งเอง"];

/** เลือกรูปแบบใบปะของ Order ตามแหล่งที่จัดส่ง (ดู SHIPPING_RULES) */
export function findLabelRule<
  R extends {
    fulfill_source: FulfillSource;
    shipping_method: string;
    sales_channel: string;
  },
>(
  rules: readonly R[],
  order: {
    fulfill_source: FulfillSource;
    shipping_method: string;
    sales_channel: string;
  },
): R | undefined {
  return rules.find(
    (r) =>
      r.fulfill_source === order.fulfill_source &&
      r.sales_channel === order.sales_channel &&
      (order.fulfill_source === "in_house" ||
        r.shipping_method === order.shipping_method),
  );
}

export function findShippingRule(
  shippingMethod: string,
  salesChannel: string,
  fulfillSource: FulfillSource,
) {
  return findLabelRule(SHIPPING_RULES, {
    fulfill_source: fulfillSource,
    shipping_method: shippingMethod,
    sales_channel: salesChannel,
  });
}
