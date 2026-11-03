import "server-only";
import { randomUUID } from "node:crypto";
import type { RakutenAdapter } from "@/lib/adapters/contracts";
import { mapAdapterError } from "@/lib/db/errors";
import type { QueryExecutor } from "@/lib/db";
import { insertAutoErrorLog } from "@/lib/queries/auto-error-logs";
import {
  completeStockSync,
  failStockSync,
  lockPendingStockSyncs,
  recordStockSyncAttempt,
} from "@/lib/queries/stock-sync";

export type StockSyncEvent =
  | { kind: "synced"; stockId: string; quantity: number }
  | { kind: "pending"; stockId: string; quantity: number };

/** UC 7S alternative #1: retry durable pending rows with latest totals. */
export async function syncRakutenStockUseCase(
  executor: QueryExecutor,
  rakuten: RakutenAdapter,
  stockIds?: readonly string[],
): Promise<StockSyncEvent[]> {
  const rows = await lockPendingStockSyncs(executor, stockIds);
  const events: StockSyncEvent[] = [];

  for (const row of rows) {
    const quantity = Number(row.available_qty);
    await recordStockSyncAttempt(executor, row.stock_id);
    const result = await rakuten.syncStock(row.channel_sku, quantity);
    if (result.ok) {
      const completed = await completeStockSync(
        executor,
        row.stock_id,
        quantity,
      );
      events.push({
        kind: completed ? "synced" : "pending",
        stockId: row.stock_id,
        quantity,
      });
      continue;
    }

    const safe = mapAdapterError(result.error);
    await failStockSync(executor, row.stock_id, result.error.code);
    await insertAutoErrorLog(executor, {
      logId: randomUUID(),
      useCaseId: "7S",
      contextKey: row.stock_id,
      errorCode: safe.code,
      safeMessage: safe.messageKey,
    });
    events.push({ kind: "pending", stockId: row.stock_id, quantity });
  }
  return events;
}

export const syncRakutenStock = syncRakutenStockUseCase;
