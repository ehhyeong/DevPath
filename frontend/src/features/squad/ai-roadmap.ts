import type { WorkspaceAiDesign } from '../project/api'

export function getAiRoadmapPhases(
  design: Pick<WorkspaceAiDesign, 'roadmap'>,
  events: { title: string; startAt: string; endAt?: string | null }[],
  createdAt?: string | null,
  today = new Date().toDateString(),
) {
  const now = new Date(today).getTime()
  let nextStart = createdAt ? new Date(createdAt) : null
  const phases = []
  for (const phase of design.roadmap) {
    // 팀이 변경한 일정이 우선이며, 일정이 없으면 생성일부터 Phase 예상 주수를 누적한다.
    const event = events.find((item) => item.title.startsWith(`Phase ${phase.phase}. `))
    const start = event ? new Date(event.startAt) : nextStart ? new Date(nextStart) : null
    const end = event?.endAt ? new Date(event.endAt) : start ? new Date(start) : null
    if (end && !event?.endAt) end.setDate(end.getDate() + Math.max(1, phase.estimatedWeeks) * 7 - 1)
    start?.setHours(0, 0, 0, 0)
    end?.setHours(23, 59, 59, 999)
    nextStart = end ? new Date(end) : null
    nextStart?.setDate(nextStart.getDate() + 1)
    const state = start && end ? now > end.getTime() ? 'done' : now >= start.getTime() ? 'current' : 'upcoming' : 'upcoming'
    phases.push({ phase, start, end, state })
  }
  return phases
}
