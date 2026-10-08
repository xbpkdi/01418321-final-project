/**
 * ค่าสถานะทั้งหมดของ Order — ลอกมาจาก 00-use-case-descriptions.md ตรงตัว
 * ห้ามเพิ่ม/แก้คำเอง ถ้าต้องเปลี่ยนให้แก้ที่ use case description ก่อน
 */
export const ORDER_STATUSES = [
  "รอตรวจสอบคำสั่งซื้อ",
  "รอจับคู่กฎ SKU",
  "รอตรวจสอบสต๊อก",
  "รอ Admin ตัดสินใจสั่งซื้อ",
  "รอสั่งซื้อจาก Supplier",
  "สั่งซื้อแล้ว",
  "ยังไม่ได้จับคู่",
  "รอจัดรูปแบบใบปะสินค้า",
  "รอพิมพ์ใบปะสินค้า",
  "พิมพ์ใบปะสินค้าแล้ว",
  "รอส่งคำสั่งซื้อ",
  "รอส่งมอบ",
  "อยู่ระหว่างจัดส่ง",
  "รอแจ้งเลขติดตาม",
  "แจ้งเลขติดตามแล้ว",
  "จัดส่งสำเร็จ",
  "จัดส่งไม่สำเร็จ",
  "ตีกลับ/คืนสินค้า",
  "รอยกเลิก Order",
  "ยกเลิกแล้ว",
  "รอดำเนินการด้วยตนเอง",
  "รอดำเนินการพิเศษ",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** กลุ่มสีของ badge ตาม ui-design-brief.md ข้อ 4 */
export type StatusTone =
  "waiting" | "progress" | "success" | "attention" | "cancelled";

const TONE_BY_STATUS: Record<OrderStatus, StatusTone> = {
  รอตรวจสอบคำสั่งซื้อ: "waiting",
  "รอจับคู่กฎ SKU": "waiting",
  รอตรวจสอบสต๊อก: "waiting",
  "รอ Admin ตัดสินใจสั่งซื้อ": "waiting",
  "รอสั่งซื้อจาก Supplier": "waiting",
  รอจัดรูปแบบใบปะสินค้า: "waiting",
  รอพิมพ์ใบปะสินค้า: "waiting",
  รอส่งคำสั่งซื้อ: "waiting",
  รอส่งมอบ: "waiting",
  ยังไม่ได้จับคู่: "waiting",
  รอแจ้งเลขติดตาม: "waiting",
  แจ้งเลขติดตามแล้ว: "progress",
  สั่งซื้อแล้ว: "progress",
  พิมพ์ใบปะสินค้าแล้ว: "progress",
  อยู่ระหว่างจัดส่ง: "progress",
  จัดส่งสำเร็จ: "success",
  รอดำเนินการด้วยตนเอง: "attention",
  รอดำเนินการพิเศษ: "attention",
  จัดส่งไม่สำเร็จ: "attention",
  "ตีกลับ/คืนสินค้า": "attention",
  "รอยกเลิก Order": "cancelled",
  ยกเลิกแล้ว: "cancelled",
};

export function toneOf(status: OrderStatus): StatusTone {
  return TONE_BY_STATUS[status];
}
