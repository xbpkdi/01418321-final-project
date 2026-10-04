// DashboardScreen — หน้ารวมหลัง login (UC 1A Post-Condition)
// โครงหน้าอิง shadcn block dashboard-01: section cards → chart → data table
// เนื้อหายึดตาม biz-requirement ข้อ 12: ออเดอร์รอพิมพ์ label, สต๊อกต่ำกว่าเกณฑ์,
// ต้นทุนต่อหน่วย และ action ที่ล้มเหลวต้องเห็นชัดในที่เดียว
// ปุ่ม "นำเข้า Order" และสถานะการเชื่อมต่อมาจาก UC 4A

import Link from "next/link";
import { ArrowRight, DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderVolumeChart } from "@/components/shared/order-volume-chart";
import { RecentOrdersTable } from "./recent-orders-table";
import {
  MOCK_CONNECTIONS,
  MOCK_DAILY_VOLUME,
  MOCK_ORDERS,
} from "@/mock/orders";
import { MOCK_STOCK } from "@/mock/products";
import type { OrderStatus } from "@/lib/order-status";

const WATCHED: { status: OrderStatus; href: string }[] = [
  { status: "รอตรวจสอบคำสั่งซื้อ", href: "/orders/verify" },
  { status: "รอ Admin ตัดสินใจสั่งซื้อ", href: "/products/reorder" },
  { status: "รอพิมพ์ใบปะสินค้า", href: "/shipping/label" },
  { status: "รอดำเนินการด้วยตนเอง", href: "/orders/verify" },
];

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function DashboardScreen() {
  const counts = WATCHED.map((item) => ({
    ...item,
    count: MOCK_ORDERS.filter((o) => o.order_status === item.status).length,
  }));
  const failed = MOCK_CONNECTIONS.filter((c) => !c.connected);
  const lowStock = MOCK_STOCK.filter(
    (s) => s.in_house_qty + s.rsl_qty <= s.reorder_threshold,
  );

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold">ภาพรวมระบบ</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            สรุปงานที่ค้างอยู่และสถานะการเชื่อมต่อช่องทางขาย
          </p>
        </div>
        <Button>
          <DownloadCloud />
          นำเข้า Order
        </Button>
      </div>

      {failed.length > 0 && (
        <div className="px-4 lg:px-6">
          <div
            role="alert"
            className="border-status-attention/30 bg-status-attention-bg text-status-attention rounded-lg border px-4 py-3 text-sm"
          >
            ไม่สามารถเชื่อมต่อกับ {failed.map((c) => c.channel).join(", ")} ได้
            กรุณาตรวจสอบการตั้งค่า
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6">
        {counts.map((item) => (
          <Card key={item.status}>
            <CardHeader>
              <CardDescription>
                <StatusBadge status={item.status} />
              </CardDescription>
              <CardTitle
                data-numeric
                className="text-3xl font-semibold tabular-nums"
              >
                {item.count}
              </CardTitle>
            </CardHeader>
            <CardFooter>
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1 text-xs"
              >
                ดูรายการ
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 px-4 lg:grid-cols-[2fr_1fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Order ล่าสุด</CardTitle>
            <CardDescription>
              รายการที่เพิ่งเข้าระบบและสถานะปัจจุบัน
            </CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href="/orders/verify">ดูทั้งหมด</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <RecentOrdersTable data={MOCK_ORDERS.slice(0, 6)} />
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>การเชื่อมต่อช่องทางขาย</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {MOCK_CONNECTIONS.map((c) => (
                <div
                  key={c.channel}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.channel}</p>
                    <p className="text-muted-foreground text-xs">
                      ซิงก์ล่าสุด {timeFormatter.format(new Date(c.last_sync))}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      c.connected
                        ? "bg-status-success-bg text-status-success"
                        : "bg-status-cancelled-bg text-status-cancelled"
                    }
                  >
                    {c.connected ? "เชื่อมต่อแล้ว" : "เชื่อมต่อไม่ได้"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>สต๊อกต่ำกว่าเกณฑ์</CardTitle>
              <CardDescription>
                SKU ที่ยอดรวมคลังบริษัทกับ RSL ถึงเกณฑ์เติมแล้ว
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {lowStock.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  ไม่มี SKU ที่ต่ำกว่าเกณฑ์
                </p>
              ) : (
                lowStock.map((s) => (
                  <div
                    key={s.sku}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.sku}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {s.product_name}
                      </p>
                    </div>
                    <span data-numeric className="text-sm font-medium">
                      {s.in_house_qty + s.rsl_qty} / {s.reorder_threshold}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter>
              <Link
                href="/products/stock"
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ดูสต๊อกทั้งหมด
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order ที่นำเข้า 7 วันล่าสุด</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderVolumeChart data={MOCK_DAILY_VOLUME} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
