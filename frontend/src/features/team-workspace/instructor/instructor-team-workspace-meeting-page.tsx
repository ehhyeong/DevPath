import { useState,type FormEvent,type ReactNode } from 'react';
import { createInstructorTeamCalendarEvent,createInstructorTeamMeetingNote,deleteInstructorTeamMeetingNote } from './instructor-api';
import type { MeetingNote,TeamData } from './instructor-types';
import { INSTRUCTOR_TEAM_MEETING_UI_LOCK_CLASSES,avatarUrl,buildHref,buildScheduleDescription,formatMeetingDate,formatTime,localDateKey,localDateTimeInput,membersOnly,parseScheduleDescription,pushTeamNotification,type MeetingNoteFilter } from './instructor-workspace-support';



export function MeetingPage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [meetupModalOpen, setMeetupModalOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null)
  const [filter, setFilter] = useState<MeetingNoteFilter>('all')
  const [success, setSuccess] = useState<{ title: string; description: ReactNode } | null>(null)
  const [now] = useState(() => Date.now())
  const ownerId = data.dashboard?.ownerId
  const learners = membersOnly(data)
  const futureMeetups = data.events
    .filter((event) => parseScheduleDescription(event.description).type === 'meetup' && new Date(event.startAt).getTime() >= now - 86400000)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const nextMeetup = futureMeetups[0] ?? null
  const activeVoiceCount = data.voiceChannels.reduce((sum, channel) => sum + channel.activeParticipantCount, 0)
  const onlineMembers = learners.filter((member) => member.online).slice(0, 4)
  const mentorNotes = data.notes.filter((note) => note.createdById === ownerId || !note.createdById)
  const teamNotes = data.notes.filter((note) => note.createdById && note.createdById !== ownerId)
  const visibleNotes = data.notes
    .filter((note) => filter === 'all' || (filter === 'mentor' ? mentorNotes.includes(note) : teamNotes.includes(note)))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())

  async function saveMeetup(form: { title: string; date: string; time: string; description: string }) {
    if (!workspaceId) return
    const startAt = `${form.date}T${form.time}:00`
    const endDate = new Date(startAt)
    endDate.setMinutes(endDate.getMinutes() + 90)
    await createInstructorTeamCalendarEvent(workspaceId, {
      title: form.title,
      description: buildScheduleDescription('meetup', form.description),
      startAt,
      endAt: localDateTimeInput(endDate),
    })
    pushTeamNotification(workspaceId, {
      title: '라이브 밋업 예약',
      description: `${form.date} ${form.time} · "${form.title}" 밋업이 예약되었습니다.`,
      href: buildHref('meeting', workspaceId),
      icon: 'fas fa-video',
    })
    setMeetupModalOpen(false)
    setSuccess({ title: '예약 완료!', description: <>라이브 밋업 일정이 예약되었으며,<br />팀원들에게 캘린더 연동 알림이 발송되었습니다.</> })
    await reload()
  }

  async function saveNote(form: { title: string; content: string }) {
    if (!workspaceId) return
    await createInstructorTeamMeetingNote(workspaceId, form)
    pushTeamNotification(workspaceId, {
      title: '공식 회의록 발행',
      description: `"${form.title}" 회의록이 발행되었습니다.`,
      href: buildHref('meeting', workspaceId),
      icon: 'fas fa-file-alt',
    })
    setNoteModalOpen(false)
    setSuccess({ title: '발행 완료!', description: <>멘토 공식 회의록이 아카이브에<br />성공적으로 발행되었습니다.</> })
    await reload()
  }

  async function deleteNote(note: MeetingNote) {
    if (!window.confirm('관리자(강사) 권한으로 해당 회의록을 삭제하시겠습니까?')) return
    await deleteInstructorTeamMeetingNote(note.noteId)
    pushTeamNotification(workspaceId, {
      title: '회의록 삭제',
      description: `"${note.title}" 회의록이 삭제되었습니다.`,
      href: buildHref('meeting', workspaceId),
      icon: 'fas fa-trash-alt',
    })
    setSelectedNote(null)
    await reload()
  }

  async function copyMeetingLink() {
    const url = `${window.location.origin}${buildHref('live-meeting', workspaceId)}`
    await navigator.clipboard?.writeText(url).catch(() => null)
    setSuccess({ title: '링크 복사 완료!', description: <>화상 회의 외부 접속 링크가<br />클립보드에 복사되었습니다.</> })
  }

  return (
    <div className={`instructor-team-meeting space-y-8 ${INSTRUCTOR_TEAM_MEETING_UI_LOCK_CLASSES}`}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-video text-[#7C3AED]" />화상 멘토링 & 회의록 관리</h1>
          <p className="mt-2 text-sm text-gray-500">라이브 밋업 방을 개설하여 멘토링을 진행하고, 팀원들을 위한 공식 회의록을 작성하세요.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setMeetupModalOpen(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"><i className="fas fa-calendar-plus" />새 밋업 예약</button>
          <button type="button" onClick={() => setNoteModalOpen(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"><i className="fas fa-pen-nib" />공식 회의록 발행</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="flex h-full flex-col space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-broadcast-tower text-[#7C3AED]" />다음 예정된 라이브 밋업 (Host)</h3>
          {nextMeetup ? (
            <div className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#7C3AED] opacity-10 blur-3xl transition duration-700 group-hover:scale-150" />
              <div className="relative flex h-32 shrink-0 flex-col justify-end bg-purple-900 p-6">
                <span className="relative z-10 mb-2 w-fit animate-pulse rounded border border-purple-500 bg-purple-700 px-2 py-1 text-xs font-extrabold text-white shadow-sm">ON AIR 준비중</span>
                <h4 className="relative z-10 text-lg leading-tight font-black text-white">{nextMeetup.title}</h4>
              </div>
              <div className="relative z-10 flex flex-1 flex-col p-6">
                <div className="mb-6 space-y-3">
                  <MeetingInfoRow icon="far fa-calendar-alt" text={formatMeetingDate(nextMeetup.startAt)} />
                  <MeetingInfoRow icon="far fa-clock" text={`${formatTime(nextMeetup.startAt)} ~ ${formatTime(nextMeetup.endAt) || '미정'}`} />
                </div>
                <p className="mb-6 flex-1 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">{parseScheduleDescription(nextMeetup.description).description || '등록된 아젠다가 없습니다.'}</p>
                <a href={buildHref('live-meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3.5 text-sm font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700"><i className="fas fa-video" />호스트로 밋업 시작하기 (ON AIR)</a>
                <button type="button" onClick={() => void copyMeetingLink()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50"><i className="fas fa-link" />외부 링크 공유</button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 text-[#7C3AED] shadow-sm"><i className="fas fa-calendar-times text-2xl" /></div>
              <h4 className="mb-2 text-lg font-bold text-gray-900">예정된 라이브 밋업이 없습니다</h4>
              <p className="mb-6 max-w-[250px] text-sm text-gray-500">팀원들과 실시간으로 소통할 수 있는 화상 멘토링 일정을 예약해 보세요.</p>
              <button type="button" onClick={() => setMeetupModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-700"><i className="fas fa-plus" />새 밋업 예약하기</button>
            </div>
          )}
        </section>

        <section className="flex h-full flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-headset text-[#4F46E5]" />학생 상시 회의장 (음성 채널)</h3>
            <span className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-500 shadow-sm">모니터링 전용</span>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className={`${activeVoiceCount > 0 ? 'bg-indigo-50' : 'bg-gray-50'} shrink-0 border-b border-gray-100 p-6`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`flex items-center gap-1.5 text-sm font-extrabold ${activeVoiceCount > 0 ? 'text-[#4F46E5]' : 'text-gray-500'}`}><i className={`fas fa-circle text-[8px] ${activeVoiceCount > 0 ? 'animate-pulse text-green-500' : 'text-gray-300'}`} />팀 보이스 챗</span>
                <span className={`rounded-full border bg-white px-2 py-0.5 text-xs font-bold ${activeVoiceCount > 0 ? 'border-indigo-200 text-[#4F46E5]' : 'border-gray-200 text-gray-500'}`}>{activeVoiceCount}명 접속 중</span>
              </div>
              <p className={`text-xs font-medium ${activeVoiceCount > 0 ? 'text-indigo-800' : 'text-gray-500'}`}>학생들이 자유롭게 사용하는 채널입니다. 필요시 입장하여 가이드할 수 있습니다.</p>
            </div>
            {activeVoiceCount > 0 ? (
              <div className="flex flex-1 flex-col bg-white p-6">
                <div className="mb-6 flex flex-1 flex-col justify-center rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-3 text-center text-xs font-bold text-gray-400">현재 접속 중인 멤버</p>
                  <div className="flex justify-center gap-6">
                    {(onlineMembers.length > 0 ? onlineMembers : learners.slice(0, Math.min(activeVoiceCount, 4))).map((member) => (
                      <div key={member.memberId} className="flex flex-col items-center gap-1">
                        <div className="relative">
                          <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-12 w-12 rounded-full border-2 border-green-400 bg-white shadow-sm" alt="" />
                          <span className="absolute right-0 bottom-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-green-500 text-[10px] text-white shadow-sm"><i className="fas fa-microphone" /></span>
                        </div>
                        <span className="mt-1 text-xs font-bold text-gray-700">{member.learnerName ?? '팀원'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-xs font-medium text-[#4F46E5]">팀원들이 음성 채널에서 협업 중입니다.</p>
                </div>
                <a href={buildHref('voice-channel', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#4F46E5] bg-white py-3.5 text-sm font-bold text-[#4F46E5] shadow-sm transition hover:bg-indigo-50"><i className="fas fa-phone-alt" />학생 채널 방문하기 (음성 연결)</a>
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center bg-white p-6">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300 shadow-sm"><i className="fas fa-microphone-slash text-2xl" /></div>
                <p className="mb-1 text-sm font-bold text-gray-400">현재 접속 중인 멤버가 없습니다</p>
                <p className="text-center text-xs leading-relaxed text-gray-400">학생들이 음성 채널에 접속하면<br />이곳에서 활동을 모니터링할 수 있습니다.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-col justify-between gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-archive text-gray-400" />회의록 아카이브 모니터링</h3>
          <div className="flex items-center gap-1 rounded-xl border border-gray-200/60 bg-gray-100 p-1 shadow-inner">
            <MeetingFilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="전체" count={data.notes.length} />
            <MeetingFilterButton active={filter === 'mentor'} onClick={() => setFilter('mentor')} label="내가 작성한 공식 회의록" count={mentorNotes.length} tone="mentor" />
            <MeetingFilterButton active={filter === 'team'} onClick={() => setFilter('team')} label="학생 작성 회의록" count={teamNotes.length} tone="team" />
          </div>
        </div>
        {visibleNotes.length === 0 ? (
          <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-16 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 text-[#7C3AED] shadow-sm"><i className="fas fa-archive text-2xl" /></div>
            <h3 className="mb-1 text-lg font-bold text-gray-900">등록된 회의록이 없습니다</h3>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-400">멘토링 요약이나 팀원들의 스크럼 회의록이 이곳에 아카이빙됩니다.</p>
            <button type="button" onClick={() => setNoteModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-pen-nib" />첫 공식 회의록 발행하기</button>
          </div>
        ) : (
          <div className="grid auto-rows-stretch grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleNotes.map((note) => <MeetingNoteCard key={note.noteId} note={note} ownerId={ownerId} onClick={() => setSelectedNote(note)} />)}
          </div>
        )}
      </section>

      {meetupModalOpen ? <MeetupSetupModal onClose={() => setMeetupModalOpen(false)} onSubmit={saveMeetup} /> : null}
      {noteModalOpen ? <TeamNoteModal onClose={() => setNoteModalOpen(false)} onSubmit={saveNote} /> : null}
      {selectedNote ? <MeetingNoteDetailModal note={selectedNote} ownerId={ownerId} onClose={() => setSelectedNote(null)} onDelete={() => void deleteNote(selectedNote)} /> : null}
      {success ? <MeetingSuccessModal title={success.title} description={success.description} onClose={() => setSuccess(null)} /> : null}
    </div>
  )
}

export function MeetingInfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className={icon} /></div>
      <span>{text}</span>
    </div>
  )
}

export function MeetingFilterButton({ active, onClick, label, count, tone = 'default' }: { active: boolean; onClick: () => void; label: string; count: number; tone?: 'default' | 'mentor' | 'team' }) {
  const countClass = tone === 'mentor' ? 'bg-purple-50 text-[#7C3AED]' : tone === 'team' ? 'bg-indigo-50 text-[#4F46E5]' : 'bg-gray-200/80 text-gray-600'
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs transition-all duration-200 ${active ? 'bg-white font-bold text-gray-900 shadow-sm' : 'font-medium text-gray-500 hover:text-gray-900'}`}>
      <span>{label}</span>
      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${countClass} ${active ? '' : 'opacity-50'}`}>{count}</span>
    </button>
  )
}

export function MeetingNoteCard({ note, ownerId, onClick }: { note: MeetingNote; ownerId?: number | null; onClick: () => void }) {
  const mentor = note.createdById === ownerId || !note.createdById
  return (
    <button type="button" onClick={onClick} className="hover-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-lg">
      <div className="mb-3 flex shrink-0 items-start justify-between">
        <span className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-extrabold ${mentor ? 'border-purple-200 bg-purple-50 text-[#7C3AED]' : 'border-indigo-200 bg-indigo-50 text-[#4F46E5]'}`}><i className={mentor ? 'fas fa-check-circle' : 'fas fa-users'} />{mentor ? '멘토 공식' : '학생 회의록'}</span>
        <span className="text-xs font-bold text-gray-400">{formatMeetingDate(note.createdAt)}</span>
      </div>
      <div className="flex-1">
        <h4 className="mb-2 line-clamp-2 text-sm leading-tight font-extrabold text-gray-900">{note.title}</h4>
        <p className="line-clamp-2 text-xs text-gray-500">{note.content || '회의록 내용이 없습니다.'}</p>
      </div>
    </button>
  )
}

export function MeetupSetupModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: { title: string; date: string; time: string; description: string }) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', date: localDateKey(new Date()), time: '20:00', description: '' })
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-calendar-plus text-[#7C3AED]" />새 라이브 밋업 예약</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-800">밋업 주제 (제목) <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="예: 4주차 배포 관련 라이브 Q&A" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-800">날짜 <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-800">시간 <span className="text-red-500">*</span></label>
              <input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-800">아젠다 및 사전 준비사항</label>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="팀원들이 밋업 전에 미리 준비해야 할 사항이나 논의할 안건을 적어주세요." className="h-32 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
          <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60"><i className="fas fa-paper-plane" />{saving ? '예약 중' : '예약 및 알림 발송'}</button>
        </div>
      </form>
    </div>
  )
}

export function TeamNoteModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: { title: string; content: string }) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', content: '' })
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-pen-nib text-[#7C3AED]" />멘토 공식 회의록 작성</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
          <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 p-3">
            <i className="fas fa-info-circle mt-0.5 text-sm text-[#7C3AED]" />
            <p className="text-[11px] leading-relaxed font-medium text-gray-700">강사님이 작성하신 회의록은 팀 아카이브 최상단에 <span className="font-bold text-[#7C3AED]">멘토 공식</span> 뱃지와 함께 박제됩니다.</p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-800">회의/밋업 제목 <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="예: 3주차 라이브 코드 리뷰 내용 요약" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" />
          </div>
          <div>
            <div className="mb-2 flex items-end justify-between">
              <label className="block text-xs font-bold text-gray-800">회의 내용 및 피드백 요약 <span className="text-red-500">*</span></label>
              <span className="text-[10px] text-gray-400">마크다운(Markdown) 지원</span>
            </div>
            <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required placeholder="밋업에서 진행한 리뷰 내용이나 팀 전체에 공지할 다음 액션 아이템을 기록해주세요." className="h-64 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
          <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-700 disabled:opacity-60"><i className="fas fa-check" />{saving ? '발행 중' : '공식 문서로 발행'}</button>
        </div>
      </form>
    </div>
  )
}

export function MeetingNoteDetailModal({ note, ownerId, onClose, onDelete }: { note: MeetingNote; ownerId?: number | null; onClose: () => void; onDelete: () => void }) {
  const mentor = note.createdById === ownerId || !note.createdById
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div className="pr-8">
            <span className={`mb-2 inline-block rounded border px-2 py-0.5 text-xs font-extrabold ${mentor ? 'border-purple-200 bg-purple-50 text-[#7C3AED]' : 'border-indigo-200 bg-indigo-50 text-[#4F46E5]'}`}>{mentor ? '멘토 공식' : '팀 스크럼'}</span>
            <h3 className="mb-1 text-lg leading-tight font-extrabold text-gray-900">{note.title}</h3>
            <p className="text-xs font-bold text-gray-400">{formatMeetingDate(note.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          <div className="whitespace-pre-line text-sm leading-relaxed font-medium text-gray-700">{note.content || '회의록 상세 내용이 없습니다.'}</div>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-white p-5">
          <button type="button" onClick={onDelete} className="flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100"><i className="fas fa-trash-alt" />삭제</button>
          <button type="button" onClick={onClose} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">닫기</button>
        </div>
      </div>
    </div>
  )
}

export function MeetingSuccessModal({ title, description, onClose }: { title: string; description: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 text-[#7C3AED] shadow-sm"><i className="fas fa-check text-3xl" /></div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm leading-relaxed font-medium text-gray-500">{description}</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}
