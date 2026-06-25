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
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchPlaceholder?: string;
  pageSize?: number;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Remove outer border — use when DataTable is already inside a section-card */
  noBorder?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Ara...',
  pageSize = 20,
  toolbar,
  onRowClick,
  emptyMessage = 'Kayıt bulunamadı.',
  noBorder = false,
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

  const wrapper = noBorder ? 'flex flex-col' : 'rounded-[14px] border border-[var(--border-subtle)] overflow-hidden bg-[rgba(16,16,22,0.82)] flex flex-col';

  return (
    <div className={wrapper}>
      {/* Toolbar */}
      <div className="dt-toolbar">
        <div className="dt-search">
          <Search className="dt-search-icon" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="dt-search-input"
          />
        </div>
        {toolbar}
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="dt-table">
          <thead className="dt-thead">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn('dt-th', header.column.getCanSort() && 'dt-th-sortable')}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span style={{ opacity: header.column.getIsSorted() ? 1 : 0.35 }}>
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3" />
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
          <tbody className="dt-tbody">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="dt-empty">
                    <div className="empty-state-icon">
                      <Search style={{ width: 18, height: 18, color: 'var(--text-muted)' }} />
                    </div>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'clickable' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="dt-td">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="dt-pagination">
        <p className="dt-page-info">
          <strong>{table.getFilteredRowModel().rows.length}</strong> kayıt
          {' · '}Sayfa{' '}
          <strong>{table.getState().pagination.pageIndex + 1}</strong>
          {' / '}
          <strong>{table.getPageCount() || 1}</strong>
        </p>
        <div className="dt-page-btns">
          <button
            className="dt-page-btn"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
          <button
            className="dt-page-btn"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
