import { describe, expect, it } from 'vitest'
import { renderAdminMarkup } from './admin-react-renderer'

describe('renderAdminMarkup', () => {
  it('keeps table rows inside a tbody container', () => {
    const table = document.createElement('table')
    const tbody = document.createElement('tbody')
    table.append(tbody)
    document.body.append(table)

    renderAdminMarkup(
      tbody,
      `
        <tr data-row-id="7">
          <td colspan="2"><strong>관리 항목</strong></td>
        </tr>
      `,
    )

    const row = tbody.querySelector(':scope > tr')
    expect(row).not.toBeNull()
    expect(row).toHaveAttribute('data-row-id', '7')
    expect(row?.querySelector('td')).toHaveAttribute('colspan', '2')
    expect(row).toHaveTextContent('관리 항목')
  })

  it('keeps options inside a select container', () => {
    const select = document.createElement('select')
    document.body.append(select)

    renderAdminMarkup(select, '<option value="active">활성</option>')

    expect(select.options).toHaveLength(1)
    expect(select.options[0]).toHaveValue('active')
    expect(select.options[0]).toHaveTextContent('활성')
  })
})
