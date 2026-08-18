import { useEffect,useMemo,useState,type FormEvent } from 'react'
import { createInstructorWorkspaceTask,updateInstructorWorkspaceTask } from './instructor-workspace-api'
import { EmptyState,PageHeading } from './instructor-workspace-shared'
import { assignmentGuideline,assignmentStatusLabel,assignmentSummary,assignmentWeekState,avatarUrl,buildAssignmentStudentRow,buildHref,compareTasksByAssignmentOrder,formatDate,inferAssignmentWeek,inferCurrentAssignmentWeek,pushWorkspaceNotification,relativeTime,type AssignmentReviewStatus,type AssignmentStudentRow,type AssignmentSuccessMessage } from './instructor-workspace-support'
import type { WorkspaceData,WorkspaceTask } from './instructor-workspace-types'



export function AssignmentsPage({ data, workspaceId, reload }: { data: WorkspaceData; workspaceId: number | null; reload: () => Promise<void> }) {
  const currentWeek = useMemo(() => inferCurrentAssignmentWeek(data.tasks), [data.tasks])
  const [activeWeek, setActiveWeek] = useState(currentWeek)
  const [statusFilter, setStatusFilter] = useState<AssignmentReviewStatus | 'all'>('all')
  const [editing, setEditing] = useState(false)
  const [feedbackTarget, setFeedbackTarget] = useState<AssignmentStudentRow | null>(null)
  const [historyTarget, setHistoryTarget] = useState<AssignmentStudentRow | null>(null)
  const [successMessage, setSuccessMessage] = useState<AssignmentSuccessMessage | null>(null)

  useEffect(() => {
    setActiveWeek(currentWeek)
  }, [currentWeek])

  const learners = useMemo(() => (data.dashboard?.members ?? [])
    .filter((member) => member.learnerId !== data.dashboard?.ownerId), [data.dashboard?.members, data.dashboard?.ownerId])

  const activeWeekTasks = useMemo(() => data.tasks
    .filter((task, index) => inferAssignmentWeek(task, index + 1) === activeWeek)
    .sort(compareTasksByAssignmentOrder), [activeWeek, data.tasks])

  const assignment = activeWeekTasks.find((task) => !task.assigneeId || task.createdById === data.dashboard?.ownerId) ?? activeWeekTasks[0] ?? null

  const rows = useMemo<AssignmentStudentRow[]>(() => learners.map((member) => {
    const assignedTasks = data.tasks
      .filter((task) => task.assigneeId === member.learnerId)
      .sort(compareTasksByAssignmentOrder)
    const task = assignedTasks.find((item, index) => inferAssignmentWeek(item, index + 1) === activeWeek) ?? null
    return buildAssignmentStudentRow(member, task)
  }), [activeWeek, data.tasks, learners])

  const visibleRows = rows.filter((row) => statusFilter === 'all' || row.status === statusFilter)
  const total = Math.max(learners.length, 1)
  const passed = rows.filter((row) => row.status === 'pass').length
  const reviewWaiting = rows.filter((row) => row.status === 'wait').length
  const rejected = rows.filter((row) => row.status === 'reject').length
  const missing = rows.filter((row) => row.status === 'missing').length
  const submitted = rows.length - missing

  async function saveAssignment(title: string, summary: string, guideline: string, dueDateTime: string) {
    if (!workspaceId || !title.trim()) return
    const description = [summary.trim(), guideline.trim()].filter(Boolean).join('\n\n')
    const payload = {
      title: title.trim(),
      description,
      priority: 'HIGH',
      dueDate: dueDateTime ? dueDateTime.slice(0, 10) : null,
    } as const
    if (assignment) {
      await updateInstructorWorkspaceTask(workspaceId, assignment.taskId, payload)
    } else {
      await createInstructorWorkspaceTask(workspaceId, payload)
    }
    setEditing(false)
    pushWorkspaceNotification(workspaceId, {
      title: assignment ? '과제 설정 수정' : '과제 설정 등록',
      description: `Week ${activeWeek} 과제 "${title.trim()}" 설정이 저장되었습니다.`,
      href: buildHref('assignments', workspaceId),
      icon: 'fas fa-tasks',
    })
    setSuccessMessage({ title: '과제 설정 저장 완료!', description: <span>Week {activeWeek} 과제 내용이 수강생 제출 목록에 반영되었습니다.</span> })
    await reload()
  }

  function completeFeedback(row: AssignmentStudentRow, result: 'pass' | 'reject') {
    setFeedbackTarget(null)
    setSuccessMessage({
      title: result === 'pass' ? 'Pass 피드백 전송 완료!' : '수정 요청 피드백 전송 완료!',
      description: <span>{row.member.learnerName ?? '수강생'} 수강생에게 Week {activeWeek} 리뷰 결과를 전달했습니다.</span>,
    })
  }

  return (
    <>
      <PageHeading page="assignments" description="주차별 수강생들의 과제 제출 현황을 확인하고 피드백을 제공하세요." />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((week) => {
          const state = assignmentWeekState(week, currentWeek)
          return (
            <button
              key={week}
              type="button"
              onClick={() => setActiveWeek(week)}
              className={`relative flex min-w-[132px] items-center justify-center rounded-xl px-5 py-3 text-xs font-extrabold transition ${
                activeWeek === week
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                  : state === '예정'
                    ? 'bg-white text-gray-400 hover:bg-gray-50'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {state === '진행 중' ? <span className="mr-2 h-2 w-2 rounded-full bg-red-500" /> : null}
              {week}주차 ({state})
            </button>
          )
        })}
      </div>

      <section className="mb-6 flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="text-base font-extrabold text-gray-900">{assignment?.title ?? `Week ${activeWeek}: 과제를 설정해주세요`}</h3>
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition hover:bg-gray-200">
              <i className="fas fa-edit mr-1.5" />과제 설정 및 가이드라인 편집
            </button>
          </div>
          <p className="mb-4 line-clamp-2 text-xs leading-5 text-gray-500">{assignmentSummary(assignment)}</p>
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>제출 현황</span>
            <span>{submitted} / {learners.length}명 제출</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="bg-green-500" style={{ width: `${(passed / total) * 100}%` }} />
            <div className="bg-yellow-400" style={{ width: `${(reviewWaiting / total) * 100}%` }} />
            <div className="bg-red-400" style={{ width: `${(rejected / total) * 100}%` }} />
            <div className="bg-gray-200" style={{ width: `${(missing / total) * 100}%` }} />
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-400">마감일 {formatDate(assignment?.dueDate)}</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 md:w-auto md:grid-cols-4">
          <AssignmentMiniStat label="총 인원" value={learners.length} tone="bg-gray-50 text-gray-900" />
          <AssignmentMiniStat label="리뷰 대기" value={reviewWaiting} tone="bg-yellow-50 text-yellow-600" />
          <AssignmentMiniStat label="Pass" value={passed} tone="bg-green-50 text-green-600" />
          <AssignmentMiniStat label="수정 요청" value={rejected} tone="bg-red-50 text-red-600" />
        </div>
      </section>

      <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-extrabold text-gray-900">수강생 제출 목록</h2>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AssignmentReviewStatus | 'all')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 outline-none transition focus:border-[#7C3AED]">
            <option value="all">상태 전체</option>
            <option value="wait">리뷰 대기중</option>
            <option value="reject">수정 요청</option>
            <option value="pass">Pass 완료</option>
            <option value="missing">미제출</option>
          </select>
        </div>
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {visibleRows.length === 0 ? (
            <EmptyState icon="fas fa-inbox" title="표시할 제출 내역이 없습니다." description="선택한 상태에 해당하는 수강생 과제 제출 내역이 없습니다." />
          ) : visibleRows.map((row) => (
            <AssignmentStudentCard
              key={row.member.memberId}
              row={row}
              onFeedback={() => setFeedbackTarget(row)}
              onHistory={() => setHistoryTarget(row)}
              onNudge={() => setSuccessMessage({ title: '독려 DM 발송 완료!', description: <span>{row.member.learnerName ?? '수강생'} 수강생에게 Week {activeWeek} 과제 제출 안내를 보냈습니다.</span> })}
            />
          ))}
        </div>
      </section>

      {editing ? <AssignmentEditModal assignment={assignment} activeWeek={activeWeek} onClose={() => setEditing(false)} onSave={saveAssignment} /> : null}
      {feedbackTarget ? <FeedbackModal row={feedbackTarget} activeWeek={activeWeek} onClose={() => setFeedbackTarget(null)} onSubmit={completeFeedback} /> : null}
      {historyTarget ? <FeedbackHistoryModal row={historyTarget} activeWeek={activeWeek} onClose={() => setHistoryTarget(null)} /> : null}
      {successMessage ? <AssignmentSuccessModal message={successMessage} onClose={() => setSuccessMessage(null)} /> : null}
    </>
  )
}

export function AssignmentMiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`min-w-[86px] rounded-xl px-4 py-3 text-center ${tone}`}>
      <p className="text-[10px] font-extrabold opacity-70">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  )
}

export function AssignmentStudentCard({ row, onFeedback, onHistory, onNudge }: { row: AssignmentStudentRow; onFeedback: () => void; onHistory: () => void; onNudge: () => void }) {
  const tone = {
    wait: 'border-yellow-200 bg-yellow-50/60',
    reject: 'border-red-200 bg-red-50/60',
    pass: 'border-gray-100 bg-white opacity-80',
    missing: 'border-gray-100 bg-gray-50/70 opacity-70',
  }[row.status]
  const badge = {
    wait: 'bg-yellow-100 text-yellow-700',
    reject: 'bg-red-100 text-red-600',
    pass: 'bg-green-100 text-green-600',
    missing: 'bg-gray-200 text-gray-500',
  }[row.status]

  return (
    <article className={`rounded-xl border p-4 transition hover:shadow-sm ${tone}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className="h-12 w-12 rounded-full border border-white bg-gray-100 shadow-sm" alt="" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${badge}`}>{assignmentStatusLabel(row.status)}</span>
              <span className="text-[10px] font-bold text-gray-400">{relativeTime(row.submittedAt)}</span>
            </div>
            {row.status === 'missing' ? (
              <p className="text-xs font-bold text-gray-400">아직 과제를 제출하지 않았습니다.</p>
            ) : (
              <div className="mt-2 rounded-lg bg-white/70 p-3 text-xs leading-5 text-gray-600">
                <i className="fas fa-quote-left mr-2 text-gray-300" />
                {row.message}
              </div>
            )}
            {row.status === 'pass' || row.status === 'reject' ? (
              <p className="mt-2 rounded-lg bg-white/70 p-3 text-xs leading-5 text-gray-600">
                <span className="mb-1 block text-[10px] font-extrabold text-gray-400">멘토 피드백</span>
                {row.mentorComment}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {row.status !== 'missing' ? (
            <a href={row.prUrl} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-600 transition hover:border-[#7C3AED] hover:text-[#7C3AED]">
              <i className="fab fa-github mr-1.5" />PR 코드 보기
            </a>
          ) : null}
          {row.status === 'wait' ? (
            <button type="button" onClick={onFeedback} className="rounded-lg bg-yellow-500 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-yellow-600">
              <i className="fas fa-pen mr-1.5" />피드백 작성하기
            </button>
          ) : null}
          {row.status === 'pass' || row.status === 'reject' ? (
            <button type="button" onClick={onHistory} className="rounded-lg bg-gray-900 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-black">
              <i className="fas fa-history mr-1.5" />피드백 내역 보기
            </button>
          ) : null}
          {row.status === 'missing' ? (
            <button type="button" onClick={onNudge} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[11px] font-bold text-gray-500 transition hover:border-gray-400 hover:text-gray-800">
              <i className="fas fa-paper-plane mr-1.5" />DM으로 독려하기
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function AssignmentEditModal({ assignment, activeWeek, onClose, onSave }: { assignment: WorkspaceTask | null; activeWeek: number; onClose: () => void; onSave: (title: string, summary: string, guideline: string, dueDateTime: string) => Promise<void> }) {
  const [title, setTitle] = useState(assignment?.title ?? `Week ${activeWeek}: `)
  const [summary, setSummary] = useState(assignmentSummary(assignment))
  const [guideline, setGuideline] = useState(assignmentGuideline(assignment))
  const [dueDateTime, setDueDateTime] = useState(assignment?.dueDate ? `${assignment.dueDate}T23:59` : '')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSave(title, summary, guideline, dueDateTime)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="custom-scrollbar max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <p className="text-[10px] font-extrabold tracking-wider text-[#7C3AED]">WEEK {activeWeek} ASSIGNMENT SETTING</p>
            <h3 className="mt-1 text-xl font-extrabold text-gray-900"><i className="fas fa-edit mr-2 text-[#7C3AED]" />과제 및 가이드라인 편집</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-900"><i className="fas fa-times text-xl" /></button>
        </div>
        <form onSubmit={submit} className="p-6">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-gray-700">이번 주 과제 타이틀 (주제) *</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-gray-700">과제 핵심 목표 (한 줄 요약)</span>
              <input value={summary} onChange={(event) => setSummary(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center justify-between text-sm font-extrabold text-gray-700">
                상세 가이드라인 및 필수 조건 *
                <span className="text-[10px] font-bold text-gray-400">Markdown 지원</span>
              </span>
              <textarea value={guideline} onChange={(event) => setGuideline(event.target.value)} required className="h-48 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" placeholder="- 구현해야 할 기능&#10;- 제출 방식&#10;- 평가 기준" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-gray-700">제출 마감 일시 *</span>
              <input type="datetime-local" value={dueDateTime} onChange={(event) => setDueDateTime(event.target.value)} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" />
            </label>
          </div>
          <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50">취소</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60">
              <i className="fas fa-save mr-2" />저장 및 수강생에게 알림
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function FeedbackModal({ row, activeWeek, onClose, onSubmit }: { row: AssignmentStudentRow; activeWeek: number; onClose: () => void; onSubmit: (row: AssignmentStudentRow, result: 'pass' | 'reject') => void }) {
  const [result, setResult] = useState<'pass' | 'reject'>('pass')
  const [feedback, setFeedback] = useState('')

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <p className="text-[10px] font-extrabold tracking-wider text-[#7C3AED]">WEEK {activeWeek} CODE REVIEW</p>
            <h3 className="mt-1 text-xl font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'} 수강생의 과제 리뷰</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-900"><i className="fas fa-times text-xl" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="mb-2 text-xs font-extrabold text-blue-700">수강생 코멘트</p>
            <p className="text-sm leading-6 text-gray-700">{row.message}</p>
            <a href={row.prUrl} className="mt-3 inline-flex items-center text-xs font-bold text-blue-600 hover:underline">
              <i className="fab fa-github mr-1.5" />GitHub PR 링크 바로가기
            </a>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-gray-700"><i className="fas fa-pen mr-2 text-[#7C3AED]" />멘토 피드백</span>
            <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} className="h-48 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-purple-50" placeholder="잘한 점, 개선할 점, 다음 액션을 Markdown 형식으로 작성하세요." />
          </label>
          <div>
            <p className="mb-3 text-sm font-extrabold text-gray-700">리뷰 결과</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-xl border p-4 transition ${result === 'pass' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <input type="radio" checked={result === 'pass'} onChange={() => setResult('pass')} className="sr-only" />
                <span className="text-sm font-extrabold text-green-600"><i className="fas fa-check-circle mr-2" />Pass (통과)</span>
                <p className="mt-1 text-xs text-gray-500">요구사항을 충족해 다음 주차로 진행합니다.</p>
              </label>
              <label className={`cursor-pointer rounded-xl border p-4 transition ${result === 'reject' ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
                <input type="radio" checked={result === 'reject'} onChange={() => setResult('reject')} className="sr-only" />
                <span className="text-sm font-extrabold text-red-600"><i className="fas fa-undo mr-2" />수정 요청 (Reject)</span>
                <p className="mt-1 text-xs text-gray-500">보완 후 재제출하도록 요청합니다.</p>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50">취소</button>
          <button type="button" onClick={() => onSubmit(row, result)} className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black">
            <i className="fas fa-paper-plane mr-2" />피드백 전송
          </button>
        </div>
      </div>
    </div>
  )
}

export function FeedbackHistoryModal({ row, activeWeek, onClose }: { row: AssignmentStudentRow; activeWeek: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <p className="text-[10px] font-extrabold tracking-wider text-[#7C3AED]">WEEK {activeWeek} CODE REVIEW</p>
            <h3 className="mt-1 text-xl font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'} 수강생의 과제 내역</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-900"><i className="fas fa-times text-xl" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
            <span className="text-sm font-extrabold text-gray-900">리뷰 상태</span>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${row.status === 'pass' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{assignmentStatusLabel(row.status)}</span>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="mb-2 text-xs font-extrabold text-blue-700">수강생 코멘트</p>
            <p className="text-sm leading-6 text-gray-700">{row.message}</p>
            <a href={row.prUrl} className="mt-3 inline-flex items-center text-xs font-bold text-blue-600 hover:underline">
              <i className="fab fa-github mr-1.5" />GitHub PR 링크 바로가기
            </a>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-2 text-xs font-extrabold text-gray-500">멘토 피드백</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{row.mentorComment}</p>
          </div>
        </div>
        <div className="flex justify-end border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black">닫기</button>
        </div>
      </div>
    </div>
  )
}

export function AssignmentSuccessModal({ message, onClose }: { message: AssignmentSuccessMessage; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-500">
          <i className="fas fa-check" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">{message.title}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-500">{message.description}</p>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}
