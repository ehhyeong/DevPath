import { describe, expect, it } from 'vitest'
import { shouldLoadAdminTab, type AdminTabKey } from './admin-dashboard-support'

describe('shouldLoadAdminTab', () => {
  it('loads a tab only once during ordinary navigation', () => {
    const loadedTabs = new Set<AdminTabKey>(['dashboard', 'tags'])

    expect(shouldLoadAdminTab(loadedTabs, 'users')).toBe(true)
    expect(shouldLoadAdminTab(loadedTabs, 'tags')).toBe(false)
  })

  it('allows the manual refresh action to bypass the cache', () => {
    const loadedTabs = new Set<AdminTabKey>(['reports'])

    expect(shouldLoadAdminTab(loadedTabs, 'reports', true)).toBe(true)
  })
})
