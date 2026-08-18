import { useState } from 'react'
import { showAuthToast } from '../../../lib/auth-toast'
import type { MeetingNote,VoiceChannel } from './common-types'
import { buildHref,formatDate,formatDateTime } from './common-workspace-support'



export function MeetingPage({
  meetingNotes,
  voiceChannels,
  workspaceId,
}: {
  meetingNotes: MeetingNote[]
  voiceChannels: VoiceChannel[]
  workspaceId: number | null
  onCreateMeetingNote: (payload: { title: string; content: string }) => Promise<void>
  onCreateVoiceChannel: (payload: { name: string; description: string }) => Promise<void>
  submitting: boolean
}) {
  const [selectedSummary, setSelectedSummary] = useState<MeetingNote | null>(null)
  const liveChannel = voiceChannels[0] ?? null
  const liveParams = new URLSearchParams()

  if (liveChannel) {
    liveParams.set('channelId', String(liveChannel.channelId))
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
      <div className="mb-8 shrink-0">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
          <i className="fas fa-video text-red-500"></i>
          화상 멘토링 (Live)
        </h1>
        <p className="mt-2 text-sm text-gray-500">정규 라이브 밋업에 참여하거나, 지난 밋업의 회의록 및 요약본을 확인할 수 있습니다.</p>
      </div>

      {liveChannel ? (
        <div className="relative mb-10 shrink-0 overflow-hidden rounded-3xl border-2 border-mentor bg-white p-8 shadow-md">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-mentor opacity-5 blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="w-full flex-1 text-center md:text-left">
              <div className="mb-3 flex items-center justify-center gap-2 md:justify-start">
                <span className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-extrabold text-red-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                  LIVE SOON
                </span>
                <span className="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">
                  <i className="far fa-clock"></i>
                  {' '}
                  {liveChannel.currentSessionStartedAt ? formatDateTime(liveChannel.currentSessionStartedAt) : '내일 20:00 예정'}
                </span>
              </div>
              <h2 className="mb-2 text-2xl font-extrabold text-gray-900 md:text-3xl">{liveChannel.name}</h2>
              <p className="mx-auto mb-6 max-w-2xl text-sm font-medium leading-relaxed text-gray-600 md:mx-0">
                {liveChannel.description ?? '멘토와 함께 이번 주차 핵심 과제 리뷰와 Q&A 세션을 진행합니다. 시작 전 안내에 맞춰 입장해주세요!'}
              </p>
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-backend" alt="" className="h-8 w-8 rounded-full border border-gray-200" />
                <div className="text-left">
                  <p className="text-[10px] font-bold leading-none text-mentor">주관 멘토</p>
                  <p className="text-xs font-bold text-gray-800">{liveChannel.creatorName ?? '코드마스터 J'}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center md:w-64">
              <i className="fas fa-video mb-3 text-3xl text-mentor"></i>
              <p className="mb-1 text-sm font-bold text-gray-900">입장 코드가 필요 없습니다.</p>
              <p className="mb-4 text-[10px] text-gray-500">시작 10분 전부터 입장 가능합니다.</p>
              <a href={buildHref('live-meeting', workspaceId, liveParams)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-mentor py-3 text-sm font-bold text-white shadow-md transition hover:bg-purple-700">
                <i className="fas fa-sign-in-alt"></i>
                밋업 입장하기
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative mb-10 shrink-0 overflow-hidden rounded-3xl border-2 border-mentor bg-white p-8 shadow-md">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-200 opacity-20 blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300">
              <i className="fas fa-video-slash text-2xl"></i>
            </div>
            <h2 className="mb-2 text-xl font-extrabold text-gray-900 md:text-2xl">예정된 라이브 밋업이 없습니다</h2>
            <p className="mx-auto mb-6 max-w-lg text-sm font-medium leading-relaxed text-gray-500">
              멘토님이 다음 화상 멘토링 일정을 조율 중입니다.
              <br />
              일정이 확정되면 이곳에 안내될 예정입니다.
            </p>
            <span className="inline-block rounded border border-gray-200 bg-gray-100 px-3 py-1.5 text-[10px] font-bold text-gray-600">
              <i className="fas fa-clock mr-1"></i>
              일정 대기 중
            </span>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <i className="fas fa-file-alt text-gray-400"></i>
          지난 라이브 요약 및 회의록
        </h3>

        {meetingNotes.length === 0 ? (
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto pr-2 pb-4 md:grid-cols-2">
            <div className="col-span-1 flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-12 md:col-span-2">
              <div className="mb-3 text-3xl text-gray-300">
                <i className="fas fa-folder-open"></i>
              </div>
              <h4 className="mb-1 text-sm font-extrabold text-gray-900">등록된 회의록이 없습니다</h4>
              <p className="text-xs text-gray-400">라이브 멘토링이 진행된 후, 회의록과 요약본이 이곳에 누적됩니다.</p>
            </div>
          </div>
        ) : (
          <div className="custom-scrollbar grid flex-1 grid-cols-1 gap-4 overflow-y-auto pr-2 pb-4 md:grid-cols-2">
            {meetingNotes.map((note, index) => (
              <article
                key={note.noteId}
                onClick={() => setSelectedSummary(note)}
                className="group flex cursor-pointer items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${index === 0 ? 'border-purple-100 bg-purple-50 text-mentor' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>
                      {index === 0 ? `WEEK ${meetingNotes.length}` : `WEEK ${Math.max(1, meetingNotes.length - index)}`}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">{note.createdAt ? formatDate(note.createdAt) : '진행 기록'}</span>
                  </div>
                  <h4 className="mb-1 truncate text-sm font-bold text-gray-900 transition group-hover:text-brand">{note.title}</h4>
                  <p className="w-64 truncate text-xs text-gray-500 md:w-80">{note.content ?? '라이브 멘토링 회의록입니다.'}</p>
                </div>

                <div className="ml-4 flex shrink-0 flex-col gap-2">
                  <button type="button" onClick={(event) => { event.stopPropagation(); showAuthToast({ message: 'VOD 페이지로 이동합니다.' }) }} className="flex h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 shadow-sm transition hover:bg-red-500 hover:text-white" title="다시보기">
                    <i className="fas fa-play"></i>
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedSummary(note) }} className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-sm transition group-hover:bg-green-50 group-hover:text-brand" title="회의록 보기">
                    <i className="fas fa-file-alt"></i>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedSummary ? (
        <div className="mentoring-workspace-modal-overlay fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="modal-content relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
              <div className="pr-8">
                <span className="mb-2 inline-block rounded border border-purple-200 bg-mentor-light px-2 py-1 text-[10px] font-extrabold text-mentor">Meeting Minutes</span>
                <h3 className="text-xl font-extrabold leading-tight text-gray-900">{selectedSummary.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedSummary(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-white p-8">
              <div>
                <h4 className="mb-2 text-sm font-bold text-brand">
                  <i className="fas fa-check-circle mr-1"></i>
                  이번 세션 핵심 요약
                </h4>
                <div className="whitespace-pre-line rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm leading-relaxed text-gray-700">
                  {selectedSummary.content ?? '회의록 내용이 비어 있습니다.'}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold text-blue-500">
                  <i className="fas fa-question-circle mr-1"></i>
                  라이브 Q&A 아카이브
                </h4>
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="mb-1 text-xs font-bold text-gray-800">Q. 라이브에서 다룬 질문은 어디에서 확인하나요?</p>
                  <p className="text-sm leading-relaxed text-gray-600">A. 멘토링이 종료된 뒤 정리된 회의록과 요약본이 이 영역에 누적됩니다.</p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setSelectedSummary(null)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
