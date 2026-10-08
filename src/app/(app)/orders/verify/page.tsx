"use client";

// OrderVerifyScreen — UC 2A ตรวจสอบคำสั่งซื้อ
// ข้อความและเงื่อนไขตรวจสอบทั้งหมดมาจาก 00-use-case-descriptions.md (ดู verifyOrder ใน lib/workflow.ts)

import * as React from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionMessage } from "@/components/shared/section-message";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";
import { TableSearch } from "@/components/shared/table-search";
import { verifyColumns } from "./columns";
import { useLanguage } from "@/lib/i18n/context";
import { useStore, useUnsavedChanges } from "@/lib/store";
import { findOrder, verifyOrder, type VerifyResult } from "@/lib/workflow";
import { SHIPPING_METHODS } from "@/mock/delivery";
import { formatDateTime } from "@/lib/format";
import type { Order } from "@/types/order";

export default function OrderVerifyScreen() {
  const { lang, t } = useLanguage();
  const { state, run } = useStore();
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shippingMethod, setShippingMethod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ขั้นตอนที่ 1: แสดงเฉพาะ Order ที่อยู่ในสถานะ "รอตรวจสอบคำสั่งซื้อ"
  const pending = useMemo(
    () => state.orders.filter((o) => o.order_status === "รอตรวจสอบคำสั่งซื้อ"),
    [state.orders],
  );
  // Order ที่ตรวจแล้วข้อมูลไม่ครบ — ให้เห็นว่าไปค้างอยู่ที่ไหน
  const manual = state.orders.filter(
    (o) =>
      o.order_status === "รอดำเนินการด้วยตนเอง" &&
      (o.manual_reason === "incomplete" ||
        o.manual_reason === "sku-unregistered"),
  );

  // ค้นหาตาม order_id, sku และ sales_channel ตามที่ UC กำหนด
  const visible = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter(
      (o) =>
        o.order_id.toLowerCase().includes(q) ||
        o.sku.toLowerCase().includes(q) ||
        o.sales_channel.toLowerCase().includes(q),
    );
  }, [pending, keyword]);

  const selected = selectedId ? (findOrder(state, selectedId) ?? null) : null;
  const columns = React.useMemo(() => verifyColumns(t), [t]);
  useUnsavedChanges(
    "verify",
    selected !== null && shippingMethod !== selected.shipping_method,
  );

  // ขั้นตอนที่ 2: เลือก Order แล้วดึงรายละเอียด (Q2A.1)
  function select(order: Order) {
    setSelectedId(order.order_id);
    setShippingMethod(order.shipping_method);
    setError(null);
  }

  const MESSAGE: Record<Exclude<VerifyResult, "ok">, string> = {
    incomplete: t.verify.errIncomplete,
    qty: t.verify.errQty,
    already: t.verify.errAlreadyVerified,
    "customer-cancelled": t.verify.errCustomerCancelled,
    marketplace: t.verify.errMarketplace,
  };

  // ขั้นตอนที่ 3: กด "ยืนยันคำสั่งซื้อ"
  function confirm() {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    const orderId = selected.order_id;
    window.setTimeout(() => {
      const { result } = run((s) => {
        const r = verifyOrder(s, orderId, { shipping_method: shippingMethod });
        return { state: r.state, result: r.result };
      });
      setSubmitting(false);
      if (result === "ok") {
        setSelectedId(null);
        toast.success(t.verify.okVerified);
        return;
      }
      // Order ที่ออกจากคิวไปแล้ว (ไม่ครบ/ลูกค้ายกเลิก) แจ้งด้วย toast เพราะแผงรายละเอียดจะปิด
      if (result === "incomplete" || result === "customer-cancelled") {
        setSelectedId(null);
        toast.error(MESSAGE[result], {
          description: t.common.orderRef(orderId),
        });
        return;
      }
      setError(MESSAGE[result]);
    }, 500);
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader title={t.verify.title} description={t.verify.description} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <DataTable
          data={visible}
          columns={columns}
          getRowId={(row) => row.order_id}
          onRowClick={select}
          selectedRowId={selectedId}
          toolbar={
            <TableSearch
              value={keyword}
              onChange={setKeyword}
              label={t.verify.searchLabel}
              placeholder={t.verify.searchPlaceholder}
            />
          }
          emptyState={
            <EmptyState
              icon={ClipboardCheck}
              title={keyword ? t.verify.emptySearchTitle : t.verify.emptyTitle}
              hint={keyword ? t.verify.emptySearchHint : t.verify.emptyHint}
            />
          }
        />

        <Card className="self-start">
          <CardHeader>
            <CardTitle>{t.verify.detailTitle}</CardTitle>
          </CardHeader>

          {!selected ? (
            <CardContent>
              <EmptyState
                icon={ClipboardCheck}
                title={t.verify.noSelectionTitle}
                hint={t.verify.noSelectionHint}
              />
            </CardContent>
          ) : (
            <CardContent className="grid gap-4">
              {selected.customer_cancel_request && (
                <Badge
                  variant="secondary"
                  className="bg-status-cancelled-bg text-status-cancelled w-fit"
                >
                  {t.verify.customerCancelBadge}
                </Badge>
              )}
              <dl className="grid gap-3 text-sm">
                <Row label="Order ID" value={selected.order_id} />
                <Row
                  label={t.verify.marketplaceOrderId}
                  value={selected.marketplace_order_id}
                />
                <Row
                  label={t.common.salesChannel}
                  value={selected.sales_channel}
                />
                <Row label={t.verify.channelSku} value={selected.channel_sku} />
                <Row label="SKU" value={selected.sku || "—"} />
                <Row label={t.common.product} value={selected.product_name} />
                <Row label="Variation" value={selected.variation} />
                <Row
                  label={t.common.qty}
                  value={String(selected.qty)}
                  numeric
                />
                <Row
                  label={t.common.shippingAddress}
                  value={selected.shipping_address || "—"}
                  multiline
                />
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{t.common.status}</dt>
                  <dd>
                    <StatusBadge status={selected.order_status} />
                  </dd>
                </div>
              </dl>

              {/* UC อนุญาตให้แก้ไขฟิลด์ที่กำหนดก่อนยืนยัน เช่น shipping_method */}
              <Field className="border-t pt-4">
                <FieldLabel htmlFor="shipping_method">
                  {t.common.shippingMethod}
                </FieldLabel>
                <Select
                  value={shippingMethod}
                  onValueChange={setShippingMethod}
                >
                  <SelectTrigger id="shipping_method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t.verify.editNote}
                  {selected.edit_log?.map((log) => (
                    <span key={log.at} className="block">
                      {t.verify.editLog(log.by, formatDateTime(log.at, lang))}
                    </span>
                  ))}
                </FieldDescription>
              </Field>

              {error && (
                <SectionMessage appearance="error">{error}</SectionMessage>
              )}

              <Button onClick={confirm} disabled={submitting}>
                {submitting && <Spinner />}
                {t.verify.submit}
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      {manual.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.verify.manualTitle}</CardTitle>
            <CardDescription>{t.verify.manualHint}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {manual.map((o) => (
              <div
                key={o.order_id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{o.order_id}</span>
                  <StatusBadge status={o.order_status} />
                </span>
                <span className="text-muted-foreground">
                  {o.manual_reason ? t.manualReason[o.manual_reason] : ""}
                </span>
                <Button size="sm" variant="outline" asChild>
                  {o.manual_reason === "sku-unregistered" ? (
                    <Link href="/products">{t.verify.goProducts}</Link>
                  ) : (
                    <Link href="/orders/cancel">{t.verify.goCancel}</Link>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  numeric,
  multiline,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <div
      className={
        multiline ? "grid gap-1" : "flex items-start justify-between gap-4"
      }
    >
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd
        data-numeric={numeric ? "" : undefined}
        className={multiline ? "" : "text-right"}
      >
        {value}
      </dd>
    </div>
  );
}
