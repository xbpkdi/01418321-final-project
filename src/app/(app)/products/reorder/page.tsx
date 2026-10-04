"use client";

// ReorderDecisionScreen — UC 5A ตัดสินใจสั่งซื้อเพิ่ม + UC 6A สั่งซื้อจาก Supplier
// สองขั้นตอนนี้รวมไว้หน้าเดียวตาม ui-design-brief.md ข้อ 1
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import { ShoppingCart, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import { purchaseColumns } from "./columns";
import { MOCK_PURCHASE_QUEUE, MOCK_REORDER_CANDIDATES } from "@/mock/products";
import type { ReorderCandidate } from "@/types/product";

const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

type Decision = "คุ้มค่า" | "ไม่คุ้มค่า";

export default function ReorderDecisionScreen() {
  const [candidates, setCandidates] = useState(MOCK_REORDER_CANDIDATES);
  const [queue, setQueue] = useState(MOCK_PURCHASE_QUEUE);
  const [confirming, setConfirming] = useState<{
    candidate: ReorderCandidate;
    decision: Decision;
    qty: number;
  } | null>(null);

  // 5A ขั้นตอนที่ 2: ตัดสินใจจากต้นทุนเทียบราคาขาย
  function decide(candidate: ReorderCandidate, decision: Decision) {
    // ไม่พบราคาขาย คำนวณกำไรไม่ได้
    if (candidate.selling_price === null) {
      toast.error("ไม่พบราคาขายของสินค้านี้ กรุณาตรวจสอบ", {
        description: "ระบบตั้งสถานะเป็น รอดำเนินการด้วยตนเอง จนกว่าจะระบุราคาขาย",
      });
      setCandidates((prev) =>
        prev.filter((c) => c.order_id !== candidate.order_id),
      );
      return;
    }

    setConfirming({
      candidate,
      decision,
      qty: candidate.reorder_qty,
    });
  }

  // Q5A.3 / Q5A.4: บันทึกผลการตัดสินใจ
  function commitDecision() {
    if (!confirming) return;
    const { candidate, decision } = confirming;
    setCandidates((prev) =>
      prev.filter((c) => c.order_id !== candidate.order_id),
    );
    setConfirming(null);
    toast.success("บันทึกผลการตัดสินใจสำเร็จ", {
      description:
        decision === "คุ้มค่า"
          ? "ส่ง Order เข้าสู่การสั่งซื้อจาก Supplier"
          : "ส่ง Order เข้าสู่การยกเลิก Order",
    });
  }

  // 6A ขั้นตอนที่ 3: ส่งคำสั่งซื้อไปยัง Supplier
  function purchase(sku: string) {
    const item = queue.find((q) => q.sku === sku);
    if (!item) return;

    if (!item.configured) {
      toast.error("ไม่พบข้อมูล Supplier หรือจำนวนสั่งซื้อ กรุณาตั้งค่าก่อนสั่งซื้อ");
      return;
    }

    setQueue((prev) => prev.filter((q) => q.sku !== sku));
    toast.success(`ส่งคำสั่งซื้อ ${sku} ไปยัง ${item.supplier_name} แล้ว`, {
      description: "สถานะเปลี่ยนเป็น สั่งซื้อแล้ว พร้อมวันที่คาดว่าจะได้รับสินค้า",
    });
  }

  const purchaseCols = purchaseColumns(purchase);

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="ตัดสินใจสั่งซื้อสินค้าเพิ่ม"
        description="ดูต้นทุนจริงเทียบราคาขายก่อนตัดสินใจ แล้วส่งคำสั่งซื้อไปยังซัพพลายเออร์"
      />

      <Tabs defaultValue="decide">
        <TabsList>
          <TabsTrigger value="decide">
            รอตัดสินใจ ({candidates.length})
          </TabsTrigger>
          <TabsTrigger value="purchase">
            รอสั่งซื้อเติมสต๊อก ({queue.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decide" className="mt-4">
          {candidates.length === 0 ? (
            <div className="rounded-lg border">
              <EmptyState
                icon={ShoppingCart}
                title="ไม่มีรายการรอตัดสินใจ"
                hint="Order ที่ระบบคำนวณต้นทุนเสร็จแล้วจะเข้ามารอการตัดสินใจที่นี่"
              />
            </div>
          ) : (
            <div className="grid gap-4">
              {candidates.map((c) => {
                const margin =
                  c.selling_price === null ? null : c.selling_price - c.unit_cost;
                return (
                  <article key={c.order_id} className="rounded-lg border">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-3.5">
                      <div>
                        <h2 className="font-semibold">{c.product_name}</h2>
                        <p className="text-muted-foreground text-xs">
                          {c.order_id} · {c.sku} · {c.variation}
                        </p>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {c.supplier_name} · รอของ{" "}
                        <span data-numeric>{c.lead_time_days}</span> วัน
                      </p>
                    </div>

                    <dl className="divide-border grid divide-y sm:grid-cols-3 sm:divide-y-0">
                      <Metric label="ต้นทุนต่อหน่วย" value={baht.format(c.unit_cost)} />
                      <Metric
                        label="ราคาขายปัจจุบัน"
                        value={
                          c.selling_price === null
                            ? "ไม่พบราคาขาย"
                            : baht.format(c.selling_price)
                        }
                        muted={c.selling_price === null}
                      />
                      <Metric
                        label="กำไรต่อหน่วยที่คาดการณ์"
                        value={margin === null ? "คำนวณไม่ได้" : baht.format(margin)}
                        muted={margin === null}
                        tone={
                          margin === null
                            ? undefined
                            : margin > 0
                              ? "success"
                              : "cancelled"
                        }
                      />
                    </dl>

                    {c.has_pending_po && (
                      <p className="border-status-attention/30 bg-status-attention-bg text-status-attention border-t px-5 py-3 text-sm">
                        มีคำสั่งซื้อ SKU นี้ค้างอยู่แล้ว ต้องการสั่งซื้อเพิ่มหรือไม่ ·
                        ล็อตเดิมคาดว่าได้รับ {c.pending_po_eta}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 border-t px-5 py-3.5">
                      <Button onClick={() => decide(c, "คุ้มค่า")}>
                        คุ้มค่า - สั่งซื้อเพิ่ม
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => decide(c, "ไม่คุ้มค่า")}
                      >
                        ไม่คุ้มค่า - ยกเลิก
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchase" className="mt-4">
          <DataTable
            data={queue}
            columns={purchaseCols}
            getRowId={(row) => row.sku}
            emptyState={
              <EmptyState
                icon={PackageCheck}
                title="ไม่มี SKU ที่ต่ำกว่าเกณฑ์"
                hint="ระบบจะดึง SKU ที่สต๊อกรวมต่ำกว่าเกณฑ์เติมขึ้นมาที่นี่ตามรอบเวลาที่ตั้งไว้"
              />
            }
          />
        </TabsContent>
      </Tabs>

      {/* UC อนุญาตให้แก้จำนวนก่อนยืนยัน โดยไม่กระทบค่า reorder_qty ที่ตั้งไว้ */}
      <Dialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              ยืนยันผลการตัดสินใจ: {confirming?.decision}
            </DialogTitle>
            <DialogDescription>
              {confirming?.decision === "คุ้มค่า"
                ? "Order จะถูกส่งเข้าสู่การสั่งซื้อจาก Supplier"
                : "Order จะถูกส่งเข้าสู่การยกเลิก Order"}
            </DialogDescription>
          </DialogHeader>

          {confirming?.decision === "คุ้มค่า" && (
            <Field>
              <FieldLabel htmlFor="order_qty">จำนวนที่จะสั่งซื้อ</FieldLabel>
              <Input
                id="order_qty"
                type="number"
                min={1}
                value={confirming.qty}
                onChange={(e) =>
                  setConfirming({ ...confirming, qty: Number(e.target.value) })
                }
              />
              <FieldDescription>
                ค่าที่แก้ที่นี่ใช้เฉพาะครั้งนี้ ไม่กระทบจำนวนสั่งเติมที่ตั้งไว้ในกฎ SKU
              </FieldDescription>
            </Field>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              ยกเลิก
            </Button>
            <Button onClick={commitDecision}>ยืนยัน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({
  label,
  value,
  muted,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  tone?: "success" | "cancelled";
}) {
  return (
    <div className="px-5 py-4 sm:not-first:border-l">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        data-numeric
        className={[
          "mt-1 text-lg font-semibold",
          muted ? "text-muted-foreground text-base font-normal" : "",
          tone === "success" ? "text-status-success" : "",
          tone === "cancelled" ? "text-status-cancelled" : "",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
