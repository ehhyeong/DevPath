import { useState } from 'react';
import { createInstructorTeamQuestionAnswer,fetchInstructorTeamQuestionDetail,updateInstructorTeamQuestionAnswer } from './instructor-api';
import type { QuestionDetail,QuestionSummary,TeamData,WorkspaceMember } from './instructor-types';
import { avatarUrl,buildHref,INSTRUCTOR_TEAM_QNA_UI_LOCK_CLASSES,isAnswered,membersOnly,pushTeamNotification,qnaRoleMeta,questionMember,relativeTime } from './instructor-workspace-support';



export function QnaPage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<'all' | 'wait' | 'done'>('all')
  const [keyword, setKeyword] = useState('')
  const [target, setTarget] = useState<QuestionSummary | null>(null)
  const [detail, setDetail] = useState<QuestionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [answerContent, setAnswerContent] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const members = membersOnly(data)
  const unansweredCount = data.questions.filter((question) => !isAnswered(question)).length
  const normalizedKeyword = keyword.trim().toLowerCase()
  const filteredQuestions = data.questions.filter((question) => {
    if (filter === 'wait' && isAnswered(question)) return false
    if (filter === 'done' && !isAnswered(question)) return false
    if (!normalizedKeyword) return true
    const member = questionMember(question, members)
    return [question.title, question.content, question.authorName, member?.learnerName, member?.roleLabel, member?.position].some((value) => value?.toLowerCase().includes(normalizedKeyword))
  })

  async function openAnswerModal(question: QuestionSummary) {
    setTarget(question)
    setDetail(null)
    setAnswerContent('')
    setDetailLoading(true)
    try {
      const response = await fetchInstructorTeamQuestionDetail(question.id)
      setDetail(response)
      setAnswerContent(response.answers[0]?.content ?? '')
    } catch {
      setDetail({ ...question, answers: [] })
    } finally {
      setDetailLoading(false)
    }
  }

  async function answer(question: QuestionSummary, content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    const existingAnswer = detail?.answers[0]
    if (existingAnswer) {
      await updateInstructorTeamQuestionAnswer(question.id, existingAnswer.id, trimmed)
    } else {
      await createInstructorTeamQuestionAnswer(question.id, trimmed)
    }
    pushTeamNotification(workspaceId, {
      title: existingAnswer ? 'Q&A 답변 수정' : 'Q&A 답변 등록',
      description: `"${question.title}" 질문에 답변이 ${existingAnswer ? '수정' : '등록'}되었습니다.`,
      href: buildHref('qna', workspaceId),
      icon: 'fas fa-comments',
    })
    setTarget(null)
    setDetail(null)
    setAnswerContent('')
    setSuccessOpen(true)
    await reload()
  }

  function emptyMessage() {
    if (filter === 'wait') return { title: '대기 중인 질문이 없습니다.', description: '모든 질문에 답변을 완료하셨습니다.' }
    if (filter === 'done') return { title: '답변 완료된 질문이 없습니다.', description: '답변을 등록하시면 완료 목록에서 확인하실 수 있습니다.' }
    return { title: '등록된 질문 내역이 없습니다.', description: '팀원들이 프로젝트를 진행하면서 질문을 남기면 이곳에 표시됩니다.' }
  }

  return (
    <div className={`instructor-team-qna flex h-full flex-col ${INSTRUCTOR_TEAM_QNA_UI_LOCK_CLASSES}`}>
      <div className="mb-8 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-comments text-[#7C3AED]" />멘토 Q&A 관리</h1>
          <p className="mt-2 text-sm text-gray-500">팀원들의 질문에 답변하고, 병목을 해소할 수 있도록 기술적인 방향을 제시해주세요.</p>
        </div>
      </div>

      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto pb-2">
          <button type="button" onClick={() => setFilter('all')} className={`filter-tab rounded-xl border px-5 py-2.5 text-sm font-bold ${filter === 'all' ? 'active border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>전체 보기</button>
          <button type="button" onClick={() => setFilter('wait')} className={`filter-tab flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold ${filter === 'wait' ? 'active border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>미답변 (대기중){unansweredCount > 0 ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unansweredCount}</span> : null}</button>
          <button type="button" onClick={() => setFilter('done')} className={`filter-tab rounded-xl border px-5 py-2.5 text-sm font-bold ${filter === 'done' ? 'active border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>답변 완료</button>
        </div>

        <div className="relative hidden w-64 md:block">
          <i className="fas fa-search absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-400" />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} type="text" placeholder="질문, 내용, 수강생 이름 검색" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium shadow-sm outline-none transition focus:border-[#7C3AED]" />
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.length === 0 ? <QnaEmptyState {...emptyMessage()} /> : filteredQuestions.map((question) => <QnaQuestionCard key={question.id} question={question} member={questionMember(question, members)} onOpen={openAnswerModal} />)}
      </div>

      {target ? <AnswerModal question={target} detail={detail} member={questionMember(target, members)} loading={detailLoading} value={answerContent} onChange={setAnswerContent} onClose={() => { setTarget(null); setDetail(null); setAnswerContent('') }} onSubmit={answer} /> : null}
      {successOpen ? <QnaSuccessModal onClose={() => setSuccessOpen(false)} /> : null}
    </div>
  )
}

export function QnaQuestionCard({ question, member, onOpen }: { question: QuestionSummary; member: WorkspaceMember | null; onOpen: (question: QuestionSummary) => void }) {
  const wait = !isAnswered(question)
  const role = qnaRoleMeta(member)
  return (
    <article className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-5 transition hover:shadow-md md:flex-row md:items-start ${wait ? 'border-red-200 shadow-md' : 'border-gray-200 shadow-sm'}`}>
      <div className="w-full flex-1">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={member?.profileImage ?? avatarUrl(question.authorName)} className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50" alt="" />
            <div>
              <p className="flex items-center gap-1 text-xs font-bold text-gray-900">
                {question.authorName ?? member?.learnerName ?? '팀원'}
                <span className={`ml-1 rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${role.badge}`}>{role.label}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">{relativeTime(question.createdAt)}</p>
            </div>
          </div>
          {wait ? <span className="flex items-center gap-1 rounded border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-500"><i className="fas fa-exclamation-circle" />답변 대기중</span> : <span className="flex items-center gap-1 rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-600"><i className="fas fa-check" />답변 완료</span>}
        </div>
        <button type="button" onClick={() => onOpen(question)} className="mb-1.5 block text-left text-base font-extrabold text-gray-900 transition hover:text-[#7C3AED]">{question.title}</button>
        <button type="button" onClick={() => onOpen(question)} className="line-clamp-2 text-left text-sm leading-relaxed text-gray-500">{question.content}</button>
        {wait ? <p className="mt-3 border-t border-gray-100 pt-3 text-xs font-medium text-red-400"><i className="fas fa-info-circle mr-1" />팀원이 멘토님의 빠른 답변을 기다리고 있습니다.</p> : <div className="mt-3 flex items-start gap-2 border-t border-gray-100 pt-3 opacity-80"><i className="fas fa-reply mt-0.5 text-[10px] text-gray-400" /><p className="line-clamp-1 flex-1 text-xs font-medium text-gray-600">나의 답변: 답변이 등록되어 있습니다. 상세에서 확인하세요.</p></div>}
      </div>
      <div className="flex shrink-0 items-center md:pt-1">
        <button type="button" onClick={() => onOpen(question)} className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-bold transition ${wait ? 'bg-gray-900 text-white shadow-md hover:bg-black' : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50'}`}>{wait ? '답변하기' : '답변 보기/수정'}</button>
      </div>
    </article>
  )
}

export function QnaEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-16 text-center text-gray-500 shadow-sm">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-inner">
        <i className="fas fa-folder-open text-2xl" />
      </div>
      <p className="mb-1 text-base font-extrabold text-gray-900">{title}</p>
      <p className="text-sm font-medium text-gray-400">{description}</p>
    </div>
  )
}

export function AnswerModal({ question, detail, member, loading, value, onChange, onClose, onSubmit }: { question: QuestionSummary; detail: QuestionDetail | null; member: WorkspaceMember | null; loading: boolean; value: string; onChange: (value: string) => void; onClose: () => void; onSubmit: (question: QuestionSummary, content: string) => Promise<void> }) {
  const answered = Boolean(detail?.answers[0] ?? isAnswered(question))
  const role = qnaRoleMeta(member)
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className={`fas ${answered ? 'fa-edit' : 'fa-pen'} text-[#7C3AED]`} />{answered ? '답변 확인 및 수정' : '답변 작성하기'}</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          <div>
            <span className="mb-2 block text-[10px] font-bold text-gray-400">학생의 질문</span>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-4">
                <img src={member?.profileImage ?? avatarUrl(question.authorName)} className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50" alt="" />
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold text-gray-900">{question.authorName ?? member?.learnerName ?? '팀원'}<span className={`ml-1 rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${role.badge}`}>{role.label}</span></p>
                  <p className="mt-0.5 text-xs text-gray-500">{relativeTime(question.createdAt)}</p>
                </div>
              </div>
              <h4 className="mb-3 text-base font-extrabold text-gray-900">{question.title}</h4>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{detail?.content ?? question.content}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-5">
            <div className="mb-3 flex items-center gap-2">
              <img src={avatarUrl('mentor')} className="h-6 w-6 rounded-full border border-[#7C3AED] bg-white" alt="" />
              <span className="text-[11px] font-extrabold tracking-wider text-[#7C3AED]">나의 답변 작성</span>
              <span className="ml-auto text-[10px] text-gray-400">마크다운(Markdown) 및 코드 블록 지원</span>
            </div>
            <textarea value={loading ? '답변 정보를 불러오는 중입니다...' : value} onChange={(event) => onChange(event.target.value)} disabled={loading} className="min-h-[200px] w-full resize-y rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] disabled:bg-gray-50 disabled:text-gray-400" placeholder="팀원의 직군과 상황에 맞는 명확한 솔루션이나 가이드를 작성해주세요." />
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
          <button type="button" onClick={() => void onSubmit(question, value)} disabled={loading || !value.trim()} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"><i className="fas fa-paper-plane" />{answered ? '답변 수정하기' : '답변 등록하기'}</button>
        </div>
      </div>
    </div>
  )
}

export function QnaSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 shadow-sm">
          <i className="fas fa-check text-3xl text-[#7C3AED]" />
        </div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">답변 등록 완료!</h3>
        <p className="mb-6 text-sm leading-relaxed font-medium text-gray-500">팀원에게 성공적으로 답변이 등록되었으며<br />알림이 발송되었습니다.</p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}
