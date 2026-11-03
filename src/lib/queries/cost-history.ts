import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { CostKey, CostLog } from "@/types/product";

export type CostHistoryValue = Record<CostKey, number | null> & {
  currency: string;
  unit_cost: number | null;
};

interface CostHistoryRow extends QueryResultRow {
  sku: string;
  new_value: CostHistoryValue;
  admin_id: string;
  changed_at: Date | string;
}

// UC 4S / Q4S.2: append-only history used by the calculation screen/report.
export const Q4S_2_HISTORY = `
  SELECT sku.sku, history.new_value, history.admin_id, history.changed_at
  FROM cost_history history
  INNER JOIN skus sku ON sku.sku_id = history.sku_id
  ORDER BY history.changed_at, history.cost_history_id
`;

export async function listCostHistory(
  executor: QueryExecutor = getPool(),
): Promise<CostLog[]> {
  const result = await executor.query<CostHistoryRow>(Q4S_2_HISTORY);
  return result.rows.flatMap<CostLog>((row) => {
    const values = [
      row.new_value.purchase_price,
      row.new_value.exchange_rate,
      row.new_value.intl_freight,
      row.new_value.duty_fee,
      row.new_value.order_qty,
      row.new_value.marketplace_fee,
      row.new_value.domestic_shipping,
      row.new_value.rsl_charge,
      row.new_value.unit_cost,
    ];
    if (values.some((value) => value === null)) return [];
    return [{
      sku: row.sku,
      unit_cost: Number(row.new_value.unit_cost),
      components: {
        purchase_price: Number(row.new_value.purchase_price),
        exchange_rate: Number(row.new_value.exchange_rate),
        intl_freight: Number(row.new_value.intl_freight),
        duty_fee: Number(row.new_value.duty_fee),
        order_qty: Number(row.new_value.order_qty),
        marketplace_fee: Number(row.new_value.marketplace_fee),
        domestic_shipping: Number(row.new_value.domestic_shipping),
        rsl_charge: Number(row.new_value.rsl_charge),
        currency: row.new_value.currency,
      },
      calculated_at:
        row.changed_at instanceof Date
          ? row.changed_at.toISOString()
          : row.changed_at,
      calculated_by: row.admin_id,
    }];
  });
}

export const Q4S_2_INSERT_HISTORY = `
  INSERT INTO cost_history (
    cost_history_id, sku_id, cost_id, previous_value, new_value, admin_id
  ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
`;

export async function insertCostHistory(
  executor: QueryExecutor,
  input: {
    historyId: string;
    skuId: string;
    costId: string | null;
    previousValue: Record<string, unknown> | null;
    newValue: CostHistoryValue;
    adminId: string;
  },
): Promise<void> {
  await executor.query(Q4S_2_INSERT_HISTORY, [
    input.historyId,
    input.skuId,
    input.costId,
    input.previousValue ? JSON.stringify(input.previousValue) : null,
    JSON.stringify(input.newValue),
    input.adminId,
  ]);
}
