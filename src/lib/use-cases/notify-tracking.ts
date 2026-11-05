import "server-only";
import { randomUUID } from "node:crypto";
import type { RakutenAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import {
  completeNotificationAttempt,
  findRetryableNotificationAttempt,
  lockNotificationOrder,
  saveNotificationAttempt,
} from "@/lib/queries/shipping";
import type { NotifyResult } from "@/lib/workflow";
import { executeWorkflow } from "@/lib/use-cases/execute-workflow";

/** UC 5S: notify Rakuten with durable retry/resend attempt semantics. */
export async function notifyTrackingUseCase(
  input: { orderId: string; confirmResend: boolean; adminId: string },
  rakuten: RakutenAdapter = getExternalAdapters().rakuten,
): Promise<NotifyResult> {
  return executeWorkflow(
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
      const sent = await rakuten.notifyTracking(
        order.marketplace_order_id,
        order.tracking_number,
        attemptId,
      );
      await completeNotificationAttempt(client, {
        attemptId,
        sent: sent.ok,
        errorCode: sent.ok ? null : sent.error.code,
      });
      return sent.ok ? "ok" : "failed";
    },
    {
      orderIds: [input.orderId],
      adapters: { ...getExternalAdapters(), rakuten },
    },
  );
}

export const notifyTracking = notifyTrackingUseCase;
