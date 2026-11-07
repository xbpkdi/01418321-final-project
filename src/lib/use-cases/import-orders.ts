import "server-only";
import { createHash } from "node:crypto";
import type { RakutenAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { withTransaction } from "@/lib/db";
import {
  findSkuRules,
  insertImportedOrder,
  markMarketplaceCancellation,
} from "@/lib/queries/orders";
import { chooseSkuRule, isImportableOrder, type ImportResult } from "@/lib/workflow";

function importedOrderId(marketplaceOrderId: string): string {
  const digest = createHash("sha256")
    .update(marketplaceOrderId)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `ORD-${digest}`;
}

/** UC 4A: fetch, validate, deduplicate, and persist the marketplace batch. */
export async function importOrdersUseCase(
  rakuten: RakutenAdapter = getExternalAdapters().rakuten,
): Promise<ImportResult> {
  const batch = await rakuten.fetchOrders();
  if (!batch.ok) return { ok: false };

  return withTransaction(async (client) => {
    let imported = 0;
    let duplicates = 0;
    let incomplete = 0;
    let unregistered = 0;

    for (const order of batch.data.orders) {
      if (!isImportableOrder(order)) {
        incomplete += 1;
        continue;
      }

      const rules = await findSkuRules(
        client,
        order.channel_sku,
        order.sales_channel,
      );
      const rule = chooseSkuRule(rules);
      const registered = rule.kind === "matched";
      const orderId = importedOrderId(order.marketplace_order_id);
      const inserted = await insertImportedOrder(client, {
        orderId,
        marketplaceOrderId: order.marketplace_order_id,
        salesChannel: order.sales_channel,
        orderDate: order.order_date,
        shippingAddress: order.shipping_address,
        shippingMethod: order.shipping_method,
        status: registered
          ? "รอตรวจสอบคำสั่งซื้อ"
          : "รอดำเนินการด้วยตนเอง",
        manualReason: registered ? null : "sku-unregistered",
        orderItemId: `${orderId}-ITEM-1`,
        channelSku: order.channel_sku,
        variation: order.variation,
        quantity: order.qty,
        // Placeholder for the NOT NULL column; 3S (Q3S.1) sets the real source.
        fulfillSource: "rsl",
        skuId: registered ? rule.value.sku_id : null,
      });

      if (!inserted) {
        duplicates += 1;
        continue;
      }
      imported += 1;
      if (!registered) unregistered += 1;
    }

    const cancelRequested: string[] = [];
    for (const marketplaceOrderId of batch.data.cancellationRequests) {
      const marked = await markMarketplaceCancellation(
        client,
        marketplaceOrderId,
      );
      if (marked && marked.status !== "รอตรวจสอบคำสั่งซื้อ") {
        cancelRequested.push(marked.orderId);
      }
    }

    return {
      ok: true,
      imported,
      duplicates,
      incomplete,
      unregistered,
      cancelRequested,
    };
  });
}

export const importOrders = importOrdersUseCase;
