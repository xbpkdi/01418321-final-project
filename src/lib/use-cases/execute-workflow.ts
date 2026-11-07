import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { ExternalAdapters } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { withTransaction } from "@/lib/db";
import { mapDatabaseError } from "@/lib/db/errors";
import { insertAutoErrorLog } from "@/lib/queries/auto-error-logs";
import {
  listSkuRetryOrderIds,
  listStockDeductRetryOrderIds,
  lockOrder,
} from "@/lib/queries/orders";
import {
  completeDeliveredOrder,
  markLabelManual,
  recordLabelServiceError,
  saveGeneratedLabels,
  toLabelOrder,
} from "@/lib/queries/shipping";
import { checkStockUseCase } from "@/lib/use-cases/check-stock";
import { deductStockUseCase } from "@/lib/use-cases/deduct-stock";
import { logAdapterFailure } from "@/lib/use-cases/log-auto-error";
import { matchSkuUseCase } from "@/lib/use-cases/match-sku";
import { syncRakutenStockUseCase } from "@/lib/use-cases/sync-rakuten-stock";
import { findLabelRule, SHIPPING_RULES } from "@/mock/delivery";
import {
  validGeneratedLabels,
  type AutoEvent,
} from "@/lib/workflow";
import type { LabelRule } from "@/lib/adapters/contracts";

const labelRules: LabelRule[] = SHIPPING_RULES.map((rule) => ({
  ...rule,
  sales_channel: "Rakuten Ichiba",
}));

class AutomationStepError extends Error {
  constructor(
    readonly useCaseId: "2S" | "3S" | "6S" | "7S",
    readonly contextKey: string,
    readonly original: unknown,
  ) {
    super(`Automation ${useCaseId} failed`);
  }
}

async function runOrderAutomation(
  client: PoolClient,
  orderId: string,
  adapters: ExternalAdapters,
): Promise<AutoEvent[]> {
  const events: AutoEvent[] = [];

  for (let guard = 0; guard < 6; guard += 1) {
    const order = await lockOrder(client, orderId);
    if (!order) break;

    if (order.order_status === "รอจับคู่กฎ SKU") {
      try {
        const matched = await matchSkuUseCase(client, order);
        if (matched === "db-unavailable") {
          events.push({ code: "sku-db", orderId });
          break;
        }
        if (matched !== "ok") {
          events.push({
            code: matched === "missing" ? "sku-missing" : "sku-multiple",
            orderId,
          });
          break;
        }
        events.push({ code: "sku-matched", count: 1 });
        continue;
      } catch (error) {
        throw new AutomationStepError("2S", orderId, error);
      }
    }

    if (order.order_status === "รอตรวจสอบสต๊อก" && order.sku) {
      try {
        const checked = await checkStockUseCase(
          client,
          { ...order, sku: order.sku },
          adapters.rsl,
        );
        if (checked !== "missing-stock") {
          events.push({
            code: checked === "low" ? "stock-low" : "stock-enough",
            orderId,
          });
        }
        // In-house Orders skip 1S RSL matching and go straight to 6S.
        if (checked === "in_house") continue;
        break;
      } catch (error) {
        throw new AutomationStepError("3S", orderId, error);
      }
    }

    if (order.order_status === "รอจัดรูปแบบใบปะสินค้า") {
      try {
        if (!order.shipping_address.trim() || !order.shipping_method.trim()) {
          await markLabelManual(client, orderId, "address");
          events.push({ code: "label-no-address", orderId });
          break;
        }
        const rule = findLabelRule(labelRules, order);
        if (!rule) {
          await markLabelManual(client, orderId, "template");
          events.push({ code: "label-no-template", orderId });
          break;
        }
        const generated = await adapters.labelService.generateLabels(
          toLabelOrder({
            ...order,
            rsl_no: order.rsl_no,
          }),
          labelRules,
        );
        if (!generated.ok || !validGeneratedLabels(generated.data)) {
          const errorCode = generated.ok
            ? "invalid_response"
            : generated.error.code;
          if (!generated.ok) {
            await logAdapterFailure(client, {
              useCaseId: "6S",
              contextKey: orderId,
              failure: generated.error,
            });
          } else {
            await recordLabelServiceError(client, {
              logId: randomUUID(),
              orderId,
              errorCode,
            });
          }
          events.push({ code: "label-service", orderId });
          break;
        }
        if (await saveGeneratedLabels(client, orderId, generated.data)) {
          events.push({
            code: "label-created",
            count: generated.data.length,
          });
        }
        break;
      } catch (error) {
        if (error instanceof AutomationStepError) throw error;
        throw new AutomationStepError("6S", orderId, error);
      }
    }

    if (order.order_status === "แจ้งเลขติดตามแล้ว") {
      try {
        const deducted = await deductStockUseCase(client, orderId);
        if (deducted.kind === "insufficient") {
          events.push({ code: "stock-insufficient", orderId });
        } else if (deducted.kind === "deducted") {
          events.push({ code: "stock-deducted", orderId });
        }
        if (deducted.kind !== "insufficient") {
          // 8A: carrier confirmed delivery earlier, stock is now deducted.
          await completeDeliveredOrder(client, orderId);
        }
        break;
      } catch (error) {
        if (error instanceof AutomationStepError) throw error;
        throw new AutomationStepError("7S", orderId, error);
      }
    }

    break;
  }

  return events;
}

/** Run all automatic steps on the same connection and transaction as action. */
export async function runAutomation(
  client: PoolClient,
  orderIds: readonly string[],
  adapters: ExternalAdapters = getExternalAdapters(),
): Promise<AutoEvent[]> {
  const events: AutoEvent[] = [];
  const requested = new Set(orderIds);
  for (const orderId of requested) {
    events.push(...(await runOrderAutomation(client, orderId, adapters)));
  }

  // UC 2S alternative: an Order left at "รอจับคู่กฎ SKU" because SKU rule data
  // was unreadable is retried by any later workflow action. A retry that still
  // fails is only logged, not reported to this unrelated action.
  for (const orderId of await listSkuRetryOrderIds(client)) {
    if (requested.has(orderId)) continue;
    const retried = await runOrderAutomation(client, orderId, adapters);
    events.push(...retried.filter((event) => event.code !== "sku-db"));
  }

  // UC 7S: 7S normally follows 5S on the same Order. An Order left at
  // "แจ้งเลขติดตามแล้ว" with items not deducted (or delivered but not yet
  // closed by 8A) is picked up by any later workflow action.
  for (const orderId of await listStockDeductRetryOrderIds(client)) {
    if (requested.has(orderId)) continue;
    events.push(...(await runOrderAutomation(client, orderId, adapters)));
  }

  // Any later workflow action is also a retry opportunity for durable 7S
  // pending rows, including a previous adapter failure.
  try {
    await syncRakutenStockUseCase(client, adapters.rakuten);
  } catch (error) {
    throw new AutomationStepError(
      "7S",
      orderIds.length === 1 ? orderIds[0] : "pending-stock-sync",
      error,
    );
  }
  return events;
}

async function recordRolledBackAutomationError(
  error: AutomationStepError,
): Promise<void> {
  const safe = mapDatabaseError(error.original);
  try {
    await withTransaction((client) =>
      insertAutoErrorLog(client, {
        logId: randomUUID(),
        useCaseId: error.useCaseId,
        contextKey: error.contextKey,
        errorCode: safe.code,
        safeMessage: safe.messageKey,
      }),
    );
  } catch {
    // The primary error is preserved; logging may be impossible while the
    // database itself is unavailable.
  }
}

export type ExecuteWorkflowOptions<T = unknown> = {
  /** Orders to automate. A function reads them from the action result when
   * the action itself finds the Orders (e.g. 6A receive goods). */
  orderIds?: readonly string[] | ((result: T) => readonly string[]);
  adapters?: ExternalAdapters;
};

/** Execute the triggering write and every resulting auto step atomically. */
export async function executeWorkflow<T>(
  action: (client: PoolClient) => Promise<T>,
  options: ExecuteWorkflowOptions<T> = {},
): Promise<T> {
  try {
    return await withTransaction(async (client) => {
      const result = await action(client);
      const orderIds =
        typeof options.orderIds === "function"
          ? options.orderIds(result)
          : (options.orderIds ?? []);
      await runAutomation(
        client,
        orderIds,
        options.adapters ?? getExternalAdapters(),
      );
      return result;
    });
  } catch (error) {
    if (error instanceof AutomationStepError) {
      await recordRolledBackAutomationError(error);
      throw error.original;
    }
    throw error;
  }
}
