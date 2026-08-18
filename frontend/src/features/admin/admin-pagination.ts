export const ADMIN_TABLE_PAGE_SIZE = 50

export type AdminPagination<T> = {
  currentPage: number
  endIndex: number
  items: T[]
  pageSize: number
  startIndex: number
  totalItems: number
  totalPages: number
}

export function paginateAdminItems<T>(
  items: T[],
  requestedPage: number,
  pageSize = ADMIN_TABLE_PAGE_SIZE,
): AdminPagination<T> {
  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1))
  const sliceStart = (currentPage - 1) * safePageSize
  const pageItems = items.slice(sliceStart, sliceStart + safePageSize)

  return {
    currentPage,
    endIndex: pageItems.length ? sliceStart + pageItems.length : 0,
    items: pageItems,
    pageSize: safePageSize,
    startIndex: pageItems.length ? sliceStart + 1 : 0,
    totalItems,
    totalPages,
  }
}
