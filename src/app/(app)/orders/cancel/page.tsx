"use client";

// CancelOrderScreen — UC 7A ยกเลิก Order
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md (ดู checkCancel / cancelOrder ใน lib/workflow.ts)

import * as React from "react";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionMessage } from "@/components/shared/section-message";
import { DataTable } from "@/components/shared/data-table";
import { TableSearch } from "@/components/shared/table-search";
import { cancelColumns } from "./columns";
import { useLanguage } from "@/lib/i18n/context";
import { useStore, useUnsavedChanges } from "@/lib/store";
import { issueOf } from "@/lib/issues";
import { formatDateTime } from "@/lib/format";
import { cancelOrder, checkCancel, findOrder, type CancelCheck } from "@/lib/workflow";
import { ORDER_STATUSES } from "@/lib/order-status";
import type { Order } from "@/types/order";

const ALL = "all";

function CancelOrderContent() {
  const searchParams = useSearchParams();
  const { lang, t } = useLanguage();
  const { state, run } = useStore();
  const [target, setTarget] = useState<{ orderId: string; check: CancelCheck } | null>(null);
  const [reason, setReason] = useState("");
  const [alsoCancelPo, setAlsoCancelPo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") ?? ALL);
  useUnsavedChanges("cancel", target !== null && reason.trim() !== "");

  // ขั้นตอนที่ 2: เลือก Order แล้วกด "ยกเลิก Order" → ตรวจสอบสถานะปัจจุบันก่อน
  const open = React.useCallback(
    (order: Order) => {
      const check = checkCancel(state, order.order_id);
      if (check.kind === "closed") {
        toast.error(t.cancel.errClosed);
        return;
      }
      // ทางเลือก #4: กดยกเลิกซ้ำ
      if (check.kind === "already") {
        toast.error(t.cancel.errAlready(check.at ? formatDateTime(check.at, lang) : "—"));
        return;
      }
      setTarget({ orderId: order.order_id, check });
      setReason(order.cancel_reason ?? "");
      setAlsoCancelPo(false);
      setError(null);
    },
    [state, t, lang],
  );

  // ขั้นตอนที่ 3: ระบุเหตุผลแล้วกด "ยืนยันการยกเลิก"
  function confirmCancel() {
    if (!target) return;
    const { result } = run((s) => {
      const r = cancelOrder(s, target.orderId, reason, alsoCancelPo);
      return { state: r.state, result: r.result };
    });
    switch (result.kind) {
      case "no-reason":
        setError(t.cancel.errNoReason);
        return;
      case "in-transit": // ทางเลือก #1
        setTarget(null);
        toast.error(t.cancel.errInTransit, { description: t.cancel.specialRecorded });
        return;
      case "closed":
        setTarget(null);
        toast.error(t.cancel.errClosed);
        return;
      case "already":
        setTarget(null);
        toast.error(t.cancel.errAlready(result.at ? formatDateTime(result.at, lang) : "—"));
        return;
      case "ok": {
        setTarget(null);
        const notes = [
          result.labelPrinted ? t.cancel.labelWarning : null,
          result.restocked > 0 ? t.cancel.restocked(result.restocked) : null,
          result.poCancelled ? t.cancel.poCancelled : null,
        ].filter(Boolean);
        toast.success(t.cancel.okCancelled, { description: notes.join(" · ") || undefined });
      }
    }
  }

  const columns = React.useMemo(
    () => cancelColumns(t, open, (o) => issueOf(o, t)?.text ?? null),
    [t, open],
  );

  // ขั้นตอนที่ 1: แสดงรายการ Order พร้อมสถานะปัจจุบัน — ใหม่สุดก่อน กรองตามสถานะ และค้นได้
  const visible = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return [...state.orders]
      .sort((a, b) => b.order_date.localeCompare(a.order_date))
      .filter((o) => status === ALL || o.order_status === status)
      .filter(
        (o) =>
          !q ||
          o.order_id.toLowerCase().includes(q) ||
          o.sku.toLowerCase().includes(q) ||
          o.product_name.toLowerCase().includes(q),
      );
  }, [state.orders, status, keyword]);

  const order = target ? findOrder(state, target.orderId) : undefined;
  const check = target?.check;

  return (
    <div className="grid gap-6 p-6">
      <PageHeader title={t.cancel.title} description={t.cancel.description} />

      <DataTable
        data={visible}
        columns={columns}
        getRowId={(row) => row.order_id}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <TableSearch
              value={keyword}
              onChange={setKeyword}
              label={t.cancel.searchLabel}
              placeholder={t.cancel.searchPlaceholder}
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label={t.cancel.statusFilter} className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.common.allStatuses}</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t.statusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        emptyState={
          <EmptyState
            icon={XCircle}
            title={keyword ? t.cancel.emptySearchTitle : t.cancel.emptyTitle}
            hint={keyword ? t.cancel.emptySearchHint : t.cancel.emptyHint}
          />
        }
      />

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.cancel.dialogTitle(target?.orderId ?? "")}</DialogTitle>
            <DialogDescription>
              {order?.product_name} · {t.common.qty} {order?.qty} {t.common.unitPieces}
            </DialogDescription>
          </DialogHeader>

          {check?.kind === "in-transit" && (
            <SectionMessage appearance="error">{t.cancel.errInTransit}</SectionMessage>
          )}
          {check?.kind === "ok" && check.labelPrinted && (
            <SectionMessage appearance="warning">{t.cancel.labelWarning}</SectionMessage>
          )}
          {order?.customer_cancel_request && (
            <SectionMessage appearance="warning">{t.cancel.customerRequest}</SectionMessage>
          )}

          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="cancel_reason">{t.cancel.reasonLabel}</FieldLabel>
            <Textarea
              id="cancel_reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={error !== null}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>

          {/* ทางเลือก #2: มีคำสั่งซื้อเติมสต๊อกที่ผูกกับ Order นี้ ให้ Admin ตัดสินใจ */}
          {check?.kind === "ok" && check.linkedPo && (
            <div className="grid gap-2 rounded-md border p-3">
              <p className="text-sm">{t.cancel.linkedPo(check.linkedPo.po_id)}</p>
              <FieldLabel htmlFor="also_cancel_po" className="font-normal">
                <Checkbox
                  id="also_cancel_po"
                  checked={alsoCancelPo}
                  onCheckedChange={(v) => setAlsoCancelPo(v === true)}
                />
                {t.cancel.alsoCancelPo}
              </FieldLabel>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={confirmCancel}>{t.cancel.submit}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// useSearchParams ต้องอยู่ใต้ Suspense ตามที่ Next.js บังคับเวลา prerender
export default function CancelOrderScreen() {
  return (
    <Suspense>
      <CancelOrderContent />
    </Suspense>
  );
}
