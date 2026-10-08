import type { Dict } from "@/lib/i18n/dict";
import type { ManualReason, Order } from "@/types/order";

/** หน้าที่ Admin ต้องไปแก้ ตามสาเหตุที่ Order ตกไปอยู่ "รอดำเนินการด้วยตนเอง" */
const HREF_BY_REASON: Record<ManualReason, string> = {
  incomplete: "/orders/verify",
  "sku-unregistered": "/products",
  "sku-rule": "/products",
  rsl: "/orders/rsl-match",
  template: "/shipping/label",
  address: "/shipping/label",
  price: "/products",
  supplier: "/products/reorder",
  "stock-deduct": "/products/stock",
};

/**
 * ข้อผิดพลาดหรือ action ที่ล้มเหลวของ Order หนึ่งรายการ (biz-requirement ข้อ 12)
 * คืน null ถ้า Order นี้ไม่มีอะไรต้องแก้
 */
export function issueOf(o: Order, t: Dict): { text: string; href: string } | null {
  if (o.order_status === "รอดำเนินการด้วยตนเอง" && o.manual_reason) {
    return { text: t.manualReason[o.manual_reason], href: HREF_BY_REASON[o.manual_reason] };
  }
  if (o.auto_error === "sku-db") return { text: t.auto.skuDb, href: "/products" };
  if (o.auto_error === "label-service") return { text: t.auto.labelService, href: "/shipping/label" };
  switch (o.order_status) {
    case "รอส่งคำสั่งซื้อ":
      return { text: t.reorder.errSendFailed, href: "/products/reorder" };
    case "รอส่งมอบ":
      return { text: t.shipping.errNoTracking, href: "/shipping" };
    case "รอแจ้งเลขติดตาม":
      return { text: t.shipping.errNotifyFailed, href: "/shipping" };
    case "จัดส่งไม่สำเร็จ":
      return { text: t.shipping.deliveryFailed(o.order_id), href: "/shipping" };
    case "ตีกลับ/คืนสินค้า":
      return { text: t.shipping.returned(o.order_id, 0), href: "/orders/cancel" };
    case "รอดำเนินการพิเศษ":
      return { text: t.cancel.errInTransit, href: "/orders/cancel" };
  }
  if (o.stock_deducted && o.mp_stock_synced === false) return { text: t.auto.stockSync, href: "/shipping" };
  if (o.customer_cancel_request && o.order_status !== "ยกเลิกแล้ว") {
    return { text: t.cancel.customerRequest, href: "/orders/cancel" };
  }
  return null;
}
