import { useMemo,useState,type FormEvent } from 'react'
import { createTeamWorkspaceMeetingNote,deleteTeamWorkspaceMeetingNote,updateTeamWorkspaceMeetingNote } from './api'
import { PageFrame } from './team-workspace-suite-shared'
import { appendQueryParam,formatMeetingNoteDate,isOfficialLiveEvent,meetingNoteKind,meetingNoteSummary } from './team-workspace-suite-support'
import type { MeetingNote,NoteForm,SuiteData } from './types'
import { formatDate,formatTime,navHref,parseDate } from './utils'


export function MeetingPage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null)
  const [noteFilter, setNoteFilter] = useState<'all' | 'mentor' | 'team'>('all')
  const [form, setForm] = useState<NoteForm>({ noteId: null, title: '', content: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const liveMeetingEvent = useMemo(
    () => data.events.filter((event) => isOfficialLiveEvent(event)).sort((left, right) => (parseDate(left.startAt)?.getTime() ?? 0) - (parseDate(right.startAt)?.getTime() ?? 0))[0] ?? null,
    [data.events],
  )
  const voiceChannel = data.voiceChannels[0] ?? null
  const voiceParticipantCount = voiceChannel?.activeParticipantCount ?? 0
  const hasLiveMeeting = Boolean(liveMeetingEvent)
  const hasVoiceSession = voiceParticipantCount > 0
  const voiceHref = appendQueryParam(navHref('/team-voice-channel', workspaceId), 'channelId', voiceChannel?.channelId)

  async function saveNote(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('회의록 제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (form.noteId) {
        await updateTeamWorkspaceMeetingNote(form.noteId, { title: form.title.trim(), content: form.content.trim() })
      } else {
        await createTeamWorkspaceMeetingNote(workspaceId, { title: form.title.trim(), content: form.content.trim() })
      }
      setModalOpen(false)
      setForm({ noteId: null, title: '', content: '' })
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '회의록 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function openNoteModal(note?: MeetingNote) {
    setError(null)
    setSelectedNote(null)
    setForm({ noteId: note?.noteId ?? null, title: note?.title ?? '', content: note?.content ?? '' })
    setModalOpen(true)
  }

  async function deleteNote(noteId: number) {
    if (!window.confirm('정말 이 회의록을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) return

    await deleteTeamWorkspaceMeetingNote(noteId)
    setSelectedNote(null)
    await reload()
  }

  const filteredNotes = useMemo(() => {
    if (noteFilter === 'all') return data.notes
    return data.notes.filter((note) => meetingNoteKind(note) === noteFilter)
  }, [data.notes, noteFilter])

  return (
    <>
      <PageFrame
        activePage="meeting"
        title="라이브 밋업 & 회의장"
        subtitle="멘토님이 주관하는 공식 밋업에 참여하거나, 팀원들끼리 모여 자유롭게 화면을 공유하며 회의하세요."
        action={<button type="button" onClick={() => openNoteModal()} className="team-ws-meeting-write-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-pen-nib"></i>팀 회의록 작성</button>}
        data={data}
        workspaceId={workspaceId}
        contentClassName="mx-auto max-w-6xl space-y-8"
      >
        <div className="flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
              <i className="fas fa-video text-team"></i>
              라이브 밋업 & 회의장
            </h1>
            <p className="mt-2 text-sm text-gray-500">멘토 공식 밋업에 참여하거나 팀원끼리 자유롭게 회의하세요.</p>
          </div>
          <button type="button" onClick={() => openNoteModal()} className="team-ws-meeting-write-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black">
            <i className="fas fa-pen-nib"></i>
            팀 회의록 작성
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex h-full flex-col space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <i className={`fas fa-broadcast-tower ${hasLiveMeeting ? 'animate-pulse text-red-500' : 'text-gray-400'}`}></i>
              멘토 공식 라이브 밋업
            </h3>
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {hasLiveMeeting ? (
                <>
                  <div className="relative flex h-32 shrink-0 flex-col justify-end bg-mentor p-6">
                    <div className="absolute inset-0 opacity-20"></div>
                    <span className="relative z-10 mb-2 w-fit rounded bg-red-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm">ON AIR</span>
                    <h4 className="relative z-10 text-lg font-black leading-tight text-white">{liveMeetingEvent?.title}</h4>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className="far fa-calendar-alt"></i></div>
                        <span>{formatDate(liveMeetingEvent?.startAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400"><i className="far fa-clock"></i></div>
                        <span>{formatTime(liveMeetingEvent?.startAt)} ~ {formatTime(liveMeetingEvent?.endAt)}</span>
                      </div>
                    </div>
                    <p className="mb-6 flex-1 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs font-medium leading-relaxed text-gray-500">
                      {liveMeetingEvent?.description || '멘토 공식 밋업 일정입니다.'}
                    </p>
                    <a href={navHref('/team-ws-live-meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                      <i className="fas fa-sign-in-alt"></i>
                      밋업 입장하기
                    </a>
                    <button type="button" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50">
                      <i className="fas fa-link"></i>
                      외부 링크 복사
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-2xl text-gray-300 shadow-sm">
                    <i className="fas fa-video-slash"></i>
                  </div>
                  <h4 className="mb-2 text-base font-extrabold text-gray-900">진행 중인 공식 밋업이 없습니다.</h4>
                  <p className="mb-6 max-w-[250px] text-xs font-medium leading-relaxed text-gray-500">다음 라이브 밋업 일정이 확정되면 멘토님이 이곳을 통해 알림을 드릴 예정입니다.</p>
                  <button type="button" disabled className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-400">
                    <i className="fas fa-sign-in-alt"></i>
                    밋업 입장하기
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex h-full flex-col space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <i className={`fas fa-headset ${hasVoiceSession ? 'text-team' : 'text-gray-400'}`}></i>
              우리 팀 상시 회의장 (음성 채널)
            </h3>
            <div className={`group relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-white ${hasVoiceSession ? 'border border-team shadow-lg' : 'border border-gray-200 shadow-sm'}`}>
              {hasVoiceSession ? <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-team opacity-10 blur-3xl transition duration-700 group-hover:scale-150"></div> : null}
              <div className={`relative z-10 shrink-0 border-b p-6 ${hasVoiceSession ? 'border-gray-100 bg-team-light' : 'border-gray-50 bg-gray-50'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-sm font-extrabold ${hasVoiceSession ? 'text-team' : 'text-gray-600'}`}>
                    <i className={`fas fa-circle text-[8px] ${hasVoiceSession ? 'animate-pulse text-green-500' : 'text-gray-400'}`}></i>
                    {voiceChannel?.name || '팀 보이스 챗'}
                  </span>
                  <span className={`rounded-full border bg-white px-2 py-0.5 text-[10px] font-bold ${hasVoiceSession ? 'border-indigo-200 text-team' : 'border-gray-200 text-gray-500'}`}>
                    {voiceParticipantCount}명 접속 중
                  </span>
                </div>
                <p className={`text-xs font-medium ${hasVoiceSession ? 'text-indigo-800' : 'text-gray-500'}`}>
                  {voiceChannel?.description || '버튼 클릭 한 번으로 팀원들과 바로 대화하고 화면을 공유하세요.'}
                </p>
              </div>

              <div className="relative z-10 flex flex-1 flex-col bg-white p-6">
                {hasVoiceSession ? (
                  <div className="mb-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-400 bg-white text-green-500 shadow-sm">
                      <i className="fas fa-headset text-xl"></i>
                    </div>
                    <p className="mb-1 text-xs font-bold text-gray-700">현재 음성 채널이 열려 있습니다.</p>
                    <p className="text-[10px] font-medium text-team">{voiceParticipantCount}명이 접속 중입니다.</p>
                  </div>
                ) : (
                  <div className="mb-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center">
                    <div className="mb-3 flex -space-x-2 opacity-30 grayscale">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-400"><i className="fas fa-user"></i></div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-400"><i className="fas fa-user"></i></div>
                    </div>
                    <p className="mb-1 text-xs font-bold text-gray-600">현재 접속 중인 멤버가 없습니다.</p>
                    <p className="text-[10px] font-medium text-gray-400">가장 먼저 채널에 접속하여 회의를 시작해보세요.</p>
                  </div>
                )}
                <a href={voiceHref} className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition ${hasVoiceSession ? 'bg-team hover:bg-indigo-700' : 'bg-gray-900 hover:bg-black'}`}>
                  <i className="fas fa-phone-alt"></i>
                  {hasVoiceSession ? '음성 채널 연결' : '채널 연결하기'}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gray-100"></div>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              <i className="fas fa-archive text-gray-400"></i>
              회의록 아카이브
            </h2>
            <div className="team-ws-meeting-filter-group flex gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              {[
                ['all', '전체'],
                ['mentor', '멘토 공식'],
                ['team', '팀 회의록'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNoteFilter(key as 'all' | 'mentor' | 'team')}
                  className={`team-ws-meeting-filter-button rounded-lg px-4 py-1.5 text-[11px] font-bold transition ${
                    noteFilter === key
                      ? key === 'mentor'
                        ? 'border border-purple-200 bg-purple-100 text-purple-700 shadow-sm'
                        : key === 'team'
                          ? 'border border-indigo-200 bg-indigo-100 text-team shadow-sm'
                          : 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {data.notes.length === 0 ? (
            <div className="team-ws-meeting-note-empty col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-sm">
                <i className="fas fa-pen-nib text-2xl"></i>
              </div>
              <h3 className="mb-1 text-base font-extrabold text-gray-900">아직 등록된 팀 회의록이 없습니다.</h3>
              <p className="mb-6 text-xs font-medium text-gray-500">킥오프 미팅, 스크럼 등 팀원들과 나눈 중요한 회의 내용을 기록하고 아카이빙 해보세요.</p>
              <button type="button" onClick={() => openNoteModal()} className="team-ws-meeting-first-button flex items-center gap-1.5 rounded-xl bg-team px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700">
                <i className="fas fa-plus"></i>
                첫 번째 회의록 작성하기
              </button>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="team-ws-meeting-note-empty col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300 shadow-sm">
                <i className="fas fa-archive text-2xl"></i>
              </div>
              <h3 className="mb-1 text-sm font-bold text-gray-700">해당 분류의 회의록이 없습니다.</h3>
              <p className="text-xs text-gray-400">새로운 회의록을 작성하거나 다른 필터를 확인해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note) => {
                const noteKind = meetingNoteKind(note)

                return (
                  <button key={note.noteId} type="button" onClick={() => setSelectedNote(note)} className="team-ws-meeting-note-card hover-card flex h-full cursor-pointer flex-col rounded-2xl bg-white p-5 text-left">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      {noteKind === 'mentor' ? (
                        <span className="team-ws-meeting-note-badge flex items-center gap-1 rounded border border-purple-200 bg-mentor-light px-1.5 py-0.5 text-[9px] font-extrabold text-mentor"><i className="fas fa-check-circle"></i> 멘토 공식</span>
                      ) : (
                        <span className="team-ws-meeting-note-badge flex items-center gap-1 rounded border border-indigo-200 bg-team-light px-1.5 py-0.5 text-[9px] font-extrabold text-team"><i className="fas fa-users"></i> 팀 회의록</span>
                      )}
                      <span className="team-ws-meeting-note-date shrink-0 text-[10px] font-bold text-gray-400">{formatMeetingNoteDate(note.createdAt)}</span>
                    </div>
                    <h4 className="team-ws-meeting-note-title mb-2 line-clamp-2 text-sm font-extrabold leading-tight text-gray-900">{note.title}</h4>
                    <p className="team-ws-meeting-note-summary line-clamp-2 flex-1 whitespace-pre-line text-xs leading-relaxed text-gray-500">{meetingNoteSummary(note)}</p>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </PageFrame>

      {modalOpen ? (
        <div id="teamNoteModal" className="team-workspace-modal-overlay fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <button type="button" aria-label="닫기" className="absolute inset-0" onClick={() => setModalOpen(false)}></button>
          <form onSubmit={saveNote} className="modal-content team-ws-meeting-note-modal relative z-10 flex w-full max-w-[672px]! flex-col rounded-[24px]! bg-white shadow-2xl [&_.bg-mentor-light]:bg-[#EDE9FE]! [&_.bg-team-light]:bg-[#EEF2FF]! [&_.text-mentor]:text-[#7C3AED]! [&_.text-team]:text-[#4F46E5]!">
            <div className="team-ws-meeting-note-modal-header flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-[24px]!">
              <div>
                <h3 className="team-ws-meeting-note-modal-title flex items-center gap-2 text-[18px]! leading-[28px]! font-extrabold text-gray-900">
                  <i className={`fas ${form.noteId ? 'fa-edit' : 'fa-pen-nib'} text-team`}></i>
                  {form.noteId ? '팀 회의록 수정' : '팀 회의록 작성'}
                </h3>
                <p className="team-ws-meeting-note-modal-desc mt-[4px]! text-[12px]! leading-[16px]! text-gray-500">회의에서 결정된 사항들을 기록해두면 훌륭한 프로젝트 산출물이 됩니다.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="team-ws-meeting-note-modal-close flex h-[32px]! w-[32px]! items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="team-ws-meeting-note-modal-body p-[24px]! [&>*+*]:mt-[16px]!">
              <div>
                <label className="team-ws-meeting-note-modal-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold text-gray-800">회의 주제 및 제목</label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="예: 프론트엔드/백엔드 API 연동 모의 회의" className="team-ws-meeting-note-modal-input h-[46px]! w-full rounded-[12px]! border border-gray-200 px-[16px]! py-0! text-[14px]! leading-[20px]! font-medium outline-none transition focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]" />
              </div>
              <div>
                <label className="team-ws-meeting-note-modal-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold text-gray-800">회의록 내용 (마크다운 지원)</label>
                <textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="결정된 사항, 문제점, 향후 계획 등을 자유롭게 작성해주세요." className="team-ws-meeting-note-modal-textarea custom-scrollbar h-[192px]! w-full resize-none rounded-[12px]! border border-gray-200 p-[16px]! text-[14px]! leading-[20px]! font-medium outline-none transition focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"></textarea>
              </div>
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{error}</p> : null}
            </div>

            <div className="team-ws-meeting-note-modal-footer flex shrink-0 gap-[12px]! border-t border-gray-100 bg-white p-[16px]!">
              <button type="button" onClick={() => setModalOpen(false)} className="team-ws-meeting-note-cancel min-h-[44px]! flex-1 rounded-[12px]! bg-gray-100 px-[16px]! py-0! text-[14px]! leading-[20px]! font-bold text-gray-600 transition hover:bg-gray-200">취소</button>
              <button type="submit" disabled={submitting} className="team-ws-meeting-note-save flex min-h-[44px]! flex-1 items-center justify-center gap-2 rounded-[12px]! bg-gray-900 px-[16px]! py-0! text-[14px]! leading-[20px]! font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60">
                <i className="fas fa-check"></i>
                {form.noteId ? '수정 완료' : '작성 완료'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {selectedNote ? (() => {
        const noteKind = meetingNoteKind(selectedNote)

        return (
          <div id="noteDetailModal" className="team-workspace-modal-overlay fixed inset-0 z-[1060] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <button type="button" aria-label="닫기" className="absolute inset-0" onClick={() => setSelectedNote(null)}></button>
            <div className="modal-content team-ws-meeting-note-detail-modal relative z-10 flex max-h-[85vh] w-full max-w-[672px]! flex-col overflow-hidden rounded-[24px]! bg-white shadow-2xl [&_.bg-mentor-light]:bg-[#EDE9FE]! [&_.bg-team-light]:bg-[#EEF2FF]! [&_.text-mentor]:text-[#7C3AED]! [&_.text-team]:text-[#4F46E5]!">
              <div className="team-ws-meeting-note-detail-header flex shrink-0 items-start justify-between border-b border-gray-100 bg-gray-50 p-[24px]!">
                <div className="min-w-0 pr-8">
                  {noteKind === 'mentor' ? (
                    <span className="team-ws-meeting-detail-badge mb-[8px]! inline-flex min-h-[21px] items-center gap-1 rounded-[4px]! border border-purple-200 bg-mentor-light px-[8px]! py-[2px]! text-[10px]! leading-[16px]! font-extrabold text-mentor"><i className="fas fa-check-circle"></i> 멘토 공식</span>
                  ) : (
                    <span className="team-ws-meeting-detail-badge mb-[8px]! inline-flex min-h-[21px] items-center gap-1 rounded-[4px]! border border-indigo-200 bg-team-light px-[8px]! py-[2px]! text-[10px]! leading-[16px]! font-extrabold text-team"><i className="fas fa-users"></i> 팀 회의록</span>
                  )}
                  <h3 className="team-ws-meeting-note-detail-title text-[20px]! leading-[28px]! font-extrabold text-gray-900">{selectedNote.title}</h3>
                  <p className="team-ws-meeting-note-detail-date mt-[8px]! text-[12px]! leading-[16px]! font-bold text-gray-400">{formatMeetingNoteDate(selectedNote.createdAt)}</p>
                </div>
                <button type="button" onClick={() => setSelectedNote(null)} className="team-ws-meeting-note-detail-close flex h-[32px]! w-[32px]! shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="team-ws-meeting-note-detail-body custom-scrollbar flex-1 overflow-y-auto p-[24px]!">
                <div className="team-ws-meeting-note-detail-content whitespace-pre-line text-[14px]! leading-[24px]! font-medium text-gray-700">
                  {selectedNote.content || '회의록 내용이 없습니다.'}
                </div>
              </div>

              <div className="team-ws-meeting-note-detail-footer flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 p-[16px]!">
                {noteKind === 'team' ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void deleteNote(selectedNote.noteId)} className="team-ws-meeting-note-detail-action flex min-h-[36px]! items-center gap-1.5 rounded-[12px]! border border-red-200 bg-white px-[16px]! py-0! text-[14px]! leading-[20px]! font-bold text-red-500 transition hover:bg-red-50">
                      <i className="fas fa-trash-alt"></i>
                      삭제
                    </button>
                    <button type="button" onClick={() => openNoteModal(selectedNote)} className="team-ws-meeting-note-detail-action flex min-h-[36px]! items-center gap-1.5 rounded-[12px]! border border-gray-200 bg-white px-[16px]! py-0! text-[14px]! leading-[20px]! font-bold text-gray-700 transition hover:bg-gray-50">
                      <i className="fas fa-edit"></i>
                      수정
                    </button>
                  </div>
                ) : <div></div>}
                <button type="button" onClick={() => setSelectedNote(null)} className="team-ws-meeting-note-detail-close-action min-h-[36px]! rounded-[12px]! bg-gray-900 px-[24px]! py-0! text-[14px]! leading-[20px]! font-bold text-white shadow-md transition hover:bg-black">닫기</button>
              </div>
            </div>
          </div>
        )
      })() : null}
    </>
  )
}
