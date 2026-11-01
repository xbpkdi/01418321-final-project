import "server-only";
import type { RakutenAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { withTransaction } from "@/lib/db";
import { lockOrder, saveVerifiedOrder } from "@/lib/queries/orders";
import { matchSkuUseCase } from "@/lib/use-cases/match-order";
import { checkStockUseCase } from "@/lib/use-cases/check-stock";
import type { VerifyResult } from "@/lib/workflow";

export async function verifyOrderUseCase(
  input: { orderId: string; shippingMethod: string; adminId: string },
  rakuten: RakutenAdapter = getExternalAdapters().rakuten,
): Promise<VerifyResult> {
  const snapshot = await withTransaction((client) =>
    lockOrder(client, input.orderId),
  );
  if (!snapshot || snapshot.order_status !== "รอตรวจสอบคำสั่งซื้อ") {
    return "already";
  }

  const latest = await rakuten.fetchOrderState(snapshot.marketplace_order_id);
  if (!latest.ok) return "marketplace";

  const channelSku = latest.data.channel_sku ?? snapshot.channel_sku;
  const variation = latest.data.variation ?? snapshot.variation;
  const quantity = latest.data.qty ?? snapshot.qty;
  const shippingAddress =
    latest.data.shipping_address ?? snapshot.shipping_address;
  const marketplaceMethod =
    latest.data.shipping_method ?? snapshot.shipping_method;
  const shippingMethod = input.shippingMethod.trim() || marketplaceMethod;

  if (!channelSku.trim() || !shippingAddress.trim() || !shippingMethod.trim()) {
    await withTransaction(async (client) => {
      const current = await lockOrder(client, input.orderId);
      if (!current || current.order_status !== "รอตรวจสอบคำสั่งซื้อ") return;
      await saveVerifiedOrder(client, {
        orderId: input.orderId,
        channelSku,
        variation,
        quantity,
        shippingAddress,
        shippingMethod,
        status: "รอดำเนินการด้วยตนเอง",
        manualReason: "incomplete",
        customerCancelRequested: current.customer_cancel_requested,
        verifiedAt: null,
        shippingMethodChanged: false,
        adminId: input.adminId,
        cancelReason: null,
        cancelledAt: null,
      });
    });
    return "incomplete";
  }
  if (!Number.isInteger(quantity) || quantity <= 0) return "qty";

  const customerCancelled =
    snapshot.customer_cancel_requested ||
    latest.data.customer_cancel_request === true;
  const now = new Date();
  if (customerCancelled) {
    await withTransaction(async (client) => {
      const current = await lockOrder(client, input.orderId);
      if (!current || current.order_status !== "รอตรวจสอบคำสั่งซื้อ") return;
      await saveVerifiedOrder(client, {
        orderId: input.orderId,
        channelSku,
        variation,
        quantity,
        shippingAddress,
        shippingMethod,
        status: "ยกเลิกแล้ว",
        manualReason: null,
        customerCancelRequested: true,
        verifiedAt: null,
        shippingMethodChanged: false,
        adminId: input.adminId,
        cancelReason: "ลูกค้ายกเลิกผ่าน Rakuten",
        cancelledAt: now,
      });
    });
    return "customer-cancelled";
  }

  await withTransaction(async (client) => {
    const current = await lockOrder(client, input.orderId);
    if (!current || current.order_status !== "รอตรวจสอบคำสั่งซื้อ") return;
    await saveVerifiedOrder(client, {
      orderId: input.orderId,
      channelSku,
      variation,
      quantity,
      shippingAddress,
      shippingMethod,
      status: "รอจับคู่กฎ SKU",
      manualReason: null,
      customerCancelRequested: false,
      verifiedAt: now,
      shippingMethodChanged: shippingMethod !== current.shipping_method,
      adminId: input.adminId,
      cancelReason: null,
      cancelledAt: null,
    });
  });

  if ((await matchSkuUseCase(input.orderId)) === "ok") {
    await checkStockUseCase(input.orderId);
  }
  return "ok";
}

export const verifyOrder = verifyOrderUseCase;
