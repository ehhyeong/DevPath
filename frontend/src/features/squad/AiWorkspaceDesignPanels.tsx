import { aiWorkspacePageHref } from './ai-workspace-navigation'
import type { WorkspaceAiDesign } from '../project/api'

export type AiWorkspacePageProps = { aiWorkspace?: boolean; design?: WorkspaceAiDesign | null }

export function AiDesignSummary({ design, workspaceId }: { design: WorkspaceAiDesign; workspaceId: number | null }) {
  return <section className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-teal-50 p-7">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start"><div className="min-w-0"><div className="mb-2 flex items-center gap-2"><span className="rounded-full border border-teal-100 bg-white px-2 py-1 text-[10px] font-black text-teal-700"><i className="fas fa-magic mr-1" />AI 포트폴리오 설계서</span><span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500">{design.difficulty === 'toy' ? '🐣 토이 프로젝트' : design.difficulty === 'enterprise' ? '🏢 엔터프라이즈' : '🚀 실전 MVP'}</span></div><h3 className="text-xl font-black leading-snug tracking-tight text-[#00C471]">{design.title}</h3><p className="mt-1 text-sm font-medium text-gray-600">{design.summary}</p><div className="mt-3 flex flex-wrap gap-1.5">{[...new Set([design.stack.frontend, design.stack.backend, design.stack.database, ...design.stack.libraries])].map((stack) => <span key={stack} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-600">{stack}</span>)}</div></div><a href={aiWorkspacePageHref('/squad-blueprint', workspaceId)} className="flex w-fit shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md"><i className="fas fa-book-open" />프로젝트 설계서 전체 보기</a></div>
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['fa-route', 'text-purple-500', '기획 & 시나리오', `MVP 기능 ${design.scenario.coreFeatures.length}개`], ['fa-database', 'text-blue-500', '아키텍처 & DB', `${design.architecture.entities.length}개 테이블`], ['fa-plug', 'text-brand', 'API 명세서', `${design.apis.length}개 엔드포인트`], ['fa-user-tie', 'text-orange-500', '로드맵 & 면접', `${design.roadmap.length}단계 · ${design.interviewQuestions.length}문항`]].map(([icon, color, title, copy]) => <div key={title} className="rounded-xl border border-white bg-white/80 p-3"><p className="text-xs font-extrabold text-gray-900"><i className={`fas ${icon} mr-1.5 ${color}`} />{title}</p><p className="mt-1 text-[10px] font-bold text-gray-400">{copy}</p></div>)}</div>
  </section>
}

export function AiRoadmapCard({ design, workspaceId, events, createdAt, today = new Date().toDateString() }: {
  design: Pick<WorkspaceAiDesign, 'roadmap'>
  workspaceId: number | null
  events: { title: string; startAt: string; endAt?: string | null }[]
  createdAt?: string | null
  today?: string
}) {
  const now = new Date(today).getTime()
  const formatDate = (date: Date) => `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
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
  return <section className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm"><div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3"><h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-route text-purple-500" />개발 로드맵</h3><a href={`${aiWorkspacePageHref('/squad-blueprint', workspaceId)}#roadmap`} className="text-[10px] font-bold text-teal-700">프로젝트 설계서 →</a></div><div className="ml-2 space-y-5 border-l-2 border-gray-100">{phases.map(({ phase, start, end, state }) => {
    const dot = state === 'done' ? 'bg-brand' : state === 'current' ? 'bg-purple-500 ring-4 ring-purple-100' : 'bg-gray-300'
    return <a key={phase.phase} href={aiWorkspacePageHref('/squad-schedule', workspaceId)} aria-label={`Phase ${phase.phase}. ${phase.title}`} aria-current={state === 'current' ? 'step' : undefined} className="relative block pl-5">
      <span aria-hidden="true" className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white ${dot}`} />
      <div className="flex justify-between gap-2"><p className="text-xs font-extrabold text-gray-900">Phase {phase.phase}. {phase.title}</p>{state === 'current' ? <span className="shrink-0 rounded bg-purple-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">진행 중</span> : state === 'done' ? <span className="shrink-0 text-[9px] font-extrabold text-brand">기간 종료</span> : null}</div>
      {start && end ? <p className="mt-1 text-[10px] font-medium text-gray-500">{formatDate(start)} ~ {formatDate(end)}</p> : null}
      <p className="mt-1 text-[10px] leading-relaxed text-gray-500">{phase.goal}</p>
    </a>
  })}</div></section>
}

export function AiRoadmapStrip({ design, workspaceId, events, todayKey, onSelectDate }: {
  design: Pick<WorkspaceAiDesign, 'roadmap'>
  workspaceId: number | null
  events: { title: string; startAt: string; endAt: string }[]
  todayKey: string
  onSelectDate: (date: Date) => void
}) {
  const now = new Date(`${todayKey}T00:00:00`).getTime()
  const formatDate = (date: Date) => `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  return <div className="shrink-0 border-b border-gray-100 bg-gradient-to-r from-green-50/60 to-white px-5 pt-4 pb-3"><div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-2 text-[11px] font-extrabold text-gray-500">AI 개발 로드맵 타임라인 <span className="rounded border border-teal-100 bg-white px-2 py-0.5 text-[10px] text-teal-700"><i className="fas fa-magic mr-1" />자동 생성</span></p><a href={`${aiWorkspacePageHref('/squad-blueprint', workspaceId)}#roadmap`} className="text-[11px] font-bold text-gray-400 hover:text-brand">설계서 보기 →</a></div><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, design.roadmap.length)}, minmax(0, 1fr))` }}>{design.roadmap.map((phase) => {
    const event = events.find((item) => item.title.startsWith(`Phase ${phase.phase}. `))
    const start = event ? new Date(event.startAt) : null
    const end = event ? new Date(event.endAt) : null
    // 원본처럼 Phase의 시작일과 종료일 전체를 포함하며 캘린더 탐색 날짜와 독립적으로 판정한다.
    start?.setHours(0, 0, 0, 0)
    end?.setHours(23, 59, 59, 999)
    const state = start && end ? now > end.getTime() ? 'done' : now >= start.getTime() ? 'current' : 'upcoming' : 'upcoming'
    const color = state === 'done' ? 'bg-brand/10 border-brand/30 text-green-800' : state === 'current' ? 'bg-purple-50 border-purple-300 text-purple-800 ring-2 ring-purple-100' : 'bg-white border-gray-200 text-gray-500'
    return <button key={phase.phase} type="button" aria-label={`Phase ${phase.phase}. ${phase.title}`} aria-current={state === 'current' ? 'step' : undefined} disabled={!start} onClick={() => { if (start) onSelectDate(start) }} className={`rounded-lg border px-3 py-2 text-left transition hover:shadow-sm ${color}`}>
      <p className="truncate text-[11px] font-extrabold" title={phase.title}>{state === 'done' ? '✓ ' : ''}Phase {phase.phase}. {phase.title}</p>
      {start && end ? <p className="mt-1 text-[10px] font-medium opacity-80">{formatDate(start)} ~ {formatDate(end)}</p> : null}
      <p className="mt-1 text-[10px] opacity-80">{phase.estimatedWeeks}주 · 작업 {phase.tasks.length}개</p>
    </button>
  })}</div></div>
}
