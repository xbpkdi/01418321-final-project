import "server-only";
import { randomUUID } from "node:crypto";
import { withTransaction } from "@/lib/db";
import {
  deleteClosedLabels,
  deleteClosedOrder,
  deleteFinishedReorder,
  deleteHistoricalCost,
  type CleanupItem,
} from "@/lib/queries/cleanup";

export type CleanupResult = {
  ok: true;
  deleted: number;
  skipped: number;
};

/** UC 10A: revalidate eligibility and delete the reviewed set atomically. */
export async function cleanupOrdersUseCase(input: {
  items: readonly CleanupItem[];
  adminId: string;
}): Promise<CleanupResult> {
  return withTransaction(async (client) => {
    let deleted = 0;
    let skipped = 0;
    const deletedOrderIds = new Set<string>();
    // Orders first: their labels cascade, so later label entries become skips.
    const ordered = [...input.items].sort((a, b) =>
      a.data_type === "order" && b.data_type !== "order" ? -1 :
      b.data_type === "order" && a.data_type !== "order" ? 1 : 0,
    );
    for (const item of ordered) {
      let removed = false;
      if (item.data_type === "order") {
        removed = await deleteClosedOrder(client, {
          orderId: item.record_id,
          historyId: randomUUID(),
          adminId: input.adminId,
        });
        if (removed) deletedOrderIds.add(item.record_id);
      } else if (item.data_type === "label") {
        removed =
          deletedOrderIds.has(item.record_id) ||
          (await deleteClosedLabels(client, item.record_id)) > 0;
      } else if (item.data_type === "reorder") {
        removed = await deleteFinishedReorder(client, item.record_id);
      } else if (item.data_type === "cost") {
        removed = await deleteHistoricalCost(client, item.record_id);
      }
      if (removed) deleted += 1;
      else skipped += 1;
    }
    return { ok: true, deleted, skipped };
  });
}

export const cleanupOrders = cleanupOrdersUseCase;
