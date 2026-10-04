// DashboardScreen — หน้ารวมหลัง login (UC 1A Post-Condition)
// เนื้อหายึดตาม biz-requirement ข้อ 12: ออเดอร์รอพิมพ์ label, สต๊อกต่ำกว่าเกณฑ์,
// ต้นทุนต่อหน่วย และ action ที่ล้มเหลวต้องเห็นชัดในที่เดียว
// ปุ่ม "นำเข้า Order" และสถานะการเชื่อมต่อมาจาก UC 4A

import Link from "next/link";
import { ArrowRight, DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderVolumeChart } from "@/components/shared/order-volume-chart";
import {
  MOCK_CONNECTIONS,
  MOCK_DAILY_VOLUME,
  MOCK_ORDERS,
} from "@/mock/orders";
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
  const recent = MOCK_ORDERS.slice(0, 6);
  const failed = MOCK_CONNECTIONS.filter((c) => !c.connected);

  return (
    <div className="grid gap-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
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
        <div
          role="alert"
          className="border-status-attention/30 bg-status-attention-bg text-status-attention rounded-lg border px-4 py-3 text-sm"
        >
          ไม่สามารถเชื่อมต่อกับ {failed.map((c) => c.channel).join(", ")} ได้
          กรุณาตรวจสอบการตั้งค่า
        </div>
      )}

      <section className="divide-border grid divide-y rounded-lg border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {counts.map((item, index) => (
          <Link
            key={item.status}
            href={item.href}
            className="hover:bg-muted focus-visible:bg-muted group flex flex-col gap-1.5 px-5 py-4 transition-colors sm:[&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0 lg:not-first:border-l sm:even:border-l"
          >
            <StatusBadge status={item.status} className="w-fit" />
            <span
              data-numeric
              className="text-foreground text-3xl leading-none font-semibold"
            >
              {item.count}
            </span>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              ดูรายการ
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="font-semibold">Order ล่าสุด</h2>
            <Link
              href="/orders/verify"
              className="text-primary text-sm hover:underline"
            >
              ดูทั้งหมด
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Order ID</th>
                <th className="hidden px-5 py-2.5 text-left font-medium md:table-cell">
                  สินค้า
                </th>
                <th className="hidden px-5 py-2.5 text-left font-medium sm:table-cell">
                  ช่องทางขาย
                </th>
                <th className="px-5 py-2.5 text-left font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {recent.map((order) => (
                <tr key={order.order_id} className="hover:bg-muted/60">
                  <td className="px-5 py-3 font-medium">{order.order_id}</td>
                  <td className="text-muted-foreground hidden max-w-[22ch] truncate px-5 py-3 md:table-cell">
                    {order.product_name}
                  </td>
                  <td className="text-muted-foreground hidden px-5 py-3 sm:table-cell">
                    {order.sales_channel}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.order_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="grid gap-6 content-start">
          <section className="rounded-lg border">
            <h2 className="border-b px-5 py-3.5 font-semibold">
              การเชื่อมต่อช่องทางขาย
            </h2>
            <ul className="divide-border divide-y">
              {MOCK_CONNECTIONS.map((c) => (
                <li
                  key={c.channel}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.channel}</p>
                    <p className="text-muted-foreground text-xs">
                      ซิงก์ล่าสุด {timeFormatter.format(new Date(c.last_sync))}
                    </p>
                  </div>
                  <span
                    className={
                      c.connected
                        ? "bg-status-success-bg text-status-success rounded-md px-2 py-0.5 text-xs font-medium"
                        : "bg-status-cancelled-bg text-status-cancelled rounded-md px-2 py-0.5 text-xs font-medium"
                    }
                  >
                    {c.connected ? "เชื่อมต่อแล้ว" : "เชื่อมต่อไม่ได้"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border">
            <h2 className="border-b px-5 py-3.5 font-semibold">
              Order ที่นำเข้า 7 วันล่าสุด
            </h2>
            <div className="px-3 py-4">
              <OrderVolumeChart data={MOCK_DAILY_VOLUME} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
