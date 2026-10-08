"use client";

// DashboardScreen — หน้ารวมหลัง login (UC 1A Post-Condition)
// โครงหน้าอิง shadcn block dashboard-01: section cards → chart → data table
// เนื้อหายึดตาม biz-requirement ข้อ 12: ออเดอร์รอพิมพ์ label, สต๊อกต่ำกว่าเกณฑ์/สถานะ reorder,
// ต้นทุนต่อหน่วย และ action ที่ล้มเหลวต้องเห็นชัดในที่เดียว
// ปุ่ม "นำเข้า Order" และสถานะการเชื่อมต่อมาจาก UC 4A

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, DownloadCloud } from "lucide-react";
import { toast } from "sonner";
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
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderVolumeChart } from "@/components/shared/order-volume-chart";
import { CountUp } from "@/components/shared/count-up";
import { SectionMessage } from "@/components/shared/section-message";
import { RecentOrdersTable } from "./recent-orders-table";
import { MOCK_DAILY_VOLUME } from "@/mock/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { useLanguage } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { issueOf } from "@/lib/issues";
import { importOrders, stockTotal, unitCostOf } from "@/lib/workflow";
import { formatBaht, formatDate, formatDateTime } from "@/lib/format";

// ส่ง status ไปกรองปลายทางด้วย ไม่งั้นพอรายการเยอะจะหาไม่เจอว่ากดมาจากใบไหน
const WATCHED: { status: OrderStatus; href: string }[] = [
  { status: "รอตรวจสอบคำสั่งซื้อ", href: "/orders/verify" },
  { status: "รอ Admin ตัดสินใจสั่งซื้อ", href: "/products/reorder" },
  { status: "รอพิมพ์ใบปะสินค้า", href: "/shipping/label" },
  { status: "รอดำเนินการด้วยตนเอง", href: "#issues" },
];

export default function DashboardScreen() {
  const { lang, t } = useLanguage();
  const { state, run } = useStore();
  const [importing, setImporting] = useState(false);

  const counts = WATCHED.map((item) => ({
    ...item,
    count: state.orders.filter((o) => o.order_status === item.status).length,
  }));
  const ticker = ORDER_STATUSES.map((status) => ({
    status,
    count: state.orders.filter((o) => o.order_status === status).length,
  })).filter((x) => x.count > 0);
  const issues = state.orders
    .map((o) => ({ order: o, issue: issueOf(o, t) }))
    .filter((x): x is { order: typeof x.order; issue: NonNullable<typeof x.issue> } => x.issue !== null);
  const lowStock = state.products
    .filter((p) => p.active)
    .map((p) => ({ product: p, stock: stockTotal(state, p.sku) }))
    .filter((x) => x.stock && x.stock.total <= x.product.reorder_threshold);
  const unitCosts = state.products
    .map((p) => ({ product: p, cost: unitCostOf(state, p.sku) }))
    .filter((x) => x.cost !== null);
  const purchaseOrders = [...state.purchaseOrders]
    .sort((a, b) => b.order_date.localeCompare(a.order_date))
    .slice(0, 4);
  const recent = [...state.orders]
    .sort((a, b) => b.order_date.localeCompare(a.order_date))
    .slice(0, 6);

  // UC 4A ขั้นตอนที่ 2–3
  function handleImport() {
    setImporting(true);
    window.setTimeout(() => {
      const { result } = run((s) => {
        const r = importOrders(s);
        return { state: r.state, result: r.result };
      });
      setImporting(false);
      if (!result.ok) {
        toast.error(t.dashboard.connectionFailed(state.connection.channel));
        return;
      }
      if (result.imported === 0 && result.incomplete === 0 && result.duplicates === 0) {
        toast.info(t.dashboard.importNone);
      } else {
        toast.success(t.dashboard.importOk(result.imported), {
          description:
            result.duplicates > 0 ? t.dashboard.importDuplicates(result.duplicates) : undefined,
        });
      }
      if (result.incomplete > 0) toast.error(t.dashboard.importIncomplete);
      if (result.unregistered > 0) toast.error(t.dashboard.importUnregistered);
      if (result.cancelRequested.length > 0) {
        toast.warning(t.dashboard.importCancelRequest(result.cancelRequested.join(", ")));
      }
    }, 500);
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 pb-4 md:gap-6 md:pb-6">
      <section className="ribbon-host border-b px-4 pt-10 pb-8 lg:px-6 lg:pt-14 lg:pb-10">
        <div className="ribbon" aria-hidden />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="rise">
            <p className="eyebrow">{t.app.company}</p>
            <h1 className="display mt-3 text-[clamp(2.75rem,7vw,6rem)]">
              {t.dashboard.title}
              <span className="text-coral">.</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-prose text-sm">
              {t.dashboard.description}
            </p>
          </div>
          <Button size="lg" className="h-11" onClick={handleImport} disabled={importing}>
            {importing ? <Spinner /> : <DownloadCloud />}
            {t.dashboard.importOrders}
          </Button>
        </div>
      </section>

      {/* แถบสรุปจำนวน Order ตามสถานะ (ticker ตาม brief ข้อ 9.1) */}
      <div className="px-4 lg:px-6">
        <div
          aria-label={t.dashboard.ticker}
          className="bg-card flex gap-6 overflow-x-auto rounded-lg border px-4 py-2.5 text-sm whitespace-nowrap"
        >
          {ticker.map((x) => (
            <span key={x.status} className="inline-flex items-center gap-2">
              <StatusBadge status={x.status} />
              <span data-numeric className="font-semibold">
                {x.count}
              </span>
            </span>
          ))}
        </div>
      </div>

      {!state.connection.connected && (
        <div className="px-4 lg:px-6">
          {/* ปัญหาการเชื่อมต่อเป็น error ตามแนวทาง Atlassian ไม่ใช่ warning */}
          <SectionMessage appearance="error">
            {t.dashboard.connectionFailed(state.connection.channel)}
          </SectionMessage>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6">
        {counts.map((item, i) => (
          <Card
            key={item.status}
            // การ์ดขาว แถบบนสี primary ทุกใบ: สีแยกต่อใบไม่ได้สื่อความหมาย และไปชนกับสีสถานะ
            className="rise stat-card"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <CardHeader>
              <CardDescription>
                <StatusBadge status={item.status} />
              </CardDescription>
              <CardTitle
                data-numeric
                className="font-display mt-2 text-6xl leading-none tabular-nums"
              >
                <CountUp value={item.count} />
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
        <div className="grid gap-4">
          <Card id="issues" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>{t.dashboard.issues}</CardTitle>
              <CardDescription>{t.dashboard.issuesHint}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {issues.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t.dashboard.noIssues}</p>
              ) : (
                issues.map(({ order, issue }) => (
                  <Link
                    key={order.order_id}
                    href={issue.href}
                    className="bg-status-cancelled-bg/60 hover:bg-status-cancelled-bg flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-medium">{order.order_id}</span>
                      <StatusBadge status={order.order_status} />
                    </span>
                    <span className="text-muted-foreground">{issue.text}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.recentOrders}</CardTitle>
              <CardDescription>{t.dashboard.recentOrdersHint}</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/orders/cancel">{t.dashboard.viewAll}</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <RecentOrdersTable data={recent} />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.connections}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{state.connection.channel}</p>
                  <p className="text-muted-foreground text-xs">
                    {t.dashboard.lastSync(formatDateTime(state.connection.last_sync, lang))}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    state.connection.connected
                      ? "bg-status-success-bg text-status-success"
                      : "bg-status-cancelled-bg text-status-cancelled"
                  }
                >
                  {state.connection.connected ? t.dashboard.connected : t.dashboard.disconnected}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.lowStock}</CardTitle>
              <CardDescription>{t.dashboard.lowStockHint}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {lowStock.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t.dashboard.noLowStock}</p>
              ) : (
                lowStock.map(({ product, stock }) => (
                  <div key={product.sku} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.sku}</p>
                      <p className="text-muted-foreground truncate text-xs">{product.product_name}</p>
                    </div>
                    <span data-numeric className="text-status-cancelled text-sm font-medium">
                      {stock!.total} / {product.reorder_threshold}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter>
              <Link href="/products/stock" className="text-muted-foreground hover:text-foreground text-xs">
                {t.dashboard.viewAllStock}
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.reorderStatus}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {purchaseOrders.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t.dashboard.noPurchaseOrders}</p>
              ) : (
                purchaseOrders.map((po) => (
                  <div key={po.po_id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {po.po_id} · {po.sku}
                      </p>
                      {po.eta && (
                        <p className="text-muted-foreground text-xs">
                          {t.dashboard.eta(formatDate(po.eta, lang))}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={po.status} />
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter>
              <Link href="/products/reorder" className="text-muted-foreground hover:text-foreground text-xs">
                {t.dashboard.viewList}
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.unitCosts}</CardTitle>
              <CardDescription>{t.dashboard.unitCostsHint}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {unitCosts.map(({ product, cost }) => {
                const over = product.selling_price !== null && cost! > product.selling_price;
                return (
                  <div key={product.sku} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.sku}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {t.common.sellingPrice}{" "}
                        {product.selling_price === null
                          ? t.common.notSet
                          : formatBaht(product.selling_price)}
                      </p>
                    </div>
                    <span
                      data-numeric
                      className={`text-sm font-medium ${over ? "text-status-cancelled" : ""}`}
                    >
                      {formatBaht(cost!)}
                    </span>
                  </div>
                );
              })}
            </CardContent>
            <CardFooter>
              <Link href="/products/cost" className="text-muted-foreground hover:text-foreground text-xs">
                {t.dashboard.viewList}
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
