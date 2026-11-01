"use client";

import { DatabaseZap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/context";
import type { SafeError } from "@/lib/db/errors";

export function DatabaseErrorState({ error }: { error: SafeError }) {
  const router = useRouter();
  const t = useT();

  return (
    <main className="grid min-h-[70dvh] place-items-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <DatabaseZap className="text-destructive size-8" aria-hidden />
          <CardTitle>{t.errors.dataLoadTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-muted-foreground text-sm" role="alert">
            {t.errors[error.messageKey]}
          </p>
          <Button className="w-fit" onClick={() => router.refresh()}>
            {t.errors.retry}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
