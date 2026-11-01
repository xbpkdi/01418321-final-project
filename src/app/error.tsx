"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useT();
  useEffect(() => {
    console.error("Unhandled application error", error.digest);
  }, [error]);

  return (
    <main className="grid min-h-[70dvh] place-items-center p-6">
      <div className="bg-card grid max-w-lg gap-4 rounded-xl border p-6">
        <h1 className="text-xl font-semibold">{t.errors.dataLoadTitle}</h1>
        <p className="text-muted-foreground text-sm" role="alert">
          {t.errors.databaseUnavailable}
        </p>
        <Button className="w-fit" onClick={retry}>
          {t.errors.retry}
        </Button>
      </div>
    </main>
  );
}
