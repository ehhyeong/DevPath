import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MvpFeatureProgress from './MvpFeatureProgress'
import type { WorkspaceTask } from './dashboard-types'

const task = (taskId: number, status: WorkspaceTask['status'], featureIds?: string[], assigneeId?: number): WorkspaceTask => ({ taskId, workspaceId: 42, title: `작업 ${taskId}`, status, featureIds, assigneeId })

describe('MVP 기능별 완료 작업 비율', () => {
  it('중간 기능을 삭제해도 남은 기능의 고정 번호로 작업 진행률을 계산한다', () => {
    render(<MvpFeatureProgress workspaceId={42} features={['신고']} featureIds={['F3']} tasks={[task(1, 'DONE', ['F3']), task(2, 'TODO', ['F1'])]} />)
    expect(screen.getByRole('progressbar', { name: 'F3. 신고' })).toHaveAttribute('aria-valuenow', '100')
    expect(screen.queryByText('F1. 신고')).not.toBeInTheDocument()
  })

  it('F1·F2를 구분하고 타 담당자·미지정 작업도 포함하며 복수 연결은 기능별로 한 번만 센다', () => {
    render(<MvpFeatureProgress workspaceId={42} features={['로그인', '신고', '조회']} tasks={[
      task(1, 'DONE', ['F1', 'F1', 'F2'], 88), task(2, 'TODO', ['F1']),
      task(3, 'IN_PROGRESS', ['F1'], 77), task(4, 'IN_REVIEW', ['F1']),
      task(5, 'DONE', ['F2']), task(6, 'DONE'),
    ]} />)
    expect(screen.getByRole('progressbar', { name: 'F1. 로그인' })).toHaveAttribute('aria-valuenow', '25')
    expect(screen.getByRole('progressbar', { name: 'F2. 신고' })).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('완료 1 / 연결 작업 4개')).toBeVisible()
    expect(screen.getByText('완료 2 / 연결 작업 2개')).toBeVisible()
    expect(screen.getAllByRole('link', { name: 'DP-01 · 작업 1' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'DP-01 · 작업 1' })[0]).toHaveAttribute('href', '/squad-workspace?workspaceId=42&ai=1#DP-01')
    expect(screen.getByText(/작업 연결 전/)).toBeVisible()
    expect(screen.queryByRole('progressbar', { name: 'F3. 조회' })).not.toBeInTheDocument()
  })

  it('상태 변경·연결 해제·카드 삭제를 반영하고 3개 중 1개 완료를 반올림한다', () => {
    const tasks = [task(1, 'DONE', ['F1']), task(2, 'TODO', ['F1']), task(3, 'IN_REVIEW', ['F1'])]
    const { rerender } = render(<MvpFeatureProgress workspaceId={42} features={['로그인']} tasks={tasks} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
    rerender(<MvpFeatureProgress workspaceId={42} features={['로그인']} tasks={tasks.map((entry) => entry.taskId === 2 ? { ...entry, status: 'DONE' } : entry)} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67')
    rerender(<MvpFeatureProgress workspaceId={42} features={['로그인']} tasks={[task(2, 'TODO', []), task(3, 'IN_REVIEW', ['F1'])]} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    rerender(<MvpFeatureProgress workspaceId={42} features={['로그인']} tasks={[]} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /작업 연결 전/ })).toHaveAttribute('href', '/squad-workspace?workspaceId=42&ai=1')
  })
})
