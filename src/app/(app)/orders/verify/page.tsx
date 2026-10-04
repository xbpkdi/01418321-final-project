"use client";

// OrderVerifyScreen — UC 2A ตรวจสอบคำสั่งซื้อ
// ข้อความและเงื่อนไขตรวจสอบทั้งหมดมาจาก 00-use-case-descriptions.md

import { useMemo, useState } from "react";
import { ClipboardCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { verifyColumns } from "./columns";
import { MOCK_ORDERS } from "@/mock/orders";
import type { Order } from "@/types/order";

const SHIPPING_METHODS = ["RSL ปกติ", "RSL ขนาดใหญ่", "จัดส่งเอง"];

export default function OrderVerifyScreen() {
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
      setError("ข้อมูลคำสั่งซื้อไม่ครบถ้วน กรุณาตรวจสอบ");
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
      setError("จำนวนสินค้าต้องมากกว่า 0");
      return;
    }

    // 3. ตรวจสอบสถานะของ Order
    if (selected.order_status !== "รอตรวจสอบคำสั่งซื้อ") {
      setError("Order นี้ผ่านการตรวจสอบไปแล้ว");
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
      toast.success("ยืนยันคำสั่งซื้อสำเร็จ");
    }, 500);
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="ตรวจสอบคำสั่งซื้อ"
        description="ตรวจทานรายละเอียด Order ก่อนส่งเข้าสู่ขั้นตอนจับคู่กฎ SKU"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <DataTable
          data={visible}
          columns={verifyColumns}
          getRowId={(row) => row.order_id}
          onRowClick={select}
          selectedRowId={selectedId}
          toolbar={
            <div className="relative max-w-sm">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
                aria-label="ค้นหา Order"
                placeholder="ค้นหาด้วย Order ID, SKU หรือช่องทางขาย"
              />
            </div>
          }
          emptyState={
            <EmptyState
              icon={ClipboardCheck}
              title={
                keyword
                  ? "ไม่พบ Order ที่ตรงกับคำค้นหา"
                  : "ไม่มี Order ที่รอตรวจสอบ"
              }
              hint={
                keyword
                  ? "ลองค้นด้วย Order ID, SKU หรือชื่อช่องทางขายอีกครั้ง"
                  : "Order ใหม่จะเข้ามาที่นี่หลังกดนำเข้า Order จากหน้าภาพรวมระบบ"
              }
            />
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>รายละเอียดคำสั่งซื้อ</CardTitle>
          </CardHeader>

          {!selected ? (
            <CardContent>
              <EmptyState
                icon={ClipboardCheck}
                title="ยังไม่ได้เลือก Order"
                hint="เลือกรายการจากตารางด้านซ้ายเพื่อตรวจทานรายละเอียดก่อนยืนยัน"
              />
            </CardContent>
          ) : (
            <CardContent className="grid gap-4">
              <dl className="grid gap-3 text-sm">
                <Row label="Order ID" value={selected.order_id} />
                <Row
                  label="เลขคำสั่งซื้อจากช่องทางขาย"
                  value={selected.marketplace_order_id}
                />
                <Row label="ช่องทางขาย" value={selected.sales_channel} />
                <Row label="SKU" value={selected.sku} />
                <Row label="สินค้า" value={selected.product_name} />
                <Row label="Variation" value={selected.variation} />
                <Row label="จำนวน" value={String(selected.qty)} numeric />
                <Row
                  label="ที่อยู่จัดส่ง"
                  value={selected.shipping_address}
                  multiline
                />
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">สถานะ</dt>
                  <dd>
                    <StatusBadge status={selected.order_status} />
                  </dd>
                </div>
              </dl>

              {/* UC อนุญาตให้แก้ไขฟิลด์ที่กำหนดก่อนยืนยัน เช่น shipping_method */}
              <div className="grid gap-2 border-t pt-4">
                <Label htmlFor="shipping_method">วิธีจัดส่ง</Label>
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
                <p className="text-muted-foreground text-xs">
                  ระบบบันทึกผู้แก้ไขและเวลาที่แก้ไขไว้ทุกครั้ง
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-3 py-2.5 text-sm"
                >
                  {error}
                </p>
              )}

              <Button onClick={confirm} disabled={submitting}>
                ยืนยันคำสั่งซื้อ
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
