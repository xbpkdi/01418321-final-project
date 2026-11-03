import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { CostComponents, CostLog } from "@/types/product";

interface CostRow extends QueryResultRow {
  sku: string;
  purchase_price: string | number | null;
  currency: string;
  exchange_rate: string | number | null;
  exchange_rate_updated_at: Date | string | null;
  intl_freight: string | number | null;
  duty_fee: string | number | null;
  marketplace_fee: string | number | null;
  domestic_shipping: string | number | null;
  rsl_charge: string | number | null;
  order_qty: string | number | null;
  unit_cost: string | number | null;
  calculated_at: Date | string | null;
}

export interface CostWriteRow extends QueryResultRow {
  cost_id: string;
  snapshot: Record<string, unknown>;
  exchange_rate: string | number | null;
  exchange_rate_updated_at: Date | string | null;
}

// UC 4S / Q4S.1-Q4S.2: read cost components and the last persisted result.
export const Q4S_1 = `
  SELECT
    sku.sku,
    costs.purchase_price,
    costs.currency,
    costs.exchange_rate,
    costs.exchange_rate_updated_at,
    costs.intl_freight,
    costs.duty_fee,
    costs.marketplace_fee,
    costs.domestic_shipping,
    costs.rsl_charge,
    costs.order_qty,
    costs.unit_cost,
    costs.calculated_at
  FROM costs
  INNER JOIN skus sku ON sku.sku_id = costs.sku_id
  ORDER BY sku.sku, costs.calculated_at NULLS LAST, costs.cost_id
`;

function numberOrNull(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export async function listCosts(
  executor: QueryExecutor = getPool(),
): Promise<{ costs: CostComponents[]; costLog: CostLog[] }> {
  const result = await executor.query<CostRow>(Q4S_1);
  const costs = result.rows.map<CostComponents>((row) => ({
    sku: row.sku,
    purchase_price: numberOrNull(row.purchase_price),
    currency: row.currency,
    exchange_rate: numberOrNull(row.exchange_rate),
    exchange_rate_updated_at: iso(row.exchange_rate_updated_at),
    intl_freight: numberOrNull(row.intl_freight),
    duty_fee: numberOrNull(row.duty_fee),
    marketplace_fee: numberOrNull(row.marketplace_fee),
    domestic_shipping: numberOrNull(row.domestic_shipping),
    rsl_charge: numberOrNull(row.rsl_charge),
    order_qty: numberOrNull(row.order_qty),
  }));

  const costLog = result.rows.flatMap<CostLog>((row) => {
    const calculatedAt = iso(row.calculated_at);
    const values = [
      row.purchase_price,
      row.exchange_rate,
      row.intl_freight,
      row.duty_fee,
      row.marketplace_fee,
      row.domestic_shipping,
      row.rsl_charge,
      row.order_qty,
      row.unit_cost,
    ];
    if (!calculatedAt || values.some((value) => value === null)) return [];
    return [
      {
        sku: row.sku,
        unit_cost: Number(row.unit_cost),
        components: {
          purchase_price: Number(row.purchase_price),
          currency: row.currency,
          exchange_rate: Number(row.exchange_rate),
          intl_freight: Number(row.intl_freight),
          duty_fee: Number(row.duty_fee),
          marketplace_fee: Number(row.marketplace_fee),
          domestic_shipping: Number(row.domestic_shipping),
          rsl_charge: Number(row.rsl_charge),
          order_qty: Number(row.order_qty),
        },
        calculated_at: calculatedAt,
        calculated_by: "system",
      },
    ];
  });

  return { costs, costLog };
}

// UC 4S / Q4S.1: lock the current saved components before a cost change.
export const Q4S_1_FOR_UPDATE = `
  SELECT
    costs.cost_id,
    to_jsonb(costs) AS snapshot,
    costs.exchange_rate,
    costs.exchange_rate_updated_at
  FROM costs
  WHERE costs.sku_id = $1
  ORDER BY costs.calculated_at DESC NULLS LAST, costs.cost_id
  LIMIT 1
  FOR UPDATE
`;

export async function lockCost(
  executor: QueryExecutor,
  skuId: string,
): Promise<CostWriteRow | null> {
  const result = await executor.query<CostWriteRow>(Q4S_1_FOR_UPDATE, [skuId]);
  return result.rows[0] ?? null;
}

// UC 4S / Q4S.1-Q4S.2: save remembered components and the latest calculated
// unit cost. A new SKU gets one canonical cost row.
export const Q4S_2_SAVE = `
  INSERT INTO costs (
    cost_id, purchase_price, currency, exchange_rate, exchange_rate_updated_at,
    intl_freight, duty_fee, marketplace_fee, domestic_shipping, rsl_charge,
    order_qty, unit_cost, calculated_at, sku_id
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13
  )
  ON CONFLICT (cost_id) DO UPDATE SET
    purchase_price = EXCLUDED.purchase_price,
    currency = EXCLUDED.currency,
    exchange_rate = EXCLUDED.exchange_rate,
    exchange_rate_updated_at = EXCLUDED.exchange_rate_updated_at,
    intl_freight = EXCLUDED.intl_freight,
    duty_fee = EXCLUDED.duty_fee,
    marketplace_fee = EXCLUDED.marketplace_fee,
    domestic_shipping = EXCLUDED.domestic_shipping,
    rsl_charge = EXCLUDED.rsl_charge,
    order_qty = EXCLUDED.order_qty,
    unit_cost = EXCLUDED.unit_cost,
    calculated_at = CURRENT_TIMESTAMP
  RETURNING cost_id
`;

export async function saveCost(
  executor: QueryExecutor,
  input: {
    costId: string;
    skuId: string;
    cost: CostComponents;
    unitCost: number | null;
  },
): Promise<string> {
  const result = await executor.query<{ cost_id: string }>(Q4S_2_SAVE, [
    input.costId,
    input.cost.purchase_price,
    input.cost.currency,
    input.cost.exchange_rate,
    input.cost.exchange_rate_updated_at,
    input.cost.intl_freight,
    input.cost.duty_fee,
    input.cost.marketplace_fee,
    input.cost.domestic_shipping,
    input.cost.rsl_charge,
    input.cost.order_qty,
    input.unitCost,
    input.skuId,
  ]);
  return result.rows[0].cost_id;
}

export const Q4S_1_SELLING_PRICE = `
  SELECT selling_price FROM skus WHERE sku_id = $1
`;

export async function getSkuSellingPrice(
  executor: QueryExecutor,
  skuId: string,
): Promise<number | null> {
  const result = await executor.query<{ selling_price: string | number | null }>(
    Q4S_1_SELLING_PRICE,
    [skuId],
  );
  const value = result.rows[0]?.selling_price;
  return value === null || value === undefined ? null : Number(value);
}
