import "server-only";
import type { CarrierAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { withTransaction } from "@/lib/db";
import { listCarrierPollOrders, saveCarrierStatus } from "@/lib/queries/shipping";
import { restoreCancelledOrderStock } from "@/lib/queries/stock";
import type { CarrierEvent } from "@/lib/workflow";

/** UC 8A: persist only carrier-confirmed delivery outcomes. */
export async function pollCarrierUseCase(
  carrier: CarrierAdapter = getExternalAdapters().carrier,
): Promise<CarrierEvent[]> {
  const rows = await listCarrierPollOrders();
  const events: CarrierEvent[] = [];
  let connectionReported = false;

  for (const row of rows) {
    const result = await carrier.getDeliveryStatus(row.tracking_number);
    if (!result.ok) {
      if (!connectionReported) events.push({ kind: "connection" });
      connectionReported = true;
      continue;
    }
    if (
      result.data === row.delivery_status ||
      (row.delivery_status === "delivered" && result.data === "in_transit")
    ) {
      continue;
    }

    let restocked = 0;
    await withTransaction(async (client) => {
      if (result.data === "returned" && row.stock_deducted && row.sku_id) {
        restocked = await restoreCancelledOrderStock(client, {
          orderId: row.order_id,
          skuId: row.sku_id,
          source: row.fulfill_source,
          quantity: Number(row.qty),
        });
      }
      await saveCarrierStatus(client, row.order_id, result.data);
    });

    if (result.data === "failed") {
      events.push({ kind: "failed", orderId: row.order_id });
    } else if (result.data === "returned") {
      events.push({ kind: "returned", orderId: row.order_id, restocked });
    }
  }
  return events;
}

export const pollCarrier = pollCarrierUseCase;
