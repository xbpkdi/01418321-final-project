import "server-only";
import { withTransaction } from "@/lib/db";
import {
  cancelLinkedReorder,
  lockOrder,
  saveCancellation,
} from "@/lib/queries/orders";
import { restoreCancelledOrderStock } from "@/lib/queries/stock";
import type { CancelResult } from "@/lib/workflow";

const HANDED_OVER = new Set([
  "อยู่ระหว่างจัดส่ง",
  "รอแจ้งเลขติดตาม",
  "แจ้งเลขติดตามแล้ว",
  "จัดส่งไม่สำเร็จ",
  "รอดำเนินการพิเศษ",
]);

/** UC 7A: authoritative cancellation with row locking and atomic restock. */
export async function cancelOrderUseCase(input: {
  orderId: string;
  reason: string;
  alsoCancelPo: boolean;
}): Promise<CancelResult> {
  const reason = input.reason.trim();
  if (!reason) return { kind: "no-reason" };

  return withTransaction(async (client) => {
    const order = await lockOrder(client, input.orderId);
    if (!order || order.order_status === "จัดส่งสำเร็จ") {
      return { kind: "closed" };
    }
    if (order.order_status === "ยกเลิกแล้ว") {
      const at = order.cancelled_at;
      return {
        kind: "already",
        at: at instanceof Date ? at.toISOString() : (at ?? ""),
      };
    }
    if (HANDED_OVER.has(order.order_status)) {
      await saveCancellation(
        client,
        input.orderId,
        "รอดำเนินการพิเศษ",
        reason,
        null,
      );
      return { kind: "in-transit" };
    }

    let restocked = 0;
    if (order.stock_deducted && order.sku_id) {
      restocked = await restoreCancelledOrderStock(client, {
        orderId: order.order_id,
        skuId: order.sku_id,
        source: order.fulfill_source,
        quantity: order.qty,
      });
    }
    const poCancelled = Boolean(
      input.alsoCancelPo &&
        order.reorder_id &&
        (await cancelLinkedReorder(client, order.reorder_id)),
    );
    await saveCancellation(
      client,
      input.orderId,
      "ยกเลิกแล้ว",
      reason,
      new Date(),
    );
    return {
      kind: "ok",
      labelPrinted: order.label_printed,
      restocked,
      poCancelled,
    };
  });
}

export const cancelOrder = cancelOrderUseCase;
