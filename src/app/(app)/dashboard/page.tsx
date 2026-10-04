"use client";

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
import { useLanguage } from "@/lib/i18n/context";

const WATCHED: { status: OrderStatus; href: string }[] = [
  { status: "รอตรวจสอบคำสั่งซื้อ", href: "/orders/verify" },
  { status: "รอ Admin ตัดสินใจสั่งซื้อ", href: "/products/reorder" },
  { status: "รอพิมพ์ใบปะสินค้า", href: "/shipping/label" },
  { status: "รอดำเนินการด้วยตนเอง", href: "/orders/verify" },
];

/** วันที่ต้องตามภาษาที่ผู้ใช้เลือก ไม่ใช่ล็อกไว้ที่ไทยเสมอ */
function makeTimeFormatter(lang: string) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardScreen() {
  const { lang, t } = useLanguage();
  const timeFormatter = makeTimeFormatter(lang);
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
          <h1 className="text-2xl font-semibold">{t.dashboard.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t.dashboard.description}
          </p>
        </div>
        <Button>
          <DownloadCloud />
          {t.dashboard.importOrders}
        </Button>
      </div>

      {failed.length > 0 && (
        <div className="px-4 lg:px-6">
          <div
            role="alert"
            className="border-status-attention/30 bg-status-attention-bg text-status-attention rounded-lg border px-4 py-3 text-sm"
          >
            {t.dashboard.connectionFailed(
              failed.map((c) => c.channel).join(", "),
            )}
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
                {t.dashboard.viewList}
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 px-4 lg:grid-cols-[2fr_1fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recentOrders}</CardTitle>
            <CardDescription>{t.dashboard.recentOrdersHint}</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href="/orders/verify">{t.dashboard.viewAll}</Link>
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
              <CardTitle>{t.dashboard.connections}</CardTitle>
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
                      {t.dashboard.lastSync(
                        timeFormatter.format(new Date(c.last_sync)),
                      )}
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
                    {c.connected ? t.dashboard.connected : t.dashboard.disconnected}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.lowStock}</CardTitle>
              <CardDescription>{t.dashboard.lowStockHint}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {lowStock.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t.dashboard.noLowStock}
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
                {t.dashboard.viewAllStock}
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.weeklyVolume}</CardTitle>
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
