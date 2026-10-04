import type { OrderStatus } from "@/lib/order-status";

/** ช่องทางขายตาม biz-requirement ข้อ 1.3 */
export type SalesChannel = "Rakuten Ichiba" | "Yahoo! Auctions" | "Amazon";

/**
 * รูปร่างตรงกับผลลัพธ์ของ Q2A.1:
 *   SELECT order_id, marketplace_order_id, sales_channel, order_date, sku,
 *          variation, qty, shipping_address, shipping_method, order_status
 *   FROM orders WHERE order_id=$1
 */
export type Order = {
  order_id: string;
  marketplace_order_id: string;
  sales_channel: SalesChannel;
  order_date: string;
  sku: string;
  product_name: string;
  variation: string;
  qty: number;
  shipping_address: string;
  shipping_method: string;
  order_status: OrderStatus;
};

/** สถานะการเชื่อมต่อ Marketplace ตาม UC 4A ทางเลือก #1 */
export type ChannelConnection = {
  channel: SalesChannel;
  connected: boolean;
  last_sync: string;
};
