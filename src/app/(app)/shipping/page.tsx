"use client";

// ShipmentScreen — UC 8A จัดส่งสินค้าให้ลูกค้าผ่าน Delivery
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { MOCK_ORDERS } from "@/mock/orders";
import { findTracking } from "@/mock/delivery";
import type { Order } from "@/types/order";

export default function ShipmentScreen() {
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
      toast.error("Order นี้ยังไม่ได้พิมพ์ใบปะสินค้า ไม่สามารถส่งมอบได้");
      return;
    }

    // Q8.1: ดึงหมายเลขติดตามพัสดุ
    const info = findTracking(order.order_id);
    if (!info) {
      toast.error("ไม่พบหมายเลขติดตามพัสดุ กรุณาตรวจสอบกับผู้ให้บริการขนส่ง", {
        description: "คง Order ไว้ในสถานะ รอส่งมอบ",
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
    toast.success(`ส่งมอบ ${order.order_id} ให้ ${info.carrier_name} แล้ว`, {
      description: `หมายเลขติดตามพัสดุ ${info.tracking_number}`,
    });
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="จัดส่งสินค้าให้ลูกค้า"
        description="ส่งมอบพัสดุที่พิมพ์ใบปะสินค้าแล้วให้ผู้ให้บริการขนส่ง และติดตามสถานะจนถึงมือลูกค้า"
      />

      <section className="rounded-lg border">
        <h2 className="border-b px-5 py-3.5 font-semibold">รอส่งมอบ</h2>
        {waiting.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="ไม่มีพัสดุรอส่งมอบ"
            hint="Order ที่พิมพ์ใบปะสินค้าแล้วจะเข้ามารอส่งมอบที่นี่"
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Order ID</th>
                <th className="hidden px-5 py-2.5 text-left font-medium md:table-cell">
                  สินค้า
                </th>
                <th className="px-5 py-2.5 text-left font-medium">วิธีจัดส่ง</th>
                <th className="px-5 py-2.5 text-left font-medium">สถานะ</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {waiting.map((order) => (
                <tr key={order.order_id} className="hover:bg-muted/60">
                  <td className="px-5 py-3 font-medium">{order.order_id}</td>
                  <td className="text-muted-foreground hidden max-w-[28ch] truncate px-5 py-3 md:table-cell">
                    {order.product_name}
                  </td>
                  <td className="text-muted-foreground px-5 py-3">
                    {order.shipping_method}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.order_status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dispatch(order)}
                    >
                      ส่งมอบให้ Delivery
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {shipped.length > 0 && (
        <section className="rounded-lg border">
          <h2 className="border-b px-5 py-3.5 font-semibold">
            ส่งมอบแล้ว
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Order ID</th>
                <th className="px-5 py-2.5 text-left font-medium">
                  หมายเลขติดตามพัสดุ
                </th>
                <th className="px-5 py-2.5 text-left font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {shipped.map((order) => (
                <tr key={order.order_id} className="hover:bg-muted/60">
                  <td className="px-5 py-3 font-medium">{order.order_id}</td>
                  <td className="text-muted-foreground px-5 py-3">
                    {tracking[order.order_id] ??
                      findTracking(order.order_id)?.tracking_number ??
                      "ยังไม่มีหมายเลข"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.order_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
