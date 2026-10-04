"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  DataTable,
  type AppTableFeatures,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useT } from "@/lib/i18n/context";
import type { Dict } from "@/lib/i18n/dict";
import type { Order } from "@/types/order";

const col = createColumnHelper<AppTableFeatures, Order>();

function recentColumns(t: Dict) {
  return col.columns([
    col.accessor("order_id", {
      header: "Order ID",
      meta: { label: "Order ID" },
      cell: (ctx) => <span className="font-medium">{ctx.getValue()}</span>,
    }),
    col.accessor("product_name", {
      header: t.common.product,
      meta: { label: t.common.product },
      cell: (ctx) => (
        <span className="text-muted-foreground block max-w-[22ch] truncate">
          {ctx.getValue()}
        </span>
      ),
    }),
    col.accessor("sales_channel", {
      header: t.common.salesChannel,
      meta: { label: t.common.salesChannel },
      cell: (ctx) => (
        <span className="text-muted-foreground">{ctx.getValue()}</span>
      ),
    }),
    col.accessor("order_status", {
      header: t.common.status,
      meta: { label: t.common.status },
      cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
    }),
  ]);
}

export function RecentOrdersTable({ data }: { data: Order[] }) {
  const t = useT();
  const columns = React.useMemo(() => recentColumns(t), [t]);

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
