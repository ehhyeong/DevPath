import { useMemo,useState,type FormEvent } from 'react'
import UserAvatar from '../../../components/UserAvatar'
import { readStoredAuthSession } from '../../../lib/auth-session'
import { adoptTeamWorkspaceAnswer,createTeamWorkspaceQuestion,fetchTeamWorkspaceQuestionDetail } from './api'
import { QUESTION_ASK_TAGS,QUESTION_STATUS_FILTERS,QUESTION_TAGS } from './constants'
import { Modal,PageFrame } from './team-workspace-suite-shared'
import { buildQuestionContent,fileIcon,parseQuestionContent,questionSourceStatus,questionSourceTags,questionUiStatus,taskStatusTitle,templateTypeFromQuestionTags,workspaceFileName } from './team-workspace-suite-support'
import type { QuestionContextPicker,QuestionContextSelection,QuestionDetail,QuestionForm,QuestionSummary,SuiteData,WorkspaceFile,WorkspaceTask } from './types'
import { formatDate,formatRelativeTime,roleForTask,taskTicketCode } from './utils'


export function QnaPage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(QUESTION_STATUS_FILTERS[0])
  const [tag, setTag] = useState(QUESTION_TAGS[0])
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<QuestionDetail | null>(null)
  const [form, setForm] = useState<QuestionForm>({ title: '', content: '', templateType: 'PROJECT', difficulty: 'MEDIUM' })
  const [selectedQuestionTags, setSelectedQuestionTags] = useState<string[]>(['Frontend', '에러/버그'])
  const [selectedQuestionContexts, setSelectedQuestionContexts] = useState<QuestionContextSelection[]>([])
  const [contextPicker, setContextPicker] = useState<QuestionContextPicker | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const session = readStoredAuthSession()
  const currentUserId = session?.userId ?? null

  const questions = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return data.questions.filter((question) => {
      const uiStatus = questionUiStatus(question)

      if (status === '답변 대기' && uiStatus !== 'wait') return false
      if (status === '답변 완료' && uiStatus !== 'done') return false
      if (status === '해결됨' && uiStatus !== 'resolved') return false
      if (tag !== '전체' && !questionSourceTags(question).includes(tag)) return false
      if (!normalized) return true

      return `${question.title} ${question.authorName ?? ''}`.toLowerCase().includes(normalized)
    })
  }, [data.questions, search, status, tag])

  function toggleAskTag(nextTag: string) {
    setSelectedQuestionTags((current) => {
      const nextTags = current.includes(nextTag) ? current.filter((item) => item !== nextTag) : [...current, nextTag]

      return nextTags.length > 0 ? nextTags : [nextTag]
    })
  }

  function closeQuestionCreateModal() {
    setModalOpen(false)
    setContextPicker(null)
    setSelectedQuestionContexts([])
    setError(null)
  }

  function selectQuestionContext(nextContext: QuestionContextSelection) {
    setSelectedQuestionContexts((current) => {
      if (current.some((context) => context.type === nextContext.type && context.id === nextContext.id)) {
        return current
      }

      return [...current, nextContext]
    })
    setContextPicker(null)
  }

  function removeQuestionContext(nextContext: QuestionContextSelection) {
    setSelectedQuestionContexts((current) =>
      current.filter((context) => context.type !== nextContext.type || context.id !== nextContext.id),
    )
  }

  function buildTaskContext(task: WorkspaceTask): QuestionContextSelection {
    const role = roleForTask(task)
    const assignee = data.dashboard?.members.find((member) => member.learnerId === task.assigneeId)
    const assigneeName = assignee?.learnerName || (task.assigneeId ? `팀원 ${task.assigneeId}` : '담당자 미정')

    return {
      type: 'task',
      id: String(task.taskId),
      label: `칸반 ${taskTicketCode(task, role)}`,
      description: `${task.title} · ${taskStatusTitle(task.status)} · ${assigneeName}`,
      iconClassName: 'fa-columns',
      toneClassName: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    }
  }

  function buildFileContext(file: WorkspaceFile): QuestionContextSelection {
    const fileMeta = file.itemType === 'LINK' ? '링크' : file.contentType || '파일'

    return {
      type: 'file',
      id: String(file.fileId),
      label: '자료실 파일',
      description: `${workspaceFileName(file)} · ${fileMeta}`,
      iconClassName: file.itemType === 'LINK' ? 'fa-link' : 'fa-file-alt',
      toneClassName: 'border-blue-100 bg-blue-50 text-blue-700',
    }
  }

  function buildApiContext(): QuestionContextSelection {
    const preview = data.apiSpec?.content?.trim().split('\n').find(Boolean) ?? 'API 명세 문서'

    return {
      type: 'api',
      id: String(data.apiSpec?.docId ?? 'api-spec'),
      label: 'API 명세',
      description: preview.length > 80 ? `${preview.slice(0, 80)}...` : preview,
      iconClassName: 'fa-network-wired',
      toneClassName: 'border-purple-100 bg-purple-50 text-purple-700',
    }
  }

  async function openDetail(question: QuestionSummary) {
    const nextDetail = await fetchTeamWorkspaceQuestionDetail(question.id)
    setDetailError(null)
    setDetail(nextDetail)
  }

  async function createQuestion(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await createTeamWorkspaceQuestion(workspaceId, {
        templateType: templateTypeFromQuestionTags(selectedQuestionTags),
        difficulty: form.difficulty,
        title: form.title.trim(),
        content: buildQuestionContent(form.content, selectedQuestionContexts),
      })
      setModalOpen(false)
      setForm({ title: '', content: '', templateType: 'PROJECT', difficulty: 'MEDIUM' })
      setSelectedQuestionTags(['Frontend', '에러/버그'])
      setSelectedQuestionContexts([])
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '질문 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function resolveQuestion(answerId?: number) {
    if (!detail || !answerId) return

    try {
      setDetailError(null)
      const nextDetail = await adoptTeamWorkspaceAnswer(detail.id, answerId)
      setDetail(nextDetail)
      await reload()
    } catch (nextError) {
      setDetailError(nextError instanceof Error ? nextError.message : '해결 처리에 실패했습니다.')
    }
  }

  return (
    <>
      <PageFrame
        activePage="qna"
        title="팀 멘토 Q&A"
        subtitle="태그와 검색을 활용해 팀의 질문 내역을 확인하고, 멘토에게 질문하세요."
        action={<button type="button" onClick={() => setModalOpen(true)} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-pen mr-2"></i>새 질문 작성</button>}
        data={data}
        workspaceId={workspaceId}
        contentClassName="team-ws-qna-content mx-auto flex h-full max-w-5xl flex-col"
      >
        <div className="team-ws-qna-page-heading mb-6 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="team-ws-qna-title flex items-center gap-2 text-2xl font-extrabold text-gray-900">
              <i className="fas fa-comments text-team"></i>
              멘토 Q&A 지식베이스
            </h1>
            <p className="team-ws-qna-subtitle mt-2 text-sm text-gray-500">태그와 검색을 활용해 팀의 질문 내역을 확인하고, 멘토에게 질문하세요.</p>
          </div>
          <button type="button" onClick={() => setModalOpen(true)} className="team-ws-qna-new-button flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black">
            <i className="fas fa-pen"></i>
            새 질문 작성
          </button>
        </div>

        <div className="team-ws-qna-filter-panel mb-6 flex shrink-0 flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="team-ws-qna-filter-top flex flex-col items-center justify-between gap-4 border-b border-gray-100 pb-4 md:flex-row">
            <div className="team-ws-qna-search-wrap relative w-full md:w-96">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="질문 내용이나 제목 검색..." className="team-ws-qna-search-input w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm font-medium outline-none transition placeholder:text-gray-400 focus:border-team focus:ring-1 focus:ring-team" />
            </div>
            <div className="team-ws-qna-status-tabs custom-scrollbar flex w-full gap-2 overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-1 md:w-auto">
              {QUESTION_STATUS_FILTERS.map((item) => (
                <button key={item} type="button" onClick={() => setStatus(item)} className={`team-ws-qna-status-tab flex items-center gap-1 whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-bold transition ${status === item ? 'active border border-gray-200 bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {item === '해결됨' ? <i className="fas fa-check-circle text-green-500"></i> : null}
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="team-ws-qna-tag-row flex flex-wrap items-center gap-2">
            <span className="team-ws-qna-tag-label mr-2 text-xs font-bold text-gray-400"><i className="fas fa-tags"></i> 카테고리 태그:</span>
            {QUESTION_TAGS.map((item) => (
              <button key={item} type="button" onClick={() => setTag(item)} className={`team-ws-qna-tag-badge rounded-full border px-3 py-1 text-[10px] font-bold transition ${tag === item ? (item === '전체' ? 'active border-gray-200 bg-gray-100 text-gray-600' : 'active border-team bg-team text-white') : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {data.questions.length === 0 ? (
          <div className="team-ws-qna-empty-state flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center shadow-sm">
            <div className="team-ws-qna-empty-icon mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-300 shadow-sm">
              <i className="fas fa-comments text-2xl"></i>
            </div>
            <h3 className="team-ws-qna-empty-title mb-1 text-lg font-extrabold text-gray-900">아직 등록된 질문이 없습니다.</h3>
            <p className="team-ws-qna-empty-desc mb-6 text-sm font-medium text-gray-500">프로젝트를 진행하며 막히는 부분을 멘토님에게 가장 먼저 질문해보세요!</p>
            <button type="button" onClick={() => setModalOpen(true)} className="team-ws-qna-first-button flex items-center gap-2 rounded-xl bg-team px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700">
              <i className="fas fa-pen"></i>
              첫 번째 질문 작성하기
            </button>
          </div>
        ) : (
          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2 pb-10">
            {questions.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white py-16 text-center text-gray-500 shadow-sm">
                <i className="fas fa-search mb-3 text-3xl text-gray-300"></i>
                <p className="text-sm font-bold text-gray-700">조건에 맞는 검색 결과가 없습니다.</p>
                <p className="mt-1 text-xs text-gray-400">검색어나 태그 필터를 변경해보세요.</p>
              </div>
            ) : questions.map((question) => {
              const statusMeta = questionSourceStatus(question)
              const tags = questionSourceTags(question)

              return (
                <button key={question.id} type="button" onClick={() => openDetail(question)} className={`qna-card ${statusMeta.cardClassName} relative flex w-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-team hover:shadow-md`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={question.authorName || '팀원'} imageUrl={null} className="h-8 w-8 border border-gray-200 bg-gray-50" iconClassName="text-xs" />
                      <div className="flex flex-col">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{question.authorName || '팀원'}</span>
                          <span className="text-[9px] font-medium text-gray-400">{formatRelativeTime(question.createdAt)}</span>
                        </div>
                        <div className="flex gap-1">
                          {tags.map((item) => (
                            <span key={item} className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-600">#{item}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-extrabold ${statusMeta.className}`}>
                      <i className={`fas ${statusMeta.icon}`}></i>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="pl-11 pr-4">
                    <h4 className="mb-1 truncate text-sm font-extrabold text-gray-800">{question.title}</h4>
                    <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">{question.templateType || '질문 상세를 열어 내용을 확인하세요.'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </PageFrame>

      {modalOpen ? (
        <Modal
          title="새 질문 작성"
          iconClassName="fa-pen"
          description="에러 코드나 관련 파일을 첨부하면 멘토님이 더 빠르게 답변할 수 있습니다."
          panelClassName="team-ws-qna-ask-modal flex max-h-[90vh]! w-full! max-w-[672px]! flex-col overflow-hidden! rounded-[24px]! bg-white! [--team-ws-primary:#4F46E5] [--team-ws-primary-dark:#4338CA] [&_.text-team]:text-[#4F46E5]! [&>div:first-child]:shrink-0! [&>div:first-child]:items-center! [&>div:first-child]:justify-between! [&>div:first-child]:border-b-[1px]! [&>div:first-child]:border-b-[#F3F4F6]! [&>div:first-child]:bg-[#F9FAFB]! [&>div:first-child]:p-[24px]! [&>div:first-child_h3]:m-0! [&>div:first-child_h3]:gap-[8px]! [&>div:first-child_h3]:text-[18px]! [&>div:first-child_h3]:leading-[28px]! [&>div:first-child_h3]:font-extrabold! [&>div:first-child_h3]:text-[#111827]! [&>div:first-child_h3_i]:text-[#4F46E5]! [&>div:first-child_p]:mt-[4px]! [&>div:first-child_p]:text-[12px]! [&>div:first-child_p]:leading-[16px]! [&>div:first-child_p]:font-normal! [&>div:first-child_p]:text-[#6B7280]! [&>div:first-child_button]:h-[32px]! [&>div:first-child_button]:min-h-[32px]! [&>div:first-child_button]:w-[32px]! [&>div:first-child_button]:min-w-[32px]! [&>div:first-child_button]:rounded-[9999px]! [&>div:first-child_button]:border-[1px]! [&>div:first-child_button]:border-[#E5E7EB]! [&>div:first-child_button]:bg-white! [&>div:first-child_button]:text-[#9CA3AF]! [&>div:first-child_button]:[box-shadow:0_1px_2px_rgba(15,23,42,0.05)]!"
          onClose={closeQuestionCreateModal}
        >
          <form onSubmit={createQuestion} className="team-ws-qna-ask-form flex min-h-0! flex-1 flex-col">
            <div className="team-ws-qna-ask-body custom-scrollbar min-h-0! flex-1 overflow-y-auto p-[24px]! [&>*+*]:mt-[24px]!">
              <div>
                <label className="team-ws-qna-ask-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">질문 카테고리 태그</label>
                <div className="team-ws-qna-ask-tag-list flex flex-wrap! gap-[8px]!">
                  {QUESTION_ASK_TAGS.map((item) => (
                    <label key={item} className="team-ws-qna-ask-tag inline-flex! min-h-[30px]! cursor-pointer items-center justify-center! gap-[6px]! rounded-[8px]! border-[1px]! border-[#E5E7EB]! px-[12px]! py-[6px]! text-[12px]! leading-[16px]! font-bold! text-[#111827]! transition hover:bg-gray-50">
                      <input type="checkbox" checked={selectedQuestionTags.includes(item)} onChange={() => toggleAskTag(item)} className="m-[0_6px_0_0]! h-[13px]! min-h-auto! w-[13px]! min-w-auto! flex-[0_0_auto]! accent-[#4F46E5]!" />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="team-ws-qna-ask-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">관련 컨텍스트 연동 (옵션)</label>
                <div className="team-ws-qna-context-list flex gap-[12px]!">
                  <button type="button" onClick={() => setContextPicker('task')} className="team-ws-qna-context-button flex min-h-[42px]! flex-1 items-center justify-center gap-2 rounded-[12px]! border border-dashed border-gray-300 bg-gray-50 px-[8px]! py-[12px]! text-[12px]! leading-[16px]! font-bold! text-gray-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
                    <i className="fas fa-columns"></i>
                    칸반 티켓 선택
                  </button>
                  <button type="button" onClick={() => setContextPicker('file')} className="team-ws-qna-context-button flex min-h-[42px]! flex-1 items-center justify-center gap-2 rounded-[12px]! border border-dashed border-gray-300 bg-gray-50 px-[8px]! py-[12px]! text-[12px]! leading-[16px]! font-bold! text-gray-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">
                    <i className="fas fa-file-alt"></i>
                    자료실 파일 첨부
                  </button>
                  <button type="button" onClick={() => setContextPicker('api')} className="team-ws-qna-context-button flex min-h-[42px]! flex-1 items-center justify-center gap-2 rounded-[12px]! border border-dashed border-gray-300 bg-gray-50 px-[8px]! py-[12px]! text-[12px]! leading-[16px]! font-bold! text-gray-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600">
                    <i className="fas fa-network-wired"></i>
                    API 명세 연동
                  </button>
                </div>
                {selectedQuestionContexts.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedQuestionContexts.map((context) => (
                      <span key={`${context.type}-${context.id}`} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${context.toneClassName}`}>
                        <i className={`fas ${context.iconClassName}`}></i>
                        {context.label}
                        <button type="button" aria-label={`${context.label} 제거`} onClick={() => removeQuestionContext(context)} className="ml-1 text-current opacity-60 hover:opacity-100">
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="team-ws-qna-ask-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">제목</label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="질문의 요지를 명확하게 작성해주세요." className="team-ws-qna-title-input h-[46px]! w-full rounded-[12px]! border-[1px]! border-[#E5E7EB]! px-[16px]! py-[12px]! text-[14px]! leading-[20px]! font-medium! text-[#111827]! outline-none transition focus:border-team focus:ring-1 focus:ring-team" />
              </div>

              <div>
                <div className="mb-2 flex items-end justify-between">
                  <label className="team-ws-qna-ask-label mb-[8px]! block text-[12px]! leading-[16px]! font-bold! text-[#1F2937]!">본문 (마크다운 지원)</label>
                  <span className="team-ws-qna-markdown-hint rounded-[4px]! bg-gray-100 px-[8px]! py-[4px]! text-[10px]! leading-[15px]! font-normal! text-gray-400"><i className="fab fa-markdown"></i> 마크다운 및 코드 스니펫(```) 지원</span>
                </div>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  placeholder={'```javascript\n// 여기에 코드를 붙여넣으세요\n```\n\n발생한 문제 상황과 시도해본 해결 방법을 상세히 적어주세요.'}
                  className="team-ws-qna-content-textarea custom-scrollbar h-[200px]! min-h-[200px]! w-full resize-none rounded-[12px]! border-[1px]! border-[#E5E7EB]! bg-[#F9FAFB]! p-[16px]! font-mono text-[14px]! leading-[22px]! font-medium! text-[#111827]! outline-none transition focus:border-team focus:bg-white focus:ring-1 focus:ring-team"
                ></textarea>
              </div>
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{error}</p> : null}
            </div>
            <div className="team-ws-qna-ask-footer flex shrink-0 justify-end gap-[12px]! border-t-[1px]! border-gray-100 border-t-[#F3F4F6]! bg-white! p-[16px]!">
              <button type="button" onClick={closeQuestionCreateModal} className="team-ws-qna-cancel-button inline-flex min-h-[42px]! items-center! justify-center! rounded-[12px]! border border-gray-200 bg-white px-[24px]! py-[10px]! text-[14px]! leading-[20px]! font-bold! text-gray-600 transition hover:bg-gray-50">취소</button>
              <button type="submit" disabled={submitting} className="team-ws-qna-submit-button inline-flex min-h-[42px]! items-center justify-center! gap-[8px]! rounded-[12px]! border-[1px]! border-[#4F46E5]! bg-[#4F46E5]! px-[24px]! py-[10px]! text-[14px]! leading-[20px]! font-bold! text-white! [box-shadow:0_4px_6px_-1px_rgba(79,70,229,0.25),0_2px_4px_-2px_rgba(79,70,229,0.25)]! transition hover:border-[#4338CA]! hover:bg-[#4338CA]! disabled:border-[#4F46E5]! disabled:bg-[#4F46E5]! disabled:text-white! disabled:opacity-60! [&_i]:text-white! [&_span]:text-white!">
                <i className="fas fa-paper-plane"></i>
                질문 등록하기
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {detail ? (() => {
        const statusMeta = questionSourceStatus(detail)
        const detailStatus = questionUiStatus(detail)
        const answers = detail.answers ?? []
        const canResolve = detailStatus === 'done' && detail.authorId === currentUserId
        const tags = questionSourceTags(detail)
        const parsedContent = parseQuestionContent(detail.content)

        return (
          <Modal title="질문 상세" iconClassName={statusMeta.icon} panelClassName="flex max-h-[90vh] w-full max-w-3xl flex-col" onClose={() => setDetail(null)}>
            <div className="custom-scrollbar max-h-[72vh] overflow-y-auto p-6">
              <div className="mb-5">
                <span className={`mb-3 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-extrabold ${statusMeta.className}`}>
                  <i className={`fas ${statusMeta.icon}`}></i>
                  {statusMeta.label}
                </span>
                <h3 className="text-[19px] font-black text-gray-900">{detail.title}</h3>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={detail.authorName || '팀원'} imageUrl={null} className="h-10 w-10 border border-gray-200 bg-gray-50" iconClassName="text-sm" />
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">{detail.authorName || '팀원'}</p>
                      <p className="text-xs font-medium text-gray-400">{formatDate(detail.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((item) => (
                      <span key={item} className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-600">#{item}</span>
                    ))}
                  </div>
                </div>
                {parsedContent.contexts.length > 0 ? (
                  <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-[11px] font-extrabold text-gray-500">관련 컨텍스트</p>
                    <div className="space-y-1.5">
                      {parsedContent.contexts.map((context) => (
                        <p key={context} className="flex items-start gap-2 text-xs font-bold leading-5 text-gray-600">
                          <i className="fas fa-link mt-0.5 text-gray-400"></i>
                          <span>{context}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="whitespace-pre-line text-sm font-medium leading-7 text-gray-700">{parsedContent.body || '질문 내용이 없습니다.'}</p>
              </div>

              {answers.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {answers.map((answer) => (
                    <div key={answer.id} className="relative rounded-2xl border border-purple-200 bg-indigo-50/30 p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-team text-white shadow-sm">
                          <i className="fas fa-user-tie"></i>
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-gray-900">{answer.authorName || '멘토'}</p>
                          <p className="text-xs font-medium text-purple-500">멘토 답변 · {formatDate(answer.createdAt)}</p>
                        </div>
                      </div>
                      <p className="whitespace-pre-line border-l-4 border-team pl-4 text-sm font-medium leading-7 text-gray-700">{answer.content}</p>

                      {canResolve && answer.authorId !== currentUserId ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                          <div>
                            <p className="text-xs font-extrabold text-blue-900">답변으로 문제가 해결되었나요?</p>
                            <p className="mt-0.5 text-[11px] font-medium text-blue-600">해결 처리하면 이 질문은 해결됨 탭으로 이동합니다.</p>
                          </div>
                          <button type="button" onClick={() => void resolveQuestion(answer.id)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700">
                            <i className="fas fa-check"></i>
                            이 답변으로 해결됨
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {detailStatus === 'resolved' ? (
                    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
                      <i className="fas fa-check-circle text-lg text-green-500"></i>
                      <div>
                        <p className="text-sm font-extrabold text-green-800">이 질문은 멘토님의 답변으로 해결되었습니다.</p>
                        <p className="mt-0.5 text-xs font-medium text-green-600">채택된 답변은 해결됨 탭에서 계속 확인할 수 있습니다.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                  <i className="fas fa-hourglass-half mb-3 text-2xl text-gray-300"></i>
                  <p className="text-sm font-extrabold text-gray-700">멘토님이 질문을 확인 중입니다.</p>
                  <p className="mt-1 text-xs font-medium text-gray-400">답변이 등록되면 알림으로 알려드릴게요.</p>
                </div>
              )}
              {detailError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">{detailError}</p> : null}
            </div>
          </Modal>
        )
      })() : null}
      {contextPicker ? (() => {
        const pickerTitle = contextPicker === 'task' ? '칸반 티켓 선택' : contextPicker === 'file' ? '자료실 파일 첨부' : 'API 명세 연동'
        const pickerIcon = contextPicker === 'task' ? 'fa-columns' : contextPicker === 'file' ? 'fa-file-alt' : 'fa-network-wired'
        const fileCandidates = data.files.filter((file) => file.itemType !== 'FOLDER')
        const hasApiSpec = Boolean(data.apiSpec?.content?.trim())

        return (
          <Modal title={pickerTitle} iconClassName={pickerIcon} panelClassName="flex max-h-[86vh] w-full max-w-xl flex-col" onClose={() => setContextPicker(null)}>
            <div className="custom-scrollbar max-h-[62vh] space-y-3 overflow-y-auto p-6">
              {contextPicker === 'task' ? (
                data.tasks.length > 0 ? data.tasks.map((task) => {
                  const context = buildTaskContext(task)
                  const selected = selectedQuestionContexts.some((item) => item.type === context.type && item.id === context.id)

                  return (
                    <button key={task.taskId} type="button" onClick={() => selectQuestionContext(context)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${selected ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-gray-900">{task.title}</p>
                        <p className="mt-1 text-xs font-bold text-gray-400">{context.description}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {selected ? '선택됨' : '선택'}
                      </span>
                    </button>
                  )
                }) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <i className="fas fa-columns mb-3 text-2xl text-gray-300"></i>
                    <p className="text-sm font-extrabold text-gray-700">선택할 칸반 티켓이 없습니다.</p>
                    <p className="mt-1 text-xs font-medium text-gray-400">칸반 보드에서 작업을 먼저 생성해주세요.</p>
                  </div>
                )
              ) : null}

              {contextPicker === 'file' ? (
                fileCandidates.length > 0 ? fileCandidates.map((file) => {
                  const context = buildFileContext(file)
                  const selected = selectedQuestionContexts.some((item) => item.type === context.type && item.id === context.id)

                  return (
                    <button key={file.fileId} type="button" onClick={() => selectQuestionContext(context)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${selected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                          <i className={`fas ${fileIcon(file)}`}></i>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-gray-900">{workspaceFileName(file)}</p>
                          <p className="mt-1 text-xs font-bold text-gray-400">{file.uploadedByName || '팀원'} · {formatDate(file.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {selected ? '첨부됨' : '첨부'}
                      </span>
                    </button>
                  )
                }) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <i className="fas fa-file-alt mb-3 text-2xl text-gray-300"></i>
                    <p className="text-sm font-extrabold text-gray-700">첨부할 자료실 파일이 없습니다.</p>
                    <p className="mt-1 text-xs font-medium text-gray-400">자료실에 파일이나 링크를 먼저 등록해주세요.</p>
                  </div>
                )
              ) : null}

              {contextPicker === 'api' ? (
                hasApiSpec ? (() => {
                  const context = buildApiContext()
                  const selected = selectedQuestionContexts.some((item) => item.type === context.type && item.id === context.id)

                  return (
                    <button type="button" onClick={() => selectQuestionContext(context)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${selected ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/40'}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-gray-900">API 명세 문서</p>
                        <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-gray-400">{context.description}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${selected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {selected ? '연동됨' : '연동'}
                      </span>
                    </button>
                  )
                })() : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <i className="fas fa-network-wired mb-3 text-2xl text-gray-300"></i>
                    <p className="text-sm font-extrabold text-gray-700">등록된 API 명세가 없습니다.</p>
                    <p className="mt-1 text-xs font-medium text-gray-400">아키텍처 페이지에서 API 명세를 먼저 저장해주세요.</p>
                  </div>
                )
              ) : null}
            </div>
          </Modal>
        )
      })() : null}
    </>
  )
}
