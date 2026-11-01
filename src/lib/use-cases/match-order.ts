import "server-only";
import type { RslAdapter, RslMatch } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { getPool, withTransaction } from "@/lib/db";
import {
  clearRslMatch,
  findSkuRules,
  listRslQueueIds,
  lockOrder,
  saveRslMatch,
  saveSkuMatch,
} from "@/lib/queries/orders";
import { chooseRslMatch, chooseSkuRule } from "@/lib/workflow";

export type SkuMatchResult = "not-pending" | "missing" | "multiple" | "ok";

/** UC 2S: resolve the persisted channel SKU using database SKU rules. */
export async function matchSkuUseCase(orderId: string): Promise<SkuMatchResult> {
  return withTransaction(async (client) => {
    const order = await lockOrder(client, orderId);
    if (!order || order.order_status !== "รอจับคู่กฎ SKU") {
      return "not-pending";
    }
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
      return selected.kind;
    }
    await saveSkuMatch(
      client,
      orderId,
      selected.value.sku_id,
      "รอตรวจสอบสต๊อก",
      null,
    );
    return "ok";
  });
}

export type RslMatchResult =
  | { kind: "not-found" }
  | { kind: "multiple"; options: RslMatch[] }
  | { kind: "connection" }
  | { kind: "ok"; reference: string }
  | { kind: "not-allowed" };

/** UC 1S: retrieve RSL candidates through the interface and persist a choice. */
export async function matchRslUseCase(
  orderId: string,
  chosen?: string,
  rsl: RslAdapter = getExternalAdapters().rsl,
): Promise<RslMatchResult> {
  const order = await withTransaction((client) => lockOrder(client, orderId));
  const allowed =
    order?.order_status === "ยังไม่ได้จับคู่" ||
    (order?.order_status === "รอดำเนินการด้วยตนเอง" &&
      order.manual_reason === "rsl");
  if (!order || !allowed || !order.sku) return { kind: "not-allowed" };

  const response = await rsl.matchOrder({
    sku: order.sku,
    variation: order.variation,
  });
  if (!response.ok) return { kind: "connection" };
  const selected = chooseRslMatch(response.data, chosen);

  if (selected.kind === "multiple") return selected;
  if (selected.kind === "not-found") {
    await withTransaction(async (client) => {
      const current = await lockOrder(client, orderId);
      if (current && current.order_status === order.order_status) {
        await saveRslMatch(
          client,
          orderId,
          null,
          "รอดำเนินการด้วยตนเอง",
          "rsl",
        );
      }
    });
    return selected;
  }

  await withTransaction(async (client) => {
    const current = await lockOrder(client, orderId);
    if (!current || current.order_status !== order.order_status) return;
    await saveRslMatch(
      client,
      orderId,
      selected.value.rsl_order_id,
      "รอจัดรูปแบบใบปะสินค้า",
      null,
    );
  });
  return { kind: "ok", reference: selected.value.rsl_order_id };
}

export async function matchAllRslUseCase(
  rsl: RslAdapter = getExternalAdapters().rsl,
): Promise<{
  matched: number;
  multiple: number;
  notFound: number;
  connection: boolean;
}> {
  const summary = { matched: 0, multiple: 0, notFound: 0, connection: false };
  for (const orderId of await listRslQueueIds(getPool())) {
    const result = await matchRslUseCase(orderId, undefined, rsl);
    if (result.kind === "ok") summary.matched += 1;
    else if (result.kind === "multiple") summary.multiple += 1;
    else if (result.kind === "not-found") summary.notFound += 1;
    else if (result.kind === "connection") {
      summary.connection = true;
      break;
    }
  }
  return summary;
}

export async function unmatchRslUseCase(orderId: string): Promise<boolean> {
  return withTransaction(async (client) => {
    await lockOrder(client, orderId);
    return clearRslMatch(client, orderId);
  });
}

export const matchOrder = matchSkuUseCase;
