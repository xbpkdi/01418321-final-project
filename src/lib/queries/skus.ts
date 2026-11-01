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
