import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { RslAdapter } from "@/lib/adapters/contracts";
import { insertAutoErrorLog } from "@/lib/queries/auto-error-logs";
import type { OrderWorkflowRow } from "@/lib/queries/orders";
import {
  getOrderStock,
  saveStockRoute,
} from "@/lib/queries/stock";
import { logAdapterFailure } from "@/lib/use-cases/log-auto-error";
import { chooseStockRoute } from "@/lib/workflow";

export type StockCheckResult = "missing-stock" | "rsl" | "in_house" | "low";

/**
 * UC 3S: compare in-house stock and the RSL adapter reading with the Order
 * quantity, then save the shipping source. Runs inside `executeWorkflow` on
 * an Order locked at "รอตรวจสอบสต๊อก". RSL Orders go to 1S RSL matching
 * ("ยังไม่ได้จับคู่"); in-house Orders are shipped by the company, have no
 * RSL reference, and go straight to 6S ("รอจัดรูปแบบใบปะสินค้า").
 */
export async function checkStockUseCase(
  client: PoolClient,
  order: OrderWorkflowRow & { sku: string },
  rsl: RslAdapter,
): Promise<StockCheckResult> {
  const stock = await getOrderStock(client, order.sku);
  if (!stock) {
    await insertAutoErrorLog(client, {
      logId: randomUUID(),
      useCaseId: "3S",
      contextKey: order.order_id,
      errorCode: "stock_missing",
      safeMessage: "Stock record is unavailable",
    });
    return "missing-stock";
  }
  const external = await rsl.getStock(order.sku);
  if (!external.ok) {
    await logAdapterFailure(client, {
      useCaseId: "3S",
      contextKey: order.order_id,
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
    order.order_id,
    route === "low"
      ? "รอ Admin ตัดสินใจสั่งซื้อ"
      : route === "rsl"
        ? "ยังไม่ได้จับคู่"
        : "รอจัดรูปแบบใบปะสินค้า",
    route === "low" ? null : route,
  );
  return route;
}
