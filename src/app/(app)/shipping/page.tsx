"use client";

// ShipmentScreen — UC 8A จัดส่งสินค้าให้ลูกค้าผ่าน Delivery
// ปุ่ม "ส่งเลขติดตามให้ลูกค้า" ของ UC 5S อยู่ในตาราง "ส่งมอบแล้ว" ของหน้านี้
// (5S ไม่มี Screen object ของตัวเอง actor ใน diagram คือ Scheduler / Admin แบบเดียวกับ 4A)
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md (ดู dispatch / pollCarrier / notifyTracking)

import * as React from "react";
import { useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { SectionMessage } from "@/components/shared/section-message";
import { DataTable } from "@/components/shared/data-table";
import { TableSearch } from "@/components/shared/table-search";
import { shippedColumns, waitingColumns } from "./columns";
import { useT } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import {
  dispatch,
  notifyTracking,
  pollCarrier,
  shipmentQueue,
  shippedOrders,
} from "@/lib/workflow";

export default function ShipmentScreen() {
  const t = useT();
  const { state, run } = useStore();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [resend, setResend] = useState<string | null>(null);
  const polled = React.useRef(false);

  const waiting = shipmentQueue(state);
  const shipped = shippedOrders(state);

  // Q8.3: ดึงสถานะจากผู้ให้บริการขนส่งเมื่อเปิดหน้า (ระบบดึงเป็นระยะ)
  React.useEffect(() => {
    if (polled.current) return;
    polled.current = true;
    const { events } = run((s) => {
      const r = pollCarrier(s);
      return { state: r.state, events: r.events };
    });
    for (const e of events) {
      if (e.kind === "connection")
        toast.error(t.shipping.errCarrier); // ทางเลือก #4
      else if (e.kind === "failed")
        toast.error(t.shipping.deliveryFailed(e.orderId)); // ทางเลือก #2
      else toast.warning(t.shipping.returned(e.orderId, e.restocked)); // ทางเลือก #3
    }
  }, [run, t]);

  // ค้นด้วย Order ID หรือชื่อสินค้า เฉพาะคิวรอส่งมอบ
  const visibleWaiting = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return waiting;
    return waiting.filter(
      (o) =>
        o.order_id.toLowerCase().includes(q) ||
        o.product_name.toLowerCase().includes(q),
    );
  }, [waiting, keyword]);

  function toggle(orderId: string) {
    setSelected((prev) =>
      prev.includes(orderId)
        ? prev.filter((x) => x !== orderId)
        : [...prev, orderId],
    );
  }

  // ขั้นตอนที่ 3: ยืนยันรายการพัสดุที่ส่งมอบ (Q8.1 + Q8.2)
  function confirmDispatch() {
    const { results } = run((s) => {
      const r = dispatch(s, selected);
      return { state: r.state, results: r.results };
    });
    setConfirming(false);
    setSelected([]);
    for (const r of results) {
      if (r.result === "ok") {
        toast.success(t.shipping.okDispatched(r.orderId, r.carrier!), {
          description: t.shipping.okDispatchedHint(r.tracking!),
        });
      } else if (r.result === "no-tracking") {
        toast.error(t.shipping.errNoTracking, {
          description: t.common.orderRef(r.orderId),
        }); // ทางเลือก #1
      } else {
        toast.error(t.shipping.errNotPrinted, {
          description: t.common.orderRef(r.orderId),
        });
      }
    }
  }

  // UC 5S ขั้นตอนที่ 3: ส่งเลขติดตามให้ลูกค้า (Q9.1 + Q9.2)
  function notify(orderId: string, confirmResend = false) {
    const { result } = run((s) => {
      const r = notifyTracking(s, orderId, confirmResend);
      return { state: r.state, result: r.result };
    });
    switch (result) {
      case "already": // ทางเลือก #2: ส่งซ้ำต้องยืนยัน
        setResend(orderId);
        return;
      case "incomplete":
        toast.error(t.shipping.errNotifyIncomplete);
        return;
      case "failed": // ทางเลือก #1
        setResend(null);
        toast.error(t.shipping.errNotifyFailed);
        return;
      case "ok":
        setResend(null);
        toast.success(t.shipping.okNotified, {
          description: t.common.orderRef(orderId),
        });
    }
  }

  const waitingCols = waitingColumns(t, selected, toggle);
  const shippedCols = shippedColumns(t, (o) => notify(o.order_id));
  const selectedOrders = waiting.filter((o) => selected.includes(o.order_id));

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.shipping.title}
        description={t.shipping.description}
      />

      {/* ทางเลือก #4: คงสถานะล่าสุดที่มีอยู่ไว้ก่อน */}
      {state.faults.carrier && (
        <SectionMessage appearance="error">
          {t.shipping.errCarrier}
        </SectionMessage>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.shipping.waitingTitle}</CardTitle>
          <CardAction className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(waiting.map((o) => o.order_id))}
              disabled={waiting.length === 0}
            >
              {t.shipping.selectAll}
            </Button>
            {/* ขั้นตอนที่ 2: รวบรวมพัสดุแล้วกด "ส่งมอบให้ Delivery" */}
            <Button
              size="sm"
              onClick={() => setConfirming(true)}
              disabled={selected.length === 0}
            >
              {t.shipping.dispatchSelected(selected.length)}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataTable
            data={visibleWaiting}
            columns={waitingCols}
            getRowId={(row) => row.order_id}
            showColumnToggle={false}
            toolbar={
              <TableSearch
                value={keyword}
                onChange={setKeyword}
                label={t.shipping.searchLabel}
                placeholder={t.shipping.searchPlaceholder}
              />
            }
            emptyState={
              <EmptyState
                icon={Truck}
                title={
                  keyword ? t.shipping.emptySearchTitle : t.shipping.emptyTitle
                }
                hint={
                  keyword ? t.shipping.emptySearchHint : t.shipping.emptyHint
                }
              />
            }
          />
        </CardContent>
      </Card>

      {shipped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.shipping.shippedTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={shipped}
              columns={shippedCols}
              getRowId={(row) => row.order_id}
              showColumnToggle={false}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.shipping.confirmTitle}</DialogTitle>
            <DialogDescription>{t.shipping.confirmHint}</DialogDescription>
          </DialogHeader>
          <ul className="grid gap-1.5 text-sm">
            {selectedOrders.map((o) => (
              <li
                key={o.order_id}
                className="flex justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span className="font-medium">{o.order_id}</span>
                <span className="text-muted-foreground truncate">
                  {o.product_name} · {t.label.parcels} {o.parcel_total ?? 1}
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={confirmDispatch}>{t.shipping.dispatch}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resend !== null}
        onOpenChange={(o) => !o && setResend(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.shipping.resendTitle}</DialogTitle>
            <DialogDescription>
              {resend} · {t.shipping.resendHint}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResend(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={() => resend && notify(resend, true)}>
              {t.shipping.resendConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
