import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SquadWorkspaceAside from './components/SquadWorkspaceAside'
import SquadWorkspaceHeader from './components/SquadWorkspaceHeader'
import UserAvatar from './components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { projectApiRequest } from './project-api'
import { createSquadNotification, squadActorName } from './squad-notifications'

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

type CodeReviewSummary = {
  reviewId: number
  workspaceId: number
  issueKey: string
  title: string
  status: 'OPEN' | 'CLOSED' | 'MERGED'
  authorId: number
  authorName?: string | null
  authorProfileImage?: string | null
  authorRole?: string | null
  filePath: string
  fileCount?: number | null
  sourceBranch: string
  targetBranch: string
  additions: number
  deletions: number
  aiCommentCount: number
  aiCodeReviewId?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

type AiReviewComment = {
  commentId: number
  category: string
  lineNumber?: number | null
  title: string
  message: string
  suggestion?: string | null
}

type AiReviewDetail = {
  reviewId: number
  summary: string
  commentCount: number
  providerName: string
  comments: AiReviewComment[]
  createdAt?: string | null
}

type CodeReviewDetail = {
  summary: CodeReviewSummary
  description?: string | null
  prUrl?: string | null
  diffText: string
  files?: CodeReviewFile[]
  aiReview?: AiReviewDetail | null
  members: WorkspaceMember[]
  comments: MemberComment[]
}

type CodeReviewFile = {
  fileId?: number | null
  reviewId: number
  filePath: string
  diffText: string
  additions: number
  deletions: number
  changeType?: string | null
}

type MemberComment = {
  commentId: number
  reviewId: number
  authorId: number
  authorName?: string | null
  authorProfileImage?: string | null
  body: string
  filePath?: string | null
  statusLabel: string
  createdAt?: string | null
}

type CodeReviewBoard = {
  workspaceId: number
  projectName: string
  members: WorkspaceMember[]
  openReviews: CodeReviewSummary[]
  closedReviews: CodeReviewSummary[]
}

type ReviewTab = 'open' | 'closed'

type CreateForm = {
  title: string
  filePath: string
  sourceBranch: string
  targetBranch: string
  description: string
  diffText: string
}

const EMPTY_FORM: CreateForm = {
  title: '',
  filePath: 'src/main/java/com/devpath/auth/AuthService.java',
  sourceBranch: 'feature/manual-review',
  targetBranch: 'main',
  description: '',
  diffText: '',
}

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return '방금 전'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) {
    return '방금 전'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  if (diffDays === 1) {
    return '어제'
  }

  return `${diffDays}일 전`
}

function statusBadgeClass(status: CodeReviewSummary['status']) {
  if (status === 'OPEN') {
    return 'bg-green-100 text-green-700 border-green-200'
  }

  if (status === 'MERGED') {
    return 'bg-purple-100 text-purple-700 border-purple-200'
  }

  return 'bg-red-100 text-red-600 border-red-200'
}

function statusLabel(status: CodeReviewSummary['status']) {
  if (status === 'OPEN') {
    return 'Open'
  }

  if (status === 'MERGED') {
    return 'Merged'
  }

  return 'Closed'
}

function categoryIconClass(category: string) {
  const normalized = category.toUpperCase()

  if (normalized.includes('SECURITY') || normalized.includes('BUG')) {
    return 'fas fa-exclamation-triangle text-orange-500'
  }

  if (normalized.includes('TEST')) {
    return 'fas fa-vial text-blue-500'
  }

  if (normalized.includes('PERFORMANCE')) {
    return 'fas fa-bolt text-yellow-500'
  }

  return 'fas fa-check-circle text-green-500'
}

function resolveReviewFiles(detail: CodeReviewDetail | null): CodeReviewFile[] {
  if (!detail) {
    return []
  }

  if (detail.files?.length) {
    return detail.files
  }

  return [{
    fileId: null,
    reviewId: detail.summary.reviewId,
    filePath: detail.summary.filePath,
    diffText: detail.diffText,
    additions: detail.summary.additions,
    deletions: detail.summary.deletions,
    changeType: 'legacy',
  }]
}

function resolveDefaultFilePath(detail: CodeReviewDetail, preferredFilePath?: string | null) {
  const reviewFiles = resolveReviewFiles(detail)
  const preferred = preferredFilePath?.trim()

  if (preferred && reviewFiles.some((file) => file.filePath === preferred)) {
    return preferred
  }

  if (reviewFiles.some((file) => file.filePath === detail.summary.filePath)) {
    return detail.summary.filePath
  }

  return reviewFiles[0]?.filePath ?? detail.summary.filePath
}

export default function SquadReviewApp() {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [board, setBoard] = useState<CodeReviewBoard | null>(null)
  const [detail, setDetail] = useState<CodeReviewDetail | null>(null)
  const [activeTab, setActiveTab] = useState<ReviewTab>('open')
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [commentDraft, setCommentDraft] = useState('')
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [openFileMenu, setOpenFileMenu] = useState<'diff' | 'comment' | null>(null)
  const [commentSaving, setCommentSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    document.title = 'DevPath - 코드 피드백'
    const html = document.documentElement
    const body = document.body

    html.classList.add('squad-dashboard-document')
    body.classList.add('squad-dashboard-body')

    return () => {
      html.classList.remove('squad-dashboard-document')
      body.classList.remove('squad-dashboard-body')
    }
  }, [])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    setCommentDraft('')
  }, [selectedReviewId])

  function selectedFileStorageKey(reviewId: number) {
    return `devpath.squadReview.${workspaceId ?? 'unknown'}.${reviewId}.selectedFilePath`
  }

  function applyDetail(detailData: CodeReviewDetail) {
    const storedFilePath = window.localStorage.getItem(selectedFileStorageKey(detailData.summary.reviewId))
    const nextFilePath = resolveDefaultFilePath(detailData, storedFilePath)

    setDetail(detailData)
    setSelectedFilePath(nextFilePath)
  }

  function selectReviewFile(filePath: string) {
    if (detail) {
      window.localStorage.setItem(selectedFileStorageKey(detail.summary.reviewId), filePath)
    }

    setSelectedFilePath(filePath)
    setOpenFileMenu(null)
  }

  useEffect(() => {
    if (!workspaceId) {
      setError('워크스페이스 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    let ignore = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const boardData = await projectApiRequest<CodeReviewBoard>(
          `/api/workspaces/${workspaceId}/code-reviews`,
          {},
          'required',
        )

        if (ignore) {
          return
        }

        setBoard(boardData)

        const firstReview = boardData.openReviews[0] ?? boardData.closedReviews[0] ?? null
        setActiveTab(boardData.openReviews.length > 0 ? 'open' : 'closed')

        if (firstReview) {
          setSelectedReviewId(firstReview.reviewId)
          await loadDetail(firstReview.reviewId, ignore)
        } else {
          setSelectedReviewId(null)
          setDetail(null)
        }
      } catch (event) {
        if (!ignore) {
          if (event instanceof Error && event.message.includes('로그인')) {
            setAuthView('login')
          }
          setError('코드 피드백 데이터를 불러오지 못했습니다.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [workspaceId])

  async function reloadBoard(preferredReviewId?: number | null) {
    if (!workspaceId) {
      return
    }

    const boardData = await projectApiRequest<CodeReviewBoard>(
      `/api/workspaces/${workspaceId}/code-reviews`,
      {},
      'required',
    )
    setBoard(boardData)

    const nextId =
      preferredReviewId ??
      selectedReviewId ??
      boardData.openReviews[0]?.reviewId ??
      boardData.closedReviews[0]?.reviewId ??
      null

    if (nextId) {
      setSelectedReviewId(nextId)
      await loadDetail(nextId)
    } else {
      setSelectedReviewId(null)
      setDetail(null)
    }
  }

  async function loadDetail(reviewId: number, ignore = false) {
    if (!workspaceId) {
      return
    }

    const detailData = await projectApiRequest<CodeReviewDetail>(
      `/api/workspaces/${workspaceId}/code-reviews/${reviewId}`,
      {},
      'required',
    )

    if (!ignore) {
      applyDetail(detailData)
    }
  }

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
    setAuthView('login')
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
    window.location.reload()
  }

  function openCreateModal() {
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function closeCreateModal() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault()

    if (!workspaceId || !form.title.trim() || !form.diffText.trim()) {
      setToast('리뷰 제목과 diff 내용을 입력해주세요.')
      return
    }

    setSaving(true)

    try {
      const created = await projectApiRequest<CodeReviewDetail>(
        `/api/workspaces/${workspaceId}/code-reviews`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            filePath: form.filePath.trim() || EMPTY_FORM.filePath,
            sourceBranch: form.sourceBranch.trim() || EMPTY_FORM.sourceBranch,
            targetBranch: form.targetBranch.trim() || EMPTY_FORM.targetBranch,
            diffText: form.diffText.trim(),
          }),
        },
        'required',
      )

      closeCreateModal()
      setToast('새 리뷰 요청이 등록되었습니다.')
      setActiveTab('open')
      setSelectedReviewId(created.summary.reviewId)
      setDetail(created)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-review',
        message: `${squadActorName(session?.name)}님이 코드 리뷰 "${created.summary.title}"을 요청했습니다.`,
        targetPath: '/squad-review',
      })
      await reloadBoard(created.summary.reviewId)
    } finally {
      setSaving(false)
    }
  }

  async function requestAiReview() {
    if (!workspaceId || !detail) {
      return
    }

    setAiLoading(true)

    try {
      const updated = await projectApiRequest<CodeReviewDetail>(
        `/api/workspaces/${workspaceId}/code-reviews/${detail.summary.reviewId}/ai-review`,
        {
          method: 'POST',
          body: JSON.stringify({
            filePath: selectedFilePath,
          }),
        },
        'required',
      )
      applyDetail(updated)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-review',
        message: `${squadActorName(session?.name)}님이 코드 리뷰 "${updated.summary.title}"의 AI 리뷰를 실행했습니다.`,
        targetPath: '/squad-review',
      })
      setToast('AI 시니어 멘토 리뷰가 완료되었습니다.')
      await reloadBoard(updated.summary.reviewId)
    } finally {
      setAiLoading(false)
    }
  }

  async function updateReviewStatus(action: 'close' | 'merge') {
    if (!workspaceId || !detail) {
      return
    }

    if (action === 'merge' && !detail.aiReview) {
      setToast('머지 전에 AI 시니어 멘토 리뷰를 먼저 실행해주세요.')
      return
    }

    setStatusLoading(true)

    try {
      const updated = await projectApiRequest<CodeReviewDetail>(
        `/api/workspaces/${workspaceId}/code-reviews/${detail.summary.reviewId}/${action}`,
        { method: 'POST' },
        'required',
      )
        applyDetail(updated)
      setActiveTab('closed')
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-review',
        message: `${squadActorName(session?.name)}님이 코드 리뷰 "${updated.summary.title}"을 ${action === 'merge' ? '머지' : '종료'}했습니다.`,
        targetPath: '/squad-review',
      })
      setToast(action === 'merge' ? 'Pull Request가 머지 처리되었습니다.' : '리뷰 요청을 닫았습니다.')
      await reloadBoard(updated.summary.reviewId)
    } finally {
      setStatusLoading(false)
    }
  }

  function insertCommentFormat(prefix: string, suffix: string) {
    const textarea = commentInputRef.current

    if (!textarea) {
      setCommentDraft((current) => `${current}${prefix}${suffix}`)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = commentDraft.slice(start, end)
    const nextValue =
      commentDraft.slice(0, start) + prefix + selectedText + suffix + commentDraft.slice(end)

    setCommentDraft(nextValue)

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.selectionStart = start + prefix.length
      textarea.selectionEnd = end + prefix.length
    })
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault()

    if (!workspaceId || !detail) {
      return
    }

    const body = commentDraft.trim()

    if (!body) {
      setToast('피드백 내용을 입력해주세요.')
      return
    }

    setCommentSaving(true)

    try {
      const updated = await projectApiRequest<CodeReviewDetail>(
        `/api/workspaces/${workspaceId}/code-reviews/${detail.summary.reviewId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            body,
            filePath: selectedFilePath,
          }),
        },
        'required',
      )

      applyDetail(updated)
      setCommentDraft('')
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-review',
        message: `${squadActorName(session?.name)}님이 코드 리뷰 "${updated.summary.title}"에 피드백을 남겼습니다.`,
        targetPath: '/squad-review',
      })
      setToast('팀원 피드백이 등록되었습니다.')
    } finally {
      setCommentSaving(false)
    }
  }

  const members = board?.members ?? detail?.members ?? []
  const projectName = board?.projectName ?? '스쿼드 프로젝트'
  const openReviews = board?.openReviews ?? []
  const closedReviews = board?.closedReviews ?? []
  const visibleReviews = activeTab === 'open' ? openReviews : closedReviews
  const hasAnyReviews = openReviews.length + closedReviews.length > 0
  const currentMember = session?.userId
    ? members.find((member) => member.learnerId === session.userId)
    : null
  const currentUserName = currentMember?.learnerName ?? session?.name ?? '사용자'
  const currentProfileImage = currentMember?.profileImage ?? null
  const currentReviewFiles = resolveReviewFiles(detail)
  const selectedReviewFile =
    currentReviewFiles.find((file) => file.filePath === selectedFilePath) ?? currentReviewFiles[0] ?? null


  function renderReviewCard(review: CodeReviewSummary) {
    const active = selectedReviewId === review.reviewId
    const closed = review.status !== 'OPEN'

    return (
      <button
        type="button"
        key={review.reviewId}
        onClick={() => {
          setSelectedReviewId(review.reviewId)
          void loadDetail(review.reviewId)
        }}
        className={`pr-card w-full text-left p-4 rounded-xl cursor-pointer transition ${
          active
            ? 'bg-blue-50 border border-blue-200 shadow-sm'
            : closed
              ? 'bg-gray-50 border border-gray-200 opacity-80 hover:opacity-100'
              : 'bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${statusBadgeClass(review.status)}`}>
            {closed ? <i className="fas fa-times-circle mr-1"></i> : null}
            {review.status === 'OPEN' ? review.issueKey : statusLabel(review.status)}
          </span>
          <span className="text-[10px] text-gray-400 font-bold">{formatRelativeTime(review.createdAt)}</span>
        </div>
        <h3 className={`font-bold text-sm mb-3 leading-snug ${closed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
          {review.title}
        </h3>
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold text-gray-400">
          <span className="inline-flex min-w-0 items-center gap-1 truncate" title={review.filePath}>
            <i className="fas fa-file-code"></i>
            <span className="truncate">{review.filePath}</span>
          </span>
          <span className="shrink-0">{review.fileCount ?? 1} files</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserAvatar
              name={review.authorName ?? '팀원'}
              imageUrl={review.authorProfileImage}
              className={`w-5 h-5 rounded-full border bg-gray-50 ${closed ? 'border-gray-300 grayscale' : 'border-gray-200'}`}
              iconClassName="text-[9px]"
            />
            <span className={`text-[10px] font-bold truncate ${closed ? 'text-gray-500' : 'text-gray-600'}`}>
              {review.authorName ?? '팀원'} ({review.authorRole ?? 'BE'})
            </span>
          </div>
          {review.aiCommentCount > 0 ? (
            <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
              <i className="fas fa-robot"></i> {review.aiCommentCount}
            </span>
          ) : null}
        </div>
      </button>
    )
  }

  function renderFileSelector(reviewFiles: CodeReviewFile[], activeFile: CodeReviewFile | null, compact = false) {
    if (!activeFile) {
      return null
    }

    const menuId = compact ? 'comment' : 'diff'
    const menuOpen = openFileMenu === menuId
    const tooltip = menuOpen ? null : (
      <span className="pointer-events-none absolute left-0 top-full z-40 mt-2 hidden max-w-[min(34rem,80vw)] rounded-lg border border-gray-200 bg-gray-900 px-3 py-2 text-left text-[11px] font-bold leading-relaxed text-white shadow-xl group-hover:block group-focus-within:block">
        {activeFile.filePath}
      </span>
    )

    if (reviewFiles.length <= 1) {
      return (
        <span className="group relative inline-flex min-w-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm">
          <i className="fas fa-file-code text-gray-400"></i>
          <span className="truncate">{activeFile.filePath}</span>
          {tooltip}
        </span>
      )
    }

    return (
      <div
        className={`group relative inline-flex min-w-0 ${compact ? 'max-w-[60%]' : 'w-full md:max-w-xl'}`}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setOpenFileMenu(null)
          }
        }}
      >
        <button
          type="button"
          aria-label="리뷰 파일 선택"
          aria-expanded={menuOpen}
          onClick={() => setOpenFileMenu(menuOpen ? null : menuId)}
          className="inline-flex w-full min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-bold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:border-gray-400 focus:outline-none"
        >
          <i className="fas fa-file-code shrink-0 text-xs text-gray-400"></i>
          <span className="min-w-0 flex-1 truncate">{activeFile.filePath}</span>
          <span className="shrink-0 text-[10px] font-black text-gray-400">
            +{activeFile.additions} -{activeFile.deletions}
          </span>
          <i className={`fas fa-chevron-down shrink-0 text-[10px] text-gray-400 transition ${menuOpen ? 'rotate-180' : ''}`}></i>
        </button>
        {menuOpen ? (
          <div className="absolute left-0 top-full z-50 mt-2 max-h-64 w-full min-w-[18rem] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 text-xs font-bold shadow-2xl">
            {reviewFiles.map((file) => {
              const selected = file.filePath === activeFile.filePath

              return (
                <button
                  type="button"
                  key={`${file.fileId ?? file.filePath}-custom-select`}
                  onClick={() => selectReviewFile(file.filePath)}
                  className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
                    selected
                      ? 'border border-gray-200 bg-gray-50 text-gray-900 shadow-sm'
                      : 'border border-transparent text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="min-w-0 truncate">{file.filePath}</span>
                  <span className={`shrink-0 text-[10px] font-black ${selected ? 'text-gray-500' : 'text-gray-400'}`}>
                    +{file.additions} -{file.deletions}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
        {tooltip}
      </div>
    )
  }

  function renderAiReviewCard() {
    const aiReview = detail?.aiReview
    const reviewFiles = resolveReviewFiles(detail)
    const activeFile =
      reviewFiles.find((file) => file.filePath === selectedFilePath) ?? reviewFiles[0] ?? null

    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 shadow-sm p-6 relative overflow-hidden" id="aiReviewCard">
        <div className="absolute -right-10 -top-10 text-indigo-500/10 text-9xl">
          <i className="fas fa-robot"></i>
        </div>

        <div className="flex justify-between items-start relative z-10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <i className="fas fa-magic"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-lg ai-gradient-text tracking-tight">AI 시니어 멘토의 자동 리뷰</h3>
              <p className="text-xs text-indigo-800 font-medium">
                {aiReview ? aiReview.summary : 'Gemini가 머지 전 잠재적인 문제와 해결책을 분석합니다.'}
              </p>
            </div>
          </div>
          {!aiReview ? (
            <button
              type="button"
              onClick={requestAiReview}
              disabled={aiLoading}
              className="origin-top-right scale-90 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition shadow-sm disabled:opacity-50"
            >
              {aiLoading ? '분석 중' : 'AI 리뷰 실행'}
            </button>
          ) : null}
        </div>

        {reviewFiles.length ? (
          <div className="relative z-10 mb-4 rounded-xl border border-indigo-100 bg-white/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Review scope</span>
              <span className="text-[10px] font-bold text-indigo-700">{reviewFiles.length} files</span>
            </div>
            {activeFile ? (
                <p className="mt-2 truncate text-[10px] font-bold text-indigo-700" title={activeFile.filePath}>
                  기본 표시 파일. {activeFile.filePath}
                </p>
            ) : null}
          </div>
        ) : null}

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-indigo-100 relative z-10 space-y-3">
          {aiReview?.comments.length ? (
            aiReview.comments.map((comment, index) => (
              <div key={comment.commentId}>
                {index > 0 ? <div className="h-px w-full bg-indigo-100 my-3"></div> : null}
                <div className="flex items-start gap-2">
                  <i className={`${categoryIconClass(comment.category)} mt-0.5`}></i>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {comment.lineNumber ? `Line ${comment.lineNumber}. ` : ''}
                      {comment.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{comment.message}</p>
                    {comment.suggestion ? (
                      <p className="text-xs text-indigo-700 mt-2 leading-relaxed bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                        해결책. {comment.suggestion}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-start gap-2">
              <i className="fas fa-info-circle text-indigo-500 mt-0.5"></i>
              <div>
                <p className="text-sm font-bold text-gray-900">아직 AI 리뷰가 실행되지 않았습니다</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  코드 변경 사항을 머지하기 전에 Gemini 기반 시니어 멘토 리뷰를 실행해 문제점과 해결책을 확인하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderDiff() {
    const reviewFiles = resolveReviewFiles(detail)
    const activeFile =
      reviewFiles.find((file) => file.filePath === selectedFilePath) ?? reviewFiles[0] ?? null

    return (
      <div className="space-y-4" id="codeDiffSection">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">파일별 변경 diff</h3>
              <p className="mt-1 text-xs font-medium text-gray-500">
                PR 전체는 하나의 리뷰로 유지하고, 변경 파일은 아래 목록에서 선택해 확인합니다.
              </p>
            </div>
            <span className="rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-black text-gray-600">
              변경 파일 {reviewFiles.length}개
            </span>
            {detail?.prUrl ? (
              <a
                href={detail.prUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-500 shadow-sm transition hover:border-brand hover:text-brand"
              >
                <i className="fas fa-external-link-alt"></i> View PR
              </a>
            ) : (
              <span className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-400 shadow-sm">
                Manual Diff
              </span>
            )}
          </div>

          {reviewFiles.length > 0 ? (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {renderFileSelector(reviewFiles, activeFile)}
                </div>
                <span className="text-[10px] font-bold text-gray-500">
                  +{detail?.summary.additions ?? 0} -{detail?.summary.deletions ?? 0}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {activeFile ? (() => {
          const lines = (activeFile.diffText ?? '').split(/\r?\n/)

          return (
            <div id="selectedReviewFile" key={`${activeFile.fileId ?? activeFile.filePath}-selected`} className="scroll-mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 p-3">
                <span className="min-w-0 truncate text-xs font-bold text-gray-700" title={activeFile.filePath}>
                  <i className="fas fa-file-code mr-1 text-gray-400"></i> {activeFile.filePath}
                </span>
                <span className="shrink-0 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-black text-gray-500">
                  +{activeFile.additions} -{activeFile.deletions}
                </span>
              </div>

              <div className="relative overflow-x-auto">
                {lines.map((line, index) => {
                  const lineClass = line.startsWith('+') ? 'line-add' : line.startsWith('-') ? 'line-remove' : 'text-gray-500 hover:bg-gray-50'

                  return (
                    <div key={`${activeFile.filePath}-${index}-${line}`} className={`code-line group ${lineClass}`}>
                      <div className="code-num">{index + 1}</div>
                      <div className="whitespace-pre">{line || ' '}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })() : null}
      </div>
    )
  }

  function renderEmptyDetail() {
    return (
      <div id="emptyDetailView" className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
        <i className="fas fa-code-pull-request text-4xl text-gray-300 mb-4"></i>
        <h2 className="text-lg font-bold text-gray-700 mb-2 tracking-tight">아직 등록된 코드 리뷰가 없습니다</h2>
        <p className="text-sm text-gray-500 font-medium mb-6 max-w-md leading-relaxed">
          스쿼드 설정에서 GitHub 레포지토리를 연동하여 자동으로 PR을 가져오거나,
          <br />
          수동으로 코드를 올려 팀원들과 멘토 AI에게 리뷰를 요청해보세요.
        </p>
        <button onClick={openCreateModal} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 hover:text-gray-900 transition shadow-sm flex items-center gap-2 text-sm">
          수동으로 리뷰 요청하기
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
      </div>
    )
  }

  if (error && !board) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <i className="fas fa-circle-exclamation text-3xl text-red-400 mb-3"></i>
          <p className="font-extrabold text-gray-900">{error}</p>
          <a href="/workspace-hub" className="inline-flex mt-5 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
            워크스페이스로 돌아가기
          </a>
        </div>
        {authView ? (
          <AuthModal view={authView} onClose={() => setAuthView(null)} onViewChange={setAuthView} onAuthenticated={handleAuthenticated} />
        ) : null}
      </div>
    )
  }

  return (
    <div className="squad-dashboard-page squad-review-page flex h-screen overflow-hidden text-gray-800">
      <SquadWorkspaceAside
        activePage="review"
        workspaceId={workspaceId}
        projectName={projectName}
        reviewBadgeCount={openReviews.length}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          workspaceId={workspaceId}
          projectName={projectName}
          members={members}
          statusLabel={hasAnyReviews ? '진행 중' : 'GitHub 연동 대기 중'}
          statusActive={hasAnyReviews}
          currentUserName={session?.name}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex overflow-hidden">
          <div className="w-1/3 max-w-sm bg-white border-r border-gray-200 flex flex-col shrink-0">
            <div className="p-5 border-b border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-lg tracking-tight">
                    {hasAnyReviews ? '코드 리뷰 & 피드백' : 'Pull Requests'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">GitHub PR 또는 수동 코드 리뷰 요청</p>
                </div>
                <button onClick={openCreateModal} className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-black transition shadow-md" title="새 리뷰 요청">
                  <i className="fas fa-plus"></i>
                </button>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('open')}
                  className={activeTab === 'open' ? 'flex-1 py-1.5 bg-white text-gray-900 shadow-sm text-xs font-bold rounded-lg transition border border-gray-200' : 'flex-1 py-1.5 text-gray-500 hover:text-gray-900 text-xs font-bold rounded-lg transition'}
                >
                  {hasAnyReviews ? `열림 (${openReviews.length})` : `Open (${openReviews.length})`}
                </button>
                <button
                  onClick={() => setActiveTab('closed')}
                  className={activeTab === 'closed' ? 'flex-1 py-1.5 bg-white text-gray-900 shadow-sm text-xs font-bold rounded-lg transition border border-gray-200' : 'flex-1 py-1.5 text-gray-500 hover:text-gray-900 text-xs font-bold rounded-lg transition'}
                >
                  {hasAnyReviews ? `닫힘 (${closedReviews.length})` : `Closed (${closedReviews.length})`}
                </button>
              </div>

              <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800">
                <div className="mb-1 flex items-center gap-1.5 font-extrabold text-amber-900">
                  <i className="fas fa-circle-info text-amber-500"></i>
                  GitHub 동기화 안내
                </div>
                <ul className="space-y-0.5 pl-4 list-disc">
                  <li>GitHub 토큰을 연결하면 더 많은 PR과 파일 변경 내역을 안정적으로 가져옵니다.</li>
                  <li>토큰이 없을 때는 기본 조회 범위 안에서 최근 PR만 먼저 보여줍니다.</li>
                  <li>전체 리뷰 흐름이 필요하면 스쿼드 설정에서 GitHub 토큰을 저장하세요.</li>
                </ul>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 relative">
              {visibleReviews.length > 0 ? (
                visibleReviews.map(renderReviewCard)
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <p className="text-sm font-bold text-gray-500 mb-1">
                    {activeTab === 'open' ? '진행 중인 리뷰 요청이 없습니다' : '닫힌 리뷰 요청이 없습니다'}
                  </p>
                  {activeTab === 'open' ? (
                    <p className="text-xs text-gray-400 font-medium">새로운 코드를 올리고 피드백을 받아보세요.</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-[#F9FAFB] relative" id="prDetailView">
            {detail ? (
              <>
                <div className="p-6 border-b border-gray-200 bg-white shrink-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`${statusBadgeClass(detail.summary.status)} text-xs font-bold px-2 py-1 rounded-md border flex items-center gap-1`}>
                      <i className="fas fa-code-branch"></i> {statusLabel(detail.summary.status)}
                    </span>
                    <h1 className="min-w-0 truncate text-base font-semibold leading-snug tracking-normal text-gray-800" title={detail.summary.title}>
                      {detail.summary.title}
                    </h1>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <span className="font-bold text-gray-700">{detail.summary.authorName ?? '팀원'}</span> wants to merge into
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs text-gray-800 border border-gray-200">{detail.summary.targetBranch}</span>
                    from
                    <span className="bg-blue-50 px-1.5 py-0.5 rounded font-mono text-xs text-blue-700 border border-blue-200">{detail.summary.sourceBranch}</span>
                    <span className="ml-auto text-xs font-bold text-green-600">+{detail.summary.additions}</span>
                    <span className="text-xs font-bold text-red-500">-{detail.summary.deletions}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-24" id="mainScrollArea">
                  {renderAiReviewCard()}
                  {renderDiff()}

                  <div className="space-y-4 pt-4" id="commentThread">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                        <i className="fas fa-comments text-gray-400"></i> 팀원 피드백
                      </h3>
                      {selectedReviewFile ? (
                        <span className="max-w-full truncate rounded-lg border border-green-100 bg-green-50 px-3 py-1.5 text-[10px] font-black text-green-700" title={selectedReviewFile.filePath}>
                          선택 파일. {selectedReviewFile.filePath}
                        </span>
                      ) : null}
                    </div>

                    {(detail.comments ?? []).length ? (
                      (detail.comments ?? []).map((comment) => (
                        <div key={comment.commentId} className="flex gap-4 items-start">
                          <UserAvatar
                            name={comment.authorName ?? '팀원'}
                            imageUrl={comment.authorProfileImage}
                            className="w-10 h-10 rounded-full border border-gray-200 bg-white shadow-sm mt-1"
                            iconClassName="text-xs"
                          />
                          <div className="flex-1 bg-white border border-gray-200 rounded-2xl rounded-tl-none shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-100 p-3 flex justify-between items-center">
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-gray-900">
                                  {comment.authorName ?? '팀원'}
                                  <span className="font-normal text-gray-500 ml-1">{formatRelativeTime(comment.createdAt)}</span>
                                </span>
                                {comment.filePath ? (
                                  <p className="mt-1 max-w-full truncate text-[10px] font-bold text-gray-400" title={comment.filePath}>
                                    <i className="fas fa-file-code mr-1"></i>{comment.filePath}
                                  </p>
                                ) : null}
                              </div>
                              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200">
                                {comment.statusLabel || 'Commented'}
                              </span>
                            </div>
                            <div className="p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {comment.body}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-500 font-medium shadow-sm">
                        아직 팀원이 남긴 피드백이 없습니다. AI 리뷰 결과를 기준으로 팀원들과 수정 방향을 논의해보세요.
                      </div>
                    )}

                    <form onSubmit={submitComment} className="flex gap-4 items-start">
                      <UserAvatar
                        name={currentUserName}
                        imageUrl={currentProfileImage}
                        className="w-10 h-10 rounded-full border border-gray-200 bg-white shadow-sm mt-1"
                        iconClassName="text-xs"
                      />
                      <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden focus-within:border-brand transition-colors">
                        <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-1 text-gray-600">
                          {selectedReviewFile ? (
                            <div className="mr-auto min-w-0 flex-1">
                              {renderFileSelector(currentReviewFiles, selectedReviewFile, true)}
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => insertCommentFormat('**', '**')}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded transition"
                            title="굵게"
                          >
                            <i className="fas fa-bold text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => insertCommentFormat('`', '`')}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded transition"
                            title="코드"
                          >
                            <i className="fas fa-code text-xs"></i>
                          </button>
                        </div>
                        <textarea
                          ref={commentInputRef}
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          className="w-full p-4 h-24 outline-none resize-y text-sm custom-scrollbar"
                          placeholder="피드백에 대한 답변이나 새로운 코멘트를 남겨보세요."
                        />
                        <div className="bg-gray-50 border-t border-gray-100 p-3 flex justify-end gap-2">
                          <button
                            type="submit"
                            disabled={commentSaving}
                            className="px-5 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition shadow-md disabled:opacity-50"
                          >
                            {commentSaving ? '등록 중' : 'Comment'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 px-6 flex justify-between items-center shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20">
                  <div className="text-xs font-bold text-gray-500" id="statusMessage">
                    <i className={`${detail.aiReview ? 'fas fa-check-circle text-green-500' : 'fas fa-robot text-indigo-500'} mr-1`}></i>
                    {detail.aiReview ? 'AI 리뷰 검토가 완료되었습니다' : '머지 전에 AI 리뷰가 필요합니다'}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => void updateReviewStatus('close')}
                      disabled={statusLoading || detail.summary.status !== 'OPEN'}
                      className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition shadow-sm disabled:opacity-40"
                    >
                      <i className="fas fa-times text-red-500 mr-1"></i> Close PR
                    </button>
                    <button
                      onClick={() => void updateReviewStatus('merge')}
                      disabled={statusLoading || detail.summary.status !== 'OPEN'}
                      className="px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-green-600 transition shadow-lg shadow-green-200 flex items-center gap-2 disabled:opacity-40"
                    >
                      <i className="fas fa-code-merge"></i> Merge Pull Request
                    </button>
                  </div>
                </div>
              </>
            ) : (
              renderEmptyDetail()
            )}
          </div>
        </main>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1050]">
          <form onSubmit={submitCreate} className="squad-review-create-modal bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <i className={`fas fa-plus-circle ${hasAnyReviews ? 'text-blue-500' : 'text-gray-400'}`}></i>
                {hasAnyReviews ? '새 코드 리뷰 요청' : '수동 코드 리뷰 요청'}
              </h3>
              <button type="button" onClick={closeCreateModal} className="text-gray-400 hover:text-gray-900 transition">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              {hasAnyReviews ? (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
                  <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    팀 설정에서 GitHub 레포지토리가 연동되어 있다면 PR 생성 시 자동으로 이 목록에 추가됩니다. 연동 전이거나 코드를 직접 올려 리뷰받고 싶을 때만 이 폼을 사용하세요.
                  </p>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">리뷰 요청 제목 <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none" placeholder="예: 로그인 로직 수정 리뷰 부탁드립니다." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">파일 경로</label>
                  <input value={form.filePath} onChange={(event) => setForm((current) => ({ ...current, filePath: event.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-xs font-mono focus:border-brand outline-none" placeholder="src/main/java/..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">브랜치</label>
                  <input value={form.sourceBranch} onChange={(event) => setForm((current) => ({ ...current, sourceBranch: event.target.value }))} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-xs font-mono focus:border-brand outline-none" placeholder="feature/..." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">수정된 소스 코드 (Diff) <span className="text-red-500">*</span></label>
                <textarea value={form.diffText} onChange={(event) => setForm((current) => ({ ...current, diffText: event.target.value }))} className="w-full border border-gray-300 rounded-xl p-4 text-xs font-mono bg-gray-50 h-32 resize-none outline-none focus:border-brand custom-scrollbar" placeholder="여기에 소스 코드를 복사하여 붙여넣으세요." />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeCreateModal} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition">취소</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition shadow-md disabled:opacity-50">
                {saving ? '등록 중' : '요청 등록'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? (
        <div id="toastContainer" className="fixed top-5 right-5 z-[2000]">
          <div className="toast bg-gray-900/90 backdrop-blur-sm text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-bold border border-gray-700">
            <i className="fas fa-info-circle text-brand"></i>
            <span>{toast}</span>
          </div>
        </div>
      ) : null}

      {authView ? (
        <AuthModal view={authView} onClose={() => setAuthView(null)} onViewChange={setAuthView} onAuthenticated={handleAuthenticated} />
      ) : null}
    </div>
  )
}
