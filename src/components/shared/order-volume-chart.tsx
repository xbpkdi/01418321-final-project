"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  count: { label: "จำนวน Order", color: "var(--primary)" },
} satisfies ChartConfig;

export function OrderVolumeChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
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
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          fontSize={12}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
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
