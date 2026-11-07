import "server-only";
import { randomUUID } from "node:crypto";
import type { QueryExecutor } from "@/lib/db";
import { mapAdapterError } from "@/lib/db/errors";
import { insertAutoErrorLog } from "@/lib/queries/auto-error-logs";

/** Record a safe adapter failure for an automatic step (FR-017). */
export async function logAdapterFailure(
  client: QueryExecutor,
  input: {
    useCaseId: "2S" | "3S" | "6S";
    contextKey: string;
    failure: Parameters<typeof mapAdapterError>[0];
  },
): Promise<void> {
  const safe = mapAdapterError(input.failure);
  await insertAutoErrorLog(client, {
    logId: randomUUID(),
    useCaseId: input.useCaseId,
    contextKey: input.contextKey,
    errorCode: safe.code,
    safeMessage: safe.messageKey,
  });
}
