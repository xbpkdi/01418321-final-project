import { Suspense } from "react";
import { DatabaseErrorState } from "@/components/shared/database-error-state";
import { PageLoading } from "@/components/shared/page-loading";
import { requireSession } from "@/lib/auth/require-session";
import { mapDatabaseError } from "@/lib/db/errors";
import { loadAppState } from "@/lib/queries/app-state";
import { StoreProvider } from "@/lib/store";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthenticatedReports>{children}</AuthenticatedReports>
    </Suspense>
  );
}

async function AuthenticatedReports({
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
  return <StoreProvider initialState={initialState}>{children}</StoreProvider>;
}
