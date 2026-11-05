"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { mapDatabaseError, type SafeError } from "@/lib/db/errors";
import { importOrdersUseCase } from "@/lib/use-cases/import-orders";
import { verifyOrderUseCase } from "@/lib/use-cases/verify-order";
import {
  matchAllRslUseCase,
  matchRslUseCase,
  unmatchRslUseCase,
} from "@/lib/use-cases/match-order";
import { cancelOrderUseCase } from "@/lib/use-cases/cancel-order";
import {
  deleteProductUseCase,
  importProductsUseCase,
  saveProductUseCase,
  setProductActiveUseCase,
} from "@/lib/use-cases/products";
import { adjustStockUseCase } from "@/lib/use-cases/stock";
import { calculateCostUseCase } from "@/lib/use-cases/costs";
import {
  decideReorderUseCase,
  purchaseReorderUseCase,
  receiveReorderUseCase,
} from "@/lib/use-cases/reorders";
import { formatLabelsUseCase } from "@/lib/use-cases/format-labels";
import { printLabelsUseCase } from "@/lib/use-cases/print-label";
import { dispatchOrdersUseCase } from "@/lib/use-cases/dispatch-order";
import { pollCarrierUseCase } from "@/lib/use-cases/poll-carrier";
import { notifyTrackingUseCase } from "@/lib/use-cases/notify-tracking";
import { cleanupOrdersUseCase } from "@/lib/use-cases/cleanup-orders";
import type { CleanupPlan } from "@/lib/workflow";
import { COST_KEYS, type Product } from "@/types/product";
import type { CostForm } from "@/lib/workflow";

type MutationResult<T> =
  | { success: true; result: T }
  | { success: false; error: SafeError["messageKey"] };

async function runMutation<T>(work: () => Promise<T>): Promise<MutationResult<T>> {
  try {
    const result = await work();
    revalidatePath("/", "layout");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: mapDatabaseError(error).messageKey };
  }
}

function safeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 100 ? trimmed : null;
}

function isCostForm(value: unknown): value is CostForm {
  if (!value || typeof value !== "object") return false;
  const form = value as Record<string, unknown>;
  return (
    typeof form.currency === "string" &&
    form.currency.length <= 20 &&
    COST_KEYS.every(
      (key) => typeof form[key] === "string" && form[key].length <= 100,
    )
  );
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;
  const product = value as Record<string, unknown>;
  return (
    ["sku", "product_name", "variation", "channel_sku", "supplier_id"].every(
      (key) =>
        typeof product[key] === "string" && product[key].length <= 500,
    ) &&
    product.sales_channel === "Rakuten Ichiba" &&
    typeof product.reorder_threshold === "number" &&
    typeof product.reorder_qty === "number" &&
    (product.selling_price === null ||
      typeof product.selling_price === "number") &&
    typeof product.active === "boolean"
  );
}

export async function importOrdersAction() {
  await requireSession();
  return runMutation(() => importOrdersUseCase());
}

export async function verifyOrderAction(orderId: string, shippingMethod: string) {
  const session = await requireSession();
  const validOrderId = safeId(orderId);
  const validMethod = safeId(shippingMethod);
  if (!validOrderId || !validMethod) {
    return {
      success: true as const,
      result: "incomplete" as const,
    };
  }
  return runMutation(() =>
    verifyOrderUseCase({
      orderId: validOrderId,
      shippingMethod: validMethod,
      adminId: session.adminId,
    }),
  );
}

export async function matchRslAction(orderId: string, chosen?: string) {
  await requireSession();
  const validOrderId = safeId(orderId);
  const validChosen = chosen === undefined ? undefined : safeId(chosen);
  if (!validOrderId || (chosen !== undefined && !validChosen)) {
    return {
      success: true as const,
      result: { kind: "not-allowed" } as const,
    };
  }
  return runMutation(async () => {
    return matchRslUseCase(validOrderId, validChosen ?? undefined);
  });
}

export async function matchAllRslAction() {
  await requireSession();
  return runMutation(async () => {
    return matchAllRslUseCase();
  });
}

export async function unmatchRslAction(orderId: string) {
  await requireSession();
  const validOrderId = safeId(orderId);
  if (!validOrderId) return { success: true as const, result: false };
  return runMutation(() => unmatchRslUseCase(validOrderId));
}

export async function cancelOrderAction(
  orderId: string,
  reason: string,
  alsoCancelPo: boolean,
) {
  await requireSession();
  const validOrderId = safeId(orderId);
  if (!validOrderId || typeof reason !== "string" || reason.length > 2_000) {
    return {
      success: true as const,
      result: { kind: "no-reason" } as const,
    };
  }
  return runMutation(() =>
    cancelOrderUseCase({
      orderId: validOrderId,
      reason,
      alsoCancelPo: alsoCancelPo === true,
    }),
  );
}

export async function saveProductAction(
  draft: Product,
  originalSku: string | null,
  costForm: CostForm,
) {
  const session = await requireSession();
  if (
    !isProduct(draft) ||
    !isCostForm(costForm) ||
    (originalSku !== null && !safeId(originalSku))
  ) {
    return {
      success: true as const,
      result: { result: "incomplete" as const, requeued: 0 },
    };
  }
  return runMutation(() =>
    saveProductUseCase({
      draft,
      originalSku,
      costForm,
      adminId: session.adminId,
    }),
  );
}

export async function setProductActiveAction(sku: string, active: boolean) {
  await requireSession();
  const validSku = safeId(sku);
  if (!validSku) return { success: true as const, result: false };
  return runMutation(() =>
    setProductActiveUseCase({ sku: validSku, active: active === true }),
  );
}

export async function deleteProductAction(sku: string) {
  await requireSession();
  const validSku = safeId(sku);
  if (!validSku) {
    return { success: true as const, result: "not-found" as const };
  }
  return runMutation(() => deleteProductUseCase(validSku));
}

export async function importProductsAction(csv: string) {
  const session = await requireSession();
  if (typeof csv !== "string" || csv.length > 900_000) {
    return { success: true as const, result: [] };
  }
  return runMutation(() =>
    importProductsUseCase({ csv, adminId: session.adminId }),
  );
}

export async function adjustStockAction(input: {
  sku: string;
  inHouseQuantity: number;
  rslQuantity: number | null;
  reason: string;
}) {
  const session = await requireSession();
  if (!input) return { success: true as const, result: "invalid" as const };
  const validSku = safeId(input?.sku);
  if (
    !validSku ||
    typeof input.inHouseQuantity !== "number" ||
    (input.rslQuantity !== null && typeof input.rslQuantity !== "number") ||
    typeof input.reason !== "string"
  ) {
    return { success: true as const, result: "invalid" as const };
  }
  return runMutation(() =>
    adjustStockUseCase({
      ...input,
      sku: validSku,
      adminId: session.adminId,
    }),
  );
}

export async function calculateCostAction(
  sku: string,
  form: CostForm,
  remember: boolean,
) {
  const session = await requireSession();
  const validSku = safeId(sku);
  if (!validSku) {
    return {
      success: true as const,
      result: { ok: false as const, reason: "not-found" as const },
    };
  }
  if (!isCostForm(form)) {
    return {
      success: true as const,
      result: { ok: false as const, reason: "invalid" as const },
    };
  }
  return runMutation(() =>
    calculateCostUseCase({
      sku: validSku,
      form,
      remember: remember === true,
      adminId: session.adminId,
    }),
  );
}

export async function decideReorderAction(
  orderId: string,
  decision: "คุ้มค่า" | "ไม่คุ้มค่า",
  quantity: number,
) {
  await requireSession();
  const validOrderId = safeId(orderId);
  if (
    !validOrderId ||
    (decision !== "คุ้มค่า" && decision !== "ไม่คุ้มค่า") ||
    typeof quantity !== "number"
  ) {
    return { success: true as const, result: "not-pending" as const };
  }
  return runMutation(() =>
    decideReorderUseCase({ orderId: validOrderId, decision, quantity }),
  );
}

export async function purchaseReorderAction(
  sku: string,
  quantity: number,
  confirmDuplicate: boolean,
) {
  await requireSession();
  const validSku = safeId(sku);
  if (!validSku || typeof quantity !== "number") {
    return {
      success: true as const,
      result: { kind: "not-configured" as const },
    };
  }
  return runMutation(() =>
    purchaseReorderUseCase({
      sku: validSku,
      quantity,
      confirmDuplicate: confirmDuplicate === true,
    }),
  );
}

export async function receiveReorderAction(reorderId: string, quantity: number) {
  const session = await requireSession();
  const validReorderId = safeId(reorderId);
  if (!validReorderId) {
    return { success: true as const, result: { kind: "not-found" as const } };
  }
  if (typeof quantity !== "number") {
    return { success: true as const, result: { kind: "invalid-qty" as const } };
  }
  return runMutation(() =>
    receiveReorderUseCase({
      reorderId: validReorderId,
      quantity,
      adminId: session.adminId,
    }),
  );
}

export async function formatLabelsAction() {
  await requireSession();
  return runMutation(() => formatLabelsUseCase());
}

export async function printLabelsAction(
  orderIds: string[],
  reprint: boolean,
) {
  const session = await requireSession();
  const validIds = Array.isArray(orderIds)
    ? orderIds.map(safeId).filter((id): id is string => id !== null).slice(0, 100)
    : [];
  if (validIds.length === 0) return { success: true as const, result: [] };
  return runMutation(() =>
    printLabelsUseCase({
      orderIds: validIds,
      reprint: reprint === true,
      adminId: session.adminId,
    }),
  );
}

export async function dispatchOrdersAction(orderIds: string[]) {
  await requireSession();
  const validIds = Array.isArray(orderIds)
    ? orderIds.map(safeId).filter((id): id is string => id !== null).slice(0, 100)
    : [];
  if (validIds.length === 0) return { success: true as const, result: [] };
  return runMutation(() => dispatchOrdersUseCase(validIds));
}

export async function pollCarrierAction() {
  await requireSession();
  return runMutation(() => pollCarrierUseCase());
}

export async function notifyTrackingAction(
  orderId: string,
  confirmResend: boolean,
) {
  const session = await requireSession();
  const validOrderId = safeId(orderId);
  if (!validOrderId) {
    return { success: true as const, result: "incomplete" as const };
  }
  return runMutation(() =>
    notifyTrackingUseCase({
      orderId: validOrderId,
      confirmResend: confirmResend === true,
      adminId: session.adminId,
    }),
  );
}

export async function cleanupOrdersAction(items: CleanupPlan["items"]) {
  const session = await requireSession();
  const validTypes = new Set(["order", "cost", "label", "reorder"]);
  const validItems = Array.isArray(items)
    ? items
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            validTypes.has(item.data_type) &&
            safeId(item.record_id) !== null &&
            typeof item.detail === "string" &&
            item.detail.length <= 2_000,
        )
        .slice(0, 1_000)
    : [];
  if (validItems.length === 0) {
    return {
      success: true as const,
      result: { ok: true as const, deleted: 0, skipped: 0 },
    };
  }
  return runMutation(() =>
    cleanupOrdersUseCase({ items: validItems, adminId: session.adminId }),
  );
}
