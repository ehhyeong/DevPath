import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminActions, installAdminActionDelegation } from './admin-action-registry'

describe('admin action delegation', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('removes inline click handlers and delegates actions through the registry', () => {
    const mergeTag = vi.fn(async () => undefined)
    adminActions.mergeTag = mergeTag
    document.body.innerHTML = '<button type="button" onclick="mergeTag(7)">병합</button>'

    installAdminActionDelegation(document.body)
    const button = document.querySelector('button')
    button?.click()

    expect(button?.hasAttribute('onclick')).toBe(false)
    expect(mergeTag).toHaveBeenCalledWith(7)
  })

  it('sanitizes dynamically rendered controls and resolves this.value', async () => {
    const updateField = vi.fn()
    adminActions.updateCatalogCategoryField = updateField
    installAdminActionDelegation(document.body)

    const input = document.createElement('input')
    input.value = '백엔드'
    input.setAttribute('onchange', "updateCatalogCategoryField(2, 'title', this.value)")
    document.body.appendChild(input)
    await Promise.resolve()
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(input.hasAttribute('onchange')).toBe(false)
    expect(updateField).toHaveBeenCalledWith(2, 'title', '백엔드')
  })

  it('delegates React-compatible input events without leaving an oninput attribute', () => {
    const updateField = vi.fn()
    adminActions.updateRoadmapHubSectionField = updateField
    document.body.innerHTML = '<input value="기존값" oninput="updateRoadmapHubSectionField(1, \'title\', this.value)">'

    installAdminActionDelegation(document.body)
    const input = document.querySelector('input') as HTMLInputElement
    input.value = '수정된 제목'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(input.hasAttribute('oninput')).toBe(false)
    expect(updateField).toHaveBeenCalledWith(1, 'title', '수정된 제목')
  })
})
