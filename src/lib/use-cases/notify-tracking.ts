import "server-only";
import { randomUUID } from "node:crypto";
import type { RakutenAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { withTransaction } from "@/lib/db";
import {
  completeNotificationAttempt,
  findRetryableNotificationAttempt,
  lockNotificationOrder,
  saveNotificationAttempt,
} from "@/lib/queries/shipping";
import type { NotifyResult } from "@/lib/workflow";

type PreparedNotification = {
  orderRef: string;
  trackingNumber: string;
  attemptId: string;
};

/** UC 5S: notify Rakuten with durable retry/resend attempt semantics. */
export async function notifyTrackingUseCase(
  input: { orderId: string; confirmResend: boolean; adminId: string },
  rakuten: RakutenAdapter = getExternalAdapters().rakuten,
): Promise<NotifyResult> {
  const prepared = await withTransaction<PreparedNotification | NotifyResult>(
    async (client) => {
      const order = await lockNotificationOrder(client, input.orderId);
      if (!order?.tracking_number || !order.carrier_name) return "incomplete";
      if (order.tracking_notified && !input.confirmResend) return "already";

      const retryAttempt = order.tracking_notified
        ? null
        : await findRetryableNotificationAttempt(
            client,
            order.order_id,
            order.tracking_number,
          );
      const attemptId = retryAttempt ?? `NOTIFY-${randomUUID()}`;
      await saveNotificationAttempt(client, {
        logId: retryAttempt ?? randomUUID(),
        attemptId,
        orderId: order.order_id,
        trackingNumber: order.tracking_number,
        adminId: input.adminId,
      });
      return {
        orderRef: order.marketplace_order_id,
        trackingNumber: order.tracking_number,
        attemptId,
      };
    },
  );

  if (typeof prepared === "string") return prepared;
  const sent = await rakuten.notifyTracking(
    prepared.orderRef,
    prepared.trackingNumber,
    prepared.attemptId,
  );
  await withTransaction((client) =>
    completeNotificationAttempt(client, {
      attemptId: prepared.attemptId,
      sent: sent.ok,
      errorCode: sent.ok ? null : sent.error.code,
    }),
  );
  return sent.ok ? "ok" : "failed";
}

export const notifyTracking = notifyTrackingUseCase;
