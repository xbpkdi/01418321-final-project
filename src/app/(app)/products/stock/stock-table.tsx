"use client";

import * as React from "react";
import { Boxes } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { TableSearch } from "@/components/shared/table-search";
import { EmptyState } from "@/components/shared/empty-state";
import { useT } from "@/lib/i18n/context";
import { stockColumns, type StockRow } from "./columns";

export function StockTable({ data }: { data: StockRow[] }) {
  const t = useT();
  const columns = React.useMemo(() => stockColumns(t), [t]);
  const [keyword, setKeyword] = React.useState("");

  // ค้นด้วย SKU หรือชื่อสินค้า
  const visible = React.useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (row) =>
        row.sku.toLowerCase().includes(q) ||
        row.product_name.toLowerCase().includes(q),
    );
  }, [data, keyword]);

  return (
    <DataTable
      data={visible}
      columns={columns}
      getRowId={(row) => row.sku}
      toolbar={
        <TableSearch
          value={keyword}
          onChange={setKeyword}
          label={t.stock.searchLabel}
          placeholder={t.stock.searchPlaceholder}
        />
      }
      emptyState={
        <EmptyState
          icon={Boxes}
          title={t.stock.emptySearchTitle}
          hint={t.stock.emptySearchHint}
        />
      }
    />
  );
}
