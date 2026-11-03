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

export interface StockWriteRow extends QueryResultRow {
  stock_id: string;
  sku_id: string;
  in_house_qty: number | string;
  rsl_qty: number | string | null;
}

export interface DeductibleStockRow extends QueryResultRow {
  order_item_id: string;
  stock_id: string;
  sku_id: string;
  channel_sku: string;
  fulfill_source: "in_house" | "rsl";
  qty: number | string;
  stock_deducted: boolean;
  in_house_qty: number | string;
  rsl_qty: number | string | null;
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

// UC 7S / Q7S.1: serialize deduction attempts for every item and inventory
// row belonging to an Order. The order lock alone is not sufficient because
// another Order may consume the same SKU concurrently.
export const Q7S_1 = `
  SELECT item.order_item_id, item.sku_id, item.channel_sku,
         item.fulfill_source, item.qty, item.stock_deducted,
         stock.stock_id, stock.in_house_qty, stock.rsl_qty
  FROM order_items item
  INNER JOIN stock ON stock.sku_id = item.sku_id
  WHERE item.order_id = $1
  ORDER BY stock.stock_id, item.order_item_id
  FOR UPDATE OF item, stock
`;

export async function lockOrderStock(
  executor: QueryExecutor,
  orderId: string,
): Promise<DeductibleStockRow[]> {
  return (await executor.query<DeductibleStockRow>(Q7S_1, [orderId])).rows;
}

// UC 7S / Q7S.2: the conditional update is a second non-negative guard in
// addition to the row lock. A zero row count aborts the enclosing workflow.
export const Q7S_2 = `
  UPDATE stock
  SET in_house_qty = CASE
        WHEN $2 = 'in_house' THEN in_house_qty - $3
        ELSE in_house_qty
      END,
      rsl_qty = CASE
        WHEN $2 = 'rsl' THEN rsl_qty - $3
        ELSE rsl_qty
      END,
      updated_at = CURRENT_TIMESTAMP
  WHERE stock_id = $1
    AND CASE
      WHEN $2 = 'in_house' THEN in_house_qty >= $3
      ELSE rsl_qty IS NOT NULL AND rsl_qty >= $3
    END
  RETURNING stock_id, sku_id, in_house_qty, rsl_qty
`;

export async function deductLockedStock(
  executor: QueryExecutor,
  input: {
    stockId: string;
    source: "in_house" | "rsl";
    quantity: number;
  },
): Promise<StockWriteRow | null> {
  const result = await executor.query<StockWriteRow>(Q7S_2, [
    input.stockId,
    input.source,
    input.quantity,
  ]);
  return result.rows[0] ?? null;
}

// UC 7S / Q7S.3: set the idempotency guard only after every stock row has
// passed its conditional decrement. A later error rolls both changes back.
export const Q7S_3 = `
  UPDATE order_items
  SET stock_deducted = TRUE, deducted_at = CURRENT_TIMESTAMP
  WHERE order_item_id = ANY($1::text[]) AND stock_deducted = FALSE
`;

export async function markItemsDeducted(
  executor: QueryExecutor,
  orderItemIds: readonly string[],
): Promise<number> {
  if (orderItemIds.length === 0) return 0;
  return (await executor.query(Q7S_3, [orderItemIds])).rowCount ?? 0;
}

// UC 7S alternative #2 / Q7S.1: insufficient stock is a business outcome,
// not a partial deduction. The caller performs this only after checking every
// locked row and before issuing any decrement.
export const Q7S_1_MANUAL = `
  UPDATE orders
  SET order_status = 'รอดำเนินการด้วยตนเอง',
      manual_reason = 'stock-deduct', updated_at = CURRENT_TIMESTAMP
  WHERE order_id = $1 AND order_status = 'แจ้งเลขติดตามแล้ว'
`;

export async function markDeductionManual(
  executor: QueryExecutor,
  orderId: string,
): Promise<void> {
  await executor.query(Q7S_1_MANUAL, [orderId]);
}

// UC 3S / Q3S.1: lock the inventory row before an Admin adjustment.
export const Q3S_1_FOR_UPDATE = `
  SELECT stock.stock_id, stock.sku_id, stock.in_house_qty, stock.rsl_qty
  FROM stock
  INNER JOIN skus ON skus.sku_id = stock.sku_id
  WHERE skus.sku = $1
  FOR UPDATE OF stock
`;

export async function lockStock(
  executor: QueryExecutor,
  sku: string,
): Promise<StockWriteRow | null> {
  const result = await executor.query<StockWriteRow>(Q3S_1_FOR_UPDATE, [sku]);
  return result.rows[0] ?? null;
}

// UC 3S / Q3S.1: persist absolute adjusted values and mark the Rakuten sync
// state pending so the later 7S retry always sends the latest quantity.
export const Q3S_1_ADJUST = `
  WITH adjusted AS (
    UPDATE stock
    SET in_house_qty = $2, rsl_qty = $3, updated_at = CURRENT_TIMESTAMP
    WHERE stock_id = $1
    RETURNING stock_id
  )
  INSERT INTO rakuten_stock_sync_states (stock_id, sync_status)
  SELECT stock_id, 'pending' FROM adjusted
  ON CONFLICT (stock_id) DO UPDATE SET
    sync_status = 'pending', last_error_code = NULL
`;

export async function adjustStock(
  executor: QueryExecutor,
  stockId: string,
  inHouseQuantity: number,
  rslQuantity: number | null,
): Promise<void> {
  await executor.query(Q3S_1_ADJUST, [
    stockId,
    inHouseQuantity,
    rslQuantity,
  ]);
}

export const Q3S_1_INSERT_HISTORY = `
  INSERT INTO stock_adjustment_history (
    stock_adjustment_history_id, stock_id,
    previous_in_house_qty, new_in_house_qty,
    previous_rsl_qty, new_rsl_qty, reason, admin_id
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`;

export async function insertStockAdjustmentHistory(
  executor: QueryExecutor,
  input: {
    historyId: string;
    stockId: string;
    previousInHouseQuantity: number;
    inHouseQuantity: number;
    previousRslQuantity: number | null;
    rslQuantity: number | null;
    reason: string;
    adminId: string;
  },
): Promise<void> {
  await executor.query(Q3S_1_INSERT_HISTORY, [
    input.historyId,
    input.stockId,
    input.previousInHouseQuantity,
    input.inHouseQuantity,
    input.previousRslQuantity,
    input.rslQuantity,
    input.reason,
    input.adminId,
  ]);
}
