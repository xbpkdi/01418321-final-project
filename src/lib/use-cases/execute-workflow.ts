import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { ExternalAdapters } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { withTransaction } from "@/lib/db";
import { mapAdapterError, mapDatabaseError } from "@/lib/db/errors";
import { insertAutoErrorLog } from "@/lib/queries/auto-error-logs";
import {
  findSkuRules,
  lockOrder,
  saveSkuMatch,
} from "@/lib/queries/orders";
import { getOrderStock, saveStockRoute } from "@/lib/queries/stock";
import {
  markLabelManual,
  recordLabelServiceError,
  saveGeneratedLabels,
  toLabelOrder,
} from "@/lib/queries/shipping";
import { deductStockUseCase } from "@/lib/use-cases/deduct-stock";
import { syncRakutenStockUseCase } from "@/lib/use-cases/sync-rakuten-stock";
import { SHIPPING_RULES } from "@/mock/delivery";
import {
  chooseSkuRule,
  chooseStockRoute,
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

async function logAdapterFailure(
  client: PoolClient,
  input: {
    useCaseId: "3S" | "6S";
    contextKey: string;
    failure: Parameters<typeof mapAdapterError>[0];
  },
): Promise<void> {
  const safe = mapAdapterError(input.failure);
  await insertAutoErrorLog(client, {
    logId: randomUUID(),
    useCaseId: input.useCaseId,
    contextKey: input.contextKey,
    errorCode: safe.code,
    safeMessage: safe.messageKey,
  });
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
        const selected = chooseSkuRule(
          await findSkuRules(client, order.channel_sku, order.sales_channel),
        );
        if (selected.kind !== "matched") {
          await saveSkuMatch(
            client,
            orderId,
            null,
            "รอดำเนินการด้วยตนเอง",
            "sku-rule",
          );
          events.push({
            code: selected.kind === "missing" ? "sku-missing" : "sku-multiple",
            orderId,
          });
          break;
        }
        await saveSkuMatch(
          client,
          orderId,
          selected.value.sku_id,
          "รอตรวจสอบสต๊อก",
          null,
        );
        events.push({ code: "sku-matched", count: 1 });
        continue;
      } catch (error) {
        throw new AutomationStepError("2S", orderId, error);
      }
    }

    if (order.order_status === "รอตรวจสอบสต๊อก" && order.sku) {
      try {
        const stock = await getOrderStock(client, order.sku);
        if (!stock) {
          await insertAutoErrorLog(client, {
            logId: randomUUID(),
            useCaseId: "3S",
            contextKey: orderId,
            errorCode: "stock_missing",
            safeMessage: "Stock record is unavailable",
          });
          break;
        }
        const external = await adapters.rsl.getStock(order.sku);
        if (!external.ok) {
          await logAdapterFailure(client, {
            useCaseId: "3S",
            contextKey: orderId,
            failure: external.error,
          });
        }
        const rslQuantity = external.ok ? external.data : null;
        const route = chooseStockRoute(
          Number(order.qty),
          stock.inHouseQuantity,
          rslQuantity,
        );
        await saveStockRoute(
          client,
          stock.stockId,
          rslQuantity,
          orderId,
          route === "enough"
            ? "ยังไม่ได้จับคู่"
            : "รอ Admin ตัดสินใจสั่งซื้อ",
        );
        events.push({
          code: route === "enough" ? "stock-enough" : "stock-low",
          orderId,
        });
        break;
      } catch (error) {
        if (error instanceof AutomationStepError) throw error;
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
        const rule = labelRules.find(
          (candidate) =>
            candidate.shipping_method === order.shipping_method &&
            candidate.sales_channel === order.sales_channel,
        );
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
  for (const orderId of [...new Set(orderIds)]) {
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

export type ExecuteWorkflowOptions = {
  orderIds?: readonly string[];
  adapters?: ExternalAdapters;
};

/** Execute the triggering write and every resulting auto step atomically. */
export async function executeWorkflow<T>(
  action: (client: PoolClient) => Promise<T>,
  options: ExecuteWorkflowOptions = {},
): Promise<T> {
  try {
    return await withTransaction(async (client) => {
      const result = await action(client);
      await runAutomation(
        client,
        options.orderIds ?? [],
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
