"use client";

// ตารางกลางของทุกหน้า อิง data-table.tsx ของ shadcn block dashboard-01
// ตัดส่วน drag-to-reorder (dnd-kit) ออก เพราะไม่มี UC ไหนต้องการจัดลำดับแถว
// เก็บไว้: เรียงคอลัมน์ กรอง แบ่งหน้า และซ่อนคอลัมน์

import * as React from "react";
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const tableFeatureSet = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

export type AppTableFeatures = typeof tableFeatureSet;

export function DataTable<T extends object>({
  data,
  columns,
  getRowId,
  onRowClick,
  selectedRowId,
  emptyState,
  toolbar,
  pageSize = 10,
  showColumnToggle = true,
}: {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: any[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedRowId?: string | null;
  emptyState?: React.ReactNode;
  toolbar?: React.ReactNode;
  pageSize?: number;
  /** ปิดเมื่อฝังตารางไว้ในการ์ด ที่ปุ่มเลือกคอลัมน์กลายเป็นส่วนเกิน */
  showColumnToggle?: boolean;
}) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });

  const table = useTable({
    features: tableFeatureSet,
    data,
    columns,
    state: { sorting, columnVisibility, columnFilters, pagination },
    getRowId: (row) => getRowId(row as T),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const rows = table.getRowModel().rows;
  const showPagination = table.getPageCount() > 1;

  return (
    <div className="flex flex-col gap-4">
      {(toolbar || showColumnToggle) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1">{toolbar}</div>
          {showColumnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3Icon data-icon="inline-start" />
                  คอลัมน์
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" &&
                      column.getCanHide(),
                  )
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {typeof column.columnDef.meta === "object" &&
                      column.columnDef.meta !== null &&
                      "label" in column.columnDef.meta
                        ? String(column.columnDef.meta.label)
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={
                    onRowClick ? () => onRowClick(row.original as T) : undefined
                  }
                  data-state={selectedRowId === row.id ? "selected" : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  {emptyState ?? (
                    <div className="text-muted-foreground h-24 text-center leading-24">
                      ไม่พบข้อมูล
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            ทั้งหมด {table.getFilteredRowModel().rows.length} รายการ
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                แถวต่อหน้า
              </Label>
              <Select
                value={`${table.state.pagination!.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 50].map((size) => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              หน้า {table.state.pagination!.pageIndex + 1} จาก{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">ไปหน้าแรก</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">หน้าก่อนหน้า</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">หน้าถัดไป</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">ไปหน้าสุดท้าย</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
