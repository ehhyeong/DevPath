import { describe, expect, it } from 'vitest'
import { paginateAdminItems } from './admin-pagination'

describe('paginateAdminItems', () => {
  it('renders only the requested page', () => {
    const result = paginateAdminItems(Array.from({ length: 103 }, (_, index) => index + 1), 2, 50)

    expect(result.items).toHaveLength(50)
    expect(result.items[0]).toBe(51)
    expect(result.items[49]).toBe(100)
    expect(result).toMatchObject({ currentPage: 2, totalPages: 3, startIndex: 51, endIndex: 100 })
  })

  it('clamps an out-of-range page after filtering', () => {
    const result = paginateAdminItems(['filtered'], 12, 50)

    expect(result).toMatchObject({ currentPage: 1, totalPages: 1, startIndex: 1, endIndex: 1 })
    expect(result.items).toEqual(['filtered'])
  })

  it('keeps empty results on the first page', () => {
    const result = paginateAdminItems([], 3, 50)

    expect(result).toMatchObject({ currentPage: 1, totalPages: 1, startIndex: 0, endIndex: 0 })
    expect(result.items).toEqual([])
  })
})
