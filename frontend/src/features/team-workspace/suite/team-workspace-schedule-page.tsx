import { useMemo,useState,type FormEvent } from 'react'
import { createTeamWorkspaceEvent,deleteTeamWorkspaceEvent } from './api'
import { Modal,PageFrame } from './team-workspace-suite-shared'
import { addMinutes,buildTeamScheduleDescription,eventSourceType,scheduleEventTooltip,sortScheduleSidebarEvents,stripTeamScheduleType,todayDateInput,toLocalDateTime } from './team-workspace-suite-support'
import type { CalendarEvent,EventForm,SuiteData } from './types'
import { formatDate,formatTime,parseDate } from './utils'


export function SchedulePage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState<EventForm>({ title: '', description: '', type: 'scrum', date: todayDateInput(), time: '10:00', duration: '60' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [optimisticEvents, setOptimisticEvents] = useState<CalendarEvent[]>([])
  const [recentEventIds, setRecentEventIds] = useState<number[]>([])
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [scheduleNotice, setScheduleNotice] = useState<{ title: string; messageLines: string[] } | null>(null)
  const events = useMemo(() => {
    const existingIds = new Set(data.events.map((event) => event.eventId))

    return [
      ...data.events,
      ...optimisticEvents.filter((event) => !existingIds.has(event.eventId)),
    ].sort((left, right) => (parseDate(left.startAt)?.getTime() ?? 0) - (parseDate(right.startAt)?.getTime() ?? 0))
  }, [data.events, optimisticEvents])
  const upcoming = useMemo(() => sortScheduleSidebarEvents(events, recentEventIds), [events, recentEventIds])
  const [monthBase, setMonthBase] = useState(() => new Date())
  const monthLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(monthBase)
  const todayKey = todayDateInput()
  const calendarDays = useMemo(() => {
    const first = new Date(monthBase.getFullYear(), monthBase.getMonth(), 1)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`

      return {
        key,
        day: date.getDate(),
        currentMonth: date.getMonth() === monthBase.getMonth(),
        events: events.filter((item) => item.startAt?.startsWith(key)).slice(0, 2),
      }
    })
  }, [events, monthBase])

  async function createEvent(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('일정 제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const startAt = toLocalDateTime(form.date, form.time)
      const createdEvent = await createTeamWorkspaceEvent(workspaceId, {
        title: form.title.trim(),
        description: buildTeamScheduleDescription(form.type, form.description),
        startAt,
        endAt: addMinutes(startAt, Number(form.duration) || 60),
      })
      setOptimisticEvents((current) => [createdEvent, ...current.filter((event) => event.eventId !== createdEvent.eventId)])
      setRecentEventIds((current) => [createdEvent.eventId, ...current.filter((eventId) => eventId !== createdEvent.eventId)].slice(0, 6))
      setModalOpen(false)
      setForm({ title: '', description: '', type: 'scrum', date: todayDateInput(), time: '10:00', duration: '60' })
      setScheduleNotice({ title: '일정 등록 완료!', messageLines: ['우리 팀 캘린더에 성공적으로', '추가되었습니다.'] })
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '일정 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteEvent() {
    if (!deleteTarget) return

    setSubmitting(true)
    setDeleteError(null)

    try {
      await deleteTeamWorkspaceEvent(deleteTarget.eventId)
      setOptimisticEvents((current) => current.filter((event) => event.eventId !== deleteTarget.eventId))
      setRecentEventIds((current) => current.filter((eventId) => eventId !== deleteTarget.eventId))
      setSelectedEvent(null)
      setDeleteTarget(null)
      setScheduleNotice({ title: '일정 삭제 완료!', messageLines: ['선택한 일정이 캘린더에서', '삭제되었습니다.'] })
      await reload()
    } catch (nextError) {
      setDeleteError(nextError instanceof Error ? nextError.message : '일정 삭제에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function openAddEvent(date?: string) {
    setError(null)
    setForm({ title: '', description: '', type: 'scrum', date: date ?? todayDateInput(), time: '10:00', duration: '60' })
    setModalOpen(true)
  }

  return (
    <>
      <PageFrame
        activePage="schedule"
        title="팀 캘린더 & 스크럼"
        subtitle="멘토의 공식 일정과 우리 팀의 자체 일정(스크럼, 기획 마감 등)을 한 곳에서 관리하세요."
        action={<button type="button" onClick={() => openAddEvent()} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-plus mr-2"></i>팀 일정 추가</button>}
        data={data}
        workspaceId={workspaceId}
        mainClassName="team-ws-schedule-main custom-scrollbar flex-1 overflow-hidden p-5 lg:p-6 relative"
        contentClassName="team-ws-schedule-content mx-auto flex h-full min-h-0 max-w-6xl flex-col"
      >
        <div className="team-ws-schedule-heading mb-4 flex shrink-0 flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
              <i className="fas fa-calendar-alt text-team"></i>
              팀 캘린더 & 스크럼
            </h1>
            <p className="mt-1 text-xs leading-5 text-gray-500">멘토의 공식 일정과 우리 팀의 자체 일정(스크럼, 기획 마감 등)을 한 곳에서 관리하세요.</p>
          </div>
          <button type="button" onClick={() => openAddEvent()} className="flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg transition hover:bg-black">
            <i className="fas fa-plus"></i>
            팀 일정 추가
          </button>
        </div>

        <div className="team-ws-schedule-layout grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-3 xl:gap-5">
          <section className="team-ws-schedule-calendar-panel flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm xl:p-5 lg:col-span-2">
            <div className="team-ws-schedule-month-header mb-3 flex shrink-0 items-center justify-between">
              <h2 className="text-lg font-extrabold text-gray-900">{monthLabel}</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMonthBase((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50">
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button type="button" onClick={() => setMonthBase((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50">
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
            <div className="team-ws-schedule-legend mb-2 flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] font-bold text-gray-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500"></span> 멘토 공식</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> 팀 스크럼/회의</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500"></span> 팀 내부 마감일</span>
            </div>
            <div className="calendar-grid team-ws-schedule-calendar-grid">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className={`calendar-header ${day === '일' ? 'text-red-500' : day === '토' ? 'text-blue-500' : ''}`}>{day}</div>
              ))}
              {calendarDays.map((day) => (
                <div key={day.key} onClick={() => openAddEvent(day.key)} className={`calendar-day ${day.currentMonth ? '' : 'other-month'} ${day.key === todayKey ? 'today' : ''}`}>
                  <span className="text-xs font-bold">{day.day}</span>
                  <div className="mt-2 space-y-1">
                    {day.events.map((event) => {
                      const meta = eventSourceType(event)
                      const tooltip = scheduleEventTooltip(event)

                      return (
                        <div key={event.eventId} title={tooltip} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(event) }} className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight text-white shadow-sm ${meta.badge}`}>
                          {formatTime(event.startAt)} {event.title}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="team-ws-schedule-upcoming-panel flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm xl:p-5">
            <h3 className="mb-3 flex shrink-0 items-center gap-2 border-b border-gray-100 pb-2 text-sm font-extrabold text-gray-900">
              <i className="fas fa-list-ul text-team"></i>
              다가오는 일정
            </h3>
            {upcoming.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-2xl text-gray-300">
                  <i className="far fa-calendar-times"></i>
                </div>
                <p className="mb-1 text-sm font-bold text-gray-500">등록된 일정이 없습니다</p>
                <p className="text-[10px] leading-relaxed text-gray-400">우측 상단의 '팀 일정 추가' 버튼을 눌러<br />새로운 일정을 만들어보세요.</p>
              </div>
            ) : (
              <div className="team-ws-schedule-upcoming-list custom-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                {upcoming.map((event) => {
                  const meta = eventSourceType(event)
                  const tooltip = scheduleEventTooltip(event)

                  return (
                  <div key={event.eventId} title={tooltip} onClick={() => setSelectedEvent(event)} className={`team-ws-schedule-upcoming-card relative cursor-pointer rounded-xl border px-3 py-2.5 transition hover:-translate-y-0.5 ${meta.shell}`}>
                    <div className="mb-1 flex items-start justify-between">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${meta.badge}`}>{meta.label}</span>
                    </div>
                    <h3 className="mb-0 line-clamp-1 text-[13px] font-bold text-gray-900" title={tooltip}>{event.title}</h3>
                    <p className="text-[10px] font-bold text-gray-500"><i className="far fa-clock mr-0.5"></i> {formatDate(event.startAt)} {formatTime(event.startAt)}</p>
                  </div>
                  )
                })}
              </div>
            )}
          </aside>
        </div>
      </PageFrame>

      {modalOpen ? (
        <Modal title="팀 일정 추가" iconClassName="fa-plus-circle" panelClassName="w-full max-w-md" onClose={() => setModalOpen(false)}>
          <form onSubmit={createEvent}>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">일정 유형 <span className="text-red-500">*</span></label>
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none transition focus:border-team">
                  <option value="scrum">🔵 스크럼 / 팀 회의</option>
                  <option value="deadline">🟠 팀 내부 마감일 (공식 아님)</option>
                  <option value="vacation">⚪ 개인 휴가 / 부재 알림</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">일정 제목 <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="예) 주간 스프린트 회의" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-team" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-600">날짜 <span className="text-red-500">*</span></label>
                  <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-team" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-600">시간</label>
                  <input type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-team" />
                </div>
              </div>
              <select value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} className="hidden">
                <option value="30">30분</option>
                <option value="60">1시간</option>
                <option value="90">1시간 30분</option>
                <option value="120">2시간</option>
              </select>
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">상세 설명</label>
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="팀원들에게 안내할 상세 내용을 입력하세요." className="h-24 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-team"></textarea>
              </div>
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60">
                <i className="fas fa-save"></i>
                추가하기
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {selectedEvent ? (() => {
        const meta = eventSourceType(selectedEvent)
        const description = stripTeamScheduleType(selectedEvent.description)
        const tooltip = scheduleEventTooltip(selectedEvent)
        const isOfficial = meta.kind === 'official'

        return (
          <div className="team-workspace-modal-overlay fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <button type="button" aria-label="닫기" className="absolute inset-0" onClick={() => setSelectedEvent(null)}></button>
            <div className="modal-content team-ws-modal-panel team-ws-event-detail-modal relative z-10 w-full! max-w-[384px]! overflow-hidden rounded-[24px]! bg-white shadow-2xl">
              <div className="team-ws-event-detail-header flex items-start justify-between gap-[16px] border-b border-gray-100 bg-gray-50 p-[24px]!">
                <div className="min-h-0! min-w-0">
                  <span className={`team-ws-event-detail-badge mb-[8px] inline-block rounded-[4px] px-[8px] py-[2px] text-[10px] leading-[16px] font-bold text-white [box-shadow:0_1px_2px_rgba(15,23,42,0.08)] ${meta.badge}`}>{isOfficial ? '멘토 공식 일정' : '우리 팀 자체 일정'}</span>
                  <h3 className="team-ws-event-detail-title max-w-[280px] truncate text-[18px] leading-[22px] font-extrabold text-gray-900" title={tooltip}>{selectedEvent.title}</h3>
                  <p className="team-ws-event-detail-time mt-[4px] text-[12px] leading-[16px] font-bold text-gray-500" title={tooltip}>
                    <i className="far fa-clock"></i> {formatDate(selectedEvent.startAt)} {formatTime(selectedEvent.startAt)}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedEvent(null)} className="team-ws-event-detail-close flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[9999px] border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="team-ws-event-detail-body p-[24px]">
                <p className="team-ws-event-detail-label mb-[4px] text-[10px] leading-[14px] font-bold text-gray-400">상세 안내</p>
                <div className="team-ws-event-detail-desc min-h-[80px] whitespace-pre-line rounded-[12px] border border-gray-100 bg-gray-50 p-[16px] text-[14px] leading-[22px] font-medium text-gray-700">
                  {description || '상세 설명이 없습니다.'}
                </div>
              </div>

              <div className="team-ws-event-detail-footer flex items-center justify-between border-t border-gray-100 bg-white p-[20px]">
                {isOfficial ? <div></div> : (
                  <button type="button" onClick={() => { setDeleteError(null); setDeleteTarget(selectedEvent) }} className="team-ws-event-detail-delete h-[34px] rounded-[12px] border border-red-100 bg-red-50 px-[16px] py-0 text-[12px]! leading-[16px]! font-bold text-red-500 transition hover:bg-red-100">
                    <i className="fas fa-trash-alt mr-[4px]"></i> 일정 삭제
                  </button>
                )}
                <button type="button" onClick={() => setSelectedEvent(null)} className="team-ws-event-detail-confirm h-[40px] rounded-[12px] bg-gray-900 px-[24px] py-0 text-[14px]! leading-[20px]! font-bold text-white shadow-md transition hover:bg-black">확인</button>
              </div>
            </div>
          </div>
        )
      })() : null}

      {deleteTarget ? (
        <div id="deleteEventModal" className="team-workspace-modal-overlay fixed inset-0 z-[1060] flex items-center justify-center bg-[rgba(0,0,0,0.5)] p-4">
          <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setDeleteTarget(null); setDeleteError(null) }}></button>
          <div className="modal-content team-ws-schedule-delete-modal relative z-10 w-full max-w-[384px]! rounded-[24px]! bg-white p-[32px]! text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 shadow-sm">
              <i className="fas fa-trash-alt text-2xl"></i>
            </div>
            <h3 className="mb-2 text-xl font-extrabold text-gray-900">일정 삭제</h3>
            <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">
              우리 팀 캘린더에서 이 일정을<br />삭제하시겠습니까?
            </p>
            {deleteError ? <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-500">{deleteError}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={submitting} className="rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60">취소</button>
              <button type="button" onClick={() => void deleteEvent()} disabled={submitting} className="rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-600 disabled:opacity-60">
                삭제하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scheduleNotice ? (
        <div id="successModal" className="team-workspace-modal-overlay fixed inset-0 z-[1060] flex items-center justify-center bg-[rgba(0,0,0,0.5)] p-4">
          <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setScheduleNotice(null)}></button>
          <div className="modal-content team-ws-schedule-success-modal relative z-10 w-full max-w-[384px]! rounded-[24px]! bg-white p-[32px]! text-center shadow-2xl">
            <div className="team-ws-schedule-success-icon mx-auto mb-4 flex h-[64px]! w-[64px]! items-center justify-center rounded-full border border-indigo-100 bg-[#EEF2FF]! shadow-sm">
              <i className="fas fa-check text-3xl text-[#4F46E5]!"></i>
            </div>
            <h3 className="mb-2 text-xl font-extrabold text-gray-900">{scheduleNotice.title}</h3>
            <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">
              {scheduleNotice.messageLines[0]}<br />{scheduleNotice.messageLines[1]}
            </p>
            <button type="button" onClick={() => setScheduleNotice(null)} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
          </div>
        </div>
      ) : null}
    </>
  )
}
