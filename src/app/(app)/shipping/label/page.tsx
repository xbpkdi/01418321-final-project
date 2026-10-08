"use client";

// LabelPrintScreen — UC 9A พิมพ์ใบปะสินค้า · จุดออกรายงานที่ 1 (ใบปะสินค้า)
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md (ดู printLabel ใน lib/workflow.ts)

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
import { useStore } from "@/lib/store";
import {
  findOrder,
  labelQueue,
  printLabel,
  type PrintResult,
} from "@/lib/workflow";

export default function LabelPrintScreen() {
  const router = useRouter();
  const t = useT();
  const { state, run } = useStore();
  const [reprint, setReprint] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  // ขั้นตอนที่ 1: Order ที่พร้อมพิมพ์ + Order ที่ 6S ทำต่อไม่ได้ (รอดำเนินการด้วยตนเอง)
  const queue = labelQueue(state);
  const printed = state.orders.filter(
    (o) => o.order_status === "พิมพ์ใบปะสินค้าแล้ว",
  );

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

  const ERROR: Record<Exclude<PrintResult, "ok">, string> = {
    "no-address": t.label.errNoAddress,
    "no-template": t.label.errNoTemplate,
    printer: t.label.errPrinter,
    already: t.label.reprintTitle,
  };

  // ขั้นตอนที่ 3: กด "พิมพ์ใบปะสินค้า" (Q6.1 + Q6.2)
  function print(orderId: string, isReprint = false): boolean {
    const { result, template } = run((s) => {
      const r = printLabel(s, orderId, isReprint);
      return { state: r.state, result: r.result, template: r.template };
    });
    if (result === "already") {
      setReprint(orderId);
      return false;
    }
    if (result !== "ok") {
      toast.error(ERROR[result], { description: t.common.orderRef(orderId) });
      return false;
    }
    const order = findOrder(state, orderId);
    toast.success(
      isReprint ? t.label.okReprinted(orderId) : t.label.okPrinted(orderId),
      {
        description: t.label.okPrintedHint(template!, order?.parcel_total ?? 1),
        action: {
          label: t.label.viewLabel,
          onClick: () => router.push(`/reports/label/${orderId}`),
        },
      },
    );
    return true;
  }

  // ขั้นตอนที่ 2: "พิมพ์ใบปะสินค้าทั้งหมด"
  function printAll() {
    const ids = queue
      .filter((o) => o.order_status === "รอพิมพ์ใบปะสินค้า")
      .map((o) => o.order_id);
    let ok = 0;
    for (const id of ids) if (print(id)) ok++;
    if (ids.length > 1)
      toast.info(t.label.printAllSummary(ok, ids.length - ok));
  }

  const queueCols = queueColumns(t, (o) => print(o.order_id));
  const printedCols = printedColumns(t, (o) => setReprint(o.order_id));

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.label.title}
        description={t.label.description}
        action={
          <Button
            onClick={printAll}
            disabled={
              !queue.some((o) => o.order_status === "รอพิมพ์ใบปะสินค้า")
            }
          >
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
              {reprint} · {t.label.reprintHint}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReprint(null)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => {
                if (reprint) print(reprint, true);
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
