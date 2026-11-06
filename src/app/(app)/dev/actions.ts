"use server";

import { revalidatePath } from "next/cache";
import {
  getFaultSnapshot,
  isFaultKey,
  resetFaults,
  setFaultEnabled,
} from "@/lib/adapters/faults";
import { requireSession } from "@/lib/auth/require-session";
import {
  createSessionRecord,
  setSessionCookie,
} from "@/lib/auth/sessions";
import { withTransaction } from "@/lib/db";
import { unlockAllAdmins } from "@/lib/queries/admin";
import type { FaultKey } from "@/lib/workflow";
import { seedDatabase } from "../../../../db/seed/index";

export type DevActionResult =
  | { success: true; faults: Record<FaultKey, boolean> }
  | { success: false; error: "invalidFault" | "databaseFailure" };

/** Toggle one approved development fault after authenticating the caller. */
export async function setFaultAction(
  key: string,
  enabled: boolean,
): Promise<DevActionResult> {
  await requireSession();
  if (!isFaultKey(key) || typeof enabled !== "boolean") {
    return { success: false, error: "invalidFault" };
  }

  setFaultEnabled(key, enabled);
  revalidatePath("/", "layout");
  return { success: true, faults: getFaultSnapshot() };
}

/** Clear every simulated failure without touching business data. */
export async function resetFaultsAction(): Promise<DevActionResult> {
  await requireSession();
  resetFaults();
  revalidatePath("/", "layout");
  return { success: true, faults: getFaultSnapshot() };
}

/** Reset PostgreSQL data and replace the session removed by the reset. */
export async function resetSampleDataAction(): Promise<DevActionResult> {
  const currentSession = await requireSession();

  try {
    await seedDatabase({ reset: true });
    const newSession = await withTransaction((client) =>
      createSessionRecord(currentSession.adminId, client),
    );
    await setSessionCookie(newSession);
    resetFaults();
    revalidatePath("/", "layout");
    return { success: true, faults: getFaultSnapshot() };
  } catch {
    return { success: false, error: "databaseFailure" };
  }
}

/** UC 1A test aid: clear failed attempts and locks on every Admin account. */
export async function unlockAccountsAction(): Promise<
  { success: true; unlocked: number } | { success: false }
> {
  await requireSession();
  try {
    return { success: true, unlocked: await unlockAllAdmins() };
  } catch {
    return { success: false };
  }
}
