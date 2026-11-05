import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { Product, Supplier } from "@/types/product";

interface SkuRow extends QueryResultRow {
  sku: string;
  product_name: string;
  variation: string;
  sales_channel: "Rakuten Ichiba";
  channel_sku: string;
  supplier_id: string | null;
  reorder_threshold: number | string;
  reorder_qty: number | string;
  selling_price: number | string | null;
  sku_status: string;
}

interface SupplierRow extends QueryResultRow {
  supplier_id: string;
  supplier_name: string;
  contact_info: string;
  lead_time_days: number | string;
}

export interface SkuWriteRow extends QueryResultRow {
  sku_id: string;
  sku: string;
  channel_sku: string;
}

// UC 3A / Q3A.1: read registered SKU rules and product master data.
export const Q3A_1 = `
  SELECT
    sku, product_name, variation, sales_channel, channel_sku, supplier_id,
    reorder_threshold, reorder_qty, selling_price, sku_status
  FROM skus
  ORDER BY sku
`;

// UC 6A / Q6A.2: read suppliers displayed with product and reorder data.
export const Q6A_2 = `
  SELECT supplier_id, supplier_name, contact_info, lead_time_days
  FROM suppliers
  ORDER BY supplier_name, supplier_id
`;

export async function listSkus(
  executor: QueryExecutor = getPool(),
): Promise<Product[]> {
  const result = await executor.query<SkuRow>(Q3A_1);
  return result.rows.map((row) => ({
    sku: row.sku,
    product_name: row.product_name,
    variation: row.variation,
    sales_channel: row.sales_channel,
    channel_sku: row.channel_sku,
    supplier_id: row.supplier_id ?? "",
    reorder_threshold: Number(row.reorder_threshold),
    reorder_qty: Number(row.reorder_qty),
    selling_price:
      row.selling_price === null ? null : Number(row.selling_price),
    active: row.sku_status === "active",
  }));
}
export async function listSuppliers(
  executor: QueryExecutor = getPool(),
): Promise<Supplier[]> {
  const result = await executor.query<SupplierRow>(Q6A_2);
  return result.rows.map((row) => ({
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    contact_info: row.contact_info,
    lead_time: Number(row.lead_time_days),
  }));
}

// UC 3A / Q3A.1: lock a SKU rule before editing or removing it.
export const Q3A_1_FOR_UPDATE = `
  SELECT sku_id, sku, channel_sku
  FROM skus
  WHERE sku = $1
  FOR UPDATE
`;

export async function lockSku(
  executor: QueryExecutor,
  sku: string,
): Promise<SkuWriteRow | null> {
  const result = await executor.query<SkuWriteRow>(Q3A_1_FOR_UPDATE, [sku]);
  return result.rows[0] ?? null;
}

// UC 3A / Q3A.1: enforce both internal and marketplace SKU uniqueness before
// returning a domain validation result to the UI.
export const Q3A_1_FIND_CONFLICT = `
  SELECT sku_id, sku, channel_sku
  FROM skus
  WHERE (sku = $1 OR channel_sku = $2)
    AND ($3::text IS NULL OR sku_id <> $3)
  LIMIT 1
`;

export async function findSkuConflict(
  executor: QueryExecutor,
  sku: string,
  channelSku: string,
  excludedSkuId: string | null,
): Promise<SkuWriteRow | null> {
  const result = await executor.query<SkuWriteRow>(Q3A_1_FIND_CONFLICT, [
    sku,
    channelSku,
    excludedSkuId,
  ]);
  return result.rows[0] ?? null;
}

export const Q6A_2_SUPPLIER_EXISTS = `
  SELECT EXISTS (
    SELECT 1 FROM suppliers WHERE supplier_id = $1
  ) AS found
`;

export async function supplierExists(
  executor: QueryExecutor,
  supplierId: string,
): Promise<boolean> {
  const result = await executor.query<{ found: boolean }>(
    Q6A_2_SUPPLIER_EXISTS,
    [supplierId],
  );
  return result.rows[0]?.found ?? false;
}

// UC 3A / Q3A.1: add a SKU rule and its initial zero stock atomically.
export const Q3A_1_INSERT = `
  WITH inserted_sku AS (
    INSERT INTO skus (
      sku_id, sku, product_name, variation, sales_channel, channel_sku,
      selling_price, reorder_threshold, reorder_qty, sku_status, supplier_id
    ) VALUES ($1, $2, $3, $4, 'Rakuten Ichiba', $5, $6, $7, $8, $9, $10)
    RETURNING sku_id
  )
  INSERT INTO stock (stock_id, in_house_qty, rsl_qty, updated_at, sku_id)
  SELECT $11, 0, 0, CURRENT_TIMESTAMP, sku_id FROM inserted_sku
`;

export async function insertSku(
  executor: QueryExecutor,
  input: Product & { skuId: string; stockId: string },
): Promise<void> {
  await executor.query(Q3A_1_INSERT, [
    input.skuId,
    input.sku,
    input.product_name,
    input.variation,
    input.channel_sku,
    input.selling_price,
    input.reorder_threshold,
    input.reorder_qty,
    input.active ? "active" : "inactive",
    input.supplier_id || null,
    input.stockId,
  ]);
}

// UC 3A / Q3A.1: edit the existing rule while retaining its stable sku_id so
// stock, costs, Order items, and reorder references remain valid.
export const Q3A_1_UPDATE = `
  UPDATE skus
  SET sku = $2,
      product_name = $3,
      variation = $4,
      channel_sku = $5,
      selling_price = $6,
      reorder_threshold = $7,
      reorder_qty = $8,
      sku_status = $9,
      supplier_id = $10
  WHERE sku_id = $1
`;

export async function updateSku(
  executor: QueryExecutor,
  skuId: string,
  input: Product,
): Promise<void> {
  await executor.query(Q3A_1_UPDATE, [
    skuId,
    input.sku,
    input.product_name,
    input.variation,
    input.channel_sku,
    input.selling_price,
    input.reorder_threshold,
    input.reorder_qty,
    input.active ? "active" : "inactive",
    input.supplier_id || null,
  ]);
}

export const Q3A_1_SET_STATUS = `
  UPDATE skus SET sku_status = $2 WHERE sku_id = $1
`;

export async function setSkuStatus(
  executor: QueryExecutor,
  skuId: string,
  active: boolean,
): Promise<void> {
  await executor.query(Q3A_1_SET_STATUS, [
    skuId,
    active ? "active" : "inactive",
  ]);
}

// UC 3A / Q3A.1: return Orders that became actionable after a rule change.
export const Q3A_1_REQUEUE = `
  WITH registered_items AS (
    UPDATE order_items
    SET sku_id = $2
    WHERE sku_id IS NULL AND (channel_sku = $1 OR channel_sku = $4)
    RETURNING order_id
  )
  UPDATE orders o
  SET order_status = CASE
        WHEN o.manual_reason = 'sku-rule' THEN 'รอจับคู่กฎ SKU'
        WHEN o.manual_reason = 'sku-unregistered' THEN 'รอตรวจสอบคำสั่งซื้อ'
        ELSE 'รอ Admin ตัดสินใจสั่งซื้อ'
      END,
      manual_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
  FROM order_items item
  WHERE item.order_id = o.order_id
    AND o.order_status = 'รอดำเนินการด้วยตนเอง'
    AND (
      (o.manual_reason = 'sku-rule' AND item.channel_sku = $1)
      OR (
        o.manual_reason = 'sku-unregistered'
        AND item.order_id IN (SELECT order_id FROM registered_items)
      )
      OR (o.manual_reason = 'price' AND item.sku_id = $2 AND $3::boolean)
    )
  RETURNING o.order_id
`;

export async function requeueOrdersForSku(
  executor: QueryExecutor,
  input: {
    skuId: string;
    sku: string;
    channelSku: string;
    hasSellingPrice: boolean;
  },
): Promise<number> {
  const result = await executor.query<{ order_id: string }>(Q3A_1_REQUEUE, [
    input.channelSku,
    input.skuId,
    input.hasSellingPrice,
    input.sku,
  ]);
  return result.rowCount ?? 0;
}

// UC 3A alternative #1 / Q3A.1: a SKU with any business reference cannot be
// deleted; the UI offers deactivation instead.
export const Q3A_1_HAS_RELATED = `
  SELECT EXISTS (
    SELECT 1 FROM order_items WHERE sku_id = $1
    UNION ALL
    SELECT 1 FROM reorders WHERE sku_id = $1
  ) AS has_related
`;

export async function skuHasRelatedRecords(
  executor: QueryExecutor,
  skuId: string,
): Promise<boolean> {
  const result = await executor.query<{ has_related: boolean }>(
    Q3A_1_HAS_RELATED,
    [skuId],
  );
  return result.rows[0]?.has_related ?? false;
}

export const Q3A_1_DELETE = `
  WITH removed_history AS (
    DELETE FROM cost_history WHERE sku_id = $1
  ), removed_costs AS (
    DELETE FROM costs WHERE sku_id = $1
  ), removed_stock AS (
    DELETE FROM stock WHERE sku_id = $1
  )
  DELETE FROM skus WHERE sku_id = $1
`;

export async function deleteSku(
  executor: QueryExecutor,
  skuId: string,
): Promise<void> {
  await executor.query(Q3A_1_DELETE, [skuId]);
}
