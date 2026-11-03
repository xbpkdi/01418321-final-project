"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { PageHeader } from "@/components/shared/page-header";
import { useT } from "@/lib/i18n/context";
import { FAULT_KEYS, type FaultKey } from "@/lib/workflow";
import {
  resetFaultsAction,
  resetSampleDataAction,
  setFaultAction,
} from "./actions";

export function DevToolsClient({
  initialFaults,
}: {
  initialFaults: Record<FaultKey, boolean>;
}) {
  const t = useT();
  const [faults, setFaults] = useState(initialFaults);
  const [pending, startTransition] = useTransition();

  function toggleFault(key: FaultKey, enabled: boolean) {
    const previous = faults;
    setFaults({ ...faults, [key]: enabled });
    startTransition(async () => {
      const result = await setFaultAction(key, enabled);
      if (!result.success) {
        setFaults(previous);
        toast.error(t.dev.actionFailed);
        return;
      }
      setFaults(result.faults);
    });
  }

  function clearFaults() {
    startTransition(async () => {
      const result = await resetFaultsAction();
      if (!result.success) {
        toast.error(t.dev.actionFailed);
        return;
      }
      setFaults(result.faults);
      toast.success(t.dev.faultsResetDone);
    });
  }

  function resetSampleData() {
    if (!window.confirm(t.dev.resetConfirm)) return;
    startTransition(async () => {
      const result = await resetSampleDataAction();
      if (!result.success) {
        toast.error(t.dev.actionFailed);
        return;
      }
      setFaults(result.faults);
      toast.success(t.dev.resetDone);
    });
  }

  return (
    <div className="grid max-w-3xl gap-6 p-6">
      <PageHeader title={t.dev.title} description={t.dev.description} />

      <Card>
        <CardHeader>
          <CardTitle>{t.dev.faultsTitle}</CardTitle>
          <CardDescription>{t.dev.faultsHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {FAULT_KEYS.map((key) => (
            <Field key={key} orientation="horizontal">
              <Checkbox
                id={`fault_${key}`}
                checked={faults[key]}
                disabled={pending}
                onCheckedChange={(value) => toggleFault(key, value === true)}
              />
              <FieldLabel htmlFor={`fault_${key}`} className="font-normal">
                {t.dev.faults[key]}
              </FieldLabel>
            </Field>
          ))}
          <Button
            variant="outline"
            className="mt-2 w-fit sm:col-span-2"
            disabled={pending}
            onClick={clearFaults}
          >
            <RotateCcw />
            {t.dev.resetFaults}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.dev.reset}</CardTitle>
          <CardDescription>{t.dev.resetHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button
            variant="outline"
            className="w-fit"
            disabled={pending}
            onClick={resetSampleData}
          >
            <RotateCcw />
            {t.dev.reset}
          </Button>
          <p className="text-muted-foreground text-sm">
            {t.dev.accounts}: {t.dev.accountsHint}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
