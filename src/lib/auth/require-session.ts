import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/sessions";

/**
 * UC 1A post-condition: server routes require a live database session.
 * Data loaders and future Server Actions must also call this DAL primitive.
 */
export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");

  return {
    sessionId: session.session_id,
    adminId: session.admin_id,
    userEmail: session.user_email,
    expiresAt: session.expires_at,
  };
});

