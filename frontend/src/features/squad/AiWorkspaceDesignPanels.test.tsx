import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiRoadmapCard, AiRoadmapStrip } from './AiWorkspaceDesignPanels'

const design = { roadmap: [1, 2, 3, 4].map((phase) => ({ phase, title: `단계 ${phase}`, goal: '개발', estimatedWeeks: 1, tasks: ['구현'] })) }
const events = [
  { title: 'Phase 1. 단계 1', startAt: '2026-09-23T00:00:00', endAt: '2026-09-30T23:59:00' },
  { title: 'Phase 2. 단계 2', startAt: '2026-10-01T00:00:00', endAt: '2026-10-07T00:00:00' },
  { title: 'Phase 3. 단계 3', startAt: '2026-11-01T00:00:00', endAt: '2026-11-08T23:59:00' },
]

describe('대시보드 개발 로드맵', () => {
  afterEach(() => vi.useRealTimers())

  it.each([
    ['2026-09-28T12:00:00', 1],
    ['2026-10-04T23:59:59', 1],
    ['2026-10-05T00:00:00', 2],
    ['2026-10-18T23:59:59', 2],
    ['2026-10-19T00:00:00', 3],
  ])('생성일부터 주수를 누적해 %s에 Phase %s를 강조한다', (today, currentPhase) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(today))
    const multiWeek = { roadmap: design.roadmap.map((phase) => ({ ...phase, estimatedWeeks: phase.phase === 2 ? 2 : 1 })) }
    render(<AiRoadmapCard design={multiWeek} workspaceId={42} events={[]} createdAt="2026-09-28T12:00:00" />)
    for (const phase of multiWeek.roadmap) {
      const link = screen.getByRole('link', { name: `Phase ${phase.phase}. ${phase.title}` })
      expect(link.hasAttribute('aria-current')).toBe(phase.phase === currentPhase)
      expect(link.querySelector('[aria-hidden]')).toHaveClass(phase.phase === currentPhase ? 'bg-purple-500' : phase.phase < currentPhase ? 'bg-brand' : 'bg-gray-300')
      expect(link).not.toHaveTextContent(/\d+주/)
    }
    expect(screen.getByRole('link', { name: 'Phase 1. 단계 1' })).toHaveTextContent('09.28 ~ 10.04')
    expect(screen.getByRole('link', { name: 'Phase 2. 단계 2' })).toHaveTextContent('10.05 ~ 10.18')
  })

  it('생성일 계산보다 수정된 저장 일정을 우선하고 기간 종료를 작업 완료와 구분한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T12:00:00'))
    render(<AiRoadmapCard design={design} workspaceId={42} events={events} createdAt="2026-10-06T12:00:00" />)
    expect(screen.getByRole('link', { name: 'Phase 1. 단계 1' })).toHaveTextContent('기간 종료')
    expect(screen.getByRole('link', { name: 'Phase 2. 단계 2' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('link', { name: 'Phase 2. 단계 2' })).toHaveTextContent('10.01 ~ 10.07')
    expect(screen.getByRole('link', { name: 'Phase 4. 단계 4' })).toHaveTextContent('11.09 ~ 11.15')
  })

  it('자정 이후 다시 렌더링하면 다음 단계로 자동 전환한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T23:59:59'))
    const card = <AiRoadmapCard design={design} workspaceId={42} events={[]} createdAt="2026-09-28T12:00:00" />
    const { rerender } = render(card)
    expect(screen.getByRole('link', { name: 'Phase 1. 단계 1' })).toHaveAttribute('aria-current', 'step')
    vi.setSystemTime(new Date('2026-10-05T00:00:00'))
    rerender(<AiRoadmapCard design={design} workspaceId={42} events={[]} createdAt="2026-09-28T12:00:00" />)
    expect(screen.getByRole('link', { name: 'Phase 1. 단계 1' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Phase 2. 단계 2' })).toHaveAttribute('aria-current', 'step')
  })

  it('모든 기간이 지났거나 기준 날짜가 없으면 현재 단계를 임의로 지정하지 않는다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-01T12:00:00'))
    const { rerender } = render(<AiRoadmapCard design={design} workspaceId={42} events={[]} createdAt="2026-09-28T12:00:00" />)
    expect(screen.getAllByText('기간 종료')).toHaveLength(4)
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
    rerender(<AiRoadmapCard design={design} workspaceId={42} events={[]} />)
    expect(screen.queryByText('기간 종료')).not.toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })
})

describe('일정 관리 Phase 타임라인', () => {
  it('저장된 구간을 기준으로 지난 Phase·현재 Phase·예정 Phase를 구분하고 시작일로 이동한다', () => {
    const select = vi.fn()
    render(<AiRoadmapStrip design={design} workspaceId={42} events={events} todayKey="2026-10-06" onSelectDate={select} />)
    const done = screen.getByRole('button', { name: 'Phase 1. 단계 1' })
    const current = screen.getByRole('button', { name: 'Phase 2. 단계 2' })
    const upcoming = screen.getByRole('button', { name: 'Phase 3. 단계 3' })
    expect(done).toHaveClass('bg-brand/10', 'text-green-800')
    expect(done).toHaveTextContent('✓ Phase 1.')
    expect(current).toHaveClass('bg-purple-50', 'border-purple-300', 'ring-2')
    expect(current).toHaveAttribute('aria-current', 'step')
    expect(current).toHaveTextContent('10.01 ~ 10.07')
    expect(upcoming).toHaveClass('bg-white', 'text-gray-500')
    fireEvent.click(upcoming)
    expect(select).toHaveBeenCalledWith(new Date('2026-11-01T00:00:00'))
    expect(current).toHaveAttribute('aria-current', 'step')
    const missing = screen.getByRole('button', { name: 'Phase 4. 단계 4' })
    expect(missing).toBeDisabled()
    expect(missing).not.toHaveAttribute('aria-current')
  })

  it.each([
    ['2026-09-30', 'upcoming'],
    ['2026-10-01', 'current'],
    ['2026-10-07', 'current'],
    ['2026-10-08', 'done'],
  ])('시작·종료일 당일을 포함해 %s의 상태를 판정한다', (todayKey, state) => {
    render(<AiRoadmapStrip design={design} workspaceId={42} events={events} todayKey={todayKey} onSelectDate={vi.fn()} />)
    const phase = screen.getByRole('button', { name: 'Phase 2. 단계 2' })
    expect(phase).toHaveClass(state === 'current' ? 'bg-purple-50' : state === 'done' ? 'bg-brand/10' : 'bg-white')
    expect(phase.hasAttribute('aria-current')).toBe(state === 'current')
  })
})
