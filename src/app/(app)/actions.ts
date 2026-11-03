"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { mapDatabaseError, type SafeError } from "@/lib/db/errors";
import { importOrdersUseCase } from "@/lib/use-cases/import-orders";
import { verifyOrderUseCase } from "@/lib/use-cases/verify-order";
import {
  matchAllRslUseCase,
  matchRslUseCase,
  unmatchRslUseCase,
} from "@/lib/use-cases/match-order";
import { cancelOrderUseCase } from "@/lib/use-cases/cancel-order";

type MutationResult<T> =
  | { success: true; result: T }
  | { success: false; error: SafeError["messageKey"] };

async function runMutation<T>(work: () => Promise<T>): Promise<MutationResult<T>> {
  try {
    const result = await work();
    revalidatePath("/", "layout");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: mapDatabaseError(error).messageKey };
  }
}

function safeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 100 ? trimmed : null;
}

export async function importOrdersAction() {
  await requireSession();
  return runMutation(() => importOrdersUseCase());
}

export async function verifyOrderAction(orderId: string, shippingMethod: string) {
  const session = await requireSession();
  const validOrderId = safeId(orderId);
  const validMethod = safeId(shippingMethod);
  if (!validOrderId || !validMethod) {
    return {
      success: true as const,
      result: "incomplete" as const,
    };
  }
  return runMutation(() =>
    verifyOrderUseCase({
      orderId: validOrderId,
      shippingMethod: validMethod,
      adminId: session.adminId,
    }),
  );
}

export async function matchRslAction(orderId: string, chosen?: string) {
  await requireSession();
  const validOrderId = safeId(orderId);
  const validChosen = chosen === undefined ? undefined : safeId(chosen);
  if (!validOrderId || (chosen !== undefined && !validChosen)) {
    return {
      success: true as const,
      result: { kind: "not-allowed" } as const,
    };
  }
  return runMutation(() =>
    matchRslUseCase(validOrderId, validChosen ?? undefined),
  );
}

export async function matchAllRslAction() {
  await requireSession();
  return runMutation(() => matchAllRslUseCase());
}

export async function unmatchRslAction(orderId: string) {
  await requireSession();
  const validOrderId = safeId(orderId);
  if (!validOrderId) return { success: true as const, result: false };
  return runMutation(() => unmatchRslUseCase(validOrderId));
}

export async function cancelOrderAction(
  orderId: string,
  reason: string,
  alsoCancelPo: boolean,
) {
  await requireSession();
  const validOrderId = safeId(orderId);
  if (!validOrderId || typeof reason !== "string" || reason.length > 2_000) {
    return {
      success: true as const,
      result: { kind: "no-reason" } as const,
    };
  }
  return runMutation(() =>
    cancelOrderUseCase({
      orderId: validOrderId,
      reason,
      alsoCancelPo: alsoCancelPo === true,
    }),
  );
}
