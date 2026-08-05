import { useState,type ReactNode } from 'react'
import { createInstructorTeamCalendarEvent,deleteInstructorTeamCalendarEvent } from './instructor-api'
import { Modal } from './instructor-team-workspace-shared'
import type { CalendarEvent,TeamData } from './instructor-types'
import { buildHref,buildScheduleDescription,formatTime,INSTRUCTOR_TEAM_SCHEDULE_UI_LOCK_CLASSES,localDateKey,localDateTimeInput,parseScheduleDescription,pushTeamNotification,scheduleEventMeta,type ScheduleEventType } from './instructor-workspace-support'



export function SchedulePage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [success, setSuccess] = useState<{ title: string; message: ReactNode } | null>(null)
  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = localDateKey(new Date())
  const eventsByDate = data.events.reduce((map, event) => {
    const key = localDateKey(new Date(event.startAt))
    const current = map.get(key) ?? []
    current.push(event)
    map.set(key, current)
    return map
  }, new Map<string, CalendarEvent[]>())
  const upcoming = data.events
    .filter((event) => new Date(event.startAt).getTime() >= new Date(todayKey).getTime())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  async function createEvent(form: { title: string; description: string; date: string; time: string; type: ScheduleEventType }) {
    if (!workspaceId) return
    const startAt = `${form.date}T${form.time || '00:00'}:00`
    const endAt = new Date(startAt)
    endAt.setHours(endAt.getHours() + 1)
    await createInstructorTeamCalendarEvent(workspaceId, {
      title: form.title,
      description: buildScheduleDescription(form.type, form.description),
      startAt,
      endAt: localDateTimeInput(endAt),
    })
    pushTeamNotification(workspaceId, {
      title: '공식 일정 등록',
      description: `${form.date} ${form.time || '00:00'} · "${form.title}" 일정이 등록되었습니다.`,
      href: buildHref('schedule', workspaceId),
      icon: 'fas fa-calendar-alt',
    })
    setModalDate(null)
    setSuccess({ title: '일정 등록 완료!', message: <>공식 일정이 성공적으로 등록되어<br />팀 캘린더와 동기화되었습니다.</> })
    await reload()
  }

  async function deleteEvent(event: CalendarEvent) {
    await deleteInstructorTeamCalendarEvent(event.eventId)
    pushTeamNotification(workspaceId, {
      title: '공식 일정 삭제',
      description: `"${event.title}" 일정이 삭제되었습니다.`,
      href: buildHref('schedule', workspaceId),
      icon: 'fas fa-calendar-times',
    })
    setSelectedEvent(null)
    setSuccess({ title: '일정 삭제 완료!', message: <>선택한 일정이 캘린더에서<br />삭제되었습니다.</> })
    await reload()
  }

  function changeMonth(delta: number) {
    setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  return (
    <div className={`instructor-team-schedule flex h-full flex-col ${INSTRUCTOR_TEAM_SCHEDULE_UI_LOCK_CLASSES}`}>
      <div className="mb-4 flex shrink-0 flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-calendar-check text-[#7C3AED]" />공식 일정 및 캘린더 관리</h1>
          <p className="mt-2 text-sm text-gray-500">프로젝트의 공식 일정을 생성하여 팀원들에게 공지하고, 팀 자체 일정을 모니터링하세요.</p>
        </div>
        <button type="button" onClick={() => setModalDate(localDateKey(new Date(year, month, new Date().getDate())))} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-plus" />새 공식 일정 등록</button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-gray-900">{year}년 {month + 1}월</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => changeMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"><i className="fas fa-chevron-left" /></button>
              <button type="button" onClick={() => changeMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"><i className="fas fa-chevron-right" /></button>
            </div>
          </div>

          <div className="mb-3 flex justify-end gap-4 text-[10px] font-bold text-gray-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#7C3AED]" />멘토 공식 일정</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />팀 내부 일정</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />마일스톤 마감일</span>
          </div>

          <div className="calendar-grid flex-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((label, index) => <div key={label} className={`calendar-header ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : ''}`}>{label}</div>)}
            {Array.from({ length: firstDay }).map((_, index) => <div key={`blank-${index}`} className="calendar-day other-month" />)}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1
              const dateKey = localDateKey(new Date(year, month, day))
              const dayEvents = eventsByDate.get(dateKey) ?? []
              return (
                <button key={dateKey} type="button" onClick={() => setModalDate(dateKey)} className={`calendar-day flex flex-col text-left ${dateKey === todayKey ? 'today font-bold' : ''}`}>
                  <span className={`text-xs ${dateKey === todayKey ? 'text-blue-600' : 'text-gray-700'}`}>{day}</span>
                  <div className="mt-1 flex-1 space-y-1 overflow-hidden">
                    {dayEvents.map((event) => {
                      const parsed = parseScheduleDescription(event.description)
                      const meta = scheduleEventMeta(parsed.type)
                      return <span key={event.eventId} role="button" tabIndex={0} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(event) }} onKeyDown={(keyEvent) => { if (keyEvent.key === 'Enter') { keyEvent.stopPropagation(); setSelectedEvent(event) } }} className={`block truncate rounded px-1 py-0.5 text-[9px] leading-tight text-white shadow-sm ${meta.dot}`}>{formatTime(event.startAt)} {event.title}</span>
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-extrabold text-gray-900"><i className="fas fa-list-ul text-[#7C3AED]" />다가오는 주요 일정</h3>
          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
            {upcoming.length === 0 ? <ScheduleEmptyUpcoming /> : upcoming.map((event) => {
              const parsed = parseScheduleDescription(event.description)
              const meta = scheduleEventMeta(parsed.type)
              return (
                <button key={event.eventId} type="button" onClick={() => setSelectedEvent(event)} className={`w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${meta.card}`}>
                  <div className="mb-2 flex items-start justify-between">
                    <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold shadow-sm ${meta.badge}`}><i className={meta.icon} />{meta.label}</span>
                  </div>
                  <h4 className="mb-1 line-clamp-1 text-sm font-bold text-gray-900">{event.title}</h4>
                  <p className="text-[10px] font-bold text-gray-500"><i className="far fa-clock mr-0.5" />{localDateKey(new Date(event.startAt))} {formatTime(event.startAt)}</p>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {modalDate ? <EventModal initialDate={modalDate} onClose={() => setModalDate(null)} onSubmit={createEvent} /> : null}
      {selectedEvent ? <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={deleteEvent} /> : null}
      {success ? <ScheduleSuccessModal title={success.title} message={success.message} onClose={() => setSuccess(null)} /> : null}
    </div>
  )
}

export function ScheduleEmptyUpcoming() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50">
        <i className="far fa-calendar-times text-2xl text-gray-300" />
      </div>
      <p className="mb-1 text-sm font-bold text-gray-500">등록된 공식 일정이 없습니다.</p>
      <p className="mt-1 text-[10px] text-gray-400">상단의 새 공식 일정 등록 버튼을 눌러<br />팀원들에게 알릴 일정을 추가해보세요.</p>
    </div>
  )
}

export function EventModal({ initialDate, onClose, onSubmit }: { initialDate: string; onClose: () => void; onSubmit: (form: { title: string; description: string; date: string; time: string; type: ScheduleEventType }) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', description: '', date: initialDate, time: '', type: 'meetup' as ScheduleEventType })
  return (
    <Modal title="새 공식 일정 등록" icon="fas fa-plus-circle" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={(event) => { event.preventDefault(); void onSubmit(form) }}>
        <div className="space-y-4 p-6">
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">일정 유형 <span className="text-red-500">*</span></span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ScheduleEventType })} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]"><option value="meetup">🎥 라이브 밋업 (코드 리뷰 등)</option><option value="deadline">🚩 주차별 마일스톤 마감일</option><option value="team">👥 학생 팀 스크럼 (학생이 추가)</option></select></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">일정 제목 <span className="text-red-500">*</span></span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="예) 3주차 라이브 코드 리뷰" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">날짜 <span className="text-red-500">*</span></span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" /></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">시간</span><input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" /></label>
          </div>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">상세 설명</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="h-24 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="팀원들에게 안내할 상세 내용을 입력하세요." /></label>
          <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 p-3"><i className="fas fa-info-circle mt-0.5 text-sm text-[#7C3AED]" /><p className="text-[11px] leading-relaxed font-medium text-gray-700">등록된 일정은 팀 워크스페이스 캘린더에 즉시 동기화되며, 모든 팀원에게 푸시 알림이 발송됩니다.</p></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button><button className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-save" />등록 및 배포</button></div>
      </form>
    </Modal>
  )
}

export function EventDetailModal({ event, onClose, onDelete }: { event: CalendarEvent; onClose: () => void; onDelete: (event: CalendarEvent) => Promise<void> }) {
  const parsed = parseScheduleDescription(event.description)
  const meta = scheduleEventMeta(parsed.type)
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div><span className={`mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold shadow-sm ${meta.badge}`}><i className={`${meta.icon} mr-1`} />{meta.label}</span><h3 className="text-lg leading-tight font-extrabold text-gray-900">{event.title}</h3><p className="mt-1 text-xs font-bold text-gray-500"><i className="far fa-clock" /> {localDateKey(new Date(event.startAt))} {formatTime(event.startAt)}</p></div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="p-6"><p className="mb-1 text-[10px] font-bold text-gray-400">상세 안내</p><div className="min-h-[80px] rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed font-medium whitespace-pre-line text-gray-700">{parsed.description || '상세 설명이 없습니다.'}</div></div>
        <div className="flex items-center justify-between border-t border-gray-100 bg-white p-5"><button type="button" onClick={() => { if (window.confirm('이 일정을 삭제하시겠습니까?\n팀원들의 캘린더에서도 함께 삭제됩니다.')) void onDelete(event) }} className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100"><i className="fas fa-trash-alt mr-1" />{parsed.type === 'team' ? '강제 삭제' : '일정 삭제'}</button><button type="button" onClick={onClose} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button></div>
      </div>
    </div>
  )
}

export function ScheduleSuccessModal({ title, message, onClose }: { title: string; message: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#7C3AED] bg-purple-50 shadow-sm"><i className="fas fa-check text-3xl text-[#7C3AED]" /></div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm leading-relaxed font-medium text-gray-500">{message}</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}
