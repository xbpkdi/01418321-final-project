"use client";

// RslMatchScreen — UC 1S จับคู่ Order กับเลข RSL
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import { Link2, Link2Off, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { MOCK_ORDERS } from "@/mock/orders";
import { findRslMatches, type RslShipment } from "@/mock/rsl";
import type { Order } from "@/types/order";
import type { OrderStatus } from "@/lib/order-status";

type MatchState = {
  rsl_reference_id: string | null;
  status: OrderStatus;
};

/** สถานะที่ยังไม่ได้จับคู่ RSL — ก่อนขั้นจัดรูปแบบใบปะสินค้า */
const UNMATCHED: OrderStatus[] = ["รอจับคู่กฎ SKU", "รอตรวจสอบสต๊อก"];

export default function RslMatchScreen() {
  const [matches, setMatches] = useState<Record<string, MatchState>>({});
  const [candidates, setCandidates] = useState<{
    order: Order;
    options: RslShipment[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const queue = MOCK_ORDERS.filter(
    (o) =>
      UNMATCHED.includes(o.order_status) && !matches[o.order_id]?.rsl_reference_id,
  );
  const matched = MOCK_ORDERS.filter(
    (o) => matches[o.order_id]?.rsl_reference_id,
  );

  function match(order: Order) {
    setError(null);
    setCandidates(null);
    setWorking(order.order_id);

    window.setTimeout(() => {
      const found = findRslMatches(order.sku, order.variation);

      // ทางเลือก #1: ไม่พบ SKU ที่ตรงกันใน RSL
      if (found.length === 0) {
        setError("ไม่พบสินค้านี้ในระบบ RSL");
        setMatches((prev) => ({
          ...prev,
          [order.order_id]: {
            rsl_reference_id: null,
            status: "รอดำเนินการด้วยตนเอง",
          },
        }));
        setWorking(null);
        return;
      }

      // ทางเลือก #2: พบมากกว่า 1 รายการ ให้ Admin เลือกเอง
      if (found.length > 1) {
        setError("พบข้อมูล RSL ที่ตรงกันมากกว่า 1 รายการ กรุณาเลือกด้วยตนเอง");
        setCandidates({ order, options: found });
        setWorking(null);
        return;
      }

      commit(order, found[0]);
      setWorking(null);
    }, 450);
  }

  // Q4.2: บันทึกผลการจับคู่แล้วส่งต่อให้ 6S
  function commit(order: Order, shipment: RslShipment) {
    setMatches((prev) => ({
      ...prev,
      [order.order_id]: {
        rsl_reference_id: shipment.rsl_order_id,
        status: "รอจัดรูปแบบใบปะสินค้า",
      },
    }));
    setCandidates(null);
    setError(null);
    toast.success(`จับคู่ Order กับ RSL สำเร็จ · ${shipment.rsl_order_id}`);
  }

  function matchAll() {
    queue.forEach((order) => {
      const found = findRslMatches(order.sku, order.variation);
      if (found.length === 1) commit(order, found[0]);
    });
  }

  // ทางเลือก #3: ยกเลิกการจับคู่ที่ทำไปแล้ว
  function unmatch(orderId: string) {
    setMatches((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    toast.success("ยกเลิกการจับคู่แล้ว");
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="จับคู่ Order กับ RSL"
        description="เทียบ SKU และ Variation ของ Order กับข้อมูลในคลัง RSL ก่อนจัดรูปแบบใบปะสินค้า"
        action={
          <Button onClick={matchAll} disabled={queue.length === 0}>
            จับคู่อัตโนมัติทั้งหมด
          </Button>
        }
      />

      {error && (
        <p
          role="alert"
          className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </p>
      )}

      {candidates && (
        <section className="border-status-attention/30 bg-status-attention-bg/40 rounded-lg border">
          <h2 className="border-status-attention/20 border-b px-5 py-3 text-sm font-semibold">
            เลือกรายการ RSL สำหรับ {candidates.order.order_id} ·{" "}
            {candidates.order.sku}
          </h2>
          <ul className="divide-border divide-y">
            {candidates.options.map((option) => (
              <li
                key={option.rsl_order_id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{option.rsl_order_id}</p>
                  <p className="text-muted-foreground text-xs">
                    คงเหลือในคลัง RSL{" "}
                    <span data-numeric>{option.rsl_stock_qty}</span> ชิ้น
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => commit(candidates.order, option)}
                >
                  เลือกรายการนี้
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border">
        <h2 className="border-b px-5 py-3.5 font-semibold">รอจับคู่</h2>
        {queue.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="จับคู่ครบทุก Order แล้ว"
            hint="Order ที่ผ่านการตรวจสอบและจับคู่กฎ SKU แล้วจะเข้ามารอที่นี่"
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Order ID</th>
                <th className="px-5 py-2.5 text-left font-medium">SKU</th>
                <th className="hidden px-5 py-2.5 text-left font-medium md:table-cell">
                  Variation
                </th>
                <th className="px-5 py-2.5 text-left font-medium">สถานะ</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {queue.map((order) => {
                const state = matches[order.order_id];
                return (
                  <tr key={order.order_id} className="hover:bg-muted/60">
                    <td className="px-5 py-3 font-medium">{order.order_id}</td>
                    <td className="text-muted-foreground px-5 py-3">
                      {order.sku}
                    </td>
                    <td className="text-muted-foreground hidden px-5 py-3 md:table-cell">
                      {order.variation}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={state?.status ?? order.order_status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => match(order)}
                        disabled={working === order.order_id}
                      >
                        {working === order.order_id && (
                          <Loader2 className="animate-spin" />
                        )}
                        จับคู่กับ RSL
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {matched.length > 0 && (
        <section className="rounded-lg border">
          <h2 className="border-b px-5 py-3.5 font-semibold">จับคู่แล้ว</h2>
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Order ID</th>
                <th className="px-5 py-2.5 text-left font-medium">
                  หมายเลขอ้างอิง RSL
                </th>
                <th className="px-5 py-2.5 text-left font-medium">สถานะ</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {matched.map((order) => (
                <tr key={order.order_id} className="hover:bg-muted/60">
                  <td className="px-5 py-3 font-medium">{order.order_id}</td>
                  <td className="text-muted-foreground px-5 py-3">
                    {matches[order.order_id].rsl_reference_id}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={matches[order.order_id].status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => unmatch(order.order_id)}
                    >
                      <Link2Off />
                      ยกเลิกการจับคู่
                    </Button>
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
