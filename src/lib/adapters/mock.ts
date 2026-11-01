import "server-only";
import type {
  AdapterFactories,
  MarketplaceOrderUpdate,
  NewMarketplaceOrder,
} from "@/lib/adapters/contracts";
import {
  SEED_ORDERS,
  SEED_RMS_CANCEL_REQUESTS,
  SEED_RMS_INBOX,
} from "@/mock/orders";
import { findRslMatches } from "@/mock/rsl";
import { trackCarrier } from "@/mock/delivery";
import { SEED_STOCK } from "@/mock/products";

function marketplaceOrder(
  order: (typeof SEED_RMS_INBOX)[number],
): NewMarketplaceOrder {
  return {
    marketplace_order_id: order.marketplace_order_id,
    sales_channel: order.sales_channel,
    order_date: order.order_date,
    channel_sku: order.channel_sku,
    product_name: order.product_name,
    variation: order.variation,
    qty: order.qty,
    shipping_address: order.shipping_address,
    shipping_method: order.shipping_method,
  };
}

export const mockAdapterFactories: AdapterFactories = {
  rakuten: {
    mock: () => ({
      async fetchOrders() {
        return {
          ok: true,
          data: {
            orders: SEED_RMS_INBOX.map(marketplaceOrder),
            cancellationRequests: [...SEED_RMS_CANCEL_REQUESTS],
          },
        };
      },
      async fetchOrderState(marketplaceOrderId) {
        const source = [...SEED_RMS_INBOX, ...SEED_ORDERS].find(
          (order) => order.marketplace_order_id === marketplaceOrderId,
        );
        const data: MarketplaceOrderUpdate = source
          ? {
              ...marketplaceOrder(source),
              customer_cancel_request:
                SEED_RMS_CANCEL_REQUESTS.includes(marketplaceOrderId),
            }
          : { marketplace_order_id: marketplaceOrderId };
        return { ok: true, data };
      },
      async notifyTracking() {
        return { ok: true, data: undefined };
      },
      async syncStock() {
        return { ok: true, data: undefined };
      },
    }),
  },
  rsl: {
    mock: () => ({
      async matchOrder(order) {
        return { ok: true, data: findRslMatches(order.sku, order.variation) };
      },
      async getStock(sku) {
        const row = SEED_STOCK.find((stock) => stock.sku === sku);
        return row?.rsl_qty === null || row?.rsl_qty === undefined
          ? {
              ok: false,
              error: { code: "unavailable", retryable: true },
            }
          : { ok: true, data: row.rsl_qty };
      },
    }),
  },
  labelService: {
    mock: () => ({
      async generateLabels(order, parcelRules) {
        const rule = parcelRules.find(
          (candidate) =>
            candidate.shipping_method === order.shipping_method &&
            candidate.sales_channel === order.sales_channel,
        );
        if (!rule) {
          return {
            ok: false,
            error: { code: "invalid_response", retryable: false },
          };
        }
        return {
          ok: true,
          data: [
            {
              label_template: rule.label_template,
              rsl_no: order.rsl_reference_id ?? "",
              parcel_seq: 1,
              parcel_total: 1,
            },
          ],
        };
      },
    }),
  },
  printer: {
    mock: () => ({
      async printLabel() {
        return { ok: true, data: undefined };
      },
    }),
  },
  carrier: {
    mock: () => ({
      async getDeliveryStatus(trackingNumber) {
        return {
          ok: true,
          data: trackCarrier(trackingNumber).delivery_status,
        };
      },
    }),
  },
  supplier: {
    mock: () => ({
      async sendPurchaseOrder(_reorder, requestId) {
        return {
          ok: true,
          data: { supplierReference: `MOCK-${requestId}` },
        };
      },
    }),
  },
};
