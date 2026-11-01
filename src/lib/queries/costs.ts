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
