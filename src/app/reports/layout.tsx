import { AuthGuard } from "@/components/app-shell/auth-guard";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
