import type { DeliveryStatus, Order, SalesChannel } from "@/types/order";
import type { PurchaseOrder } from "@/types/product";

export type AdapterFailureCode =
  | "unavailable"
  | "rejected"
  | "invalid_response";

export type AdapterFailure = {
  code: AdapterFailureCode;
  retryable: boolean;
  /** Opaque provider reference safe to include in internal support logs. */
  referenceId?: string;
};

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AdapterFailure };

export type NewMarketplaceOrder = Pick<
  Order,
  | "marketplace_order_id"
  | "sales_channel"
  | "order_date"
  | "channel_sku"
  | "product_name"
  | "variation"
  | "qty"
  | "shipping_address"
  | "shipping_method"
>;

export type MarketplaceOrderBatch = {
  orders: NewMarketplaceOrder[];
  cancellationRequests: string[];
};

export type MarketplaceOrderUpdate = Partial<NewMarketplaceOrder> & {
  marketplace_order_id: string;
  customer_cancel_request?: boolean;
};

export interface RakutenAdapter {
  /** UC 4A and 4A alternative #3. */
  fetchOrders(): Promise<AdapterResult<MarketplaceOrderBatch>>;
  /** UC 2A. */
  fetchOrderState(
    marketplaceOrderId: string,
  ): Promise<AdapterResult<MarketplaceOrderUpdate>>;
  /** UC 5S; sends through the configured sales channel. */
  notifyTracking(
    orderRef: string,
    trackingNumber: string,
    attemptId: string,
  ): Promise<AdapterResult<void>>;
  /** UC 7S alternative #1; quantity is absolute so retry is idempotent. */
  syncStock(
    channelSku: string,
    availableQuantity: number,
  ): Promise<AdapterResult<void>>;
}

export type RslMatch = {
  rsl_order_id: string;
  rsl_sku: string;
  rsl_variation: string;
  rsl_stock_qty: number;
};

export interface RslAdapter {
  /** UC 1S alternative #4. */
  matchOrder(order: Pick<Order, "sku" | "variation">): Promise<AdapterResult<RslMatch[]>>;
  /** UC 3S alternatives #1 and #3. */
  getStock(sku: string): Promise<AdapterResult<number>>;
}

export type LabelOrder = Pick<
  Order,
  | "order_id"
  | "sales_channel"
  | "rsl_reference_id"
  | "shipping_address"
  | "shipping_method"
>;

export type LabelRule = {
  shipping_method: string;
  sales_channel: SalesChannel;
  label_template: string;
  max_items_per_parcel: number;
};

export type GeneratedLabel = {
  label_template: string;
  rsl_no: string;
  parcel_seq: number;
  parcel_total: number;
};

export interface LabelServiceAdapter {
  /** UC 6S. */
  generateLabels(
    order: LabelOrder,
    parcelRules: readonly LabelRule[],
  ): Promise<AdapterResult<GeneratedLabel[]>>;
}

export interface PrinterAdapter {
  /** UC 9A alternatives #2 and #3. */
  printLabel(
    label: GeneratedLabel,
    printAttemptId: string,
  ): Promise<AdapterResult<void>>;
}

export interface CarrierAdapter {
  /** UC 8A alternative #4. */
  getDeliveryStatus(
    trackingNumber: string,
  ): Promise<AdapterResult<DeliveryStatus>>;
}

export interface SupplierAdapter {
  /** UC 6A alternative #3. */
  sendPurchaseOrder(
    reorder: PurchaseOrder,
    requestId: string,
  ): Promise<AdapterResult<{ supplierReference: string }>>;
}

export type ExternalAdapters = {
  rakuten: RakutenAdapter;
  rsl: RslAdapter;
  labelService: LabelServiceAdapter;
  printer: PrinterAdapter;
  carrier: CarrierAdapter;
  supplier: SupplierAdapter;
};

export type AdapterName = keyof ExternalAdapters;
export type AdapterMode = "mock";
export type AdapterConfig = Readonly<Record<AdapterName, AdapterMode>>;

export type AdapterFactories = {
  [K in AdapterName]: Record<AdapterMode, () => ExternalAdapters[K]>;
};
