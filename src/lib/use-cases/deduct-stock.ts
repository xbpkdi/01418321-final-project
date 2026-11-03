import "server-only";
import type { QueryExecutor } from "@/lib/db";
import {
  deductLockedStock,
  lockOrderStock,
  markDeductionManual,
  markItemsDeducted,
} from "@/lib/queries/stock";
import { markStockSyncPending } from "@/lib/queries/stock-sync";

export type DeductStockResult =
  | { kind: "already"; stockIds: string[] }
  | { kind: "insufficient"; stockIds: string[] }
  | { kind: "deducted"; stockIds: string[] };

type Deduction = {
  stockId: string;
  source: "in_house" | "rsl";
  quantity: number;
  available: number;
};

/** UC 7S: lock, validate, decrement, and set each item guard atomically. */
export async function deductStockUseCase(
  executor: QueryExecutor,
  orderId: string,
): Promise<DeductStockResult> {
  const rows = await lockOrderStock(executor, orderId);
  if (rows.length === 0) {
    await markDeductionManual(executor, orderId);
    return { kind: "insufficient", stockIds: [] };
  }
  const pending = rows.filter((row) => !row.stock_deducted);
  if (pending.length === 0) {
    return {
      kind: "already",
      stockIds: [...new Set(rows.map((row) => row.stock_id))],
    };
  }

  const deductions = new Map<string, Deduction>();
  for (const row of pending) {
    const key = `${row.stock_id}:${row.fulfill_source}`;
    const existing = deductions.get(key);
    const available = Number(
      row.fulfill_source === "in_house" ? row.in_house_qty : row.rsl_qty,
    );
    deductions.set(key, {
      stockId: row.stock_id,
      source: row.fulfill_source,
      quantity: (existing?.quantity ?? 0) + Number(row.qty),
      available,
    });
  }

  if (
    [...deductions.values()].some(
      (deduction) =>
        !Number.isFinite(deduction.available) ||
        deduction.available < deduction.quantity,
    )
  ) {
    await markDeductionManual(executor, orderId);
    return { kind: "insufficient", stockIds: [] };
  }

  const stockIds = new Set<string>();
  for (const deduction of deductions.values()) {
    const updated = await deductLockedStock(executor, deduction);
    if (!updated) {
      throw new Error("Stock deduction invariant failed");
    }
    stockIds.add(updated.stock_id);
  }

  const itemIds = pending.map((row) => row.order_item_id);
  const marked = await markItemsDeducted(executor, itemIds);
  if (marked !== itemIds.length) {
    throw new Error("Stock deduction guard invariant failed");
  }
  for (const stockId of stockIds) {
    await markStockSyncPending(executor, stockId);
  }
  return { kind: "deducted", stockIds: [...stockIds] };
}

export const deductStock = deductStockUseCase;
