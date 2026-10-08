"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useLanguage } from "@/lib/i18n/context";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export function OrderVolumeChart({
  data,
}: {
  /** date เป็น ISO (yyyy-mm-dd) */
  data: { date: string; count: number }[];
}) {
  const { lang, t } = useLanguage();
  // วันที่บนแกนต้องตามภาษาที่เลือก ไม่ใช่ล็อกไว้ที่ไทย
  const dayFormatter = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "th-TH", {
    day: "numeric",
    month: "short",
  });
  const toDate = (iso: string) => new Date(`${iso}T00:00:00`);
  const formatDay = (iso: string) => dayFormatter.format(toDate(iso));
  // แกนแสดงแค่วันที่ ไม่งั้นการ์ดแคบแล้วป้ายซ้อนกัน วันเดือนเต็มอยู่ใน tooltip
  const formatTick = (iso: string) => String(toDate(iso).getDate());
  const config = {
    count: { label: t.dashboard.chartSeries, color: "var(--primary)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-44 w-full">
      <BarChart data={data} margin={{ left: -16, right: 8, top: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          interval={0}
          minTickGap={0}
          tickFormatter={formatTick}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          fontSize={12}
          allowDecimals={false}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} />}
        />
        {/* ปิด animation: แท่งวิ่งขึ้นไม่ได้สื่อสถานะอะไร และทำให้ภาพที่ capture ได้ไม่ตรง */}
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
