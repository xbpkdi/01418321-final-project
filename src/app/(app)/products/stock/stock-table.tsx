"use client";

import * as React from "react";
import { DataTable } from "@/components/shared/data-table";
import { useT } from "@/lib/i18n/context";
import { stockColumns, type StockRow } from "./columns";

export function StockTable({ data }: { data: StockRow[] }) {
  const t = useT();
  const columns = React.useMemo(() => stockColumns(t), [t]);

  return (
    <DataTable data={data} columns={columns} getRowId={(row) => row.sku} />
  );
}
