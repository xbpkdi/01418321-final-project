import "server-only";
import type {
  AdapterFailure,
  AdapterFactories,
  MarketplaceOrderUpdate,
  NewMarketplaceOrder,
} from "@/lib/adapters/contracts";
import { isFaultEnabled } from "@/lib/adapters/faults";
import type { FaultKey } from "@/lib/workflow";
import {
  SEED_ORDERS,
  SEED_RMS_CANCEL_REQUESTS,
  SEED_RMS_INBOX,
} from "@/mock/orders";
import { findRslMatches } from "@/mock/rsl";
import { findLabelRule, findTracking, trackCarrier } from "@/mock/delivery";
import { getPool } from "@/lib/db";
import { getRslQuantity } from "@/lib/queries/stock";

function unavailable(key: FaultKey): { ok: false; error: AdapterFailure } {
  return {
    ok: false,
    error: {
      code: "unavailable",
      retryable: true,
      referenceId: `mock-fault-${key}`,
    },
  };
}

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
        if (isFaultEnabled("rms")) return unavailable("rms");
        return {
          ok: true,
          data: {
            orders: SEED_RMS_INBOX.map(marketplaceOrder),
            cancellationRequests: [...SEED_RMS_CANCEL_REQUESTS],
          },
        };
      },
      async fetchOrderState(marketplaceOrderId) {
        if (isFaultEnabled("marketplaceVerify")) {
          return unavailable("marketplaceVerify");
        }
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
        if (isFaultEnabled("trackingNotify")) {
          return unavailable("trackingNotify");
        }
        return { ok: true, data: undefined };
      },
      async syncStock() {
        if (isFaultEnabled("mpStockSync")) {
          return unavailable("mpStockSync");
        }
        return { ok: true, data: undefined };
      },
    }),
  },
  rsl: {
    mock: () => ({
      async matchOrder(order) {
        if (isFaultEnabled("rsl")) return unavailable("rsl");
        return { ok: true, data: findRslMatches(order.sku, order.variation) };
      },
      async getStock(sku) {
        if (isFaultEnabled("rsl")) return unavailable("rsl");
        const rslQuantity = await getRslQuantity(getPool(), sku);
        return rslQuantity === null
          ? {
              ok: false,
              error: { code: "unavailable", retryable: true },
            }
          : { ok: true, data: rslQuantity };
      },
    }),
  },
  labelService: {
    mock: () => ({
      async generateLabels(order, parcelRules) {
        if (isFaultEnabled("labelService")) {
          return unavailable("labelService");
        }
        const rule = findLabelRule(parcelRules, order);
        if (!rule) {
          return {
            ok: false,
            error: { code: "invalid_response", retryable: false },
          };
        }
        const parcels = Math.max(
          1,
          Math.ceil(order.qty / rule.max_items_per_parcel),
        );
        return {
          ok: true,
          data: Array.from({ length: parcels }, (_, index) => ({
            label_template: rule.label_template,
            // In-house Orders skip 1S and have no RSL reference.
            rsl_no:
              order.fulfill_source === "rsl"
                ? (order.rsl_reference_id ?? "")
                : "",
            parcel_seq: index + 1,
            parcel_total: parcels,
          })),
        };
      },
    }),
  },
  printer: {
    mock: () => ({
      async printLabel() {
        if (isFaultEnabled("printer")) return unavailable("printer");
        return { ok: true, data: undefined };
      },
    }),
  },
  carrier: {
    mock: () => ({
      async getTrackingInfo(orderId) {
        if (isFaultEnabled("carrier")) return unavailable("carrier");
        const info = findTracking(orderId);
        return {
          ok: true,
          data: info
            ? {
                trackingNumber: info.tracking_number,
                carrierName: info.carrier_name,
              }
            : null,
        };
      },
      async getDeliveryStatus(trackingNumber) {
        if (isFaultEnabled("carrier")) return unavailable("carrier");
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
        if (isFaultEnabled("supplierSend")) {
          return unavailable("supplierSend");
        }
        return {
          ok: true,
          data: { supplierReference: `MOCK-${requestId}` },
        };
      },
    }),
  },
};
