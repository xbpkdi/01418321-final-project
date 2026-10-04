"use client";

// DataCleanupScreen — UC 10A ลบข้อมูลเก่าที่ไม่ใช้แล้ว
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

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
import { useT } from "@/lib/i18n/context";
import { MOCK_ORDERS } from "@/mock/orders";

const DATA_TYPES = [
  { key: "order", label: "Order" },
  { key: "cost", label: "Cost" },
  { key: "label", label: "Label" },
  { key: "reorder", label: "Reorder" },
];

/** Order ที่ปิดแล้วตาม Pre-Condition ของ UC */
const CLOSED_ORDERS = MOCK_ORDERS.filter((o) =>
  ["จัดส่งสำเร็จ", "ยกเลิกแล้ว"].includes(o.order_status),
);

export default function DataCleanupScreen() {
  const t = useT();
  const [types, setTypes] = useState<string[]>([]);
  const [cutoff, setCutoff] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"range" | "closed" | null>(null);

  function toggleType(key: string) {
    setTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    setError(null);
  }

  // ทางเลือก #1: ลบตามช่วงวันที่
  function reviewRange() {
    setError(null);

    // ต้องเลือกประเภทข้อมูลอย่างน้อย 1 ประเภท
    if (types.length === 0) {
      setError(t.cleanup.errNoType);
      return;
    }

    if (!cutoff) {
      setError(t.cleanup.errCutoff);
      return;
    }

    // cutoff_date ต้องย้อนหลังอย่างน้อย 12 เดือน
    const limit = new Date();
    limit.setMonth(limit.getMonth() - 12);
    if (new Date(cutoff) > limit) {
      setError(t.cleanup.errCutoff);
      return;
    }

    // ไม่พบข้อมูลที่เข้าเงื่อนไข
    const matched = MOCK_ORDERS.filter(
      (o) =>
        ["จัดส่งสำเร็จ", "ยกเลิกแล้ว"].includes(o.order_status) &&
        new Date(o.order_date) < new Date(cutoff),
    );
    if (matched.length === 0) {
      setError(t.cleanup.errNoData);
      return;
    }

    setConfirming("range");
  }

  // ทางเลือก #2: ลบ Order ที่ปิดแล้วทั้งหมด
  function reviewClosed() {
    setError(null);
    if (CLOSED_ORDERS.length === 0) {
      setError(t.cleanup.errNoClosed);
      return;
    }
    setConfirming("closed");
  }

  function commit() {
    if (confirming === "closed") {
      toast.success(t.cleanup.okDeletedClosed(CLOSED_ORDERS.length));
    } else {
      toast.success(t.cleanup.okDeleted(types.length), {
        description: t.cleanup.okDeletedHint,
      });
    }
    setConfirming(null);
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.cleanup.title}
        description={t.cleanup.description}
      />

      {error && (
        <p
          role="alert"
          className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </p>
      )}

      <Tabs defaultValue="range" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="range">{t.cleanup.tabRange}</TabsTrigger>
          <TabsTrigger value="closed">{t.cleanup.tabClosed}</TabsTrigger>
        </TabsList>

        <TabsContent value="range" className="mt-4">
          <Card>
            <CardContent>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend variant="label">{t.cleanup.dataTypes}</FieldLegend>
                  <FieldGroup className="grid gap-2 sm:grid-cols-2">
                    {DATA_TYPES.map((dataType) => (
                      <FieldLabel
                        key={dataType.key}
                        htmlFor={`data_type_${dataType.key}`}
                      >
                        <Field orientation="horizontal">
                          <Checkbox
                            id={`data_type_${dataType.key}`}
                            checked={types.includes(dataType.key)}
                            onCheckedChange={() => toggleType(dataType.key)}
                          />
                          <FieldTitle>{dataType.label}</FieldTitle>
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

                <div className="flex flex-wrap gap-2">
                  <Button onClick={reviewRange}>
                    <Trash2 />
                    {t.cleanup.submit}
                  </Button>
                  <Button variant="outline">
                    <Download />
                    {t.cleanup.backup}
                  </Button>
                </div>
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
                {t.cleanup.closedCount}{" "}
                <span data-numeric className="text-foreground font-medium">
                  {CLOSED_ORDERS.length}
                </span>{" "}
                {t.cleanup.closedCountSuffix}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button onClick={reviewClosed}>
                  <Trash2 />
                  {t.cleanup.submit}
                </Button>
                <Button variant="outline">
                  <Download />
                  {t.cleanup.backup}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.cleanup.confirmTitle}</DialogTitle>
            <DialogDescription>
              {confirming === "closed"
                ? t.cleanup.confirmClosed(CLOSED_ORDERS.length)
                : t.cleanup.confirmRange(types.join(", "), cutoff)}
              {" · "}
              {t.cleanup.irreversible}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={commit}>{t.cleanup.submit}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
