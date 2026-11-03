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
  manual_reason: ManualReason | null;
  rsl_no: string | null;
  tracking_number: string | null;
  carrier_name: string | null;
  dispatched_at: Date | string | null;
  delivery_status: DeliveryStatus | null;
  tracking_notified: boolean;
  tracking_notified_at: Date | string | null;
  cancel_reason: string | null;
  cancelled_at: Date | string | null;
  verified_at: Date | string | null;
  customer_cancel_requested: boolean;
  edit_log: { field: string; by: string; at: string }[] | null;
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
  reorder_decision: "คุ้มค่า" | "ไม่คุ้มค่า" | null;
  decided_qty: number | string | null;
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
    o.delivery_status,
    o.tracking_notified,
    o.tracking_notified_at,
    o.cancel_reason,
    o.cancelled_at,
    o.verified_at,
    o.manual_reason,
    o.customer_cancel_requested,
    o.edit_log,
    o.reorder_decision,
    o.decided_qty,
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
  if (row.manual_reason) return row.manual_reason;
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
    delivery_status: row.delivery_status ?? deliveryStatus(row.order_status),
    tracking_notified: row.tracking_notified,
    tracking_notified_at: iso(row.tracking_notified_at),
    notify_log: row.notify_log ?? undefined,
    stock_deducted: row.stock_deducted ?? false,
    deducted_at: iso(row.deducted_at),
    mp_stock_synced: row.sync_status !== "pending",
    cancel_reason: row.cancel_reason ?? undefined,
    cancelled_at: iso(row.cancelled_at),
    verified_at: iso(row.verified_at),
    customer_cancel_request: row.customer_cancel_requested,
    edit_log: row.edit_log ?? undefined,
    decision: row.reorder_decision ?? undefined,
    decided_qty: row.decided_qty === null ? undefined : Number(row.decided_qty),
  };
}

export async function listOrders(
  executor: QueryExecutor = getPool(),
): Promise<Order[]> {
  const result = await executor.query<OrderReadRow>(Q2A_1);
  return result.rows.map(toOrder);
}

export interface OrderWorkflowRow extends QueryResultRow {
  order_id: string;
  marketplace_order_id: string;
  sales_channel: "Rakuten Ichiba";
  order_status: OrderStatus;
  manual_reason: ManualReason | null;
  shipping_address: string;
  shipping_method: string;
  cancelled_at: Date | string | null;
  customer_cancel_requested: boolean;
  channel_sku: string;
  variation: string;
  qty: number;
  fulfill_source: "in_house" | "rsl";
  stock_deducted: boolean;
  sku_id: string | null;
  sku: string | null;
  label_printed: boolean;
  reorder_id: string | null;
  reorder_status: string | null;
}

export interface SkuRuleRow extends QueryResultRow {
  sku_id: string;
  sku: string;
  product_name: string;
  variation: string;
}

// UC 4A / Q4A.1: insert one valid marketplace order and its first item
// atomically. marketplace_order_id is the concurrency-safe deduplication key.
export const Q4A_1 = `
  WITH inserted_order AS (
    INSERT INTO orders (
      order_id, marketplace_order_id, sales_channel, order_date,
      shipping_address, shipping_method, order_status, manual_reason,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (marketplace_order_id) DO NOTHING
    RETURNING order_id
  ), inserted_item AS (
    INSERT INTO order_items (
      order_item_id, channel_sku, variation, qty, fulfill_source,
      order_id, sku_id
    )
    SELECT $9, $10, $11, $12, $13, order_id, $14
    FROM inserted_order
    RETURNING order_id
  )
  SELECT order_id FROM inserted_order
`;

export async function insertImportedOrder(
  executor: QueryExecutor,
  input: {
    orderId: string;
    marketplaceOrderId: string;
    salesChannel: "Rakuten Ichiba";
    orderDate: string;
    shippingAddress: string;
    shippingMethod: string;
    status: OrderStatus;
    manualReason: ManualReason | null;
    orderItemId: string;
    channelSku: string;
    variation: string;
    quantity: number;
    fulfillSource: "in_house" | "rsl";
    skuId: string | null;
  },
): Promise<boolean> {
  const result = await executor.query<{ order_id: string }>(Q4A_1, [
    input.orderId,
    input.marketplaceOrderId,
    input.salesChannel,
    input.orderDate,
    input.shippingAddress,
    input.shippingMethod,
    input.status,
    input.manualReason,
    input.orderItemId,
    input.channelSku,
    input.variation,
    input.quantity,
    input.fulfillSource,
    input.skuId,
  ]);
  return result.rowCount === 1;
}

// UC 4A alternative #3 / Q4A.1: persist customer cancellation notices that
// arrive in the same marketplace batch as new orders.
export const Q4A_1_MARK_CANCELLATION = `
  UPDATE orders
  SET customer_cancel_requested = TRUE, updated_at = CURRENT_TIMESTAMP
  WHERE marketplace_order_id = $1
    AND order_status NOT IN ('จัดส่งสำเร็จ', 'ยกเลิกแล้ว')
  RETURNING order_id, order_status
`;

export async function markMarketplaceCancellation(
  executor: QueryExecutor,
  marketplaceOrderId: string,
): Promise<{ orderId: string; status: OrderStatus } | null> {
  const result = await executor.query<{
    order_id: string;
    order_status: OrderStatus;
  }>(Q4A_1_MARK_CANCELLATION, [marketplaceOrderId]);
  const row = result.rows[0];
  return row ? { orderId: row.order_id, status: row.order_status } : null;
}

// UC 2S / Q2S.1: resolve the marketplace channel SKU to an active SKU rule.
export const Q2S_1 = `
  SELECT sku_id, sku, product_name, variation
  FROM skus
  WHERE channel_sku = $1 AND sales_channel = $2 AND sku_status = 'active'
  ORDER BY sku_id
`;

export async function findSkuRules(
  executor: QueryExecutor,
  channelSku: string,
  salesChannel: "Rakuten Ichiba",
): Promise<SkuRuleRow[]> {
  const result = await executor.query<SkuRuleRow>(Q2S_1, [
    channelSku,
    salesChannel,
  ]);
  return result.rows;
}

// UC 2A / Q2A.1: lock the authoritative order header before a mutation.
export const Q2A_1_FOR_UPDATE = `
  SELECT
    o.order_id, o.marketplace_order_id, o.sales_channel, o.order_status,
    o.manual_reason,
    o.shipping_address, o.shipping_method, o.cancelled_at,
    o.customer_cancel_requested, item.channel_sku, item.variation, item.qty,
    item.fulfill_source, item.stock_deducted, item.sku_id, sku.sku,
    EXISTS (
      SELECT 1 FROM labels l
      WHERE l.order_id = o.order_id AND l.printed_at IS NOT NULL
    ) AS label_printed,
    reorder.reorder_id, reorder.reorder_status
  FROM orders o
  INNER JOIN LATERAL (
    SELECT oi.* FROM order_items oi
    WHERE oi.order_id = o.order_id
    ORDER BY oi.order_item_id LIMIT 1
  ) item ON TRUE
  LEFT JOIN skus sku ON sku.sku_id = item.sku_id
  LEFT JOIN LATERAL (
    SELECT r.reorder_id, r.reorder_status
    FROM reorders r
    WHERE r.order_id = o.order_id
    ORDER BY r.created_at DESC LIMIT 1
  ) reorder ON TRUE
  WHERE o.order_id = $1
  FOR UPDATE OF o
`;

export async function lockOrder(
  executor: QueryExecutor,
  orderId: string,
): Promise<OrderWorkflowRow | null> {
  const result = await executor.query<OrderWorkflowRow>(Q2A_1_FOR_UPDATE, [
    orderId,
  ]);
  return result.rows[0] ?? null;
}

// UC 2A / Q2A.2: save the latest marketplace fields, the allowed Admin edit,
// verification time, and the next workflow state in one statement.
export const Q2A_2 = `
  WITH updated_item AS (
    UPDATE order_items
    SET channel_sku = $2, variation = $3, qty = $4
    WHERE order_id = $1
  )
  UPDATE orders
  SET shipping_address = $5,
      shipping_method = $6,
      order_status = $7,
      manual_reason = $8,
      customer_cancel_requested = $9,
      verified_at = $10,
      edit_log = CASE
        WHEN $11::boolean THEN edit_log || jsonb_build_array(
          jsonb_build_object('field', 'shipping_method', 'by', $12::text, 'at', $10::timestamptz)
        )
        ELSE edit_log
      END,
      cancel_reason = $13,
      cancelled_at = $14,
      updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1
`;

export async function saveVerifiedOrder(
  executor: QueryExecutor,
  input: {
    orderId: string;
    channelSku: string;
    variation: string;
    quantity: number;
    shippingAddress: string;
    shippingMethod: string;
    status: OrderStatus;
    manualReason: ManualReason | null;
    customerCancelRequested: boolean;
    verifiedAt: Date | null;
    shippingMethodChanged: boolean;
    adminId: string;
    cancelReason: string | null;
    cancelledAt: Date | null;
  },
): Promise<void> {
  await executor.query(Q2A_2, [
    input.orderId,
    input.channelSku,
    input.variation,
    input.quantity,
    input.shippingAddress,
    input.shippingMethod,
    input.status,
    input.manualReason,
    input.customerCancelRequested,
    input.verifiedAt,
    input.shippingMethodChanged,
    input.adminId,
    input.cancelReason,
    input.cancelledAt,
  ]);
}

// UC 2S / Q2S.2-Q2S.3: persist a unique SKU match or its manual exception.
export const Q2S_2 = `
  WITH matched_item AS (
    UPDATE order_items SET sku_id = $2 WHERE order_id = $1
  )
  UPDATE orders
  SET order_status = $3, manual_reason = $4, updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1 AND order_status = 'รอจับคู่กฎ SKU'
`;

export async function saveSkuMatch(
  executor: QueryExecutor,
  orderId: string,
  skuId: string | null,
  status: OrderStatus,
  manualReason: ManualReason | null,
): Promise<void> {
  await executor.query(Q2S_2, [orderId, skuId, status, manualReason]);
}

// UC 1S / Q1S.1: persist a selected RSL reference and advance to label work.
export const Q1S_1 = `
  UPDATE orders
  SET rsl_no = $2,
      rsl_matched_at = CASE WHEN $2::text IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,
      order_status = $3,
      manual_reason = $4,
      updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1
`;

export async function saveRslMatch(
  executor: QueryExecutor,
  orderId: string,
  reference: string | null,
  status: OrderStatus,
  manualReason: ManualReason | null,
): Promise<void> {
  await executor.query(Q1S_1, [orderId, reference, status, manualReason]);
}

// UC 1S / Q1S.1: list work that can be matched automatically or retried.
export const Q1S_1_QUEUE = `
  SELECT o.order_id
  FROM orders o
  WHERE o.order_status = 'ยังไม่ได้จับคู่'
     OR (o.order_status = 'รอดำเนินการด้วยตนเอง' AND o.manual_reason = 'rsl')
  ORDER BY o.order_date, o.order_id
`;

export async function listRslQueueIds(
  executor: QueryExecutor = getPool(),
): Promise<string[]> {
  const result = await executor.query<{ order_id: string }>(Q1S_1_QUEUE);
  return result.rows.map((row) => row.order_id);
}

// UC 1S alternative #3 / Q1S.1: clear the RSL link and generated labels.
export const Q1S_1_UNMATCH = `
  WITH eligible AS (
    SELECT order_id FROM orders
    WHERE order_id = $1
      AND (
        order_status IN ('รอจัดรูปแบบใบปะสินค้า', 'รอพิมพ์ใบปะสินค้า')
        OR (order_status = 'รอดำเนินการด้วยตนเอง' AND rsl_no IS NOT NULL)
      )
  ), removed_labels AS (
    DELETE FROM labels WHERE order_id IN (SELECT order_id FROM eligible)
  )
  UPDATE orders
  SET rsl_no = NULL, rsl_matched_at = NULL, order_status = 'ยังไม่ได้จับคู่',
      manual_reason = NULL, updated_at = CURRENT_TIMESTAMP
  WHERE order_id IN (SELECT order_id FROM eligible)
  RETURNING order_id
`;

export async function clearRslMatch(
  executor: QueryExecutor,
  orderId: string,
): Promise<boolean> {
  const result = await executor.query<{ order_id: string }>(Q1S_1_UNMATCH, [
    orderId,
  ]);
  return result.rowCount === 1;
}

// UC 7A / Q7A.1: persist the cancellation result or special handling request.
export const Q7A_1 = `
  UPDATE orders
  SET order_status = $2, cancel_reason = $3, cancelled_at = $4,
      manual_reason = NULL, updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1
`;

export async function saveCancellation(
  executor: QueryExecutor,
  orderId: string,
  status: OrderStatus,
  reason: string,
  cancelledAt: Date | null,
): Promise<void> {
  await executor.query(Q7A_1, [orderId, status, reason, cancelledAt]);
}

// UC 7A alternative #2 / Q7A.1: cancel the linked replenishment on request.
export const Q7A_1_CANCEL_REORDER = `
  UPDATE reorders
  SET reorder_status = 'ยกเลิกแล้ว'
  WHERE reorder_id = $1 AND reorder_status <> 'ยกเลิกแล้ว'
  RETURNING reorder_id
`;

export async function cancelLinkedReorder(
  executor: QueryExecutor,
  reorderId: string,
): Promise<boolean> {
  const result = await executor.query<{ reorder_id: string }>(
    Q7A_1_CANCEL_REORDER,
    [reorderId],
  );
  return result.rowCount === 1;
}
