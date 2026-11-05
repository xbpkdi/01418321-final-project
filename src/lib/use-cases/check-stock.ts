import "server-only";
import type { RslAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { getPool, withTransaction } from "@/lib/db";
import { lockOrder } from "@/lib/queries/orders";
import {
  getOrderStock,
  saveStockRoute,
} from "@/lib/queries/stock";
import { chooseStockRoute } from "@/lib/workflow";

export type StockCheckResult =
  | "not-pending"
  | "missing-stock"
  | "enough"
  | "low";

/** UC 3S: combine confirmed in-house stock with the RSL adapter reading. */
export async function checkStockUseCase(
  orderId: string,
  rsl: RslAdapter = getExternalAdapters().rsl,
): Promise<StockCheckResult> {
  const order = await withTransaction((client) => lockOrder(client, orderId));
  if (!order || order.order_status !== "รอตรวจสอบสต๊อก" || !order.sku) {
    return "not-pending";
  }

  const stock = await getOrderStock(getPool(), order.sku);
  if (!stock) return "missing-stock";

  const external = await rsl.getStock(order.sku);
  const rslQuantity = external.ok ? external.data : null;
  const route = chooseStockRoute(
    order.qty,
    stock.inHouseQuantity,
    rslQuantity,
  );

  await withTransaction(async (client) => {
    const current = await lockOrder(client, orderId);
    if (!current || current.order_status !== "รอตรวจสอบสต๊อก") return;
    await saveStockRoute(
      client,
      stock.stockId,
      rslQuantity,
      orderId,
      route === "enough" ? "ยังไม่ได้จับคู่" : "รอ Admin ตัดสินใจสั่งซื้อ",
    );
  });
  return route;
}

export const checkStock = checkStockUseCase;
