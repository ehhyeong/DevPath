import { useState,type FormEvent } from 'react'
import type { QuestionDetail,QuestionSummary } from './common-types'
import { SourceFormModal } from './common-workspace-shared'
import { formatRelativeTime } from './common-workspace-support'



export function QnaPage({
  questions,
  questionDetails,
  expandedQuestionId,
  onToggleQuestion,
  onCreateQuestion,
  submitting,
}: {
  questions: QuestionSummary[]
  questionDetails: Map<number, QuestionDetail>
  expandedQuestionId: number | null
  onToggleQuestion: (questionId: number) => void
  onCreateQuestion: (payload: { title: string; content: string; difficulty: string; templateType: string }) => Promise<void>
  submitting: boolean
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'answered' | 'pending'>('all')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [privateQuestion, setPrivateQuestion] = useState(false)
  const answeredCount = questions.filter((question) => question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED').length
  const pendingCount = questions.length - answeredCount
  const filteredQuestions = questions.filter((question) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'answered' && (question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED')) ||
      (filter === 'pending' && question.qnaStatus !== 'ANSWERED' && question.qnaStatus !== 'CLOSED')
    const matchesSearch = search.trim()
      ? `${question.title} ${question.authorName ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
      : true

    return matchesFilter && matchesSearch
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateQuestion({ title, content, difficulty, templateType: 'PROJECT' })
    setTitle('')
    setContent('')
    setDifficulty('MEDIUM')
    setPrivateQuestion(false)
    setFormOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <i className="fas fa-comments text-blue-500"></i>
            멘토 Q&A
          </h1>
          <p className="mt-2 text-sm text-gray-500">학습 중 발생한 오류나 궁금한 점을 멘토님에게 자유롭게 질문하세요.</p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-600"
        >
          <i className="fas fa-pen"></i>
          질문 작성하기
        </button>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="custom-scrollbar flex gap-6 overflow-x-auto px-2">
          {[
            ['all', questions.length === 0 ? `전체 질문 (${questions.length})` : '전체 질문'],
            ['answered', questions.length === 0 ? `답변 완료 (${answeredCount})` : '답변 완료'],
            ['pending', questions.length === 0 ? `답변 대기중 (${pendingCount})` : '답변 대기중'],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setFilter(key as 'all' | 'answered' | 'pending')}
              className={
                filter === key
                  ? 'border-b-2 border-[#7C3AED] pb-1 text-sm font-extrabold text-[#7C3AED]'
                  : 'border-b-2 border-transparent pb-1 text-sm font-medium text-gray-500 transition hover:text-gray-800'
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full shrink-0 md:w-64">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"></i>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
            placeholder="질문 내용 검색..."
          />
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300 shadow-inner">
            <i className="fas fa-comment-slash text-4xl"></i>
          </div>
          <h3 className="mb-2 text-lg font-bold text-gray-900">등록된 질문이 없습니다</h3>
          <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-400">
            멘토링 진행 중 궁금한 로직, 아키텍처 구성, 디버깅 이슈 등이 있다면 가장 먼저 질문을 남겨보세요!
          </p>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-600"
          >
            <i className="fas fa-pen text-xs"></i>
            첫 질문 작성하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-xs font-bold text-gray-400">
              조건에 맞는 질문이 없습니다.
            </div>
          ) : null}
          {filteredQuestions.map((question) => {
            const expanded = expandedQuestionId === question.id
            const detail = questionDetails.get(question.id)
            const answered = question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED'

            return (
              <article key={question.id} className="qna-card overflow-hidden rounded-[16px]! border border-gray-200 bg-white shadow-sm transition hover:border-gray-300">
                <button
                  type="button"
                  onClick={() => onToggleQuestion(question.id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left transition hover:bg-gray-50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span
                      className={
                        answered
                          ? 'shrink-0 rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-extrabold text-blue-600'
                          : 'shrink-0 rounded bg-gray-100 px-2 py-1 text-[10px] font-extrabold text-gray-500'
                      }
                    >
                      {answered ? '답변완료' : '답변대기'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-bold text-gray-900">{question.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">{question.authorName ?? '작성자 정보 없음'}</span>
                        <span className="text-[10px] text-gray-400">· {formatRelativeTime(question.createdAt)}</span>
                        <span className="text-[10px] text-gray-400">· 답변 {question.answerCount}</span>
                      </div>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-down text-gray-400 transition ${expanded ? 'rotate-180' : ''}`}></i>
                </button>

                {expanded ? (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-6">
                    {detail ? (
                      <div className="space-y-6">
                        <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-gray-700">{detail.content}</p>
                        <div className="space-y-3">
                          {detail.answers.length > 0 ? (
                            detail.answers.map((answer) => (
                              <div key={answer.id} className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-[#7C3AED]">{answer.authorName ?? '멘토'}</span>
                                  <span className="text-[10px] font-bold text-gray-400">{formatRelativeTime(answer.createdAt)}</span>
                                </div>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{answer.content}</p>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-xl border border-gray-200 bg-white p-4 text-center text-xs font-bold text-gray-400 shadow-sm">
                              멘토 답변을 기다리고 있습니다.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-xs font-bold text-gray-400">질문 상세를 불러오는 중입니다.</p>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      <SourceFormModal
        open={formOpen}
        title="질문 작성하기"
        icon="fas fa-pen"
        widthClass="max-w-2xl"
        bodyClass="custom-scrollbar max-h-[70vh] overflow-y-auto p-6 space-y-5"
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        footer={
          <>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">
              취소
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-brand px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
              등록하기
            </button>
          </>
        }
      >
        <div className="flex items-center justify-end">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 transition hover:bg-gray-100">
            <input
              type="checkbox"
              checked={privateQuestion}
              onChange={(event) => setPrivateQuestion(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 bg-white text-brand accent-brand focus:ring-brand"
            />
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <i className="fas fa-lock text-gray-400"></i>
              멘토에게만 비공개로 문의하기
            </span>
          </label>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            질문 제목 <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-[#9CA3AF]! placeholder:opacity-100! focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="무엇이 궁금하신가요? 핵심을 요약해주세요."
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            상세 내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
            className="h-40 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="발생한 문제 상황, 시도해본 방법, 첨부할 코드나 로그를 상세히 적어주시면 멘토님이 더 빠르고 정확하게 답변을 드릴 수 있습니다."
          ></textarea>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">파일 및 이미지 첨부 (선택)</label>
          <div className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition hover:bg-gray-50">
            <i className="fas fa-cloud-upload-alt mb-1 text-3xl text-gray-400"></i>
            <p className="text-sm font-bold text-gray-600">클릭하거나 파일을 이곳으로 드래그하세요.</p>
            <p className="text-xs text-gray-400">지원 확장자: .txt, .log, .png, .jpg (최대 10MB)</p>
          </div>
        </div>
        <select
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        >
          <option value="MEDIUM">보통</option>
        </select>
      </SourceFormModal>
    </div>
  )
}
