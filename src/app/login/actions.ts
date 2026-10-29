"use server";

import { redirect } from "next/navigation";
import { withTransaction } from "@/lib/db";
import { mapDatabaseError } from "@/lib/db/errors";
import {
  findAdminByEmail,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/queries/admin";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionRecord,
  revokeCurrentSession,
  setSessionCookie,
} from "@/lib/auth/sessions";

const EMAIL_PATTERN = /^[A-Za-z0-9]+@[A-Za-z0-9]+\.[A-Za-z0-9]+$/;

export type LoginActionResult =
  | "incomplete"
  | "email-format"
  | "locked"
  | "wrong"
  | "databaseUnavailable"
  | "databaseFailure";

export type LoginActionState = { result: LoginActionResult } | null;

/** UC 1A: validate credentials, update counters, and create a DB session. */
export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const emailValue = formData.get("user_email");
  const passwordValue = formData.get("user_password");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (!email || !password.trim()) return { result: "incomplete" };
  if (!EMAIL_PATTERN.test(email)) return { result: "email-format" };

  let newSession:
    | Awaited<ReturnType<typeof createSessionRecord>>
    | undefined;

  try {
    const result = await withTransaction(async (client) => {
      const admin = await findAdminByEmail(email, client);
      if (!admin) return "wrong" as const;
      if (admin.fail_attempts >= 5) return "locked" as const;

      const valid = await verifyPassword(password, admin.user_password);
      if (!valid) {
        await recordFailedLogin(admin.admin_id, client);
        return "wrong" as const;
      }

      const now = new Date();
      await recordSuccessfulLogin(admin.admin_id, now, client);
      newSession = await createSessionRecord(admin.admin_id, client, now);
      return "ok" as const;
    });

    if (result !== "ok") return { result };
  } catch (error) {
    const safeError = mapDatabaseError(error);
    return {
      result:
        safeError.code === "database_unavailable"
          ? "databaseUnavailable"
          : "databaseFailure",
    };
  }

  if (!newSession) return { result: "databaseFailure" };
  await setSessionCookie(newSession);
  redirect("/dashboard");
}

/** UC 1A step 4: revoke only the current session and return to login. */
export async function logoutAction(): Promise<never> {
  try {
    await revokeCurrentSession();
  } catch {
    // The HttpOnly cookie is deleted in revokeCurrentSession's finally block.
    // A database outage must not trap the Admin on a protected page.
  }
  redirect("/login");
}
