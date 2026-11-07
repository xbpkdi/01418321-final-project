import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";

export interface AdminCredentialRow extends QueryResultRow {
  admin_id: string;
  user_email: string;
  user_password: string;
  fail_attempts: number;
  locked_until: Date | null;
  last_login: Date | null;
}

/** UC 1A: the 5th failed password locks the account for 15 minutes. */
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;

// UC 1A / Q1A.1: find the registered Admin by email.
export const Q1A_1 = `
  SELECT admin_id, user_email, user_password, fail_attempts, locked_until,
    last_login
  FROM admins
  WHERE user_email = $1
`;

// UC 1A / Q1A.2 (provisional): count a failed password attempt. The attempt
// that reaches the limit sets the end of the lock ($2 = now, $3 = limit,
// $4 = lock minutes). fail_attempts on the right side is the old value.
export const Q1A_2 = `
  UPDATE admins
  SET fail_attempts = fail_attempts + 1,
      locked_until = CASE
        WHEN fail_attempts + 1 >= $3
          THEN $2::timestamptz + make_interval(mins => $4::integer)
        ELSE locked_until
      END
  WHERE admin_id = $1
  RETURNING fail_attempts, locked_until
`;

// UC 1A / Q1A.2 (provisional): clear an expired lock before checking the
// password again; the /dev "unlock account" control uses it too.
export const Q1A_2_UNLOCK = `
  UPDATE admins
  SET fail_attempts = 0, locked_until = NULL
  WHERE admin_id = $1
`;

// UC 1A / Q1A.3 (provisional): reset failures and record a successful login.
export const Q1A_3 = `
  UPDATE admins
  SET fail_attempts = 0, locked_until = NULL, last_login = $2
  WHERE admin_id = $1
`;

export async function findAdminByEmail(
  email: string,
  executor: QueryExecutor = getPool(),
): Promise<AdminCredentialRow | null> {
  const result = await executor.query<AdminCredentialRow>(Q1A_1, [email]);
  return result.rows[0] ?? null;
}

export async function recordFailedLogin(
  adminId: string,
  now: Date,
  executor: QueryExecutor = getPool(),
): Promise<{ failAttempts: number; lockedUntil: Date | null }> {
  const result = await executor.query<{
    fail_attempts: number;
    locked_until: Date | null;
  }>(Q1A_2, [adminId, now, LOGIN_MAX_ATTEMPTS, LOGIN_LOCK_MINUTES]);
  const row = result.rows[0];
  return {
    failAttempts: row?.fail_attempts ?? 0,
    lockedUntil: row?.locked_until ?? null,
  };
}

export async function unlockAdmin(
  adminId: string,
  executor: QueryExecutor = getPool(),
): Promise<void> {
  await executor.query(Q1A_2_UNLOCK, [adminId]);
}

export async function recordSuccessfulLogin(
  adminId: string,
  loggedInAt: Date,
  executor: QueryExecutor = getPool(),
): Promise<void> {
  await executor.query(Q1A_3, [adminId, loggedInAt]);
}


// /dev only (not a UC step): unlock every account that has failed attempts
// or a lock, so the 1A lock path can be tested again without a reset.
export const Q_DEV_UNLOCK_ADMINS = `
  UPDATE admins
  SET fail_attempts = 0, locked_until = NULL
  WHERE fail_attempts > 0 OR locked_until IS NOT NULL
  RETURNING admin_id
`;

export async function unlockAllAdmins(
  executor: QueryExecutor = getPool(),
): Promise<number> {
  const result = await executor.query(Q_DEV_UNLOCK_ADMINS);
  return result.rowCount ?? 0;
}
