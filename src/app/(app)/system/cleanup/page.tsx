"use client";

// DataCleanupScreen — UC 10A ลบข้อมูลเก่าที่ไม่ใช้แล้ว
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md (ดู planRangeCleanup / commitCleanup)

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { SectionMessage } from "@/components/shared/section-message";
import { useT } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import {
  cleanupCsv,
  commitCleanup,
  planClosedCleanup,
  planRangeCleanup,
  type CleanupPlan,
  type CleanupType,
} from "@/lib/workflow";

const DATA_TYPES: CleanupType[] = ["order", "cost", "label", "reorder"];

export default function DataCleanupScreen() {
  const t = useT();
  const { state, run } = useStore();
  const [mode, setMode] = useState<"range" | "closed">("range");
  const [types, setTypes] = useState<CleanupType[]>([]);
  const [cutoff, setCutoff] = useState("");
  const [error, setError] = useState<{ message: string; hint?: string } | null>(
    null,
  );
  const [plan, setPlan] = useState<CleanupPlan | null>(null);

  const closedPreview = planClosedCleanup(state);
  const closedOrders = closedPreview.items.filter(
    (i) => i.data_type === "order",
  ).length;
  const closedLabels = closedPreview.items.filter(
    (i) => i.data_type === "label",
  ).length;

  function toggleType(key: CleanupType) {
    setTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    setError(null);
  }

  // ทางเลือก #1: ลบตามช่วงวันที่
  function reviewRange() {
    setError(null);
    if (types.length === 0) {
      setError({ message: t.cleanup.errNoType });
      return;
    }
    // cutoff_date ต้องย้อนหลังอย่างน้อย 12 เดือน
    const limit = new Date();
    limit.setMonth(limit.getMonth() - 12);
    if (!cutoff || new Date(cutoff) > limit) {
      setError({ message: t.cleanup.errCutoff });
      return;
    }
    // Q10A.1 + Q10A.2
    const next = planRangeCleanup(state, types, cutoff);
    if (next.items.length === 0) {
      setError({ message: t.cleanup.errNoData, hint: t.cleanup.errNoDataHint });
      return;
    }
    setPlan(next);
  }

  // ทางเลือก #2: ลบ Order ที่ปิดแล้วทั้งหมด (Q10A.8 + Q10A.9)
  function reviewClosed() {
    setError(null);
    const next = planClosedCleanup(state);
    if (next.items.length === 0) {
      setError({ message: t.cleanup.errNoClosed });
      return;
    }
    setPlan(next);
  }

  // ดาวน์โหลดไฟล์สำรองของรายการที่จะลบก่อน
  function backup() {
    if (!plan) return;
    const blob = new Blob([cleanupCsv(state, plan)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.cleanup.backupDone);
  }

  // Q10A.3–7 / Q10A.10–12 — ล้มเหลวแล้ว rollback ทั้งชุด
  function commit() {
    if (!plan) return;
    const { ok } = run((s) => {
      const r = commitCleanup(s, plan);
      return { state: r.state, ok: r.ok };
    });
    if (!ok) {
      setPlan(null);
      toast.error(t.cleanup.errFailed);
      return;
    }
    const total = plan.items.length;
    if (mode === "closed") {
      toast.success(
        t.cleanup.okDeletedClosed(
          plan.items.filter((i) => i.data_type === "order").length,
        ),
      );
    } else {
      toast.success(t.cleanup.okDeleted(total), {
        description: summary(plan),
      });
    }
    if (plan.blocked.length > 0) {
      toast.warning(t.cleanup.errReferenced, {
        description: plan.blocked.map((b) => b.record_id).join(", "),
      });
    }
    setPlan(null);
  }

  function summary(p: CleanupPlan) {
    return DATA_TYPES.map((type) => ({
      type,
      n: p.items.filter((i) => i.data_type === type).length,
    }))
      .filter((x) => x.n > 0)
      .map((x) => t.cleanup.countByType(t.cleanup.typeLabel[x.type], x.n))
      .join(" · ");
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader title={t.cleanup.title} description={t.cleanup.description} />

      {error && (
        <SectionMessage appearance="error">
          {error.message}
          {error.hint && (
            <span className="text-muted-foreground block">{error.hint}</span>
          )}
        </SectionMessage>
      )}

      {/* ขั้นตอนที่ 1–2: เลือกวิธีการลบข้อมูล */}
      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as "range" | "closed");
          setError(null);
        }}
        className="max-w-2xl"
      >
        <TabsList>
          <TabsTrigger value="range">{t.cleanup.tabRange}</TabsTrigger>
          <TabsTrigger value="closed">{t.cleanup.tabClosed}</TabsTrigger>
        </TabsList>

        <TabsContent value="range" className="mt-4">
          <Card>
            <CardContent>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend variant="label">
                    {t.cleanup.dataTypes}
                  </FieldLegend>
                  <FieldGroup className="grid gap-2 sm:grid-cols-2">
                    {DATA_TYPES.map((type) => (
                      <FieldLabel key={type} htmlFor={`data_type_${type}`}>
                        <Field orientation="horizontal">
                          <Checkbox
                            id={`data_type_${type}`}
                            checked={types.includes(type)}
                            onCheckedChange={() => toggleType(type)}
                          />
                          <FieldTitle>{t.cleanup.typeLabel[type]}</FieldTitle>
                        </Field>
                      </FieldLabel>
                    ))}
                  </FieldGroup>
                </FieldSet>

                <Field>
                  <FieldLabel htmlFor="cutoff_date">
                    {t.cleanup.cutoffLabel}
                  </FieldLabel>
                  <Input
                    id="cutoff_date"
                    type="date"
                    value={cutoff}
                    onChange={(e) => {
                      setCutoff(e.target.value);
                      setError(null);
                    }}
                  />
                  <FieldDescription>{t.cleanup.cutoffHint}</FieldDescription>
                </Field>

                <Button onClick={reviewRange} className="w-fit">
                  <Trash2 />
                  {t.cleanup.submit}
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-normal">
                {t.cleanup.closedTitle}
              </CardTitle>
              <CardDescription>
                {t.cleanup.closedSummary(closedOrders, closedLabels)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={reviewClosed}>
                <Trash2 />
                {t.cleanup.submit}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ตรวจทานก่อนยืนยัน + ดาวน์โหลดไฟล์สำรอง แล้วยืนยันอีกครั้ง */}
      <Dialog open={plan !== null} onOpenChange={(o) => !o && setPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.cleanup.reviewTitle}</DialogTitle>
            <DialogDescription>
              {plan &&
                (mode === "closed"
                  ? t.cleanup.closedSummary(
                      plan.items.filter((i) => i.data_type === "order").length,
                      plan.items.filter((i) => i.data_type === "label").length,
                    )
                  : summary(plan))}
              {" · "}
              {t.cleanup.irreversible}
            </DialogDescription>
          </DialogHeader>

          {plan && plan.blocked.length > 0 && (
            <SectionMessage appearance="warning">
              <p className="font-medium">{t.cleanup.blockedTitle}</p>
              {plan.blocked.map((b) => (
                <p key={`${b.data_type}-${b.record_id}`}>
                  {t.cleanup.typeLabel[b.data_type]} {b.record_id} ·{" "}
                  {t.cleanup.errReferenced}
                </p>
              ))}
            </SectionMessage>
          )}

          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={backup}>
              <Download />
              {t.cleanup.backup}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPlan(null)}>
                {t.common.cancel}
              </Button>
              <Button variant="destructive" onClick={commit}>
                {t.cleanup.submit}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
