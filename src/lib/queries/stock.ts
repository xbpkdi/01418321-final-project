import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { StockLevel } from "@/types/product";
import type { OrderStatus } from "@/lib/order-status";

interface StockRow extends QueryResultRow {
  sku: string;
  in_house_qty: number | string;
  rsl_qty: number | string | null;
  updated_at: Date | string;
}

// UC 3S / Q3S.1: read current in-house and RSL stock for every SKU.
export const Q3S_1 = `
  SELECT sku.sku, stock.in_house_qty, stock.rsl_qty, stock.updated_at
  FROM stock
  INNER JOIN skus sku ON sku.sku_id = stock.sku_id
  ORDER BY sku.sku
`;

export async function listStock(
  executor: QueryExecutor = getPool(),
): Promise<StockLevel[]> {
  const result = await executor.query<StockRow>(Q3S_1);
  return result.rows.map((row) => ({
    sku: row.sku,
    in_house_qty: Number(row.in_house_qty),
    rsl_qty: row.rsl_qty === null ? null : Number(row.rsl_qty),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
  }));
}

interface OrderStockRow extends QueryResultRow {
  stock_id: string;
  in_house_qty: number | string;
  rsl_qty: number | string | null;
}

// UC 3S / Q3S.1: read the stock row used to route one matched Order.
export const Q3S_1_ORDER = `
  SELECT stock.stock_id, stock.in_house_qty, stock.rsl_qty
  FROM stock
  INNER JOIN skus ON skus.sku_id = stock.sku_id
  WHERE skus.sku = $1
`;

export async function getOrderStock(
  executor: QueryExecutor,
  sku: string,
): Promise<{ stockId: string; inHouseQuantity: number; rslQuantity: number | null } | null> {
  const result = await executor.query<OrderStockRow>(Q3S_1_ORDER, [sku]);
  const row = result.rows[0];
  return row
    ? {
        stockId: row.stock_id,
        inHouseQuantity: Number(row.in_house_qty),
        rslQuantity: row.rsl_qty === null ? null : Number(row.rsl_qty),
      }
    : null;
}

// UC 3S / Q3S.1: persist the latest successful RSL reading and route the Order.
export const Q3S_1_ROUTE = `
  WITH latest_stock AS (
    UPDATE stock
    SET rsl_qty = COALESCE($2, rsl_qty), updated_at = CURRENT_TIMESTAMP
    WHERE stock_id = $1
  )
  UPDATE orders
  SET order_status = $4, manual_reason = NULL, updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $3 AND order_status = 'รอตรวจสอบสต๊อก'
`;

export async function saveStockRoute(
  executor: QueryExecutor,
  stockId: string,
  rslQuantity: number | null,
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  await executor.query(Q3S_1_ROUTE, [
    stockId,
    rslQuantity,
    orderId,
    status,
  ]);
}

// UC 7A / Q7A.2: restore exactly once to the fulfillment source and clear the
// item guard in the same statement/transaction.
export const Q7A_2 = `
  WITH restored AS (
    UPDATE stock
    SET in_house_qty = in_house_qty + CASE WHEN $3 = 'in_house' THEN $4 ELSE 0 END,
        rsl_qty = CASE
          WHEN $3 = 'rsl' THEN COALESCE(rsl_qty, 0) + $4
          ELSE rsl_qty
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE sku_id = $2
      AND EXISTS (
        SELECT 1 FROM order_items
        WHERE order_id = $1 AND stock_deducted = TRUE
      )
    RETURNING stock_id
  )
  UPDATE order_items
  SET stock_deducted = FALSE, deducted_at = NULL
  WHERE order_id = $1 AND EXISTS (SELECT 1 FROM restored)
  RETURNING qty
`;

export async function restoreCancelledOrderStock(
  executor: QueryExecutor,
  input: {
    orderId: string;
    skuId: string;
    source: "in_house" | "rsl";
    quantity: number;
  },
): Promise<number> {
  const result = await executor.query<{ qty: number }>(Q7A_2, [
    input.orderId,
    input.skuId,
    input.source,
    input.quantity,
  ]);
  return result.rowCount === 1 ? input.quantity : 0;
}
