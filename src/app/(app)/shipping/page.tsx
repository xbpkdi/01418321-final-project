"use client";

// ShipmentScreen — UC 8A จัดส่งสินค้าให้ลูกค้าผ่าน Delivery
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import { shippedColumns, waitingColumns } from "./columns";
import { useT } from "@/lib/i18n/context";
import { MOCK_ORDERS } from "@/mock/orders";
import { findTracking } from "@/mock/delivery";
import type { Order } from "@/types/order";

export default function ShipmentScreen() {
  const t = useT();
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const waiting = orders.filter(
    (o) => o.order_status === "พิมพ์ใบปะสินค้าแล้ว",
  );
  const shipped = orders.filter((o) =>
    ["อยู่ระหว่างจัดส่ง", "จัดส่งสำเร็จ"].includes(o.order_status),
  );

  function dispatch(order: Order) {
    // ตรวจสอบ: ต้องพิมพ์ใบปะสินค้าแล้วเท่านั้น
    if (order.order_status !== "พิมพ์ใบปะสินค้าแล้ว") {
      toast.error(t.shipping.errNotPrinted);
      return;
    }

    // Q8.1: ดึงหมายเลขติดตามพัสดุ
    const info = findTracking(order.order_id);
    if (!info) {
      toast.error(t.shipping.errNoTracking, {
        description: t.shipping.errNoTrackingHint,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === order.order_id
            ? { ...o, order_status: "รอส่งมอบ" }
            : o,
        ),
      );
      return;
    }

    // Q8.2: บันทึกการส่งมอบ
    setTracking((prev) => ({ ...prev, [order.order_id]: info.tracking_number }));
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order.order_id
          ? { ...o, order_status: "อยู่ระหว่างจัดส่ง" }
          : o,
      ),
    );
    toast.success(t.shipping.okDispatched(order.order_id, info.carrier_name), {
      description: t.shipping.okDispatchedHint(info.tracking_number),
    });
  }

  const waitingCols = waitingColumns(t, dispatch);
  const shippedCols = shippedColumns(
    t,
    (order: Order) =>
      tracking[order.order_id] ??
      findTracking(order.order_id)?.tracking_number ??
      t.shipping.noTrackingYet,
  );

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.shipping.title}
        description={t.shipping.description}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.shipping.waitingTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={waiting}
            columns={waitingCols}
            getRowId={(row) => row.order_id}
            showColumnToggle={false}
            emptyState={
              <EmptyState
                icon={Truck}
                title={t.shipping.emptyTitle}
                hint={t.shipping.emptyHint}
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
    </div>
  );
}
