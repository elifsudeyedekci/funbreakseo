'use client';
import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T>({ data, columns, pageSize = 20, className, emptyMessage = 'Veri bulunamadı.', loading }: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                    {h.isPlaceholder ? null : (
                      <div
                        className={cn('flex items-center gap-1', h.column.getCanSort() && 'cursor-pointer select-none hover:text-[var(--text-primary)]')}
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() && (
                          h.column.getIsSorted() === 'asc' ? <ChevronUp className="h-3 w-3" /> :
                          h.column.getIsSorted() === 'desc' ? <ChevronDown className="h-3 w-3" /> :
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-subtle)] animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-[var(--bg-elevated)]" /></td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-[var(--text-secondary)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-[var(--text-muted)]">
          <span>{table.getRowCount()} kayıt</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
              className="rounded p-1 hover:bg-[var(--bg-elevated)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Sayfa {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
            <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
              className="rounded p-1 hover:bg-[var(--bg-elevated)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
