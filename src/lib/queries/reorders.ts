import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { PurchaseOrder } from "@/types/product";

interface ReorderRow extends QueryResultRow {
  reorder_id: string;
  sku: string;
  supplier_id: string;
  order_qty: string | number;
  order_date: Date | string;
  expected_date: Date | string | null;
  reorder_status: PurchaseOrder["status"];
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
    reorders.reorder_status
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
  }));
}
