import "server-only";
import { getPool, type QueryExecutor } from "@/lib/db";

// UC 2S Q2S.3 / UC 3S Q3S.1 / UC 6S Q6S.2 / UC 7S Q7S.5:
// shared append-only safe automation error record required by FR-017.
export const Q_AUTO_ERROR_LOG = `
  INSERT INTO auto_error_logs (
    auto_error_log_id, use_case_id, context_key, error_code, safe_message
  ) VALUES ($1, $2, $3, $4, $5)
`;

export async function insertAutoErrorLog(
  executor: QueryExecutor,
  input: {
    logId: string;
    useCaseId: "2S" | "3S" | "6S" | "7S";
    contextKey: string;
    errorCode: string;
    safeMessage: string;
  },
): Promise<void> {
  await executor.query(Q_AUTO_ERROR_LOG, [
    input.logId,
    input.useCaseId,
    input.contextKey,
    input.errorCode,
    input.safeMessage,
  ]);
}

// /dev page: newest safe automation error records.
export const Q_AUTO_ERROR_LOG_RECENT = `
  SELECT use_case_id, context_key, error_code, safe_message, occurred_at
  FROM auto_error_logs
  ORDER BY occurred_at DESC, auto_error_log_id DESC
  LIMIT $1
`;

export async function listRecentAutoErrorLogs(
  executor: QueryExecutor = getPool(),
  limit = 50,
): Promise<
  {
    at: string;
    message: string;
    useCaseId: string;
    contextKey: string;
    errorCode: string;
  }[]
> {
  const result = await executor.query<{
    use_case_id: string;
    context_key: string;
    error_code: string;
    safe_message: string;
    occurred_at: Date | string;
  }>(Q_AUTO_ERROR_LOG_RECENT, [limit]);
  return result.rows.map((row) => ({
    at:
      row.occurred_at instanceof Date
        ? row.occurred_at.toISOString()
        : row.occurred_at,
    message: row.safe_message,
    useCaseId: row.use_case_id,
    contextKey: row.context_key,
    errorCode: row.error_code,
  }));
}
