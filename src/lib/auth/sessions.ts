import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { QueryExecutor } from "@/lib/db";
import {
  findActiveSession,
  insertSession,
  revokeSession,
  type SessionRow,
} from "@/lib/queries/sessions";

export const SESSION_COOKIE = "rsl_session";
const DEFAULT_SESSION_HOURS = 8;

type NewSession = {
  token: string;
  expiresAt: Date;
};

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

function sessionHours(): number {
  const configured = Number(process.env.SESSION_DURATION_HOURS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_SESSION_HOURS;
}

/** UC 1A: create the database record inside the caller's login transaction. */
export async function createSessionRecord(
  adminId: string,
  executor: QueryExecutor,
  now = new Date(),
): Promise<NewSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + sessionHours() * 60 * 60 * 1000);

  await insertSession(
    {
      sessionId: randomUUID(),
      adminId,
      tokenHash: tokenHash(token),
      createdAt: now,
      expiresAt,
    },
    executor,
  );

  return { token, expiresAt };
}

/** Next.js 16 cookies() is async; cookie mutation stays in Server Actions. */
export async function setSessionCookie(session: NewSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
}

/** UC 1A: verify the opaque cookie against the durable server-side session. */
export async function getSession(): Promise<SessionRow | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findActiveSession(tokenHash(token), new Date());
}

/** UC 1A step 4: revoke the active record and remove the browser cookie. */
export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  try {
    if (token) {
      await revokeSession(tokenHash(token), new Date());
    }
  } finally {
    cookieStore.delete(SESSION_COOKIE);
  }
}
