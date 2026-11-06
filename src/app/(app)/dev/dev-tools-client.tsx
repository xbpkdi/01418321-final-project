"use client";

import { useState, useTransition } from "react";
import { LockOpen, RotateCcw } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { FAULT_KEYS, type FaultKey } from "@/lib/workflow";
import {
  resetFaultsAction,
  resetSampleDataAction,
  setFaultAction,
  unlockAccountsAction,
} from "./actions";

export function DevToolsClient({
  initialFaults,
}: {
  initialFaults: Record<FaultKey, boolean>;
}) {
  const { lang, t } = useLanguage();
  const { state } = useStore();
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

  function unlockAccounts() {
    startTransition(async () => {
      const result = await unlockAccountsAction();
      if (!result.success) {
        toast.error(t.dev.actionFailed);
        return;
      }
      toast.success(t.dev.unlockDone(result.unlocked));
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
          <Button
            variant="outline"
            className="w-fit"
            disabled={pending}
            onClick={unlockAccounts}
          >
            <LockOpen />
            {t.dev.unlock}
          </Button>
          <p className="text-muted-foreground text-sm">
            {t.dev.accounts}: {t.dev.accountsHint}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.dev.errorLogTitle}</CardTitle>
          <CardDescription>{t.dev.errorLogHint}</CardDescription>
        </CardHeader>
        <CardContent>
          {state.errorLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t.dev.errorLogEmpty}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.dev.errorLogAt}</TableHead>
                  <TableHead>{t.dev.errorLogUseCase}</TableHead>
                  <TableHead>{t.dev.errorLogContext}</TableHead>
                  <TableHead>{t.dev.errorLogCode}</TableHead>
                  <TableHead>{t.dev.errorLogMessage}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.errorLog.map((entry, index) => (
                  <TableRow key={`${entry.at}-${index}`}>
                    <TableCell className="tabular-nums">
                      {formatDateTime(entry.at, lang)}
                    </TableCell>
                    <TableCell>{entry.useCaseId ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.contextKey ?? "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.errorCode ?? "-"}
                    </TableCell>
                    <TableCell>{entry.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
