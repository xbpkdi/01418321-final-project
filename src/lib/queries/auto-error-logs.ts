import "server-only";
import type { QueryExecutor } from "@/lib/db";

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
