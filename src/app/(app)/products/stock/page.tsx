"use client";

// StockCheckScreen — UC 3S ตรวจสอบของสินค้าใน stock + RSL
// ข้อความและเกณฑ์ทั้งหมดมาจาก 00-use-case-descriptions.md (ดู checkStock ใน lib/workflow.ts)

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { SectionMessage } from "@/components/shared/section-message";
import { StockTable } from "./stock-table";
import { useT } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { checkStock, type StockCheck } from "@/lib/workflow";
import { StockBadge, type StockRow } from "./columns";

export default function StockCheckScreen() {
  const t = useT();
  const { state } = useStore();
  const [sku, setSku] = useState("");
  const [result, setResult] = useState<StockCheck | null>(null);

  // ทางเลือก #2: ภาพรวมทุก SKU เรียงรายการที่ต่ำกว่าเกณฑ์ไว้บนสุด
  const rows: StockRow[] = state.products
    .map((p) => {
      const c = checkStock(state, p.sku);
      return c.found
        ? { ...c, product_name: p.product_name, variation: p.variation }
        : null;
    })
    .filter((r): r is StockRow => r !== null)
    .sort((a, b) => Number(b.low) - Number(a.low));

  const incomplete = rows.filter((r) => r.incomplete);

  // ขั้นตอนที่ 1–2: เลือกสินค้า แล้วกด "เช็คสต๊อก" (Q3.1)
  function check() {
    setResult(checkStock(state, sku));
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader title={t.stock.title} description={t.stock.description} />

      {/* ทางเลือก #3: เชื่อมต่อ RSL ไม่ได้ แสดงเฉพาะคลังบริษัท */}
      {state.faults.rsl && (
        <SectionMessage appearance="error">
          {t.stock.errRsl}
          <span className="text-muted-foreground block">
            {t.stock.partialHint}
          </span>
        </SectionMessage>
      )}

      {/* ทางเลือก #1: ข้อมูลสต๊อกขาดหาย */}
      {incomplete.length > 0 && (
        <SectionMessage appearance="warning">
          {t.stock.errIncomplete} · {incomplete.map((r) => r.sku).join(", ")}
        </SectionMessage>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Field className="w-full max-w-sm">
            <FieldLabel htmlFor="stock_sku">{t.stock.selectProduct}</FieldLabel>
            <Select
              value={sku}
              onValueChange={(v) => {
                setSku(v);
                // ระบบแสดงผลอัตโนมัติเมื่อเลือกสินค้า
                setResult(checkStock(state, v));
              }}
            >
              <SelectTrigger id="stock_sku" className="w-full">
                <SelectValue placeholder={t.stock.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {state.products.map((p) => (
                  <SelectItem key={p.sku} value={p.sku}>
                    {p.sku} · {p.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button onClick={check} disabled={!sku}>
            {t.stock.check}
          </Button>
        </CardContent>
        {result && (
          <CardContent>
            {!result.found ? (
              <SectionMessage appearance="error">
                {t.stock.errNotFound}
              </SectionMessage>
            ) : (
              <dl className="grid gap-4 rounded-md border p-4 text-sm sm:grid-cols-5">
                <Metric label={t.stock.inHouse} value={result.in_house_qty} />
                <Metric
                  label={t.stock.rsl}
                  value={result.rsl_qty}
                  fallback={t.common.notFound}
                />
                <Metric label={t.stock.total} value={result.total} strong />
                <Metric
                  label={t.common.reorderThreshold}
                  value={result.threshold}
                />
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {t.common.status}
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    <StockBadge low={result.low} />
                    {(result.incomplete || result.partial) && (
                      <Badge
                        variant="secondary"
                        className="bg-status-attention-bg text-status-attention"
                      >
                        {result.incomplete
                          ? t.stock.incomplete
                          : t.stock.partial}
                      </Badge>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.stock.overviewTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <StockTable data={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  fallback,
  strong,
}: {
  label: string;
  value: number | null;
  fallback?: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        data-numeric
        className={`mt-1 text-lg ${strong ? "font-semibold" : ""}`}
      >
        {value === null ? (
          <span className="text-muted-foreground text-sm">{fallback}</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
