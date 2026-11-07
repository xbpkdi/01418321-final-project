"use server";

import { redirect } from "next/navigation";
import { withTransaction } from "@/lib/db";
import { mapDatabaseError } from "@/lib/db/errors";
import {
  findAdminByEmail,
  LOGIN_MAX_ATTEMPTS,
  recordFailedLogin,
  recordSuccessfulLogin,
  unlockAdmin,
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

/** `retryMinutes` is set only for "locked": minutes left until auto-unlock. */
export type LoginActionState = {
  result: LoginActionResult;
  retryMinutes?: number;
} | null;

function minutesUntil(until: Date, now: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
}

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
    const result = await withTransaction<LoginActionState | "ok">(
      async (client) => {
        const now = new Date();
        const admin = await findAdminByEmail(email, client);
        // Unknown email: no account to count against, same generic message.
        if (!admin) return { result: "wrong" };
        if (admin.locked_until && admin.locked_until > now) {
          return {
            result: "locked",
            retryMinutes: minutesUntil(admin.locked_until, now),
          };
        }
        // The lock has ended (or a legacy row has no end time): start over.
        if (admin.locked_until || admin.fail_attempts >= LOGIN_MAX_ATTEMPTS) {
          await unlockAdmin(admin.admin_id, client);
        }

        const valid = await verifyPassword(password, admin.user_password);
        if (!valid) {
          const failed = await recordFailedLogin(admin.admin_id, now, client);
          // The 5th failure locks the account and says so right away.
          if (failed.lockedUntil && failed.lockedUntil > now) {
            return {
              result: "locked",
              retryMinutes: minutesUntil(failed.lockedUntil, now),
            };
          }
          return { result: "wrong" };
        }

        await recordSuccessfulLogin(admin.admin_id, now, client);
        newSession = await createSessionRecord(admin.admin_id, client, now);
        return "ok";
      },
    );

    if (result !== "ok") return result;
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
