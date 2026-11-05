import "server-only";
import type { PoolClient } from "pg";
import { isFaultEnabled } from "@/lib/adapters/faults";
import {
  findSkuRules,
  saveSkuMatch,
  type OrderWorkflowRow,
} from "@/lib/queries/orders";
import { logAdapterFailure } from "@/lib/use-cases/log-auto-error";
import { chooseSkuRule } from "@/lib/workflow";

export type SkuMatchResult = "db-unavailable" | "missing" | "multiple" | "ok";

/**
 * UC 2S: resolve the persisted channel SKU using database SKU rules. Runs
 * inside `executeWorkflow` on an Order locked at "รอจับคู่กฎ SKU".
 */
export async function matchSkuUseCase(
  client: PoolClient,
  order: OrderWorkflowRow,
): Promise<SkuMatchResult> {
  // /dev fault skuRuleDb: SKU rule data is unavailable, so the Order
  // stays at 2S and the next workflow action retries it.
  if (isFaultEnabled("skuRuleDb")) {
    await logAdapterFailure(client, {
      useCaseId: "2S",
      contextKey: order.order_id,
      failure: {
        code: "unavailable",
        retryable: true,
        referenceId: "mock-fault-skuRuleDb",
      },
    });
    return "db-unavailable";
  }
  const selected = chooseSkuRule(
    await findSkuRules(client, order.channel_sku, order.sales_channel),
  );
  if (selected.kind !== "matched") {
    await saveSkuMatch(
      client,
      order.order_id,
      null,
      "รอดำเนินการด้วยตนเอง",
      "sku-rule",
    );
    return selected.kind;
  }
  await saveSkuMatch(
    client,
    order.order_id,
    selected.value.sku_id,
    "รอตรวจสอบสต๊อก",
    null,
  );
  return "ok";
}
