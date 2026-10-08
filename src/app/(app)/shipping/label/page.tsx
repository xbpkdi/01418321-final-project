"use client";

// LabelPrintScreen — UC 9A พิมพ์ใบปะสินค้า
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { TableSearch } from "@/components/shared/table-search";
import { printedColumns, queueColumns } from "./columns";
import { useT } from "@/lib/i18n/context";
import { MOCK_ORDERS } from "@/mock/orders";
import { LABEL_TEMPLATES } from "@/mock/delivery";
import type { Order } from "@/types/order";
import type { OrderStatus } from "@/lib/order-status";

/** Order ที่พร้อมพิมพ์ ตาม Pre-Condition ของ UC */
const READY: OrderStatus[] = ["รอพิมพ์ใบปะสินค้า", "รอจัดรูปแบบใบปะสินค้า"];

export default function LabelPrintScreen() {
  const router = useRouter();
  const t = useT();
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [reprint, setReprint] = useState<Order | null>(null);
  const [keyword, setKeyword] = useState("");

  const queue = orders.filter((o) => READY.includes(o.order_status));
  const printed = orders.filter((o) => o.order_status === "พิมพ์ใบปะสินค้าแล้ว");

  // ค้นด้วย Order ID หรือที่อยู่จัดส่ง เฉพาะคิวรอพิมพ์
  const visibleQueue = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter(
      (o) =>
        o.order_id.toLowerCase().includes(q) ||
        o.shipping_address.toLowerCase().includes(q),
    );
  }, [queue, keyword]);

  function print(order: Order) {
    // ตรวจสอบ: ต้องมีที่อยู่จัดส่งและวิธีจัดส่งครบถ้วน
    if (!order.shipping_address.trim() || !order.shipping_method.trim()) {
      toast.error(t.label.errNoAddress);
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
      toast.error(t.label.errNoTemplate);
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
    toast.success(t.label.okPrinted(order.order_id), {
      description: t.label.okPrintedHint(template),
      action: {
        label: t.nav.items.shipping,
        onClick: () => router.push("/shipping"),
      },
    });
  }

  function printAll() {
    queue.forEach(print);
  }

  const queueCols = queueColumns(t, print);
  const printedCols = printedColumns(t, setReprint);

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.label.title}
        description={t.label.description}
        action={
          <Button onClick={printAll} disabled={queue.length === 0}>
            <Printer />
            {t.label.printAll}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.label.queueTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={visibleQueue}
            columns={queueCols}
            getRowId={(row) => row.order_id}
            showColumnToggle={false}
            toolbar={
              <TableSearch
                value={keyword}
                onChange={setKeyword}
                label={t.label.searchLabel}
                placeholder={t.label.searchPlaceholder}
              />
            }
            emptyState={
              <EmptyState
                icon={Printer}
                title={keyword ? t.label.emptySearchTitle : t.label.emptyTitle}
                hint={keyword ? t.label.emptySearchHint : t.label.emptyHint}
              />
            }
          />
        </CardContent>
      </Card>

      {printed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.label.printedTitle}</CardTitle>
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
            <DialogTitle>{t.label.reprintTitle}</DialogTitle>
            <DialogDescription>
              {reprint?.order_id} · {t.label.reprintHint}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReprint(null)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => {
                toast.success(t.label.okReprinted(reprint?.order_id ?? ""));
                setReprint(null);
              }}
            >
              {t.label.reprintConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
