import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { DeletionLog } from "@/lib/workflow";

interface DeletionRow extends QueryResultRow {
  order_reference: string;
  admin_id: string;
  deleted_at: Date | string;
}

// UC 10A / Q10A.6: read the deletion audit shown by cleanup tooling.
export const Q10A_6 = `
  SELECT order_reference, admin_id, deleted_at
  FROM deletion_history
  ORDER BY deleted_at DESC
`;

export async function listDeletionHistory(
  executor: QueryExecutor = getPool(),
): Promise<DeletionLog[]> {
  const result = await executor.query<DeletionRow>(Q10A_6);
  return result.rows.map((row) => ({
    data_type: "order",
    record_id: row.order_reference,
    deleted_at:
      row.deleted_at instanceof Date
        ? row.deleted_at.toISOString()
        : row.deleted_at,
    deleted_by: row.admin_id,
  }));
}
