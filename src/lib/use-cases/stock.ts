import "server-only";
import { randomUUID } from "node:crypto";
import { withTransaction } from "@/lib/db";
import {
  adjustStock,
  insertStockAdjustmentHistory,
  lockStock,
} from "@/lib/queries/stock";

export type AdjustStockResult = "invalid" | "not-found" | "ok";

export async function adjustStockUseCase(input: {
  sku: string;
  inHouseQuantity: number;
  rslQuantity: number | null;
  reason: string;
  adminId: string;
}): Promise<AdjustStockResult> {
  if (
    !input.sku.trim() ||
    !Number.isInteger(input.inHouseQuantity) ||
    input.inHouseQuantity < 0 ||
    (input.rslQuantity !== null &&
      (!Number.isInteger(input.rslQuantity) || input.rslQuantity < 0)) ||
    !input.reason.trim() ||
    input.reason.trim().length > 500
  ) {
    return "invalid";
  }

  return withTransaction(async (client) => {
    const current = await lockStock(client, input.sku.trim());
    if (!current) return "not-found";

    await adjustStock(
      client,
      current.stock_id,
      input.inHouseQuantity,
      input.rslQuantity,
    );
    await insertStockAdjustmentHistory(client, {
      historyId: `STOCK-HISTORY-${randomUUID()}`,
      stockId: current.stock_id,
      previousInHouseQuantity: Number(current.in_house_qty),
      inHouseQuantity: input.inHouseQuantity,
      previousRslQuantity:
        current.rsl_qty === null ? null : Number(current.rsl_qty),
      rslQuantity: input.rslQuantity,
      reason: input.reason.trim(),
      adminId: input.adminId,
    });
    return "ok";
  });
}
