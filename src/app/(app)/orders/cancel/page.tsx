"use client";

// CancelOrderScreen — UC 7A ยกเลิก Order
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import * as React from "react";
import { useState } from "react";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { MOCK_ORDERS } from "@/mock/orders";
import type { Order } from "@/types/order";
import type { OrderStatus } from "@/lib/order-status";

/** สถานะที่ยกเลิกไม่ได้แล้ว ตาม Pre-Condition ของ UC */
const CLOSED: OrderStatus[] = ["จัดส่งสำเร็จ", "ยกเลิกแล้ว"];
/** สถานะที่ถือว่าส่งมอบ Delivery ไปแล้ว */
const IN_TRANSIT: OrderStatus = "อยู่ระหว่างจัดส่ง";
/** สถานะที่พิมพ์ใบปะสินค้าไปแล้วแต่ยังไม่ส่งมอบ */
const LABEL_PRINTED: OrderStatus = "พิมพ์ใบปะสินค้าแล้ว";

export default function CancelOrderScreen() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [target, setTarget] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(order: Order) {
    // ตรวจสอบก่อนเปิดฟอร์ม
    if (CLOSED.includes(order.order_status)) {
      toast.error(
        "ไม่สามารถยกเลิก Order นี้ได้ เนื่องจากจัดส่งสำเร็จแล้ว/ถูกยกเลิกไปแล้ว",
      );
      return;
    }
    setTarget(order);
    setReason("");
    setError(null);
  }

  function confirmCancel() {
    if (!target) return;

    // ต้องระบุเหตุผลการยกเลิก
    if (!reason.trim()) {
      setError("กรุณาระบุเหตุผลการยกเลิก");
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
      toast.error(
        "Order นี้อยู่ระหว่างการจัดส่งแล้ว ไม่สามารถยกเลิกในระบบได้ทันที กรุณาประสานงานกับผู้ให้บริการขนส่งเพื่อเรียกพัสดุคืน",
      );
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
    toast.success("ยกเลิก Order สำเร็จ", {
      description: needLabelWarning
        ? `คืนสต๊อก ${target.qty} ชิ้นแล้ว · Order นี้พิมพ์ใบปะสินค้าไปแล้ว กรุณายกเลิกใบปะสินค้ากับผู้ให้บริการขนส่งด้วย`
        : `คืนสต๊อก ${target.qty} ชิ้นกลับเข้าคลังแล้ว`,
    });
  }

  const cancellable = orders.filter((o) => !CLOSED.includes(o.order_status));
  const columns = React.useMemo(() => cancelColumns(open), []);

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="ยกเลิก Order"
        description="ยกเลิก Order ที่มีปัญหาหรือลูกค้าขอยกเลิก พร้อมคืนสต๊อกกลับเข้าคลังอัตโนมัติ"
      />

      <DataTable
        data={cancellable}
        columns={columns}
        getRowId={(row) => row.order_id}
        emptyState={
          <EmptyState
            icon={XCircle}
            title="ไม่มี Order ที่ยกเลิกได้"
            hint="Order ที่จัดส่งสำเร็จหรือยกเลิกไปแล้วจะไม่แสดงที่นี่"
          />
        }
      />

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยกเลิก {target?.order_id}</DialogTitle>
            <DialogDescription>
              {target?.product_name} · จำนวน {target?.qty} ชิ้น
              {target?.order_status === LABEL_PRINTED &&
                " · Order นี้พิมพ์ใบปะสินค้าไปแล้ว"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="cancel_reason">เหตุผลการยกเลิก</Label>
            <textarea
              id="cancel_reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3"
            />
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              ยกเลิก
            </Button>
            <Button onClick={confirmCancel}>ยืนยันการยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
