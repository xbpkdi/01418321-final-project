"use client";

import { createColumnHelper } from "@tanstack/react-table";
import {
  DataTable,
  type AppTableFeatures,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

const columns = col.columns([
  col.accessor("order_id", {
    header: "Order ID",
    meta: { label: "Order ID" },
    cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
  }),
  col.accessor("product_name", {
    header: "สินค้า",
    meta: { label: "สินค้า" },
    cell: (ctx) => (
      <span className="text-muted-foreground block max-w-[22ch] truncate">
        {ctx.getValue()}
      </span>
    ),
  }),
  col.accessor("sales_channel", {
    header: "ช่องทางขาย",
    meta: { label: "ช่องทางขาย" },
    cell: (ctx) => (
      <span className="text-muted-foreground">{ctx.getValue()}</span>
    ),
  }),
  col.accessor("order_status", {
    header: "สถานะ",
    meta: { label: "สถานะ" },
    cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
  }),
]);

export function RecentOrdersTable({ data }: { data: Order[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.order_id}
      showColumnToggle={false}
      pageSize={data.length || 1}
    />
  );
}
