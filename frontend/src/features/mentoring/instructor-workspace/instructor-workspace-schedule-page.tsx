import { useMemo,useState,type FormEvent } from 'react'
import { createInstructorWorkspaceCalendarEvent,deleteInstructorWorkspaceCalendarEvent } from './instructor-workspace-api'
import { Modal,PageHeading } from './instructor-workspace-shared'
import { EVENT_LIST_TONE,EVENT_TYPE_CONFIG,buildHref,encodeEventDescription,eventDescriptionOf,eventTypeOf,formatDate,formatTime,pushWorkspaceNotification,type CalendarEventType } from './instructor-workspace-support'
import type { CalendarEvent,WorkspaceData } from './instructor-workspace-types'



export function SchedulePage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const initialMonth = data.events[0]?.startAt ? new Date(data.events[0].startAt) : new Date()
  const [currentMonth, setCurrentMonth] = useState(() => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1))
  const [eventType, setEventType] = useState<CalendarEventType>('meetup')
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [description, setDescription] = useState('')
  const monthEvents = useMemo(() => data.events.filter((event) => {
    const date = new Date(event.startAt)
    return date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth()
  }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()), [currentMonth, data.events])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDate = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ key: string; day: number | null; dateKey?: string; events: CalendarEvent[]; otherMonth?: boolean }> = []
    for (let index = 0; index < firstDay.getDay(); index += 1) {
      cells.push({ key: `blank-before-${index}`, day: null, events: [], otherMonth: true })
    }
    for (let day = 1; day <= lastDate; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        key: dateKey,
        day,
        dateKey,
        events: monthEvents.filter((event) => event.startAt.slice(0, 10) === dateKey),
      })
    }
    while (cells.length < 42) {
      cells.push({ key: `blank-after-${cells.length}`, day: null, events: [], otherMonth: true })
    }
    return cells
  }, [currentMonth, monthEvents])

  async function createEvent(event: FormEvent) {
    event.preventDefault()
    if (!workspaceId || !title.trim() || !eventDate) return
    const startAt = `${eventDate}T${eventTime || '00:00'}:00`
    const startDate = new Date(startAt)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    const endAt = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`
    await createInstructorWorkspaceCalendarEvent(workspaceId, {
      title: title.trim(),
      description: encodeEventDescription(eventType, description),
      startAt,
      endAt,
    })
    pushWorkspaceNotification(workspaceId, {
      title: '일정 등록',
      description: `"${title.trim()}" 일정이 등록되었습니다.`,
      href: buildHref('schedule', workspaceId),
      icon: EVENT_TYPE_CONFIG[eventType].icon,
    })
    setTitle('')
    setEventDate('')
    setEventTime('')
    setDescription('')
    setEventType('meetup')
    setOpen(false)
    await reload()
  }

  async function deleteEvent() {
    if (!selectedEvent) return
    const deletedTitle = selectedEvent.title
    await deleteInstructorWorkspaceCalendarEvent(selectedEvent.eventId)
    pushWorkspaceNotification(workspaceId, {
      title: '일정 삭제',
      description: `"${deletedTitle}" 일정이 삭제되었습니다.`,
      href: buildHref('schedule', workspaceId),
      icon: 'fas fa-calendar-times',
    })
    setSelectedEvent(null)
    await reload()
  }

  function openForDate(dateKey?: string) {
    setEventDate(dateKey ?? '')
    setOpen(true)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeading
        page="schedule"
        description={<>이곳에서 등록한 일정은 <span className="font-bold text-gray-700">모든 수강생의 캘린더에 공식 일정으로 자동 동기화</span>됩니다.</>}
        action={<button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-plus" /> 새 공식 일정 등록</button>}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-gray-900">{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"><i className="fas fa-chevron-left" /></button>
              <button type="button" onClick={() => setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50"><i className="fas fa-chevron-right" /></button>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div key={day} className={`bg-gray-50 p-2 text-center text-xs font-extrabold ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{day}</div>
            ))}
            {calendarDays.map((cell) => (
              <button key={cell.key} type="button" onClick={() => openForDate(cell.dateKey)} disabled={!cell.day} className={`flex min-h-0 flex-col bg-white p-2 text-left transition ${cell.day ? 'hover:bg-gray-50' : 'pointer-events-none cursor-default bg-gray-50 text-gray-300'}`}>
                {cell.day ? <span className="text-xs font-extrabold text-gray-700">{cell.day}</span> : null}
                <div className="mt-1 min-h-0 flex-1 space-y-1 overflow-hidden">
                  {cell.events.slice(0, 3).map((item) => {
                    const type = eventTypeOf(item)
                    return (
                      <div key={item.eventId} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(item) }} className={`truncate rounded px-1 py-0.5 text-[9px] font-bold leading-tight text-white shadow-sm ${EVENT_LIST_TONE[type].badge}`}>
                        {formatTime(item.startAt)} {EVENT_TYPE_CONFIG[type].label}
                      </div>
                    )
                  })}
                  {cell.events.length > 3 ? <p className="text-[10px] font-bold text-gray-400">+{cell.events.length - 3}개 더보기</p> : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-extrabold text-gray-900"><i className="fas fa-list-ul text-[#7C3AED]" /> 등록된 공식 일정</h3>
          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
            {monthEvents.length === 0 ? <p className="mt-10 text-center text-sm text-gray-400">등록된 일정이 없습니다.</p> : monthEvents.map((event) => {
              const type = eventTypeOf(event)
              const tone = EVENT_LIST_TONE[type]
              return (
                <button key={event.eventId} type="button" onClick={() => setSelectedEvent(event)} className={`relative w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${tone.border} ${tone.bg}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold shadow-sm ${tone.badge}`}><i className={EVENT_TYPE_CONFIG[type].icon} />{EVENT_TYPE_CONFIG[type].label}</span>
                    <span className="text-[10px] font-bold text-gray-400">{formatTime(event.startAt)}</span>
                  </div>
                  <p className="text-xs font-extrabold text-gray-900">{event.title}</p>
                  <p className="mt-1 text-[10px] font-bold text-gray-400">{formatDate(event.startAt)}</p>
                </button>
              )
            })}
          </div>
        </section>
      </div>
      {open ? (
        <Modal title="새 공식 일정 등록" icon="fas fa-plus-circle" maxWidth="max-w-md" onClose={() => setOpen(false)}>
          <form onSubmit={createEvent}>
            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-gray-600">일정 유형 <span className="text-red-500">*</span></span>
                <select value={eventType} onChange={(event) => setEventType(event.target.value as CalendarEventType)} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none transition focus:border-[#7C3AED]">
                  <option value="meetup">라이브 밋업 (코드 리뷰 등)</option>
                  <option value="deadline">과제 마감일</option>
                  <option value="special">특강 / 기타 일정</option>
                </select>
              </label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">일정 제목</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="예: 3주차 라이브 코드 리뷰" /></label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">날짜 <span className="text-red-500">*</span></span><input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#7C3AED]" /></label>
                <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">시간</span><input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#7C3AED]" /></label>
              </div>
              <label className="block"><span className="mb-2 block text-xs font-bold text-gray-600">상세 설명</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="h-24 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="수강생들에게 안내할 상세 내용을 입력하세요." /></label>
              <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 p-3">
                <i className="fas fa-info-circle mt-0.5 text-sm text-[#7C3AED]" />
                <p className="text-[11px] font-medium leading-relaxed text-gray-700">등록된 일정은 워크스페이스 내 모든 수강생의 캘린더에 즉시 동기화됩니다.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700">취소</button><button type="submit" className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white"><i className="fas fa-save" /> 등록 및 배포</button></div>
          </form>
        </Modal>
      ) : null}
      {selectedEvent ? (
        <Modal title="공식 일정 상세" icon={EVENT_TYPE_CONFIG[eventTypeOf(selectedEvent)].icon} maxWidth="max-w-sm" onClose={() => setSelectedEvent(null)}>
          <div className="p-6">
            <span className={`mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold shadow-sm ${EVENT_TYPE_CONFIG[eventTypeOf(selectedEvent)].badge}`}>{EVENT_TYPE_CONFIG[eventTypeOf(selectedEvent)].label}</span>
            <h3 className="text-lg font-extrabold leading-tight text-gray-900">{selectedEvent.title}</h3>
            <p className="mt-1 text-xs font-bold text-gray-500"><i className="far fa-clock mr-1" />{formatDate(selectedEvent.startAt)} {formatTime(selectedEvent.startAt)}</p>
            <p className="mt-5 mb-1 text-[10px] font-bold text-gray-400">상세 안내</p>
            <div className="min-h-[80px] rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm font-medium leading-relaxed text-gray-700">{eventDescriptionOf(selectedEvent) || '상세 안내가 없습니다.'}</div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 bg-white p-5">
            <button type="button" onClick={deleteEvent} className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100"><i className="fas fa-trash-alt mr-1" /> 일정 삭제</button>
            <button type="button" onClick={() => setSelectedEvent(null)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white">확인</button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
