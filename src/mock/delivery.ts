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

export const MOCK_DELIVERY: DeliveryInfo[] = [
  {
    order_id: "ORD-24182",
    tracking_number: "JP-4418-2290-7731",
    carrier_name: "Yamato Transport",
    pickup_date: "2026-10-05",
  },
  // ORD-24183 ไม่มีข้อมูล ใช้ทดสอบเคส "ไม่พบหมายเลขติดตามพัสดุ"
];

export function findTracking(orderId: string): DeliveryInfo | undefined {
  return MOCK_DELIVERY.find((d) => d.order_id === orderId);
}

/** รูปแบบใบปะสินค้าตาม Q6.1 (shipping_rules) */
export const LABEL_TEMPLATES: Record<string, string> = {
  "RSL ปกติ": "RSL-STD-A6",
  "RSL ขนาดใหญ่": "RSL-LARGE-A5",
};
