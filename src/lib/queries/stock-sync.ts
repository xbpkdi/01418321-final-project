import "server-only";
import type { QueryResultRow } from "pg";
import type { QueryExecutor } from "@/lib/db";

export interface PendingStockSyncRow extends QueryResultRow {
  stock_id: string;
  channel_sku: string;
  available_qty: number | string;
}

// UC 7S / Q7S.4: every stock mutation creates or refreshes one durable
// pending row. The quantity is intentionally read only when a retry starts.
export const Q7S_4_PENDING = `
  INSERT INTO rakuten_stock_sync_states (
    stock_id, sync_status, last_error_code
  ) VALUES ($1, 'pending', NULL)
  ON CONFLICT (stock_id) DO UPDATE SET
    sync_status = 'pending', last_error_code = NULL
`;

export async function markStockSyncPending(
  executor: QueryExecutor,
  stockId: string,
): Promise<void> {
  await executor.query(Q7S_4_PENDING, [stockId]);
}

// UC 7S alternative #1 / Q7S.4: lock pending state and inventory together;
// retry always sends the newest absolute total, never a stale delta.
export const Q7S_4_LOCK_PENDING = `
  SELECT sync.stock_id, sku.channel_sku,
         (stock.in_house_qty + COALESCE(stock.rsl_qty, 0)) AS available_qty
  FROM rakuten_stock_sync_states sync
  INNER JOIN stock ON stock.stock_id = sync.stock_id
  INNER JOIN skus sku ON sku.sku_id = stock.sku_id
  WHERE sync.sync_status = 'pending'
    AND ($1::text[] IS NULL OR sync.stock_id = ANY($1::text[]))
  ORDER BY sync.stock_id
  FOR UPDATE OF sync, stock
`;

export async function lockPendingStockSyncs(
  executor: QueryExecutor,
  stockIds?: readonly string[],
): Promise<PendingStockSyncRow[]> {
  return (
    await executor.query<PendingStockSyncRow>(Q7S_4_LOCK_PENDING, [
      stockIds && stockIds.length > 0 ? stockIds : null,
    ])
  ).rows;
}

// UC 7S / Q7S.5: record an attempt before calling the configured adapter.
export const Q7S_5_ATTEMPT = `
  UPDATE rakuten_stock_sync_states
  SET last_attempt_at = CURRENT_TIMESTAMP
  WHERE stock_id = $1 AND sync_status = 'pending'
`;

export async function recordStockSyncAttempt(
  executor: QueryExecutor,
  stockId: string,
): Promise<void> {
  await executor.query(Q7S_5_ATTEMPT, [stockId]);
}

// UC 7S / Q7S.5: clear pending only when the current absolute total still
// equals the value acknowledged by Rakuten.
export const Q7S_5_SUCCESS = `
  UPDATE rakuten_stock_sync_states sync
  SET sync_status = 'synced', last_synced_qty = $2,
      last_synced_at = CURRENT_TIMESTAMP, last_error_code = NULL
  FROM stock
  WHERE sync.stock_id = $1 AND stock.stock_id = sync.stock_id
    AND stock.in_house_qty + COALESCE(stock.rsl_qty, 0) = $2
`;

export async function completeStockSync(
  executor: QueryExecutor,
  stockId: string,
  quantity: number,
): Promise<boolean> {
  return (
    (await executor.query(Q7S_5_SUCCESS, [stockId, quantity])).rowCount === 1
  );
}

// UC 7S alternative #1 / Q7S.5: keep the retry durable and store only the
// adapter's bounded error code, never provider text or configuration.
export const Q7S_5_FAILURE = `
  UPDATE rakuten_stock_sync_states
  SET sync_status = 'pending', last_error_code = $2
  WHERE stock_id = $1
`;

export async function failStockSync(
  executor: QueryExecutor,
  stockId: string,
  errorCode: string,
): Promise<void> {
  await executor.query(Q7S_5_FAILURE, [stockId, errorCode]);
}
