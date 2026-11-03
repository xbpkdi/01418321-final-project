import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { StockLevel } from "@/types/product";

interface StockRow extends QueryResultRow {
  sku: string;
  in_house_qty: number | string;
  rsl_qty: number | string | null;
  updated_at: Date | string;
}

// UC 3S / Q3S.1: read current in-house and RSL stock for every SKU.
export const Q3S_1 = `
  SELECT sku.sku, stock.in_house_qty, stock.rsl_qty, stock.updated_at
  FROM stock
  INNER JOIN skus sku ON sku.sku_id = stock.sku_id
  ORDER BY sku.sku
`;

export async function listStock(
  executor: QueryExecutor = getPool(),
): Promise<StockLevel[]> {
  const result = await executor.query<StockRow>(Q3S_1);
  return result.rows.map((row) => ({
    sku: row.sku,
    in_house_qty: Number(row.in_house_qty),
    rsl_qty: row.rsl_qty === null ? null : Number(row.rsl_qty),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
  }));
}
