import { requireSession } from "@/lib/auth/require-session";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return children;
}
