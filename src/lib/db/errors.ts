import type { AdapterFailure } from "@/lib/adapters/contracts";

export type SafeErrorCode =
  | "database_unavailable"
  | "database_failure"
  | "external_unavailable"
  | "external_rejected"
  | "external_invalid_response";

export type SafeError = {
  code: SafeErrorCode;
  messageKey:
    | "databaseUnavailable"
    | "databaseFailure"
    | "externalUnavailable"
    | "externalRejected"
    | "externalInvalidResponse";
  retryable: boolean;
  referenceId?: string;
};

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

/** Map database exceptions to a safe result without returning driver messages. */
export function mapDatabaseError(error: unknown): SafeError {
  const driverCode = getErrorCode(error);
  const unavailable =
    driverCode?.startsWith("08") === true ||
    (driverCode !== undefined && CONNECTION_ERROR_CODES.has(driverCode));

  return unavailable
    ? {
        code: "database_unavailable",
        messageKey: "databaseUnavailable",
        retryable: true,
      }
    : {
        code: "database_failure",
        messageKey: "databaseFailure",
        retryable: false,
      };
}

/** Map an adapter result to an application code; never expose provider text. */
export function mapAdapterError(failure: AdapterFailure): SafeError {
  const errorInfo: Record<
    AdapterFailure["code"],
    { code: SafeErrorCode; messageKey: SafeError["messageKey"] }
  > = {
    unavailable: {
      code: "external_unavailable",
      messageKey: "externalUnavailable",
    },
    rejected: {
      code: "external_rejected",
      messageKey: "externalRejected",
    },
    invalid_response: {
      code: "external_invalid_response",
      messageKey: "externalInvalidResponse",
    },
  };

  return {
    ...errorInfo[failure.code],
    retryable: failure.retryable,
    ...(failure.referenceId ? { referenceId: failure.referenceId } : {}),
  };
}
