import "server-only";
import type { CarrierAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { withTransaction } from "@/lib/db";
import {
  lockDispatchOrder,
  markAwaitingCarrier,
  saveDispatch,
} from "@/lib/queries/shipping";
import type { DispatchResult } from "@/lib/workflow";

/** UC 8A: hand printed parcels to the carrier and persist its tracking data. */
export async function dispatchOrdersUseCase(
  orderIds: readonly string[],
  carrier: CarrierAdapter = getExternalAdapters().carrier,
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];
  for (const orderId of orderIds) {
    const eligible = await withTransaction((client) =>
      lockDispatchOrder(client, orderId),
    );
    if (
      !eligible ||
      !eligible.labels_printed ||
      !["พิมพ์ใบปะสินค้าแล้ว", "รอส่งมอบ"].includes(eligible.order_status)
    ) {
      results.push({ orderId, result: "not-printed" });
      continue;
    }

    const tracking = await carrier.getTrackingInfo(orderId);
    if (
      !tracking.ok ||
      !tracking.data ||
      !tracking.data.trackingNumber.trim() ||
      !tracking.data.carrierName.trim()
    ) {
      await withTransaction((client) => markAwaitingCarrier(client, orderId));
      results.push({ orderId, result: "no-tracking" });
      continue;
    }
    const info = tracking.data;

    await withTransaction(async (client) => {
      const current = await lockDispatchOrder(client, orderId);
      if (
        current &&
        ["พิมพ์ใบปะสินค้าแล้ว", "รอส่งมอบ"].includes(current.order_status)
      ) {
        await saveDispatch(client, {
          orderId,
          trackingNumber: info.trackingNumber,
          carrierName: info.carrierName,
        });
      }
    });
    results.push({
      orderId,
      result: "ok",
      tracking: info.trackingNumber,
      carrier: info.carrierName,
    });
  }
  return results;
}

export const dispatchOrders = dispatchOrdersUseCase;
