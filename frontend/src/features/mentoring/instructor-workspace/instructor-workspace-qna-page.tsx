import { useEffect,useState,type FormEvent } from 'react'
import { createInstructorWorkspaceQuestionAnswer,fetchInstructorWorkspaceQuestionDetail } from './instructor-workspace-api'
import { Modal } from './instructor-workspace-shared'
import { avatarUrl,buildHref,isQuestionAnswered,pushWorkspaceNotification,relativeTime } from './instructor-workspace-support'
import type { QuestionDetail,WorkspaceData } from './instructor-workspace-types'



export function QnaPage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<'waiting' | 'answered' | 'all'>('waiting')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailResult, setDetailResult] = useState<{ questionId: number; detail: QuestionDetail | null } | null>(null)
  const [answer, setAnswer] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const waitingCount = data.questions.filter((question) => !isQuestionAnswered(question)).length
  const questions = data.questions.filter((question) => {
    const matchesFilter = filter === 'answered' ? isQuestionAnswered(question) : filter === 'waiting' ? !isQuestionAnswered(question) : true
    const searchText = `${question.title} ${question.authorName ?? ''} ${question.content ?? ''}`.toLowerCase()
    return matchesFilter && searchText.includes(query.toLowerCase())
  })
  const selected = data.questions.find((question) => question.id === selectedId) ?? null
  const detail = detailResult?.questionId === selectedId ? detailResult.detail : null

  useEffect(() => {
    if (!selectedId) {
      return
    }
    let active = true
    fetchInstructorWorkspaceQuestionDetail(selectedId)
      .then((nextDetail) => {
        if (!active) return
        setDetailResult({ questionId: selectedId, detail: nextDetail })
        const answers = nextDetail.answers ?? []
        setAnswer(answers.length > 0 ? answers[answers.length - 1].content : '')
      })
      .catch(() => { if (active) setDetailResult({ questionId: selectedId, detail: null }) })
    return () => { active = false }
  }, [selectedId])

  async function submitAnswer(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || !answer.trim()) return
    await createInstructorWorkspaceQuestionAnswer(selectedId, answer.trim())
    pushWorkspaceNotification(workspaceId, {
      title: 'Q&A 답변 등록',
      description: `"${selected?.title ?? '질문'}"에 답변을 등록했습니다.`,
      href: buildHref('qna', workspaceId),
      icon: 'fas fa-comments',
    })
    setAnswer('')
    await reload()
    setSelectedId(null)
    setDetailResult(null)
    setSuccessOpen(true)
  }

  return (
    <>
      <div className="mb-8 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <i className="fas fa-comments text-blue-500" /> 멘토 Q&A 관리
          </h1>
          <p className="mt-2 text-sm text-gray-500">수강생들의 질문에 답변하고, 문제 해결을 도와주세요.</p>
        </div>
      </div>
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto pb-2">
          {[
            ['waiting', '미답변 (대기중)'],
            ['answered', '답변 완료'],
            ['all', '전체 보기'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value as 'waiting' | 'answered' | 'all')} className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm transition focus:outline-none ${filter === value ? 'border-gray-900 bg-gray-900 font-bold text-white' : 'border-gray-200 bg-white font-bold text-gray-600 hover:bg-gray-100'}`}>
              {label}
              {value === 'waiting' && waitingCount > 0 ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{waitingCount}</span> : null}
            </button>
          ))}
        </div>
        <div className="relative hidden w-64 md:block">
          <i className="fas fa-search absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium shadow-sm outline-none transition focus:border-[#7C3AED]" placeholder="질문, 내용, 수강생 이름 검색" />
        </div>
      </div>
      <div className="space-y-4">
        {questions.length === 0 ? (
          <QnaEmptyState hasAnyQuestion={data.questions.length > 0} hasSearch={query.trim().length > 0} filter={filter} />
        ) : (
          questions.map((question) => {
            const answered = isQuestionAnswered(question)
            return (
              <article key={question.id} className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md md:flex-row md:items-start ${answered ? 'border-gray-200' : 'border-red-200'}`}>
                <div className="w-full flex-1">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={avatarUrl(question.authorName)} className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50" alt="" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{question.authorName ?? '수강생'}</p>
                        <p className="text-[10px] text-gray-400">{relativeTime(question.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-extrabold ${answered ? 'border-blue-100 bg-blue-50 text-blue-600' : 'border-red-100 bg-red-50 text-red-500'}`}>
                      <i className={answered ? 'fas fa-check' : 'fas fa-exclamation-circle'} />
                      {answered ? '답변 완료' : '답변 대기중'}
                    </span>
                  </div>
                  <h4 role="button" tabIndex={0} onClick={() => { setSelectedId(question.id); setAnswer('') }} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedId(question.id) }} className="mb-1.5 cursor-pointer text-base font-extrabold text-gray-900 transition hover:text-[#00C471]">{question.title}</h4>
                  <p role="button" tabIndex={0} onClick={() => { setSelectedId(question.id); setAnswer('') }} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedId(question.id) }} className="line-clamp-2 cursor-pointer text-sm leading-relaxed text-gray-500">
                    {question.content ?? '질문 상세 내용을 확인하려면 답변 창을 열어주세요.'}
                  </p>
                  {answered ? (
                    <div className="mt-3 flex items-start gap-2 border-t border-gray-100 pt-3 opacity-80">
                      <i className="fas fa-reply mt-0.5 text-[10px] text-gray-400" />
                      <p className="line-clamp-1 flex-1 text-xs font-medium text-gray-600">나의 답변: 등록된 답변 {question.answerCount}개</p>
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-gray-100 pt-3 text-xs font-medium text-red-400">
                      <i className="fas fa-info-circle mr-1" /> 아직 멘토님의 답변이 등록되지 않았습니다. 수강생이 기다리고 있어요!
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center md:pt-1">
                  <button type="button" onClick={() => { setSelectedId(question.id); setAnswer('') }} className={`rounded-xl px-5 py-2.5 text-xs font-bold whitespace-nowrap transition ${answered ? 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50' : 'bg-gray-900 text-white shadow-md hover:bg-black'}`}>
                    {answered ? '답변 보기/수정' : '답변하기'}
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
      {selected ? (
        <Modal title={isQuestionAnswered(selected) ? '답변 확인 및 수정' : '답변 작성하기'} icon={isQuestionAnswered(selected) ? 'fas fa-edit' : 'fas fa-pen'} maxWidth="max-w-3xl" onClose={() => setSelectedId(null)}>
          <form onSubmit={submitAnswer}>
            <div className="space-y-6 p-6">
              <div>
                <span className="mb-2 block text-[10px] font-bold text-gray-400">학생의 질문</span>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-4">
                    <img src={avatarUrl(selected.authorName)} className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50" alt="" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selected.authorName ?? '수강생'} <span className="ml-2 text-[10px] font-medium text-gray-400">{relativeTime(selected.createdAt)}</span></p>
                      <p className="text-xs text-gray-500">{data.dashboard?.name ?? '멘토링 워크스페이스'}</p>
                    </div>
                  </div>
                  <h4 className="mb-3 text-base font-extrabold text-gray-900">{selected.title}</h4>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{detail?.content ?? selected.content ?? '질문 내용을 불러오는 중입니다.'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <img src={avatarUrl(data.dashboard?.ownerName)} className="h-6 w-6 rounded-full border border-[#7C3AED] bg-white" alt="" />
                  <span className="text-[11px] font-extrabold tracking-wider text-[#7C3AED]">나의 답변 작성</span>
                  <span className="ml-auto text-[10px] text-gray-400">마크다운(Markdown) 및 코드 블록 지원</span>
                </div>
                <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-[200px] w-full resize-y rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="수강생의 질문에 대한 답변을 명확하고 친절하게 작성해주세요." />
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setSelectedId(null)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
              <button type="submit" className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                <i className="fas fa-paper-plane" /> 답변 등록하기
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {successOpen ? <QnaAnswerSuccessModal onClose={() => setSuccessOpen(false)} /> : null}
    </>
  )
}

export function QnaEmptyState({ hasAnyQuestion, hasSearch, filter }: { hasAnyQuestion: boolean; hasSearch: boolean; filter: 'waiting' | 'answered' | 'all' }) {
  if (!hasAnyQuestion) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 shadow-sm">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50">
          <i className="fas fa-comments text-2xl text-gray-300" />
        </div>
        <p className="mb-1 text-sm font-bold text-gray-600">아직 등록된 질문이 없습니다.</p>
        <p className="text-xs text-gray-400">수강생이 질문을 남기면 이곳에 표시됩니다.</p>
      </div>
    )
  }

  if (hasSearch) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
        <i className="fas fa-search mb-4 text-4xl text-gray-300 opacity-50" />
        <p className="text-sm font-bold">검색 결과가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
      <i className="fas fa-check-circle mb-4 text-4xl text-gray-300" />
      <p className="text-sm font-bold">해당하는 질문 내역이 없습니다.</p>
      {filter === 'waiting' ? <p className="mt-2 text-xs">모든 질문에 답변을 완료하셨습니다!</p> : null}
    </div>
  )
}

export function QnaAnswerSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-blue-50 shadow-sm">
          <i className="fas fa-check text-3xl text-blue-500" />
        </div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">답변 등록 완료!</h3>
        <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">수강생에게 성공적으로 답변이 등록되었으며<br />알림이 발송되었습니다.</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}
