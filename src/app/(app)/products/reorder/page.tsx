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
import { useT } from "@/lib/i18n/context";
import { MOCK_PURCHASE_QUEUE, MOCK_REORDER_CANDIDATES } from "@/mock/products";
import type { ReorderCandidate } from "@/types/product";

const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

type Decision = "คุ้มค่า" | "ไม่คุ้มค่า";

export default function ReorderDecisionScreen() {
  const t = useT();
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
      toast.error(t.reorder.errNoPrice, {
        description: t.reorder.errNoPriceHint,
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
    toast.success(t.reorder.okDecided, {
      description:
        decision === "คุ้มค่า"
          ? t.reorder.okDecidedApprove
          : t.reorder.okDecidedReject,
    });
  }

  // 6A ขั้นตอนที่ 3: ส่งคำสั่งซื้อไปยัง Supplier
  function purchase(sku: string) {
    const item = queue.find((q) => q.sku === sku);
    if (!item) return;

    if (!item.configured) {
      toast.error(t.reorder.errNotConfigured);
      return;
    }

    setQueue((prev) => prev.filter((q) => q.sku !== sku));
    toast.success(t.reorder.okPurchased(sku, item.supplier_name), {
      description: t.reorder.okPurchasedHint,
    });
  }

  const purchaseCols = purchaseColumns(t, purchase);

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.reorder.title}
        description={t.reorder.description}
      />

      <Tabs defaultValue="decide">
        <TabsList>
          <TabsTrigger value="decide">
            {t.reorder.tabDecide(candidates.length)}
          </TabsTrigger>
          <TabsTrigger value="purchase">
            {t.reorder.tabPurchase(queue.length)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decide" className="mt-4">
          {candidates.length === 0 ? (
            <div className="rounded-lg border">
              <EmptyState
                icon={ShoppingCart}
                title={t.reorder.emptyDecideTitle}
                hint={t.reorder.emptyDecideHint}
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
                        {c.supplier_name} · {t.reorder.leadTime}{" "}
                        <span data-numeric>{c.lead_time_days}</span>{" "}
                        {t.reorder.days}
                      </p>
                    </div>

                    <dl className="divide-border grid divide-y sm:grid-cols-3 sm:divide-y-0">
                      <Metric
                        label={t.reorder.unitCost}
                        value={baht.format(c.unit_cost)}
                      />
                      <Metric
                        label={t.reorder.currentPrice}
                        value={
                          c.selling_price === null
                            ? t.reorder.noPrice
                            : baht.format(c.selling_price)
                        }
                        muted={c.selling_price === null}
                      />
                      <Metric
                        label={t.reorder.expectedMargin}
                        value={
                          margin === null
                            ? t.reorder.cannotCompute
                            : baht.format(margin)
                        }
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
                        {t.reorder.pendingPo(c.pending_po_eta ?? "")}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 border-t px-5 py-3.5">
                      <Button onClick={() => decide(c, "คุ้มค่า")}>
                        {t.reorder.approve}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => decide(c, "ไม่คุ้มค่า")}
                      >
                        {t.reorder.reject}
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
                title={t.reorder.emptyPurchaseTitle}
                hint={t.reorder.emptyPurchaseHint}
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
              {t.reorder.confirmTitle(
                confirming?.decision === "คุ้มค่า"
                  ? t.reorder.decisionApprove
                  : t.reorder.decisionReject,
              )}
            </DialogTitle>
            <DialogDescription>
              {confirming?.decision === "คุ้มค่า"
                ? t.reorder.confirmApprove
                : t.reorder.confirmReject}
            </DialogDescription>
          </DialogHeader>

          {confirming?.decision === "คุ้มค่า" && (
            <Field>
              <FieldLabel htmlFor="order_qty">
                {t.reorder.orderQtyLabel}
              </FieldLabel>
              <Input
                id="order_qty"
                type="number"
                min={1}
                value={confirming.qty}
                onChange={(e) =>
                  setConfirming({ ...confirming, qty: Number(e.target.value) })
                }
              />
              <FieldDescription>{t.reorder.orderQtyHint}</FieldDescription>
            </Field>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={commitDecision}>{t.common.confirm}</Button>
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
