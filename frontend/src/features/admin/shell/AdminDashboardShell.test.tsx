import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AdminDashboardShell from './AdminDashboardShell'

describe('AdminDashboardShell', () => {
  it('keeps the navigation, tab, modal, and imperative DOM contracts', () => {
    const { container } = render(<AdminDashboardShell />)
    const ids = Array.from(container.querySelectorAll<HTMLElement>('[id]')).map((element) => element.id)

    expect(container.querySelectorAll('.nav-btn')).toHaveLength(9)
    expect(container.querySelectorAll('[id^="view-"]')).toHaveLength(10)
    expect(new Set(ids).size).toBe(ids.length)
    expect(container.querySelector('#main-content')).toBeInTheDocument()
    expect(container.querySelector('#view-dashboard')).toBeVisible()
    expect(container.querySelector('#view-tags')).toHaveClass('hidden')
    expect(container.querySelector('#addNodeModal')).toBeInTheDocument()
    expect(container.querySelector('#nodeResourceActiveInput')).toBeChecked()
  })
})
