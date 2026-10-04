"use client";

import { DataTable } from "@/components/shared/data-table";
import { stockColumns, type StockRow } from "./columns";

export function StockTable({ data }: { data: StockRow[] }) {
  return (
    <DataTable
      data={data}
      columns={stockColumns}
      getRowId={(row) => row.sku}
    />
  );
}
