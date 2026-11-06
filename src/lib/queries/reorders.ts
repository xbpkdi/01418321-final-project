import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { PurchaseOrder } from "@/types/product";
import type { OrderStatus } from "@/lib/order-status";

interface ReorderRow extends QueryResultRow {
  reorder_id: string;
  sku: string;
  supplier_id: string;
  order_qty: string | number;
  order_date: Date | string;
  expected_date: Date | string | null;
  reorder_status: PurchaseOrder["status"];
  received_at: Date | string | null;
  received_qty: string | number | null;
}

// UC 5A / Q5A.1 and UC 6A / Q6A.1: read current replenishment orders.
export const Q5A_1 = `
  SELECT
    reorders.reorder_id,
    sku.sku,
    reorders.supplier_id,
    reorders.order_qty,
    COALESCE(reorders.ordered_at, reorders.created_at) AS order_date,
    reorders.expected_date,
    reorders.reorder_status,
    reorders.received_at,
    reorders.received_qty
  FROM reorders
  INNER JOIN skus sku ON sku.sku_id = reorders.sku_id
  ORDER BY COALESCE(reorders.ordered_at, reorders.created_at) DESC,
           reorders.reorder_id DESC
`;

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function date(value: Date | string | null): string {
  if (value === null) return "";
  return iso(value).slice(0, 10);
}

export async function listReorders(
  executor: QueryExecutor = getPool(),
): Promise<PurchaseOrder[]> {
  const result = await executor.query<ReorderRow>(Q5A_1);
  return result.rows.map((row) => ({
    po_id: row.reorder_id,
    sku: row.sku,
    supplier_id: row.supplier_id,
    order_qty: Number(row.order_qty),
    order_date: iso(row.order_date),
    eta: date(row.expected_date),
    status: row.reorder_status,
    received_at: row.received_at === null ? undefined : iso(row.received_at),
    received_qty:
      row.received_qty === null ? undefined : Number(row.received_qty),
  }));
}

export interface DecisionContextRow extends QueryResultRow {
  order_id: string;
  order_status: OrderStatus;
  manual_reason: string | null;
  sku_id: string | null;
  sku: string | null;
  selling_price: string | number | null;
  unit_cost: string | number | null;
}

// UC 5A / Q5A.1-Q5A.3: lock the Order and load authoritative price/cost.
export const Q5A_1_FOR_UPDATE = `
  SELECT
    o.order_id, o.order_status, o.manual_reason, item.sku_id, sku.sku,
    sku.selling_price,
    COALESCE(
      cost.unit_cost,
      NULLIF(history.new_value ->> 'unit_cost', '')::numeric
    ) AS unit_cost
  FROM orders o
  INNER JOIN LATERAL (
    SELECT * FROM order_items
    WHERE order_id = o.order_id
    ORDER BY order_item_id LIMIT 1
  ) item ON TRUE
  LEFT JOIN skus sku ON sku.sku_id = item.sku_id
  LEFT JOIN LATERAL (
    SELECT unit_cost FROM costs
    WHERE sku_id = item.sku_id
    ORDER BY calculated_at DESC NULLS LAST, cost_id DESC LIMIT 1
  ) cost ON TRUE
  LEFT JOIN LATERAL (
    SELECT new_value FROM cost_history
    WHERE sku_id = item.sku_id
      AND new_value ->> 'unit_cost' IS NOT NULL
    ORDER BY changed_at DESC, cost_history_id DESC LIMIT 1
  ) history ON TRUE
  WHERE o.order_id = $1
  FOR UPDATE OF o
`;

export async function lockDecisionContext(
  executor: QueryExecutor,
  orderId: string,
): Promise<DecisionContextRow | null> {
  const result = await executor.query<DecisionContextRow>(Q5A_1_FOR_UPDATE, [
    orderId,
  ]);
  return result.rows[0] ?? null;
}

// UC 5A / Q5A.4: persist the decision and quantity with the workflow state.
export const Q5A_4 = `
  UPDATE orders
  SET reorder_decision = $2,
      decided_qty = CASE WHEN $2 = 'คุ้มค่า' THEN $3::integer ELSE NULL END,
      order_status = $4,
      manual_reason = $5,
      updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1
`;

export async function saveReorderDecision(
  executor: QueryExecutor,
  input: {
    orderId: string;
    decision: "คุ้มค่า" | "ไม่คุ้มค่า";
    quantity: number;
    status: OrderStatus;
    manualReason: "price" | null;
  },
): Promise<void> {
  await executor.query(Q5A_4, [
    input.orderId,
    input.decision,
    input.quantity,
    input.status,
    input.manualReason,
  ]);
}

export const Q5A_4_MANUAL_PRICE = `
  UPDATE orders
  SET order_status = 'รอดำเนินการด้วยตนเอง', manual_reason = 'price',
      updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1
`;

export async function markDecisionMissingPrice(
  executor: QueryExecutor,
  orderId: string,
): Promise<void> {
  await executor.query(Q5A_4_MANUAL_PRICE, [orderId]);
}

export interface PurchaseContextRow extends QueryResultRow {
  sku_id: string;
  sku: string;
  product_name: string;
  variation: string;
  supplier_id: string | null;
  supplier_name: string | null;
  lead_time_days: number | string | null;
}

// UC 6A / Q6A.2: serialize purchase attempts per SKU and read Supplier config.
export const Q6A_2_FOR_UPDATE = `
  SELECT
    sku.sku_id, sku.sku, sku.product_name, sku.variation,
    supplier.supplier_id, supplier.supplier_name, supplier.lead_time_days
  FROM skus sku
  LEFT JOIN suppliers supplier ON supplier.supplier_id = sku.supplier_id
  WHERE sku.sku = $1
  FOR UPDATE OF sku
`;

export async function lockPurchaseContext(
  executor: QueryExecutor,
  sku: string,
): Promise<PurchaseContextRow | null> {
  const result = await executor.query<PurchaseContextRow>(Q6A_2_FOR_UPDATE, [
    sku,
  ]);
  return result.rows[0] ?? null;
}

export interface ReorderAttemptRow extends QueryResultRow {
  reorder_id: string;
  order_qty: number | string;
  supplier_id: string;
  supplier_request_id: string;
  expected_date: Date | string | null;
  created_at: Date | string;
}

// UC 6A alternative #4 / Q6A.1: detect an accepted replenishment still due.
export const Q6A_1_PENDING = `
  SELECT reorder_id, order_qty, supplier_id, supplier_request_id,
         expected_date, created_at
  FROM reorders
  WHERE sku_id = $1
    AND reorder_status = 'สั่งซื้อแล้ว'
    AND expected_date >= CURRENT_DATE - 1
  ORDER BY ordered_at DESC NULLS LAST, created_at DESC
  LIMIT 1
`;

export async function findPendingReorder(
  executor: QueryExecutor,
  skuId: string,
): Promise<ReorderAttemptRow | null> {
  const result = await executor.query<ReorderAttemptRow>(Q6A_1_PENDING, [skuId]);
  return result.rows[0] ?? null;
}

// UC 6A alternative #3 / Q6A.1: retry the same durable attempt/request id.
export const Q6A_1_RETRY = `
  SELECT reorder_id, order_qty, supplier_id, supplier_request_id,
         expected_date, created_at
  FROM reorders
  WHERE sku_id = $1 AND reorder_status = 'รอส่งคำสั่งซื้อ'
  ORDER BY created_at DESC
  LIMIT 1
`;

export async function findRetryReorder(
  executor: QueryExecutor,
  skuId: string,
): Promise<ReorderAttemptRow | null> {
  const result = await executor.query<ReorderAttemptRow>(Q6A_1_RETRY, [skuId]);
  return result.rows[0] ?? null;
}

export const Q6A_1_INSERT = `
  INSERT INTO reorders (
    reorder_id, order_qty, reorder_status, expected_date, created_at,
    sku_id, supplier_id, supplier_request_id
  ) VALUES ($1, $2, 'รอส่งคำสั่งซื้อ', $3, CURRENT_TIMESTAMP, $4, $5, $6)
`;

export async function insertReorderAttempt(
  executor: QueryExecutor,
  input: {
    reorderId: string;
    quantity: number;
    expectedDate: string;
    skuId: string;
    supplierId: string;
    requestId: string;
  },
): Promise<void> {
  await executor.query(Q6A_1_INSERT, [
    input.reorderId,
    input.quantity,
    input.expectedDate,
    input.skuId,
    input.supplierId,
    input.requestId,
  ]);
}

// UC 6A / Q6A.1: move every waiting Order of the SKU together and, when a
// reorder exists, link each of them to it (orders.reorder_id). One reorder
// therefore covers all Orders of the SKU that were waiting when it was sent.
export const Q6A_1_MARK_ORDERS = `
  UPDATE orders o
  SET order_status = $2, manual_reason = $3,
      reorder_id = COALESCE($4, o.reorder_id),
      updated_at = CURRENT_TIMESTAMP
  WHERE EXISTS (
    SELECT 1 FROM order_items item
    WHERE item.order_id = o.order_id AND item.sku_id = $1
  )
    AND (
      o.order_status IN ('รอสั่งซื้อจาก Supplier', 'รอส่งคำสั่งซื้อ')
      OR (o.order_status = 'รอดำเนินการด้วยตนเอง'
          AND o.manual_reason = 'supplier')
    )
`;

export async function markLinkedReorderOrders(
  executor: QueryExecutor,
  skuId: string,
  status: OrderStatus,
  manualReason: "supplier" | null,
  reorderId: string | null = null,
): Promise<void> {
  await executor.query(Q6A_1_MARK_ORDERS, [
    skuId,
    status,
    manualReason,
    reorderId,
  ]);
}

// UC 6A / Q6A.1: persist the external accepted/failure result.
export const Q6A_1_COMPLETE = `
  UPDATE reorders
  SET reorder_status = $2,
      ordered_at = CASE WHEN $2 = 'สั่งซื้อแล้ว' THEN CURRENT_TIMESTAMP ELSE ordered_at END,
      supplier_reference = $3,
      last_error_code = $4
  WHERE reorder_id = $1
    AND supplier_request_id = $5
    AND ($2 = 'สั่งซื้อแล้ว' OR reorder_status <> 'สั่งซื้อแล้ว')
  RETURNING reorder_id
`;

export async function completeReorderAttempt(
  executor: QueryExecutor,
  input: {
    reorderId: string;
    requestId: string;
    accepted: boolean;
    supplierReference: string | null;
    errorCode: string | null;
  },
): Promise<boolean> {
  const result = await executor.query<{ reorder_id: string }>(Q6A_1_COMPLETE, [
    input.reorderId,
    input.accepted ? "สั่งซื้อแล้ว" : "รอส่งคำสั่งซื้อ",
    input.supplierReference,
    input.errorCode,
    input.requestId,
  ]);
  return result.rowCount === 1;
}

export interface ReceiveContextRow extends QueryResultRow {
  reorder_id: string;
  reorder_status: PurchaseOrder["status"];
  order_qty: number | string;
  sku: string;
  stock_id: string;
  in_house_qty: number | string;
  rsl_qty: number | string | null;
}

// UC 6A receive step / Q6A.10: lock the reorder and the SKU stock row before
// adding the received goods.
export const Q6A_10_FOR_UPDATE = `
  SELECT r.reorder_id, r.reorder_status, r.order_qty, sku.sku,
         stock.stock_id, stock.in_house_qty, stock.rsl_qty
  FROM reorders r
  INNER JOIN skus sku ON sku.sku_id = r.sku_id
  INNER JOIN stock ON stock.sku_id = r.sku_id
  WHERE r.reorder_id = $1
  FOR UPDATE OF r, stock
`;

export async function lockReceiveContext(
  executor: QueryExecutor,
  reorderId: string,
): Promise<ReceiveContextRow | null> {
  const result = await executor.query<ReceiveContextRow>(Q6A_10_FOR_UPDATE, [
    reorderId,
  ]);
  return result.rows[0] ?? null;
}

// UC 6A receive step / Q6A.11: close the reorder once. The status guard makes
// a second receive of the same reorder a no-op.
export const Q6A_11_RECEIVE = `
  UPDATE reorders
  SET reorder_status = 'ได้รับสินค้าแล้ว',
      received_at = CURRENT_TIMESTAMP,
      received_qty = $2
  WHERE reorder_id = $1 AND reorder_status = 'สั่งซื้อแล้ว'
  RETURNING reorder_id
`;

export async function markReorderReceived(
  executor: QueryExecutor,
  reorderId: string,
  quantity: number,
): Promise<boolean> {
  const result = await executor.query<{ reorder_id: string }>(Q6A_11_RECEIVE, [
    reorderId,
    quantity,
  ]);
  return result.rowCount === 1;
}

// UC 6A receive step / Q6A.12: every Order covered by the reorder goes back to
// 3S, which runs in the same transaction.
export const Q6A_12_RELEASE_ORDERS = `
  UPDATE orders
  SET order_status = 'รอตรวจสอบสต๊อก', manual_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE reorder_id = $1 AND order_status = 'สั่งซื้อแล้ว'
  RETURNING order_id
`;

export async function releaseReceivedOrders(
  executor: QueryExecutor,
  reorderId: string,
): Promise<string[]> {
  const result = await executor.query<{ order_id: string }>(
    Q6A_12_RELEASE_ORDERS,
    [reorderId],
  );
  return result.rows.map((row) => row.order_id).sort();
}
