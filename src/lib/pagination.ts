export type PaginationResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
};

export function paginateItems<T>(items: T[], requestedPage: number, pageSize: number): PaginationResult<T> {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (page - 1) * safePageSize;
  const pageItems = items.slice(startIndex, startIndex + safePageSize);

  return {
    items: pageItems,
    page,
    pageSize: safePageSize,
    totalItems: items.length,
    totalPages,
    startItem: items.length ? startIndex + 1 : 0,
    endItem: Math.min(startIndex + safePageSize, items.length)
  };
}
