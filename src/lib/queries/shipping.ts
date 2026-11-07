import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { GeneratedLabel, LabelOrder } from "@/lib/adapters/contracts";
import type { DeliveryStatus } from "@/types/order";
import type { OrderStatus } from "@/lib/order-status";

export interface LabelReadModel extends QueryResultRow {
  order_id: string;
  label_template: string;
  parcel_total: number;
  printed_at: Date | string | null;
}

// UC 9A / Q9A.1: read the persisted labels used by the print queue/report.
export const Q9A_1 = `
  SELECT order_id, MAX(label_template) AS label_template,
         MAX(parcel_total)::integer AS parcel_total,
         MAX(printed_at) AS printed_at
  FROM labels GROUP BY order_id ORDER BY order_id
`;

export async function listLabels(
  executor: QueryExecutor = getPool(),
): Promise<LabelReadModel[]> {
  return (await executor.query<LabelReadModel>(Q9A_1)).rows;
}

export interface LabelOrderRow extends QueryResultRow {
  order_id: string;
  sales_channel: "Rakuten Ichiba";
  rsl_no: string | null;
  shipping_address: string;
  shipping_method: string;
  qty: number;
  fulfill_source: "in_house" | "rsl";
  order_status: OrderStatus;
}

// UC 6S / Q6S.1: load work waiting for automatic label generation.
export const Q6S_1 = `
  SELECT o.order_id, o.sales_channel, o.rsl_no, o.shipping_address,
         o.shipping_method, item.qty, item.fulfill_source, o.order_status
  FROM orders o
  INNER JOIN LATERAL (
    SELECT qty, fulfill_source FROM order_items
    WHERE order_id = o.order_id ORDER BY order_item_id LIMIT 1
  ) item ON TRUE
  WHERE o.order_status = 'รอจัดรูปแบบใบปะสินค้า'
  ORDER BY o.order_date, o.order_id
`;

export async function listPendingLabelOrders(
  executor: QueryExecutor = getPool(),
): Promise<LabelOrderRow[]> {
  return (await executor.query<LabelOrderRow>(Q6S_1)).rows;
}

export function toLabelOrder(row: LabelOrderRow): LabelOrder {
  return {
    order_id: row.order_id,
    sales_channel: row.sales_channel,
    rsl_reference_id: row.rsl_no ?? undefined,
    shipping_address: row.shipping_address,
    shipping_method: row.shipping_method,
    qty: Number(row.qty),
    fulfill_source: row.fulfill_source,
  };
}

// UC 6S / Q6S.2: persist generated parcels once and advance the Order.
export const Q6S_2_INSERT = `
  INSERT INTO labels (
    label_id, label_template, rsl_no, parcel_seq, parcel_total,
    label_status, created_at, order_id
  )
  SELECT $1, $2, $3, $4, $5, 'ready', CURRENT_TIMESTAMP, o.order_id
  FROM orders o
  WHERE o.order_id = $6 AND o.order_status = 'รอจัดรูปแบบใบปะสินค้า'
  ON CONFLICT (order_id, parcel_seq) DO NOTHING
`;

export const Q6S_2_ADVANCE = `
  UPDATE orders
  SET order_status = 'รอพิมพ์ใบปะสินค้า', manual_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1 AND order_status = 'รอจัดรูปแบบใบปะสินค้า'
    AND EXISTS (SELECT 1 FROM labels WHERE order_id = $1)
`;

export async function saveGeneratedLabels(
  executor: QueryExecutor,
  orderId: string,
  labels: readonly GeneratedLabel[],
): Promise<boolean> {
  for (const label of labels) {
    await executor.query(Q6S_2_INSERT, [
      `${orderId}-LABEL-${label.parcel_seq}`,
      label.label_template,
      label.rsl_no || null,
      label.parcel_seq,
      label.parcel_total,
      orderId,
    ]);
  }
  return (await executor.query(Q6S_2_ADVANCE, [orderId])).rowCount === 1;
}

export const Q6S_2_MANUAL = `
  UPDATE orders
  SET order_status = 'รอดำเนินการด้วยตนเอง', manual_reason = $2,
      updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1 AND order_status = 'รอจัดรูปแบบใบปะสินค้า'
`;

export async function markLabelManual(
  executor: QueryExecutor,
  orderId: string,
  reason: "address" | "template",
): Promise<void> {
  await executor.query(Q6S_2_MANUAL, [orderId, reason]);
}

export const Q6S_2_ERROR = `
  INSERT INTO auto_error_logs (
    auto_error_log_id, use_case_id, context_key, error_code, safe_message
  ) VALUES ($1, '6S', $2, $3, 'Label service could not generate labels')
`;

export async function recordLabelServiceError(
  executor: QueryExecutor,
  input: { logId: string; orderId: string; errorCode: string },
): Promise<void> {
  await executor.query(Q6S_2_ERROR, [input.logId, input.orderId, input.errorCode]);
}

export interface PrintLabelRow extends QueryResultRow, GeneratedLabel {
  label_id: string;
  order_id: string;
  order_status: OrderStatus;
  shipping_address: string;
  shipping_method: string;
}

export const Q9A_1_PRINT = `
  SELECT l.label_id, l.order_id, l.label_template, l.rsl_no,
         l.parcel_seq, l.parcel_total, o.order_status,
         o.shipping_address, o.shipping_method
  FROM labels l INNER JOIN orders o ON o.order_id = l.order_id
  WHERE l.order_id = $1 ORDER BY l.parcel_seq
`;

export async function listPrintableLabels(
  executor: QueryExecutor,
  orderId: string,
): Promise<PrintLabelRow[]> {
  return (await executor.query<PrintLabelRow>(Q9A_1_PRINT, [orderId])).rows;
}

export const Q9A_2_HISTORY = `
  INSERT INTO label_print_history (
    label_print_history_id, print_attempt_id, label_id, admin_id,
    is_reprint, outcome, error_code
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (print_attempt_id, label_id) DO NOTHING
`;

export const Q9A_2_COMPLETE = `
  WITH updated_labels AS (
    UPDATE labels SET label_status = 'printed', printed_at = CURRENT_TIMESTAMP
    WHERE order_id = $1
  )
  UPDATE orders
  SET order_status = 'พิมพ์ใบปะสินค้าแล้ว', updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1 AND order_status = 'รอพิมพ์ใบปะสินค้า'
`;

export async function recordPrintAttempt(
  executor: QueryExecutor,
  input: {
    historyId: string;
    attemptId: string;
    labelId: string;
    adminId: string;
    reprint: boolean;
    outcome: "printed" | "failed";
    errorCode: string | null;
  },
): Promise<void> {
  await executor.query(Q9A_2_HISTORY, [
    input.historyId, input.attemptId, input.labelId, input.adminId,
    input.reprint, input.outcome, input.errorCode,
  ]);
}

export async function completeLabelPrint(
  executor: QueryExecutor,
  orderId: string,
): Promise<void> {
  await executor.query(Q9A_2_COMPLETE, [orderId]);
}

export interface DispatchRow extends QueryResultRow {
  order_id: string;
  order_status: OrderStatus;
  tracking_number: string | null;
  carrier_name: string | null;
  delivery_status: DeliveryStatus | null;
  labels_printed: boolean;
}

export const Q8A_1 = `
  SELECT o.order_id, o.order_status, o.tracking_number, o.carrier_name,
         o.delivery_status,
         EXISTS (SELECT 1 FROM labels l WHERE l.order_id = o.order_id)
         AND NOT EXISTS (
           SELECT 1 FROM labels l
           WHERE l.order_id = o.order_id AND l.printed_at IS NULL
         ) AS labels_printed
  FROM orders o WHERE o.order_id = $1 FOR UPDATE OF o
`;

export async function lockDispatchOrder(
  executor: QueryExecutor,
  orderId: string,
): Promise<DispatchRow | null> {
  return (await executor.query<DispatchRow>(Q8A_1, [orderId])).rows[0] ?? null;
}

export const Q8A_1_SAVE = `
  UPDATE orders
  SET tracking_number = $2, carrier_name = $3,
      dispatched_at = CURRENT_TIMESTAMP, delivery_status = 'in_transit',
      tracking_notified = FALSE, tracking_notified_at = NULL,
      order_status = 'อยู่ระหว่างจัดส่ง', updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1
    AND order_status IN ('พิมพ์ใบปะสินค้าแล้ว', 'รอส่งมอบ')
`;

export const Q8A_1_WAIT = `
  UPDATE orders SET order_status = 'รอส่งมอบ', updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1 AND order_status = 'พิมพ์ใบปะสินค้าแล้ว'
`;

export async function saveDispatch(
  executor: QueryExecutor,
  input: { orderId: string; trackingNumber: string; carrierName: string },
): Promise<void> {
  await executor.query(Q8A_1_SAVE, [input.orderId, input.trackingNumber, input.carrierName]);
}

export async function markAwaitingCarrier(
  executor: QueryExecutor,
  orderId: string,
): Promise<void> {
  await executor.query(Q8A_1_WAIT, [orderId]);
}

export interface CarrierPollRow extends QueryResultRow {
  order_id: string;
  order_status: OrderStatus;
  tracking_number: string;
  delivery_status: DeliveryStatus | null;
  tracking_notified: boolean;
  stock_deducted: boolean;
  sku_id: string | null;
  fulfill_source: "in_house" | "rsl";
  qty: number;
}

export const Q8A_1_POLL = `
  SELECT o.order_id, o.order_status, o.tracking_number, o.delivery_status,
         o.tracking_notified, item.stock_deducted, item.sku_id,
         item.fulfill_source, item.qty
  FROM orders o
  INNER JOIN LATERAL (
    SELECT * FROM order_items WHERE order_id = o.order_id
    ORDER BY order_item_id LIMIT 1
  ) item ON TRUE
  WHERE o.tracking_number IS NOT NULL
    AND o.order_status IN (
      'อยู่ระหว่างจัดส่ง', 'รอแจ้งเลขติดตาม', 'แจ้งเลขติดตามแล้ว',
      'จัดส่งสำเร็จ', 'รอดำเนินการพิเศษ'
    )
  ORDER BY o.order_id
`;

export async function listCarrierPollOrders(
  executor: QueryExecutor = getPool(),
): Promise<CarrierPollRow[]> {
  return (await executor.query<CarrierPollRow>(Q8A_1_POLL)).rows;
}

export const Q8A_1_STATUS = `
  UPDATE orders
  SET delivery_status = $2,
      order_status = CASE
        WHEN $2 = 'failed' THEN 'จัดส่งไม่สำเร็จ'
        WHEN $2 = 'returned' THEN 'ตีกลับ/คืนสินค้า'
        WHEN $2 = 'delivered' AND tracking_notified = TRUE
          AND EXISTS (SELECT 1 FROM order_items WHERE order_id = $1)
          AND NOT EXISTS (
            SELECT 1 FROM order_items
            WHERE order_id = $1 AND stock_deducted = FALSE
          ) THEN 'จัดส่งสำเร็จ'
        ELSE order_status
      END,
      updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1
    AND (delivery_status IS DISTINCT FROM 'delivered' OR $2 <> 'in_transit')
`;

export async function saveCarrierStatus(
  executor: QueryExecutor,
  orderId: string,
  status: DeliveryStatus,
): Promise<void> {
  await executor.query(Q8A_1_STATUS, [orderId, status]);
}

export interface NotificationRow extends QueryResultRow {
  order_id: string;
  order_status: OrderStatus;
  marketplace_order_id: string;
  tracking_number: string | null;
  carrier_name: string | null;
  tracking_notified: boolean;
  delivery_status: DeliveryStatus | null;
}

// UC 8A / Q8A.1: the carrier already confirmed delivery and 7S has now
// deducted stock, so close the Order. This is the only place besides the
// carrier poll that sets "จัดส่งสำเร็จ" (7S itself never does).
export const Q8A_1_DELIVERED = `
  UPDATE orders
  SET order_status = 'จัดส่งสำเร็จ', manual_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1
    AND order_status = 'แจ้งเลขติดตามแล้ว'
    AND tracking_notified = TRUE
    AND delivery_status = 'delivered'
    AND EXISTS (SELECT 1 FROM order_items WHERE order_id = $1)
    AND NOT EXISTS (
      SELECT 1 FROM order_items
      WHERE order_id = $1 AND stock_deducted = FALSE
    )
`;

export async function completeDeliveredOrder(
  executor: QueryExecutor,
  orderId: string,
): Promise<void> {
  await executor.query(Q8A_1_DELIVERED, [orderId]);
}

export const Q5S_1 = `
  SELECT order_id, order_status, marketplace_order_id, tracking_number,
         carrier_name, tracking_notified, delivery_status
  FROM orders WHERE order_id = $1 FOR UPDATE
`;

export async function lockNotificationOrder(
  executor: QueryExecutor,
  orderId: string,
): Promise<NotificationRow | null> {
  return (await executor.query<NotificationRow>(Q5S_1, [orderId])).rows[0] ?? null;
}

export const Q5S_1_RETRY = `
  SELECT attempt_id FROM tracking_notification_logs
  WHERE order_id = $1 AND tracking_number = $2
    AND outcome IN ('pending', 'failed')
  ORDER BY sent_at DESC LIMIT 1
`;

export async function findRetryableNotificationAttempt(
  executor: QueryExecutor,
  orderId: string,
  trackingNumber: string,
): Promise<string | null> {
  const row = (await executor.query<{ attempt_id: string }>(Q5S_1_RETRY, [orderId, trackingNumber])).rows[0];
  return row?.attempt_id ?? null;
}

export const Q5S_1_ATTEMPT = `
  INSERT INTO tracking_notification_logs (
    tracking_notification_log_id, attempt_id, order_id, tracking_number,
    outcome, sent_at, admin_id, error_code
  ) VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP, $5, NULL)
  ON CONFLICT (attempt_id) DO UPDATE SET
    outcome = 'pending', sent_at = CURRENT_TIMESTAMP,
    admin_id = EXCLUDED.admin_id, error_code = NULL
`;

export async function saveNotificationAttempt(
  executor: QueryExecutor,
  input: { logId: string; attemptId: string; orderId: string; trackingNumber: string; adminId: string },
): Promise<void> {
  await executor.query(Q5S_1_ATTEMPT, [input.logId, input.attemptId, input.orderId, input.trackingNumber, input.adminId]);
}

export const Q5S_2 = `
  WITH finished AS (
    UPDATE tracking_notification_logs
    SET outcome = $2, error_code = $3, sent_at = CURRENT_TIMESTAMP
    WHERE attempt_id = $1 RETURNING order_id
  )
  UPDATE orders o
  SET tracking_notified = CASE WHEN $2 = 'sent' THEN TRUE ELSE tracking_notified END,
      tracking_notified_at = CASE WHEN $2 = 'sent' THEN CURRENT_TIMESTAMP ELSE tracking_notified_at END,
      order_status = CASE
        WHEN $2 <> 'sent' AND tracking_notified = FALSE THEN 'รอแจ้งเลขติดตาม'
        WHEN $2 = 'sent' AND delivery_status = 'delivered'
          AND EXISTS (SELECT 1 FROM order_items WHERE order_id = o.order_id)
          AND NOT EXISTS (
            SELECT 1 FROM order_items
            WHERE order_id = o.order_id AND stock_deducted = FALSE
          ) THEN 'จัดส่งสำเร็จ'
        WHEN $2 = 'sent' AND tracking_notified = FALSE THEN 'แจ้งเลขติดตามแล้ว'
        ELSE order_status
      END,
      updated_at = CURRENT_TIMESTAMP
  FROM finished WHERE o.order_id = finished.order_id
`;

export async function completeNotificationAttempt(
  executor: QueryExecutor,
  input: { attemptId: string; sent: boolean; errorCode: string | null },
): Promise<void> {
  await executor.query(Q5S_2, [input.attemptId, input.sent ? "sent" : "failed", input.errorCode]);
}
