// โครงหน้าอิง shadcn block sidebar-16 (sticky site header เต็มความกว้าง + sidebar ด้านล่าง)

import { Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { SiteHeader } from "@/components/app-shell/site-header";
import { DatabaseErrorState } from "@/components/shared/database-error-state";
import { PageLoading } from "@/components/shared/page-loading";
import { requireSession } from "@/lib/auth/require-session";
import { mapDatabaseError } from "@/lib/db/errors";
import { loadAppState } from "@/lib/queries/app-state";
import { StoreProvider } from "@/lib/store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
    </Suspense>
  );
}

async function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  let initialState;
  try {
    initialState = await loadAppState(session);
  } catch (error) {
    return <DatabaseErrorState error={mapDatabaseError(error)} />;
  }

  return (
    <StoreProvider initialState={initialState}>
      <TooltipProvider>
        <div className="[--header-height:calc(--spacing(14))]">
          <SidebarProvider className="flex flex-col">
            <SiteHeader />
            <div className="flex flex-1">
              <AppSidebar adminEmail={session.userEmail} />
              <SidebarInset>
                <main className="flex-1">{children}</main>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </div>
      </TooltipProvider>
    </StoreProvider>
  );
}
