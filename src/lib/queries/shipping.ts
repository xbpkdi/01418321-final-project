import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";

export interface LabelReadModel extends QueryResultRow {
  order_id: string;
  label_template: string;
  parcel_total: number;
  printed_at: Date | string | null;
}

// UC 9A / Q9A.1: read the persisted labels used by the print queue/report.
export const Q9A_1 = `
  SELECT
    order_id,
    MAX(label_template) AS label_template,
    MAX(parcel_total)::integer AS parcel_total,
    MAX(printed_at) AS printed_at
  FROM labels
  GROUP BY order_id
  ORDER BY order_id
`;

export async function listLabels(
  executor: QueryExecutor = getPool(),
): Promise<LabelReadModel[]> {
  const result = await executor.query<LabelReadModel>(Q9A_1);
  return result.rows;
}
