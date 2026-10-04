"use client";

// CancelOrderScreen — UC 7A ยกเลิก Order
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import * as React from "react";
import { Suspense } from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import { cancelColumns } from "./columns";
import { useT } from "@/lib/i18n/context";
import { MOCK_ORDERS } from "@/mock/orders";
import type { Order } from "@/types/order";
import type { OrderStatus } from "@/lib/order-status";

/** สถานะที่ยกเลิกไม่ได้แล้ว ตาม Pre-Condition ของ UC */
const CLOSED: OrderStatus[] = ["จัดส่งสำเร็จ", "ยกเลิกแล้ว"];
/** สถานะที่ถือว่าส่งมอบ Delivery ไปแล้ว */
const IN_TRANSIT: OrderStatus = "อยู่ระหว่างจัดส่ง";
/** สถานะที่พิมพ์ใบปะสินค้าไปแล้วแต่ยังไม่ส่งมอบ */
const LABEL_PRINTED: OrderStatus = "พิมพ์ใบปะสินค้าแล้ว";

function CancelOrderContent() {
  const searchParams = useSearchParams();
  const t = useT();
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [target, setTarget] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = React.useCallback(
    (order: Order) => {
      // ตรวจสอบก่อนเปิดฟอร์ม
      if (CLOSED.includes(order.order_status)) {
        toast.error(t.cancel.errClosed);
        return;
      }
      setTarget(order);
      setReason("");
      setError(null);
    },
    [t],
  );

  function confirmCancel() {
    if (!target) return;

    // ต้องระบุเหตุผลการยกเลิก
    if (!reason.trim()) {
      setError(t.cancel.errNoReason);
      return;
    }

    // ทางเลือก #1: ส่งมอบ Delivery ไปแล้ว ยกเลิกในระบบทันทีไม่ได้
    if (target.order_status === IN_TRANSIT) {
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === target.order_id
            ? { ...o, order_status: "รอดำเนินการพิเศษ" }
            : o,
        ),
      );
      setTarget(null);
      toast.error(t.cancel.errInTransit);
      return;
    }

    // Q10.1 + Q10.2: อัปเดตสถานะและคืนสต๊อก
    const needLabelWarning = target.order_status === LABEL_PRINTED;
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === target.order_id
          ? { ...o, order_status: "ยกเลิกแล้ว" }
          : o,
      ),
    );
    setTarget(null);
    toast.success(t.cancel.okCancelled, {
      description: needLabelWarning
        ? t.cancel.restockedWithLabel(target.qty)
        : t.cancel.restocked(target.qty),
    });
  }

  // กรองตาม status ที่ส่งมาจากการ์ดบนหน้าภาพรวม เพื่อให้เห็นเฉพาะรายการที่กดมา
  const focusStatus = searchParams.get("status");
  const cancellable = orders
    .filter((o) => !CLOSED.includes(o.order_status))
    .filter((o) => !focusStatus || o.order_status === focusStatus);
  const columns = React.useMemo(() => cancelColumns(t, open), [t, open]);

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.cancel.title}
        description={t.cancel.description}
      />

      <DataTable
        data={cancellable}
        columns={columns}
        getRowId={(row) => row.order_id}
        emptyState={
          <EmptyState
            icon={XCircle}
            title={t.cancel.emptyTitle}
            hint={t.cancel.emptyHint}
          />
        }
      />

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.cancel.dialogTitle(target?.order_id ?? "")}</DialogTitle>
            <DialogDescription>
              {target?.product_name} · {t.common.qty} {target?.qty}{" "}
              {t.common.unitPieces}
              {target?.order_status === LABEL_PRINTED && t.cancel.alreadyPrinted}
            </DialogDescription>
          </DialogHeader>

          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="cancel_reason">
              {t.cancel.reasonLabel}
            </FieldLabel>
            <Textarea
              id="cancel_reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={error !== null}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>

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
