"use client";

// LabelPrintScreen — UC 9A พิมพ์ใบปะสินค้า
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { printedColumns, queueColumns } from "./columns";
import { MOCK_ORDERS } from "@/mock/orders";
import { LABEL_TEMPLATES } from "@/mock/delivery";
import type { Order } from "@/types/order";
import type { OrderStatus } from "@/lib/order-status";

/** Order ที่พร้อมพิมพ์ ตาม Pre-Condition ของ UC */
const READY: OrderStatus[] = ["รอพิมพ์ใบปะสินค้า", "รอจัดรูปแบบใบปะสินค้า"];

export default function LabelPrintScreen() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [reprint, setReprint] = useState<Order | null>(null);

  const queue = orders.filter((o) => READY.includes(o.order_status));
  const printed = orders.filter((o) => o.order_status === "พิมพ์ใบปะสินค้าแล้ว");

  function print(order: Order) {
    // ตรวจสอบ: ต้องมีที่อยู่จัดส่งและวิธีจัดส่งครบถ้วน
    if (!order.shipping_address.trim() || !order.shipping_method.trim()) {
      toast.error("ข้อมูลที่อยู่จัดส่งไม่ครบถ้วน ไม่สามารถพิมพ์ใบปะสินค้าได้");
      return;
    }

    // ทางเลือก #1: ไม่พบ Label Template ที่ตรงกับวิธีจัดส่ง
    const template = LABEL_TEMPLATES[order.shipping_method];
    if (!template) {
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === order.order_id
            ? { ...o, order_status: "รอดำเนินการด้วยตนเอง" }
            : o,
        ),
      );
      toast.error("ไม่พบรูปแบบใบปะสินค้าที่เหมาะสม กรุณาตั้งค่า Label Template ก่อน");
      return;
    }

    // Q6.2: อัปเดตสถานะเป็นพิมพ์แล้ว
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order.order_id
          ? { ...o, order_status: "พิมพ์ใบปะสินค้าแล้ว" }
          : o,
      ),
    );
    toast.success(`ส่งใบปะสินค้า ${order.order_id} ไปยังเครื่องพิมพ์แล้ว`, {
      description: `ใช้รูปแบบ ${template}`,
    });
  }

  function printAll() {
    queue.forEach(print);
  }

  const queueCols = queueColumns(print);
  const printedCols = printedColumns(setReprint);

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="พิมพ์ใบปะสินค้า"
        description="พิมพ์ใบปะหน้าพัสดุสำหรับ Order ที่กำหนดวิธีจัดส่งเรียบร้อยแล้ว"
        action={
          <Button onClick={printAll} disabled={queue.length === 0}>
            <Printer />
            พิมพ์ใบปะสินค้าทั้งหมด
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>รอพิมพ์</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={queue}
            columns={queueCols}
            getRowId={(row) => row.order_id}
            emptyState={
              <EmptyState
                icon={Printer}
                title="ไม่มี Order ที่รอพิมพ์"
                hint="Order ที่จับคู่กับ RSL และจัดรูปแบบใบปะสินค้าแล้วจะเข้ามารอที่นี่"
              />
            }
          />
        </CardContent>
      </Card>

      {printed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>พิมพ์แล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={printed}
              columns={printedCols}
              getRowId={(row) => row.order_id}
              showColumnToggle={false}
            />
          </CardContent>
        </Card>
      )}

      {/* ทางเลือก #3: พิมพ์ซ้ำต้องให้ Admin ยืนยันก่อน แล้วบันทึก Log */}
      <Dialog
        open={reprint !== null}
        onOpenChange={(o) => !o && setReprint(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Order นี้พิมพ์ใบปะสินค้าไปแล้ว ต้องการพิมพ์ซ้ำหรือไม่
            </DialogTitle>
            <DialogDescription>
              {reprint?.order_id} · ระบบจะบันทึก Log การพิมพ์ซ้ำพร้อมเวลาและผู้ดำเนินการ
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReprint(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                toast.success(`พิมพ์ใบปะสินค้า ${reprint?.order_id} ซ้ำแล้ว`);
                setReprint(null);
              }}
            >
              ยืนยันพิมพ์ซ้ำ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
