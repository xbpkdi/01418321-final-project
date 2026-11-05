import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";

export interface SessionRow extends QueryResultRow {
  session_id: string;
  admin_id: string;
  user_email: string;
  created_at: Date;
  expires_at: Date;
}

// UC 1A / Q1A.4 (provisional): persist an opaque, hashed session token.
export const Q1A_4 = `
  INSERT INTO sessions (
    session_id, admin_id, token_hash, created_at, expires_at, revoked_at
  ) VALUES ($1, $2, $3, $4, $5, NULL)
`;

// UC 1A / Q1A.5 (provisional): validate a non-expired, non-revoked session.
export const Q1A_5 = `
  SELECT
    s.session_id,
    s.admin_id,
    a.user_email,
    s.created_at,
    s.expires_at
  FROM sessions AS s
  INNER JOIN admins AS a ON a.admin_id = s.admin_id
  WHERE s.token_hash = $1
    AND s.revoked_at IS NULL
    AND s.expires_at > $2
`;

// UC 1A / Q1A.6 (provisional): logout revokes the current session.
export const Q1A_6 = `
  UPDATE sessions
  SET revoked_at = $2
  WHERE token_hash = $1 AND revoked_at IS NULL
`;

export async function insertSession(
  input: {
    sessionId: string;
    adminId: string;
    tokenHash: string;
    createdAt: Date;
    expiresAt: Date;
  },
  executor: QueryExecutor = getPool(),
): Promise<void> {
  await executor.query(Q1A_4, [
    input.sessionId,
    input.adminId,
    input.tokenHash,
    input.createdAt,
    input.expiresAt,
  ]);
}

export async function findActiveSession(
  tokenHash: string,
  now: Date,
  executor: QueryExecutor = getPool(),
): Promise<SessionRow | null> {
  const result = await executor.query<SessionRow>(Q1A_5, [tokenHash, now]);
  return result.rows[0] ?? null;
}

export async function revokeSession(
  tokenHash: string,
  revokedAt: Date,
  executor: QueryExecutor = getPool(),
): Promise<void> {
  await executor.query(Q1A_6, [tokenHash, revokedAt]);
}

