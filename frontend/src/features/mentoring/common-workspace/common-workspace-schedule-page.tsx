import { useState,type FormEvent } from 'react'
import type { CalendarEvent } from './common-types'
import { SourceFormModal } from './common-workspace-shared'
import { formatDateTime,parseDate } from './common-workspace-support'



export function SchedulePage({
  events,
  onCreateEvent,
  submitting,
}: {
  events: CalendarEvent[]
  onCreateEvent: (payload: { title: string; description: string; startAt: string; endAt: string }) => Promise<void>
  submitting: boolean
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const sortedEvents = [...events].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())
  const sourceEventDays = [5, 6, 10, 12, 19, 20, 24, 27]
  const eventsByDay = new Map<number, CalendarEvent[]>()

  sortedEvents.forEach((event, index) => {
    const parsed = parseDate(event.startAt)
    const day = parsed && parsed.getFullYear() === 2026 && parsed.getMonth() === 1 ? parsed.getDate() : sourceEventDays[index % sourceEventDays.length]
    const dayEvents = eventsByDay.get(day) ?? []

    dayEvents.push(event)
    eventsByDay.set(day, dayEvents)
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const time = eventTime || '09:00'
    const [hour = '09', minute = '00'] = time.split(':')
    const endHour = String((Number(hour) + 1) % 24).padStart(2, '0')

    await onCreateEvent({
      title,
      description,
      startAt: `${eventDate}T${time}`,
      endAt: `${eventDate}T${endHour}:${minute}`,
    })
    setTitle('')
    setDescription('')
    setEventDate('')
    setEventTime('')
    setFormOpen(false)
  }

  function eventTone(event: CalendarEvent) {
    const eventText = `${event.title} ${event.description ?? ''}`

    if (eventText.includes('마감') || eventText.includes('과제')) {
      return 'bg-red-50 text-red-500 border-red-100'
    }

    if (eventText.includes('멘토') || eventText.includes('화상') || eventText.includes('라이브')) {
      return 'bg-purple-50 text-mentor border-purple-100'
    }

    return 'bg-green-50 text-brand border-green-100'
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:flex-wrap">
      <section className="min-w-0 flex-1">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
              <i className="fas fa-calendar-alt text-brand"></i>
              팀 및 개인 일정
            </h1>
            <p className="mt-2 text-sm text-gray-500">멘토님의 공식 일정과 나의 개인 학습 플랜을 관리하세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50">
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="w-24 text-center text-lg font-bold text-gray-900">2026. 02</span>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center text-xs font-extrabold">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, index) => (
              <div key={day} className={`py-3 ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-7 gap-[1px] bg-gray-100">
            {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => {
              const dayEvents = eventsByDay.get(day) ?? []

              return (
                <div key={day} className={`mentoring-source-calendar-day min-h-[100px] p-2 [&:nth-child(7n)]:border-r-0! [&:nth-last-child(-n+7)]:border-b-0! ${day === 19 ? 'bg-green-50/40' : 'bg-white'}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${day === 19 ? 'bg-brand text-white' : 'text-gray-500'}`}>{day}</span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div key={event.eventId} className={`line-clamp-1 rounded border px-1.5 py-1 text-[10px] font-bold ${eventTone(event)}`}>
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 ? <div className="px-1.5 text-[10px] font-bold text-gray-400">+{dayEvents.length - 2}</div> : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <aside className="w-full shrink-0 space-y-6 lg:w-80">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600"
        >
          <i className="fas fa-plus"></i>
          내 개인 일정 추가하기
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-extrabold text-gray-900">일정 범례</h3>
          <div className="space-y-3 text-xs font-bold text-gray-500">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-mentor"></span>
              멘토 공식 일정
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-brand"></span>
              개인 학습 일정
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400"></span>
              과제 마감
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-5 flex items-center gap-2 text-sm font-extrabold text-gray-900">
            <i className="far fa-clock text-brand"></i>
            다가오는 일정
          </h3>
          {sortedEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-gray-300">
                <i className="far fa-calendar"></i>
              </div>
              <p className="mb-2 text-sm font-extrabold text-gray-900">등록된 일정이 없습니다</p>
              <p className="mb-5 text-xs leading-relaxed text-gray-500">아직 예정된 일정이 없습니다. 개인 학습 목표나 일정을 등록해 보세요!</p>
              <button type="button" onClick={() => setFormOpen(true)} className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-600">
                첫 일정 등록하기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEvents.slice(0, 5).map((event) => (
                <div key={event.eventId} className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-brand"></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{event.title}</p>
                    <p className="mt-1 text-xs font-bold text-gray-400">{formatDateTime(event.startAt)}</p>
                    {event.description ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{event.description}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <SourceFormModal
        open={formOpen}
        title="개인 일정 추가"
        icon="fas fa-plus-circle"
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        footer={
          <>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">
              취소
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-brand px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
              <i className="fas fa-save"></i>
              저장
            </button>
          </>
        }
      >
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            일정 제목 <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="예: 인프런 강의 3섹션 수강"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-600">
              날짜 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              required
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-600">시간</label>
            <input
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">상세 메모</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-24 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="메모할 내용을 적어주세요."
          ></textarea>
        </div>
      </SourceFormModal>
    </div>
  )
}
