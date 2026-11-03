import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type {
  DeliveryStatus,
  ManualReason,
  Order,
} from "@/types/order";
import type { OrderStatus } from "@/lib/order-status";

interface OrderReadRow extends QueryResultRow {
  order_id: string;
  marketplace_order_id: string;
  sales_channel: "Rakuten Ichiba";
  order_date: Date | string;
  shipping_address: string;
  shipping_method: string;
  order_status: OrderStatus;
  rsl_no: string | null;
  tracking_number: string | null;
  carrier_name: string | null;
  dispatched_at: Date | string | null;
  tracking_notified: boolean;
  tracking_notified_at: Date | string | null;
  cancel_reason: string | null;
  cancelled_at: Date | string | null;
  verified_at: Date | string | null;
  channel_sku: string | null;
  variation: string | null;
  qty: number | string | null;
  fulfill_source: "in_house" | "rsl" | null;
  stock_deducted: boolean | null;
  deducted_at: Date | string | null;
  sku_id: string | null;
  sku: string | null;
  product_name: string | null;
  selling_price: string | number | null;
  reorder_id: string | null;
  label_template: string | null;
  parcel_total: number | string | null;
  label_printed_at: Date | string | null;
  sync_status: "pending" | "synced" | null;
  notify_log: { by: string; at: string }[] | null;
}

// UC 2A / Q2A.1-Q2A.2: read the current order list and the detail fields
// used across Order, shipping, label, cleanup, and report screens.
export const Q2A_1 = `
  SELECT
    o.order_id,
    o.marketplace_order_id,
    o.sales_channel,
    o.order_date,
    o.shipping_address,
    o.shipping_method,
    o.order_status,
    o.rsl_no,
    o.tracking_number,
    o.carrier_name,
    o.dispatched_at,
    o.tracking_notified,
    o.tracking_notified_at,
    o.cancel_reason,
    o.cancelled_at,
    o.verified_at,
    item.channel_sku,
    item.variation,
    item.qty,
    item.fulfill_source,
    item.stock_deducted,
    item.deducted_at,
    item.sku_id,
    sku.sku,
    sku.product_name,
    sku.selling_price,
    reorder.reorder_id,
    label.label_template,
    label.parcel_total,
    label.label_printed_at,
    sync.sync_status,
    notification.notify_log
  FROM orders o
  LEFT JOIN LATERAL (
    SELECT oi.*
    FROM order_items oi
    WHERE oi.order_id = o.order_id
    ORDER BY oi.order_item_id
    LIMIT 1
  ) item ON TRUE
  LEFT JOIN skus sku ON sku.sku_id = item.sku_id
  LEFT JOIN stock stock_row ON stock_row.sku_id = sku.sku_id
  LEFT JOIN rakuten_stock_sync_states sync ON sync.stock_id = stock_row.stock_id
  LEFT JOIN LATERAL (
    SELECT r.reorder_id
    FROM reorders r
    WHERE r.order_id = o.order_id
    ORDER BY r.created_at DESC
    LIMIT 1
  ) reorder ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      MAX(l.label_template) AS label_template,
      MAX(l.parcel_total) AS parcel_total,
      MAX(l.printed_at) AS label_printed_at
    FROM labels l
    WHERE l.order_id = o.order_id
  ) label ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'by', COALESCE(t.admin_id, 'system'),
        'at', t.sent_at
      ) ORDER BY t.sent_at
    ) AS notify_log
    FROM tracking_notification_logs t
    WHERE t.order_id = o.order_id
  ) notification ON TRUE
  ORDER BY o.order_date DESC, o.order_id DESC
`;

function iso(value: Date | string | null): string | undefined {
  if (value === null) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function manualReason(row: OrderReadRow): ManualReason | undefined {
  if (row.order_status !== "รอดำเนินการด้วยตนเอง") return undefined;
  if (!row.shipping_address.trim()) return "address";
  if (!row.sku_id) return "sku-rule";
  if (row.selling_price === null) return "price";
  if (row.rsl_no && !row.label_template) return "template";
  return "rsl";
}

function deliveryStatus(status: OrderStatus): DeliveryStatus | undefined {
  if (status === "จัดส่งสำเร็จ") return "delivered";
  if (status === "จัดส่งไม่สำเร็จ") return "failed";
  if (status === "ตีกลับ/คืนสินค้า") return "returned";
  if (
    status === "อยู่ระหว่างจัดส่ง" ||
    status === "รอแจ้งเลขติดตาม" ||
    status === "แจ้งเลขติดตามแล้ว"
  ) {
    return "in_transit";
  }
  return undefined;
}

function toOrder(row: OrderReadRow): Order {
  return {
    order_id: row.order_id,
    marketplace_order_id: row.marketplace_order_id,
    sales_channel: row.sales_channel,
    order_date: iso(row.order_date)!,
    channel_sku: row.channel_sku ?? "",
    sku: row.sku ?? row.channel_sku ?? "",
    product_name: row.product_name ?? row.channel_sku ?? "—",
    variation: row.variation ?? "",
    qty: Number(row.qty ?? 0),
    shipping_address: row.shipping_address,
    shipping_method: row.shipping_method,
    order_status: row.order_status,
    fulfill_source: row.fulfill_source ?? "in_house",
    manual_reason: manualReason(row),
    rsl_reference_id: row.rsl_no ?? undefined,
    po_id: row.reorder_id ?? undefined,
    label_template: row.label_template ?? undefined,
    parcel_total:
      row.parcel_total === null ? undefined : Number(row.parcel_total),
    label_printed_at: iso(row.label_printed_at),
    tracking_number: row.tracking_number ?? undefined,
    carrier_name: row.carrier_name ?? undefined,
    dispatched_at: iso(row.dispatched_at),
    delivery_status: deliveryStatus(row.order_status),
    tracking_notified: row.tracking_notified,
    tracking_notified_at: iso(row.tracking_notified_at),
    notify_log: row.notify_log ?? undefined,
    stock_deducted: row.stock_deducted ?? false,
    deducted_at: iso(row.deducted_at),
    mp_stock_synced: row.sync_status !== "pending",
    cancel_reason: row.cancel_reason ?? undefined,
    cancelled_at: iso(row.cancelled_at),
    verified_at: iso(row.verified_at),
  };
}

export async function listOrders(
  executor: QueryExecutor = getPool(),
): Promise<Order[]> {
  const result = await executor.query<OrderReadRow>(Q2A_1);
  return result.rows.map(toOrder);
}
