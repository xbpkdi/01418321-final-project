"use client";

// OrderVerifyScreen — UC 2A ตรวจสอบคำสั่งซื้อ
// ข้อความและเงื่อนไขตรวจสอบทั้งหมดมาจาก 00-use-case-descriptions.md

import * as React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";
import { TableSearch } from "@/components/shared/table-search";
import { verifyColumns } from "./columns";
import { useT } from "@/lib/i18n/context";
import { MOCK_ORDERS } from "@/mock/orders";
import type { Order } from "@/types/order";

const SHIPPING_METHODS = ["RSL ปกติ", "RSL ขนาดใหญ่", "จัดส่งเอง"];

export default function OrderVerifyScreen() {
  const router = useRouter();
  const t = useT();
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shippingMethod, setShippingMethod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ขั้นตอนที่ 1: แสดงเฉพาะ Order ที่อยู่ในสถานะ "รอตรวจสอบคำสั่งซื้อ"
  const pending = useMemo(
    () => orders.filter((o) => o.order_status === "รอตรวจสอบคำสั่งซื้อ"),
    [orders],
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

  const selected = orders.find((o) => o.order_id === selectedId) ?? null;
  const columns = React.useMemo(() => verifyColumns(t), [t]);

  function select(order: Order) {
    setSelectedId(order.order_id);
    setShippingMethod(order.shipping_method);
    setError(null);
  }

  function confirm() {
    if (!selected) return;
    setError(null);

    // 2. ตรวจสอบความครบถ้วนของข้อมูล
    if (
      !selected.sku.trim() ||
      !selected.shipping_address.trim() ||
      selected.qty === null
    ) {
      setError(t.verify.errIncomplete);
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === selected.order_id
            ? { ...o, order_status: "รอดำเนินการด้วยตนเอง" }
            : o,
        ),
      );
      setSelectedId(null);
      return;
    }

    if (!Number.isInteger(selected.qty) || selected.qty <= 0) {
      setError(t.verify.errQty);
      return;
    }

    // 3. ตรวจสอบสถานะของ Order
    if (selected.order_status !== "รอตรวจสอบคำสั่งซื้อ") {
      setError(t.verify.errAlreadyVerified);
      return;
    }

    // 4. อัปเดตสถานะ Order (Q2A.2)
    setSubmitting(true);
    window.setTimeout(() => {
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === selected.order_id
            ? {
                ...o,
                shipping_method: shippingMethod,
                order_status: "รอจับคู่กฎ SKU",
              }
            : o,
        ),
      );
      setSelectedId(null);
      setSubmitting(false);
      // บอกขั้นถัดไปด้วย ไม่งั้นผู้ใช้ต้องเดาเองว่า Order ที่ยืนยันแล้วไปโผล่ที่ไหน
      toast.success(t.verify.okVerified, {
        action: {
          label: t.nav.items.rslMatch,
          onClick: () => router.push("/orders/rsl-match"),
        },
      });
    }, 500);
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.verify.title}
        description={t.verify.description}
      />

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
              title={
                keyword ? t.verify.emptySearchTitle : t.verify.emptyTitle
              }
              hint={keyword ? t.verify.emptySearchHint : t.verify.emptyHint}
            />
          }
        />

        <Card>
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
              <dl className="grid gap-3 text-sm">
                <Row label="Order ID" value={selected.order_id} />
                <Row
                  label={t.verify.marketplaceOrderId}
                  value={selected.marketplace_order_id}
                />
                <Row label={t.common.salesChannel} value={selected.sales_channel} />
                <Row label="SKU" value={selected.sku} />
                <Row label={t.common.product} value={selected.product_name} />
                <Row label="Variation" value={selected.variation} />
                <Row label={t.common.qty} value={String(selected.qty)} numeric />
                <Row
                  label={t.common.shippingAddress}
                  value={selected.shipping_address}
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
                <FieldDescription>{t.verify.editNote}</FieldDescription>
              </Field>

              {error && (
                <p
                  role="alert"
                  className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-3 py-2.5 text-sm"
                >
                  {error}
                </p>
              )}

              <Button onClick={confirm} disabled={submitting}>
                {t.verify.submit}
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
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
