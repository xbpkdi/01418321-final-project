import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db";
import {
  deleteSku,
  findSkuConflict,
  insertSku,
  lockSku,
  requeueOrdersForSku,
  setSkuStatus,
  skuHasRelatedRecords,
  supplierExists,
  updateSku,
} from "@/lib/queries/skus";
import { saveCostDraft } from "@/lib/use-cases/costs";
import type {
  CostForm,
  CsvRowResult,
  ProductResult,
} from "@/lib/workflow";
import type { Product } from "@/types/product";

function cleanProduct(draft: Product): Product {
  return {
    ...draft,
    sku: draft.sku.trim(),
    product_name: draft.product_name.trim(),
    variation: draft.variation.trim(),
    channel_sku: draft.channel_sku.trim(),
    supplier_id: draft.supplier_id.trim(),
  };
}

function validateProduct(draft: Product): ProductResult {
  if (
    !draft.product_name ||
    !draft.sku ||
    !draft.variation ||
    !draft.channel_sku
  ) {
    return "incomplete";
  }
  const positiveInt = (value: number) =>
    Number.isInteger(value) && value > 0;
  if (
    !positiveInt(draft.reorder_threshold) ||
    !positiveInt(draft.reorder_qty) ||
    (draft.selling_price !== null &&
      (!Number.isFinite(draft.selling_price) || draft.selling_price < 0))
  ) {
    return "invalid-number";
  }
  return "ok";
}

async function saveProductInTransaction(
  client: PoolClient,
  input: {
    draft: Product;
    originalSku: string | null;
    costForm?: CostForm;
    adminId: string;
  },
): Promise<{ result: ProductResult; requeued: number }> {
  const draft = cleanProduct(input.draft);
  const validation = validateProduct(draft);
  if (validation !== "ok") return { result: validation, requeued: 0 };

  const original = input.originalSku
    ? await lockSku(client, input.originalSku)
    : null;
  if (input.originalSku && !original) {
    return { result: "duplicate", requeued: 0 };
  }
  const conflict = await findSkuConflict(
    client,
    draft.sku,
    draft.channel_sku,
    original?.sku_id ?? null,
  );
  if (conflict) return { result: "duplicate", requeued: 0 };
  if (draft.supplier_id && !(await supplierExists(client, draft.supplier_id))) {
    return { result: "incomplete", requeued: 0 };
  }

  const skuId = original?.sku_id ?? `SKU-${randomUUID()}`;
  if (original) {
    await updateSku(client, skuId, draft);
  } else {
    await insertSku(client, {
      ...draft,
      skuId,
      stockId: `STOCK-${randomUUID()}`,
    });
  }

  if (input.costForm) {
    await saveCostDraft(client, {
      sku: draft.sku,
      form: input.costForm,
      adminId: input.adminId,
      allowIncomplete: true,
      remember: true,
    });
  }

  const requeued = await requeueOrdersForSku(client, {
    skuId,
    sku: draft.sku,
    channelSku: draft.channel_sku,
    hasSellingPrice: draft.selling_price !== null,
  });
  return { result: "ok", requeued };
}

export async function saveProductUseCase(input: {
  draft: Product;
  originalSku: string | null;
  costForm: CostForm;
  adminId: string;
}): Promise<{ result: ProductResult; requeued: number }> {
  return withTransaction((client) => saveProductInTransaction(client, input));
}

export async function setProductActiveUseCase(input: {
  sku: string;
  active: boolean;
}): Promise<boolean> {
  return withTransaction(async (client) => {
    const row = await lockSku(client, input.sku);
    if (!row) return false;
    await setSkuStatus(client, row.sku_id, input.active);
    return true;
  });
}

export async function deleteProductUseCase(
  sku: string,
): Promise<"has-related" | "not-found" | "ok"> {
  return withTransaction(async (client) => {
    const row = await lockSku(client, sku);
    if (!row) return "not-found";
    if (await skuHasRelatedRecords(client, row.sku_id)) return "has-related";
    await deleteSku(client, row.sku_id);
    return "ok";
  });
}

function parseCsv(csv: string): Product[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  const [header, ...body] = lines;
  const columns = (header ?? "").split(",").map((cell) => cell.trim());
  return body.map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const get = (name: string) => cells[columns.indexOf(name)] ?? "";
    const price = get("selling_price");
    return {
      sku: get("sku"),
      product_name: get("product_name"),
      variation: get("variation"),
      sales_channel: "Rakuten Ichiba",
      channel_sku: get("channel_sku"),
      supplier_id: get("supplier_id"),
      reorder_threshold: Number(get("reorder_threshold")),
      reorder_qty: Number(get("reorder_qty")),
      selling_price: price === "" ? null : Number(price),
      active: true,
    };
  });
}

export async function importProductsUseCase(input: {
  csv: string;
  adminId: string;
}): Promise<CsvRowResult[]> {
  const products = parseCsv(input.csv);
  return withTransaction(async (client) => {
    const rows: CsvRowResult[] = [];
    for (const [index, draft] of products.entries()) {
      const existing = await lockSku(client, draft.sku);
      const saved = await saveProductInTransaction(client, {
        draft,
        originalSku: existing?.sku ?? null,
        adminId: input.adminId,
      });
      rows.push({ row: index + 2, sku: draft.sku, result: saved.result });
    }
    return rows;
  });
}
