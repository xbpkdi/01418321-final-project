import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";

export interface AdminCredentialRow extends QueryResultRow {
  admin_id: string;
  user_email: string;
  user_password: string;
  fail_attempts: number;
  last_login: Date | null;
}

// UC 1A / Q1A.1 (provisional): find the registered Admin by email.
export const Q1A_1 = `
  SELECT admin_id, user_email, user_password, fail_attempts, last_login
  FROM admins
  WHERE user_email = $1
`;

// UC 1A / Q1A.2 (provisional): count a failed password attempt.
export const Q1A_2 = `
  UPDATE admins
  SET fail_attempts = fail_attempts + 1
  WHERE admin_id = $1
  RETURNING fail_attempts
`;

// UC 1A / Q1A.3 (provisional): reset failures and record a successful login.
export const Q1A_3 = `
  UPDATE admins
  SET fail_attempts = 0, last_login = $2
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
  executor: QueryExecutor = getPool(),
): Promise<number> {
  const result = await executor.query<{ fail_attempts: number }>(Q1A_2, [
    adminId,
  ]);
  return result.rows[0]?.fail_attempts ?? 0;
}

export async function recordSuccessfulLogin(
  adminId: string,
  loggedInAt: Date,
  executor: QueryExecutor = getPool(),
): Promise<void> {
  await executor.query(Q1A_3, [adminId, loggedInAt]);
}

