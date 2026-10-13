import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { navigateTo } from './spa-navigation'
import { useWorkspaceDataVersion, WORKSPACE_DATA_CHANGED_EVENT } from './workspace-events'

describe('보존된 스쿼드 화면 갱신', () => {
  it('다른 페이지의 이동에는 조회하지 않고 재방문과 뒤로가기 때 갱신한다', () => {
    window.history.replaceState({}, '', '/squad-workspace?workspaceId=42')
    const { result } = renderHook(useWorkspaceDataVersion)
    act(() => navigateTo('/squad-dashboard?workspaceId=42'))
    expect(result.current).toBe(0)
    act(() => navigateTo('/squad-workspace?workspaceId=42'))
    expect(result.current).toBe(1)
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(result.current).toBe(2)
    act(() => window.dispatchEvent(new Event(WORKSPACE_DATA_CHANGED_EVENT)))
    expect(result.current).toBe(3)
  })
})
