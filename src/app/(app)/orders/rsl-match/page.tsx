"use client";

// RslMatchScreen — UC 1S จับคู่ Order กับเลข RSL
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import { matchedColumns, queueColumns } from "./columns";
import { useT } from "@/lib/i18n/context";
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
  const router = useRouter();
  const t = useT();
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
        setError(t.rslMatch.errNotFound);
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
        setError(t.rslMatch.errMultiple);
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
    toast.success(`${t.rslMatch.okMatched} · ${shipment.rsl_order_id}`, {
      action: {
        label: t.nav.items.label,
        onClick: () => router.push("/shipping/label"),
      },
    });
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
    toast.success(t.rslMatch.okUnmatched);
  }

  const queueCols = queueColumns(
    t,
    (order) => matches[order.order_id]?.status ?? order.order_status,
    match,
    working,
  );
  const matchedCols = matchedColumns(
    t,
    (order) => matches[order.order_id]?.rsl_reference_id ?? null,
    (order) => matches[order.order_id].status,
    unmatch,
  );

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.rslMatch.title}
        description={t.rslMatch.description}
        action={
          <Button onClick={matchAll} disabled={queue.length === 0}>
            {t.rslMatch.matchAll}
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
        <Card className="border-status-attention/30 bg-status-attention-bg/40">
          <CardHeader>
            <CardTitle className="text-sm">
              {t.rslMatch.chooseFor(
                candidates.order.order_id,
                candidates.order.sku,
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {candidates.options.map((option) => (
              <Item key={option.rsl_order_id} variant="outline">
                <ItemContent>
                  <ItemTitle>{option.rsl_order_id}</ItemTitle>
                  <ItemDescription>
                    {t.rslMatch.stockLeft}{" "}
                    <span data-numeric>{option.rsl_stock_qty}</span>{" "}
                    {t.common.unitPieces}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => commit(candidates.order, option)}
                  >
                    {t.rslMatch.chooseThis}
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.rslMatch.queueTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={queue}
            columns={queueCols}
            getRowId={(row) => row.order_id}
            showColumnToggle={false}
            emptyState={
              <EmptyState
                icon={Link2}
                title={t.rslMatch.emptyTitle}
                hint={t.rslMatch.emptyHint}
              />
            }
          />
        </CardContent>
      </Card>

      {matched.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.rslMatch.matchedTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={matched}
              columns={matchedCols}
              getRowId={(row) => row.order_id}
              showColumnToggle={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
