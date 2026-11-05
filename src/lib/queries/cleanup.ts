import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { DeletionLog } from "@/lib/workflow";
import type { CleanupType } from "@/lib/workflow";

interface DeletionRow extends QueryResultRow {
  order_reference: string;
  admin_id: string;
  deleted_at: Date | string;
}

// UC 10A / Q10A.6: read the deletion audit shown by cleanup tooling.
export const Q10A_6 = `
  SELECT order_reference, admin_id, deleted_at
  FROM deletion_history
  ORDER BY deleted_at DESC
`;

export async function listDeletionHistory(
  executor: QueryExecutor = getPool(),
): Promise<DeletionLog[]> {
  const result = await executor.query<DeletionRow>(Q10A_6);
  return result.rows.map((row) => ({
    data_type: "order",
    record_id: row.order_reference,
    deleted_at:
      row.deleted_at instanceof Date
        ? row.deleted_at.toISOString()
        : row.deleted_at,
    deleted_by: row.admin_id,
  }));
}

// UC 10A / Q10A.5-Q10A.6: snapshot and delete one closed Order atomically.
export const Q10A_5_DELETE_ORDER = `
  WITH eligible AS MATERIALIZED (
    SELECT o.order_id,
      jsonb_build_object(
        'order', to_jsonb(o),
        'items', COALESCE((
          SELECT jsonb_agg(to_jsonb(i)) FROM order_items i
          WHERE i.order_id = o.order_id
        ), '[]'::jsonb),
        'labels', COALESCE((
          SELECT jsonb_agg(to_jsonb(l)) FROM labels l
          WHERE l.order_id = o.order_id
        ), '[]'::jsonb)
      ) AS snapshot
    FROM orders o
    WHERE o.order_id = $1
      AND o.order_status IN ('จัดส่งสำเร็จ', 'ยกเลิกแล้ว')
    FOR UPDATE
  ), logged AS (
    INSERT INTO deletion_history (
      deletion_history_id, order_reference, order_snapshot, admin_id
    )
    SELECT $2, order_id, snapshot, $3 FROM eligible
    RETURNING order_reference
  ), detached_cost_history AS (
    UPDATE cost_history SET cost_id = NULL
    WHERE cost_id IN (
      SELECT cost_id FROM costs
      WHERE order_id IN (SELECT order_reference FROM logged)
    )
    RETURNING cost_history_id
  ), deleted_costs AS (
    DELETE FROM costs
    WHERE order_id IN (SELECT order_reference FROM logged)
      AND (SELECT COUNT(*) FROM detached_cost_history) >= 0
    RETURNING cost_id
  ), deleted AS (
    DELETE FROM orders
    WHERE order_id IN (SELECT order_reference FROM logged)
      AND (SELECT COUNT(*) FROM deleted_costs) >= 0
    RETURNING order_id
  )
  SELECT order_id FROM deleted
`;

export async function deleteClosedOrder(
  executor: QueryExecutor,
  input: { orderId: string; historyId: string; adminId: string },
): Promise<boolean> {
  const result = await executor.query<{ order_id: string }>(Q10A_5_DELETE_ORDER, [
    input.orderId,
    input.historyId,
    input.adminId,
  ]);
  return result.rowCount === 1;
}

// UC 10A / Q10A.3: a label can be removed independently only for a closed Order.
export const Q10A_3_DELETE_LABEL = `
  DELETE FROM labels l USING orders o
  WHERE l.order_id = $1 AND o.order_id = l.order_id
    AND o.order_status IN ('จัดส่งสำเร็จ', 'ยกเลิกแล้ว')
  RETURNING l.label_id
`;

export async function deleteClosedLabels(
  executor: QueryExecutor,
  orderId: string,
): Promise<number> {
  return (await executor.query(Q10A_3_DELETE_LABEL, [orderId])).rowCount ?? 0;
}

// UC 10A / Q10A.4: keep reorders referenced by an open Order.
export const Q10A_4_DELETE_REORDER = `
  DELETE FROM reorders r
  WHERE r.reorder_id = $1
    AND (
      r.reorder_status IN ('ยกเลิกแล้ว', 'ได้รับสินค้าแล้ว')
      OR (r.reorder_status = 'สั่งซื้อแล้ว' AND r.expected_date < CURRENT_DATE)
    )
    AND NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.reorder_id = r.reorder_id
        AND o.order_status NOT IN ('จัดส่งสำเร็จ', 'ยกเลิกแล้ว')
    )
  RETURNING r.reorder_id
`;

export async function deleteFinishedReorder(
  executor: QueryExecutor,
  reorderId: string,
): Promise<boolean> {
  return (await executor.query(Q10A_4_DELETE_REORDER, [reorderId])).rowCount === 1;
}

// UC 10A / Q10A.2: remove a historical cost point unless it is the current
// cost of a SKU still referenced by an open Order.
export const Q10A_2_DELETE_COST = `
  WITH sku_row AS (
    SELECT sku_id FROM skus WHERE sku = $1
  ), deleted_history AS (
    DELETE FROM cost_history h
    USING sku_row s
    WHERE h.sku_id = s.sku_id AND h.changed_at = $2::timestamptz
    RETURNING h.cost_history_id
  )
  SELECT 'history' AS kind FROM deleted_history
`;

export async function deleteHistoricalCost(
  executor: QueryExecutor,
  recordId: string,
): Promise<boolean> {
  const separator = recordId.indexOf("@");
  if (separator <= 0) return false;
  const sku = recordId.slice(0, separator);
  const timestamp = recordId.slice(separator + 1);
  if (!sku || Number.isNaN(Date.parse(timestamp))) return false;
  return (await executor.query(Q10A_2_DELETE_COST, [sku, timestamp])).rowCount !== 0;
}

export type CleanupItem = {
  data_type: CleanupType;
  record_id: string;
  detail: string;
};
