import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WorkspaceProjectStartLayer from './WorkspaceProjectStartLayer'
import { openWorkspaceProjectStart } from './workspace-project-start-event'

vi.mock('./WorkspaceProjectStartModal', () => ({
  default: ({ open }: { open: boolean }) => (
    <div data-testid="workspace-project-start-state">{open ? '열림' : '닫힘'}</div>
  ),
}))

function TestApp({ pathname }: { pathname: string }) {
  return (
    <>
      <main key={pathname}>{pathname}</main>
      <WorkspaceProjectStartLayer />
    </>
  )
}

describe('WorkspaceProjectStartLayer', () => {
  it('페이지가 바뀌어도 열린 AI 작업 레이어를 유지한다', () => {
    const { rerender } = render(<TestApp pathname="/workspace-hub" />)

    act(() => openWorkspaceProjectStart())
    expect(screen.getByTestId('workspace-project-start-state')).toHaveTextContent('열림')

    rerender(<TestApp pathname="/squad-dashboard" />)
    expect(screen.getByTestId('workspace-project-start-state')).toHaveTextContent('열림')
  })
})
