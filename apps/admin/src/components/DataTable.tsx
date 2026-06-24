'use client';

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchColumn?: string;
  pageSize?: number;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Ara...',
  searchColumn,
  pageSize = 20,
  toolbar,
  onRowClick,
  emptyMessage = 'Kayıt bulunamadı.',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-56"
        />
        {toolbar}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center gap-1',
                            header.column.getCanSort() && 'cursor-pointer select-none hover:text-[var(--text-secondary)]'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-[var(--text-muted)]">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronsUpDown className="w-3 h-3 opacity-40" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-12 text-center text-[var(--text-muted)] text-sm"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      'border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 text-[var(--text-primary)] whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-[var(--text-muted)]">
          Toplam{' '}
          <span className="font-medium text-[var(--text-secondary)]">{table.getFilteredRowModel().rows.length}</span>{' '}
          kayıt — Sayfa{' '}
          <span className="font-medium text-[var(--text-secondary)]">{table.getState().pagination.pageIndex + 1}</span>{' '}
          /{' '}
          <span className="font-medium text-[var(--text-secondary)]">{table.getPageCount() || 1}</span>
        </p>
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            icon={<ChevronLeft className="w-3.5 h-3.5" />}
          />
          <Button
            size="xs"
            variant="ghost"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            icon={<ChevronRight className="w-3.5 h-3.5" />}
          />
        </div>
      </div>
    </div>
  );
}
