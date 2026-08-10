import { Button, CmsIcon, EmptyState, Input } from "@cms/ui";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

export type DataTableColumn<TRow> = {
  align?: "left" | "right";
  header: string;
  id: string;
  render: (row: TRow) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: TRow) => number | string | null | undefined;
};

type DataTablePagination = {
  label: string;
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
};

type DataTableProps<TRow> = {
  columns: DataTableColumn<TRow>[];
  data: TRow[];
  emptyDescription: string;
  emptyTitle: string;
  filters?: ReactNode;
  getRowKey: (row: TRow) => string;
  isLoading?: boolean;
  loadingDescription: string;
  loadingTitle: string;
  onSearch?: (formData: FormData) => void;
  pagination?: DataTablePagination | undefined;
  searchDefaultValue?: string;
  searchPlaceholder?: string;
};

type SortState = {
  columnId: string;
  direction: "asc" | "desc";
} | null;

export function DataTable<TRow>({
  columns,
  data,
  emptyDescription,
  emptyTitle,
  filters,
  getRowKey,
  isLoading = false,
  loadingDescription,
  loadingTitle,
  onSearch,
  pagination,
  searchDefaultValue = "",
  searchPlaceholder = "Search",
}: DataTableProps<TRow>) {
  const [sort, setSort] = useState<SortState>(null);
  const sortedData = useMemo(() => sortRows(data, columns, sort), [columns, data, sort]);
  const hasToolbar = Boolean(onSearch || filters);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch?.(new FormData(event.currentTarget));
  }

  return (
    <div className="data-table-panel">
      {hasToolbar && (
        <form className="toolbar" onSubmit={handleSearch}>
          {onSearch && (
            <label className="search-field">
              <CmsIcon name="search" />
              <Input
                name="search"
                placeholder={searchPlaceholder}
                defaultValue={searchDefaultValue}
              />
            </label>
          )}
          {filters}
          {onSearch && (
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          )}
        </form>
      )}

      {isLoading ? (
        <EmptyState title={loadingTitle} description={loadingDescription} />
      ) : sortedData.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={column.align === "right" ? "text-right" : undefined}
                  >
                    {column.sortable ? (
                      <button type="button" onClick={() => setSort(nextSort(sort, column.id))}>
                        {column.header}
                        {sort?.columnId === column.id && (
                          <span aria-hidden="true">
                            {sort.direction === "asc" ? "Asc" : "Desc"}
                          </span>
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr key={getRowKey(row)}>
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={column.align === "right" ? "text-right" : undefined}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <div className="pagination">
          <span>{pagination.label}</span>
          <div>
            <button
              disabled={pagination.page <= 1}
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <CmsIcon name="chevronLeft" />
            </button>
            <strong>
              {pagination.page} / {Math.max(pagination.pageCount, 1)}
            </strong>
            <button
              disabled={pagination.page >= pagination.pageCount}
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <CmsIcon name="chevronRight" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function nextSort(sort: SortState, columnId: string): SortState {
  if (sort?.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }

  if (sort.direction === "asc") {
    return { columnId, direction: "desc" };
  }

  return null;
}

function sortRows<TRow>(rows: TRow[], columns: DataTableColumn<TRow>[], sort: SortState): TRow[] {
  if (!sort) {
    return rows;
  }

  const column = columns.find((currentColumn) => currentColumn.id === sort.columnId);

  if (!column?.sortValue) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const leftValue = column.sortValue?.(left);
    const rightValue = column.sortValue?.(right);
    const comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return sort.direction === "asc" ? comparison : -comparison;
  });
}
