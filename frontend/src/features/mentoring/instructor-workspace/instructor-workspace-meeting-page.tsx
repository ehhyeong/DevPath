import { useEffect,useState,type FormEvent } from 'react'
import { deleteInstructorWorkspaceMeetingNote,saveInstructorWorkspaceMeetingNote,saveInstructorWorkspaceMeetingSettings } from './instructor-workspace-api'
import { EmptyState,Modal,PageHeading } from './instructor-workspace-shared'
import { buildDefaultMeetingSettings,buildHref,encodeMeetingNoteContent,eventTypeOf,meetingNoteContentOf,meetingNoteDateLabel,meetingNoteMetaOf,parseMeetingSettings,pushWorkspaceNotification } from './instructor-workspace-support'
import type { MeetingNote,MeetingSettings,WorkspaceData } from './instructor-workspace-types'



export function MeetingPage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null)
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [savingSetup, setSavingSetup] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const nextMeetup = data.events.find((event) => eventTypeOf(event) === 'meetup') ?? null
  const liveRoomUrl = `${window.location.origin}${buildHref('live-meeting', workspaceId)}`
  const [meetup, setMeetup] = useState<MeetingSettings>(() => buildDefaultMeetingSettings(nextMeetup, liveRoomUrl))

  useEffect(() => {
    if (data.meetingSettings) {
      setMeetup({ ...data.meetingSettings, link: data.meetingSettings.link || liveRoomUrl })
      return
    }
    setMeetup(buildDefaultMeetingSettings(nextMeetup, liveRoomUrl))
  }, [data.meetingSettings, liveRoomUrl, nextMeetup])

  async function saveMeetupSettings(nextMeetupSettings: MeetingSettings) {
    if (!workspaceId) return
    const normalized = { ...nextMeetupSettings, link: nextMeetupSettings.link || liveRoomUrl }
    setSavingSetup(true)
    try {
      const saved = await saveInstructorWorkspaceMeetingSettings(workspaceId, normalized)
      setMeetup(parseMeetingSettings(saved, liveRoomUrl) ?? normalized)
      pushWorkspaceNotification(workspaceId, {
        title: '밋업 설정 변경',
        description: `"${normalized.title || '라이브 밋업'}" 설정이 저장되었습니다.`,
        href: buildHref('meeting', workspaceId),
        icon: 'fas fa-cog',
      })
      await reload()
      setSetupOpen(false)
    } finally {
      setSavingSetup(false)
    }
  }

  async function copyMeetupLink() {
    const link = meetup.link || liveRoomUrl
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = link
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function openCreateNote() {
    setEditingNote(null)
    setNoteOpen(true)
  }

  function openEditNote(note: MeetingNote) {
    setSelectedNote(null)
    setEditingNote(note)
    setNoteOpen(true)
  }

  async function deleteNote(note: MeetingNote) {
    if (!window.confirm('이 회의록을 정말 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) return
    setDeletingNoteId(note.noteId)
    try {
      await deleteInstructorWorkspaceMeetingNote(note.noteId)
      if (selectedNote?.noteId === note.noteId) {
        setSelectedNote(null)
      }
      pushWorkspaceNotification(workspaceId, {
        title: '회의록 삭제',
        description: `"${note.title}" 회의록이 삭제되었습니다.`,
        href: buildHref('meeting', workspaceId),
        icon: 'fas fa-trash-alt',
      })
      await reload()
    } finally {
      setDeletingNoteId(null)
    }
  }

  return (
    <>
      <PageHeading
        page="meeting"
        description="라이브 밋업 일정을 설정하고, 종료 후 수강생들을 위해 회의록을 작성해 배포하세요."
        action={<button type="button" onClick={openCreateNote} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-pen-nib" /> 회의록 작성하기</button>}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-broadcast-tower animate-pulse text-red-500" /> 다가오는 라이브 밋업</h2>
            <button type="button" onClick={() => setSetupOpen(true)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:border-[#7C3AED] hover:text-[#7C3AED]"><i className="fas fa-cog mr-1" /> 밋업 설정</button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#7C3AED] bg-white shadow-lg">
            <div className="relative flex h-32 flex-col justify-end bg-[#7C3AED] p-6 text-white">
              <span className={`relative z-10 mb-2 w-fit rounded px-2 py-1 text-[10px] font-extrabold shadow-sm ${meetup.status === 'ON AIR' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}>{meetup.status}</span>
              <h3 className="relative z-10 text-lg font-black leading-tight">{meetup.title || '등록된 라이브 밋업이 없습니다.'}</h3>
            </div>
            <div className="p-5">
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className="far fa-calendar-alt" /></div>
                  <span>{meetup.date || '일정 미정'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className="far fa-clock" /></div>
                  <span>{meetup.time || '시간 미정'}</span>
                </div>
              </div>
              <p className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">{meetup.description || '밋업 설정에서 설명을 등록하세요.'}</p>
              <a href={buildHref('live-meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C471] py-3.5 text-sm font-bold text-white shadow-md"><i className="fas fa-sign-in-alt" /> 밋업 호스트로 입장하기</a>
              <button type="button" onClick={() => void copyMeetupLink()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50"><i className="fas fa-link" /> {copied ? '복사 완료' : '외부 참여 링크 복사'}</button>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-archive text-gray-400" /> 지난 밋업 회의록 (아카이브)</h2>
          {data.meetingNotes.length === 0 ? (
            <EmptyState icon="fas fa-clipboard-list" title="등록된 회의록이 없습니다." description="멘토링 후 회의록을 저장하면 주차별 진행 기록으로 남습니다." />
          ) : (
            <div className="space-y-4">
              {data.meetingNotes.map((note) => {
                const meta = meetingNoteMetaOf(note)
                const content = meetingNoteContentOf(note)
                const preview = content.replace(/\n/g, ' ')
                return (
                  <article
                    key={note.noteId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedNote(note)}
                    onKeyDown={(event) => { if (event.key === 'Enter') setSelectedNote(note) }}
                    className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">{meta.week !== '0' ? `Week ${meta.week}` : '공통'}</span>
                        <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">회의록</span>
                        <span className="ml-1 text-[10px] font-bold text-gray-400">{meetingNoteDateLabel(meta.date || note.createdAt)}</span>
                      </div>
                      <div className="flex shrink-0 gap-1" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => openEditNote(note)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]" aria-label="회의록 수정"><i className="fas fa-pen text-[10px]" /></button>
                        <button type="button" disabled={deletingNoteId === note.noteId} onClick={() => void deleteNote(note)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-red-200 hover:text-red-500 disabled:opacity-50" aria-label="회의록 삭제"><i className="fas fa-trash text-[10px]" /></button>
                      </div>
                    </div>
                    <h4 className="mb-2 text-base font-extrabold text-gray-900">{note.title}</h4>
                    <p className="line-clamp-2 text-sm text-gray-500">{preview ? `${preview.slice(0, 90)}${preview.length > 90 ? '...' : ''}` : '내용 없음'}</p>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
      {setupOpen ? <MeetupSetupModal meetup={meetup} saving={savingSetup} onClose={() => setSetupOpen(false)} onSave={saveMeetupSettings} /> : null}
      {noteOpen ? <MeetingNoteModal workspaceId={workspaceId} note={editingNote} reload={reload} onClose={() => { setNoteOpen(false); setEditingNote(null) }} /> : null}
      {selectedNote ? <MeetingNoteDetailModal note={selectedNote} deleting={deletingNoteId === selectedNote.noteId} onClose={() => setSelectedNote(null)} onEdit={openEditNote} onDelete={deleteNote} /> : null}
    </>
  )
}

export function MeetupSetupModal({ meetup, saving, onClose, onSave }: { meetup: MeetingSettings; saving: boolean; onClose: () => void; onSave: (meetup: MeetingSettings) => Promise<void> }) {
  const [draft, setDraft] = useState(meetup)

  function updateField(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  return (
    <Modal title="라이브 밋업 설정" icon="fas fa-cog" onClose={onClose}>
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-800">해당 주차</span>
            <select value={draft.week} onChange={(event) => updateField('week', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#7C3AED]">
              <option value="1주차">1주차 (Week 1)</option>
              <option value="2주차">2주차 (Week 2)</option>
              <option value="3주차">3주차 (Week 3)</option>
              <option value="4주차">4주차 (Week 4)</option>
              <option value="기타">선택 안함 (특강 등)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-800">진행 상태</span>
            <select value={draft.status} onChange={(event) => updateField('status', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#7C3AED]">
              <option value="UPCOMING">예정됨 (UPCOMING)</option>
              <option value="ON AIR">진행 중 (ON AIR)</option>
            </select>
          </label>
        </div>
        <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">밋업 제목 <span className="text-red-500">*</span></span><input value={draft.title} onChange={(event) => updateField('title', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#7C3AED]" /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">진행 날짜 <span className="text-red-500">*</span></span><input value={draft.date} onChange={(event) => updateField('date', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="예: 2026.02.20 (금)" /></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">진행 시간 <span className="text-red-500">*</span></span><input value={draft.time} onChange={(event) => updateField('time', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="예: 20:00 ~ 21:30" /></label>
        </div>
        <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">상세 설명</span><textarea value={draft.description} onChange={(event) => updateField('description', event.target.value)} className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed outline-none focus:border-[#7C3AED]" /></label>
        <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">화상 회의 링크 (Zoom, Google Meet 등)</span><input type="url" value={draft.link} onChange={(event) => updateField('link', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED]" placeholder="https://..." /></label>
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
        <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700">취소</button>
        <button type="button" disabled={saving} onClick={() => void onSave(draft)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"><i className="fas fa-check" /> {saving ? '저장 중' : '밋업 설정 저장'}</button>
      </div>
    </Modal>
  )
}

export function MeetingNoteModal({ workspaceId, note, reload, onClose }: { workspaceId: number | null; note?: MeetingNote | null; reload: () => Promise<void>; onClose: () => void }) {
  const noteMeta = note ? meetingNoteMetaOf(note) : null
  const [week, setWeek] = useState(noteMeta?.week ?? '3')
  const [title, setTitle] = useState(note?.title ?? '')
  const [date, setDate] = useState(noteMeta?.date ?? '')
  const [content, setContent] = useState(note ? meetingNoteContentOf(note) : '')
  const [notifyStudents, setNotifyStudents] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const editing = Boolean(note)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!workspaceId || !title.trim() || !date || !content.trim()) return
    setSubmitting(true)
    try {
      await saveInstructorWorkspaceMeetingNote(workspaceId, note?.noteId ?? null, { title: title.trim(), content: encodeMeetingNoteContent(week, date, content) })
      void notifyStudents
      pushWorkspaceNotification(workspaceId, {
        title: editing ? '회의록 수정' : '회의록 발행',
        description: `"${title.trim()}" 회의록이 ${editing ? '수정' : '등록'}되었습니다.`,
        href: buildHref('meeting', workspaceId),
        icon: 'fas fa-clipboard-list',
      })
      await reload()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={editing ? '회의록 수정' : '회의록 작성'} icon={editing ? 'fas fa-edit' : 'fas fa-pen-nib'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-gray-800">해당 주차 <span className="text-red-500">*</span></span>
              <select value={week} onChange={(event) => setWeek(event.target.value)} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#7C3AED]">
                <option value="0">선택안함 (공통)</option>
                <option value="1">1주차 (Week 1)</option>
                <option value="2">2주차 (Week 2)</option>
                <option value="3">3주차 (Week 3)</option>
                <option value="4">4주차 (Week 4)</option>
              </select>
            </label>
            <label className="block md:col-span-2"><span className="mb-2 block text-xs font-bold text-gray-800">회의록 제목 <span className="text-red-500">*</span></span><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#7C3AED]" placeholder="예: 라이브 코드 리뷰 요약" /></label>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-gray-800">밋업 진행일 <span className="text-red-500">*</span></span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#7C3AED] md:w-1/2" />
          </label>
          <label className="block">
            <div className="mb-2 flex items-end justify-between">
              <span className="block text-xs font-bold text-gray-800">회의 내용 및 피드백 요약 <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-gray-400">마크다운(Markdown) 지원</span>
            </div>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[300px] w-full resize-y rounded-xl border border-gray-200 p-4 text-sm leading-relaxed outline-none focus:border-[#7C3AED]" placeholder="밋업에서 다루었던 핵심 내용, 자주 나온 질문, 우수 사례 등을 자유롭게 작성해주세요." />
          </label>
          <label className="flex cursor-pointer select-none items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
            <input type="checkbox" checked={notifyStudents} onChange={(event) => setNotifyStudents(event.target.checked)} className="h-4 w-4 accent-[#7C3AED]" />
            <span className="text-xs font-bold text-[#7C3AED]">등록 즉시 전체 수강생에게 알림 발송</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700">취소</button><button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"><i className="fas fa-save" /> {submitting ? '저장 중' : '저장 및 배포'}</button></div>
      </form>
    </Modal>
  )
}

export function MeetingNoteDetailModal({ note, deleting, onClose, onEdit, onDelete }: { note: MeetingNote; deleting: boolean; onClose: () => void; onEdit: (note: MeetingNote) => void; onDelete: (note: MeetingNote) => Promise<void> }) {
  const meta = meetingNoteMetaOf(note)
  const content = meetingNoteContentOf(note)

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
          <div className="pr-8">
            <div className="mb-2 flex items-center gap-2">
              {meta.week !== '0' ? <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">Week {meta.week}</span> : null}
              <span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">MEETING NOTE</span>
            </div>
            <h3 className="mb-1 text-lg font-extrabold leading-tight text-gray-900">{note.title}</h3>
            <p className="text-[10px] font-bold text-gray-400">{meetingNoteDateLabel(meta.date || note.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          <div className="whitespace-pre-line text-sm font-medium leading-relaxed text-gray-700">{content || '회의록 상세 내용이 없습니다.'}</div>
        </div>
        <div className="flex shrink-0 justify-between border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" disabled={deleting} onClick={() => void onDelete(note)} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-500 shadow-sm transition hover:bg-red-50 disabled:opacity-50"><i className="fas fa-trash-alt mr-1" /> {deleting ? '삭제 중' : '삭제'}</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">닫기</button>
            <button type="button" onClick={() => onEdit(note)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">수정하기</button>
          </div>
        </div>
      </div>
    </div>
  )
}
