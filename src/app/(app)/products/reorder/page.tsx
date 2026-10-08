"use client";

// ReorderDecisionScreen — UC 5A ตัดสินใจสั่งซื้อเพิ่ม + UC 6A สั่งซื้อจาก Supplier
// สองขั้นตอนนี้รวมไว้หน้าเดียวตาม ui-design-brief.md ข้อ 1
// Order ที่ตัดสินใจ "คุ้มค่า" ใน 5A จะไปรออยู่ในแท็บ "รอสั่งซื้อเติมสต๊อก" ของ 6A ทันที
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md (ดู decide / purchase ใน lib/workflow.ts)

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageCheck, ReceiptText, ShoppingCart } from "lucide-react";
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
import { SectionMessage } from "@/components/shared/section-message";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";
import { purchaseColumns, purchaseOrderColumns } from "./columns";
import { useLanguage } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { formatBaht, formatDate } from "@/lib/format";
import {
  decide,
  findProduct,
  findSupplier,
  pendingPo,
  purchase,
  purchaseQueue,
  unitCostOf,
  type DecideResult,
  type PurchaseRow,
} from "@/lib/workflow";
import type { Order } from "@/types/order";

type Decision = "คุ้มค่า" | "ไม่คุ้มค่า";

export default function ReorderDecisionScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { state, run } = useStore();
  const [tab, setTab] = useState("decide");
  const [confirming, setConfirming] = useState<{ orderId: string; decision: Decision; qty: number } | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [buying, setBuying] = useState<{ row: PurchaseRow; qty: number; duplicateEta: string | null } | null>(null);

  // 5A ขั้นตอนที่ 1: Order ที่รอการตัดสินใจ รวม Order ที่ไม่มีราคาขาย (รอดำเนินการด้วยตนเอง)
  const candidates = state.orders.filter(
    (o) =>
      o.order_status === "รอ Admin ตัดสินใจสั่งซื้อ" ||
      (o.order_status === "รอดำเนินการด้วยตนเอง" && o.manual_reason === "price"),
  );
  const queue = purchaseQueue(state);
  const purchaseOrders = [...state.purchaseOrders].sort((a, b) => b.order_date.localeCompare(a.order_date));

  // 5A ขั้นตอนที่ 2 → ทางเลือก #1 / #2
  function open(order: Order, decision: Decision) {
    const product = findProduct(state, order.sku);
    setDialogError(null);
    setConfirming({ orderId: order.order_id, decision, qty: product?.reorder_qty ?? order.qty });
  }

  const DECIDE_ERROR: Record<Exclude<DecideResult, "ok">, string> = {
    "not-pending": t.reorder.errDecided,
    "no-price": t.reorder.errNoPrice,
    "no-cost": t.reorder.errNoCost,
    db: t.reorder.errDb,
  };

  // Q5A.3 / Q5A.4
  function commitDecision() {
    if (!confirming) return;
    const { orderId, decision, qty } = confirming;
    const { result } = run((s) => {
      const r = decide(s, orderId, decision, qty);
      return { state: r.state, result: r.result };
    });
    if (result === "ok") {
      setConfirming(null);
      toast.success(t.reorder.okDecided, {
        description: decision === "คุ้มค่า" ? t.reorder.okDecidedApprove : t.reorder.okDecidedReject,
        action:
          decision === "คุ้มค่า"
            ? { label: t.reorder.tabPurchase(queue.length + 1), onClick: () => setTab("purchase") }
            : undefined,
      });
      return;
    }
    if (result === "no-price" || result === "not-pending") {
      setConfirming(null);
      toast.error(DECIDE_ERROR[result]);
      return;
    }
    // บันทึกไม่สำเร็จ: คง dialog ไว้ให้กดยืนยันซ้ำได้
    setDialogError(DECIDE_ERROR[result]);
  }

  // 6A ขั้นตอนที่ 3 + ทางเลือก #2: เปิดให้แก้จำนวนก่อนกด "สั่งซื้อ"
  function openPurchase(row: PurchaseRow) {
    setBuying({ row, qty: row.decided_qty ?? row.reorder_qty, duplicateEta: null });
  }

  function commitPurchase() {
    if (!buying) return;
    const { row, qty, duplicateEta } = buying;
    const { result } = run((s) => {
      const r = purchase(s, row.sku, qty, duplicateEta !== null);
      return { state: r.state, result: r.result };
    });
    switch (result.kind) {
      case "pending-po": // ทางเลือก #4: ให้ Admin ยืนยันก่อนสั่งซ้ำ
        setBuying({ ...buying, duplicateEta: result.eta });
        return;
      case "not-configured": // ทางเลือก #1
        setBuying(null);
        toast.error(t.reorder.errNotConfigured, {
          action: { label: t.reorder.goProducts, onClick: () => router.push("/products") },
        });
        return;
      case "send-failed": // ทางเลือก #3
        setBuying(null);
        toast.error(t.reorder.errSendFailed);
        return;
      case "ok":
        setBuying(null);
        toast.success(t.reorder.okPurchased(row.sku, result.supplier.supplier_name), {
          description: t.reorder.okPurchasedHint(formatDate(result.po.eta, lang)),
        });
    }
  }

  const confirmingOrder = confirming ? state.orders.find((o) => o.order_id === confirming.orderId) : undefined;
  const recalculated =
    confirming && confirmingOrder && confirming.qty > 0
      ? unitCostOf(state, confirmingOrder.sku, confirming.qty)
      : null;

  return (
    <div className="grid gap-6 p-6">
      <PageHeader title={t.reorder.title} description={t.reorder.description} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="decide">{t.reorder.tabDecide(candidates.length)}</TabsTrigger>
          <TabsTrigger value="purchase">{t.reorder.tabPurchase(queue.length)}</TabsTrigger>
          <TabsTrigger value="ordered">{t.reorder.tabOrdered(purchaseOrders.length)}</TabsTrigger>
        </TabsList>

        <TabsContent value="decide" className="mt-4">
          {candidates.length === 0 ? (
            <div className="rounded-lg border">
              <EmptyState icon={ShoppingCart} title={t.reorder.emptyDecideTitle} hint={t.reorder.emptyDecideHint} />
            </div>
          ) : (
            <div className="grid gap-4">
              {candidates.map((o) => {
                const product = findProduct(state, o.sku);
                const supplier = product ? findSupplier(state, product.supplier_id) : undefined;
                const unitCost = unitCostOf(state, o.sku);
                const price = product?.selling_price ?? null;
                const margin = price === null || unitCost === null ? null : price - unitCost;
                const po = pendingPo(state, o.sku);
                const manual = o.order_status === "รอดำเนินการด้วยตนเอง";
                return (
                  <article key={o.order_id} className="rounded-lg border">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-3.5">
                      <div>
                        <h2 className="font-semibold">{o.product_name}</h2>
                        <p className="text-muted-foreground text-xs">
                          {o.order_id} · {o.sku} · {o.variation} · {t.common.qty} {o.qty}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={o.order_status} />
                        <p className="text-muted-foreground text-xs">
                          {supplier?.supplier_name ?? t.reorder.notConfigured} · {t.reorder.leadTime}{" "}
                          <span data-numeric>{supplier?.lead_time ?? "—"}</span> {t.common.days}
                        </p>
                      </div>
                    </div>

                    <dl className="divide-border grid divide-y sm:grid-cols-3 sm:divide-y-0">
                      <Metric
                        label={t.reorder.unitCost}
                        value={unitCost === null ? t.reorder.cannotCompute : formatBaht(unitCost)}
                        muted={unitCost === null}
                      />
                      <Metric
                        label={t.reorder.currentPrice}
                        value={price === null ? t.reorder.noPrice : formatBaht(price)}
                        muted={price === null}
                      />
                      <Metric
                        label={t.reorder.expectedMargin}
                        value={margin === null ? t.reorder.cannotCompute : formatBaht(margin)}
                        muted={margin === null}
                        tone={margin === null ? undefined : margin > 0 ? "success" : "cancelled"}
                      />
                    </dl>

                    {unitCost === null && (
                      <div className="border-t px-5 py-3">
                        <SectionMessage appearance="warning">
                          {t.reorder.errNoCost}{" "}
                          <Link href="/products/cost" className="underline">
                            {t.reorder.goCost}
                          </Link>
                        </SectionMessage>
                      </div>
                    )}
                    {manual && (
                      <div className="border-t px-5 py-3">
                        <SectionMessage appearance="error">
                          {t.reorder.errNoPrice}{" "}
                          <Link href="/products" className="underline">
                            {t.reorder.goProducts}
                          </Link>
                        </SectionMessage>
                      </div>
                    )}
                    {po && (
                      <div className="border-t px-5 py-3">
                        <SectionMessage appearance="warning">
                          {t.reorder.pendingPo} · {t.reorder.pendingPoEta(formatDate(po.eta, lang))}
                        </SectionMessage>
                      </div>
                    )}

                    {!manual && (
                      <div className="flex flex-wrap gap-2 border-t px-5 py-3.5">
                        <Button onClick={() => open(o, "คุ้มค่า")}>{t.reorder.approve}</Button>
                        <Button variant="outline" onClick={() => open(o, "ไม่คุ้มค่า")}>
                          {t.reorder.reject}
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchase" className="mt-4">
          <DataTable
            data={queue}
            columns={purchaseColumns(t, openPurchase)}
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

        <TabsContent value="ordered" className="mt-4">
          <DataTable
            data={purchaseOrders}
            columns={purchaseOrderColumns(t, lang, (id) => findSupplier(state, id)?.supplier_name ?? id)}
            getRowId={(row) => row.po_id}
            emptyState={<EmptyState icon={ReceiptText} title={t.reorder.emptyOrderedTitle} />}
          />
        </TabsContent>
      </Tabs>

      {/* 5A: ยืนยันผลการตัดสินใจ แก้จำนวนสั่งซื้อได้โดยไม่กระทบ reorder_qty และคำนวณ unit_cost ใหม่ */}
      <Dialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t.reorder.confirmTitle(
                confirming?.decision === "คุ้มค่า" ? t.reorder.decisionApprove : t.reorder.decisionReject,
              )}
            </DialogTitle>
            <DialogDescription>
              {confirming?.orderId} ·{" "}
              {confirming?.decision === "คุ้มค่า" ? t.reorder.confirmApprove : t.reorder.confirmReject}
            </DialogDescription>
          </DialogHeader>

          {confirming?.decision === "คุ้มค่า" && confirmingOrder && pendingPo(state, confirmingOrder.sku) && (
            <SectionMessage appearance="warning">
              {t.reorder.pendingPo} ·{" "}
              {t.reorder.pendingPoEta(formatDate(pendingPo(state, confirmingOrder.sku)!.eta, lang))}
            </SectionMessage>
          )}

          {confirming?.decision === "คุ้มค่า" && (
            <Field>
              <FieldLabel htmlFor="decided_qty">{t.reorder.orderQtyLabel}</FieldLabel>
              <Input
                id="decided_qty"
                type="number"
                min={1}
                value={confirming.qty}
                onChange={(e) => setConfirming({ ...confirming, qty: Number(e.target.value) })}
              />
              <FieldDescription>
                {t.reorder.orderQtyHint}
                {recalculated !== null && (
                  <span className="text-foreground block">{t.reorder.recalculated(formatBaht(recalculated))}</span>
                )}
              </FieldDescription>
            </Field>
          )}

          {dialogError && <SectionMessage appearance="error">{dialogError}</SectionMessage>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={commitDecision} disabled={confirming?.decision === "คุ้มค่า" && !(confirming.qty > 0)}>
              {t.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6A: ยืนยันจำนวนแล้วกด "สั่งซื้อ" */}
      <Dialog open={buying !== null} onOpenChange={(o) => !o && setBuying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.reorder.purchaseTitle(buying?.row.sku ?? "")}</DialogTitle>
            <DialogDescription>
              {buying?.row.supplier
                ? t.reorder.purchaseHint(buying.row.supplier.supplier_name, buying.row.supplier.lead_time)
                : t.reorder.notConfigured}
            </DialogDescription>
          </DialogHeader>

          {buying?.duplicateEta && (
            <SectionMessage appearance="warning">
              {t.reorder.pendingPo} · {t.reorder.pendingPoEta(formatDate(buying.duplicateEta, lang))}
            </SectionMessage>
          )}

          {buying && (
            <Field>
              <FieldLabel htmlFor="purchase_qty">{t.reorder.orderQtyLabel}</FieldLabel>
              <Input
                id="purchase_qty"
                type="number"
                min={1}
                value={buying.qty}
                onChange={(e) => setBuying({ ...buying, qty: Number(e.target.value) })}
              />
              <FieldDescription>{t.reorder.orderQtyHint}</FieldDescription>
            </Field>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuying(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={commitPurchase}>{buying?.duplicateEta ? t.common.confirm : t.reorder.purchase}</Button>
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
