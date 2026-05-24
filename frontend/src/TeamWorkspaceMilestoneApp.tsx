import { useEffect, useMemo, useState, type FormEvent } from 'react'
import LoginRequiredView from './components/LoginRequiredView'
import TeamWorkspaceHeader from './components/TeamWorkspaceHeader'
import UserAvatar from './components/UserAvatar'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from './lib/auth-session'
import { projectApiRequest } from './project-api'

type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
type MilestoneStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CLOSED'

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  joinedAt?: string | null
  lastActiveAt?: string | null
  online?: boolean
}

type WorkspaceDashboard = {
  workspaceId: number
  name: string
  description?: string | null
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  members: WorkspaceMember[]
  unresolvedTaskCount: number
  activeMilestoneCount: number
  createdAt?: string | null
}

type WorkspaceTask = {
  taskId: number
  workspaceId: number
  title: string
  description?: string | null
  status: TaskStatus
  priority?: TaskPriority | null
  assigneeId?: number | null
  dueDate?: string | null
  createdById?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

type Milestone = {
  milestoneId: number
  workspaceId: number
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  status: MilestoneStatus
  createdById?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

type Notice = {
  id: number
  workspaceId: number
  title: string
  content?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type ActivityLog = {
  logId: number
  workspaceId: number
  actorId?: number | null
  activityType: string
  description: string
  createdAt?: string | null
}

type RoleKey = 'frontend' | 'backend' | 'design' | 'planning'
type SubmissionMode = 'new' | 'resubmit'
type SubmissionStatus = 'none' | 'wait' | 'pass'

type WeekView = {
  id: number
  tabLabel: string
  isCurrent: boolean
  title: string
  description: string
  milestone?: Milestone
}

type FeedbackEntry = {
  id: string
  isMe: boolean
  time: string
  text: string
}

type TeamStatusView = {
  id: number
  name: string
  roleKey: RoleKey
  roleLabel: string
  seed: string
  profileImage?: string | null
  status: 'pass' | 'wait' | 'working' | 'none'
}

const WEEK_COUNT = 4

const ROLE_META: Record<RoleKey, {
  label: string
  shortLabel: string
  seed: string
  keywords: string[]
  roleBadgeClass: string
  missionBadgeClass: string
  teamBadgeClass: string
}> = {
  frontend: {
    label: 'Frontend',
    shortLabel: 'FE',
    seed: 'Taehyeong',
    keywords: ['frontend', 'front', 'react', 'next', 'vue', 'ui', '화면', '프론트'],
    roleBadgeClass: 'text-blue-600 bg-blue-50 border-blue-100',
    missionBadgeClass: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    teamBadgeClass: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  backend: {
    label: 'Backend',
    shortLabel: 'BE',
    seed: 'John',
    keywords: ['backend', 'back', 'api', 'server', 'spring', 'jpa', 'db', '서버', '백엔드'],
    roleBadgeClass: 'text-purple-600 bg-purple-50 border-purple-100',
    missionBadgeClass: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    teamBadgeClass: 'text-purple-600 bg-purple-50 border-purple-100',
  },
  design: {
    label: 'Designer',
    shortLabel: 'UX/UI',
    seed: 'Sarah',
    keywords: ['design', 'figma', 'wireframe', 'prototype', '디자인', '와이어프레임'],
    roleBadgeClass: 'text-pink-600 bg-pink-50 border-pink-100',
    missionBadgeClass: 'bg-pink-500/20 border-pink-500/50 text-pink-300',
    teamBadgeClass: 'text-pink-600 bg-pink-50 border-pink-100',
  },
  planning: {
    label: 'Planning',
    shortLabel: 'PM',
    seed: 'Mike',
    keywords: ['plan', 'docs', 'document', '기획', '문서', '요구사항', '회의'],
    roleBadgeClass: 'text-orange-600 bg-orange-50 border-orange-100',
    missionBadgeClass: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
    teamBadgeClass: 'text-orange-600 bg-orange-50 border-orange-100',
  },
}

const DEFAULT_MEMBER_ROLES: RoleKey[] = ['frontend', 'backend', 'backend', 'design']

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

function percent(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

function parseDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatShortDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '일정 미정'

  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date)
}

function formatRelativeTime(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '방금 전'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}시간 전`

  return `${Math.floor(diffHours / 24)}일 전`
}

function roleKeyForText(text: string): RoleKey {
  const normalized = text.toLowerCase()
  const matched = (Object.keys(ROLE_META) as RoleKey[]).find((key) =>
    ROLE_META[key].keywords.some((keyword) => normalized.includes(keyword)),
  )

  return matched ?? 'planning'
}

function roleKeyForTask(task: WorkspaceTask) {
  return roleKeyForText(`${task.title} ${task.description ?? ''}`)
}

function roleKeyForMember(index: number) {
  return DEFAULT_MEMBER_ROLES[index] ?? 'planning'
}

function tabSuffix(title?: string | null) {
  if (!title) return ''
  if (/(기획|설계|와이어|요구사항)/i.test(title)) return ' (기획/설계)'
  if (/(mvp|개발|구현|초기)/i.test(title)) return ' (MVP 개발)'
  if (/(고도화|개선|피드백|리팩토링)/i.test(title)) return ' (고도화)'
  if (/(배포|테스트|qa|출시)/i.test(title)) return ' (배포)'

  const compact = title.replace(/[()[\]]/g, '').trim().split(/\s+/).slice(0, 2).join(' ')
  return compact ? ` (${compact.slice(0, 8)})` : ''
}

function isClosedMilestone(milestone: Milestone) {
  return milestone.status === 'DONE' || milestone.status === 'CLOSED'
}

function isTaskInWeek(task: WorkspaceTask, milestone: Milestone | undefined) {
  if (!milestone) return true
  if (!task.dueDate) return false

  const dueDate = parseDate(task.dueDate)
  const startDate = parseDate(milestone.startDate)
  const endDate = parseDate(milestone.dueDate)

  if (!dueDate) return false
  if (startDate && dueDate < startDate) return false
  if (endDate && dueDate > endDate) return false

  return true
}

function submissionStatus(tasks: WorkspaceTask[]): SubmissionStatus {
  if (tasks.length === 0) return 'none'
  if (tasks.every((task) => task.status === 'DONE')) return 'pass'
  if (tasks.some((task) => task.status === 'IN_PROGRESS' || task.status === 'DONE')) return 'wait'

  return 'none'
}

function teamTaskStatus(tasks: WorkspaceTask[]): TeamStatusView['status'] {
  if (tasks.length === 0) return 'none'
  if (tasks.every((task) => task.status === 'DONE')) return 'pass'
  if (tasks.some((task) => task.status === 'IN_PROGRESS')) return 'working'
  if (tasks.some((task) => task.status === 'DONE')) return 'wait'

  return 'none'
}

function findSubmissionLink(description?: string | null) {
  const matched = description?.match(/https?:\/\/\S+/)
  return matched?.[0] ?? ''
}

function buildSubmissionDescription(task: WorkspaceTask | null, link: string, comment: string) {
  const base = task?.description?.trim()
  const sections = base ? [base] : []

  sections.push(`[제출 링크]\n${link}`)

  if (comment.trim()) {
    sections.push(`[제출 코멘트]\n${comment.trim()}`)
  }

  return sections.join('\n\n')
}

function sortedMilestones(milestones: Milestone[]) {
  return [...milestones].sort((left, right) => {
    const leftTime = parseDate(left.dueDate ?? left.createdAt)?.getTime() ?? 0
    const rightTime = parseDate(right.dueDate ?? right.createdAt)?.getTime() ?? 0

    return leftTime - rightTime
  })
}

function sortedTasks(tasks: WorkspaceTask[]) {
  return [...tasks].sort((left, right) => {
    const leftTime = parseDate(left.dueDate ?? left.createdAt)?.getTime() ?? 0
    const rightTime = parseDate(right.dueDate ?? right.createdAt)?.getTime() ?? 0

    return leftTime - rightTime
  })
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="team-ws-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] text-gray-800">
      <div className="team-ws-card w-[420px] border border-gray-100 bg-white p-8 text-center shadow-sm">
        <i className="fas fa-circle-exclamation mb-3 text-3xl text-red-400"></i>
        <h1 className="text-xl font-black text-gray-900">팀 마일스톤을 열 수 없습니다</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-gray-500">{message}</p>
        <a
          href="/workspace-hub"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-gray-900 px-5 text-sm font-black text-white hover:bg-black"
        >
          워크스페이스 허브로 이동
        </a>
      </div>
    </div>
  )
}

export default function TeamWorkspaceMilestoneApp() {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationCleared, setNotificationCleared] = useState(false)
  const [selectedWeekId, setSelectedWeekId] = useState(1)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null)
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('new')
  const [submissionForm, setSubmissionForm] = useState({ link: '', comment: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousTitle = document.title

    html.classList.add('team-ws-dashboard-document')
    body.classList.add('team-ws-dashboard-body')
    document.title = 'DevPath - 팀 마일스톤 및 역할별 과제'

    return () => {
      html.classList.remove('team-ws-dashboard-document')
      body.classList.remove('team-ws-dashboard-body')
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())

    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
  }, [])

  useEffect(() => {
    if (!session || !workspaceId) {
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadWorkspace() {
      setLoading(true)
      setError(null)

      try {
        const [dashboardData, taskData, milestoneData, noticeData, activityData] = await Promise.all([
          projectApiRequest<WorkspaceDashboard>(
            `/api/workspaces/${workspaceId}/dashboard`,
            { signal: controller.signal },
            'required',
          ),
          projectApiRequest<WorkspaceTask[]>(
            `/api/workspaces/${workspaceId}/tasks`,
            { signal: controller.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<Milestone[]>(
            `/api/workspaces/${workspaceId}/milestones`,
            { signal: controller.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<Notice[]>(
            `/api/workspaces/${workspaceId}/notices`,
            { signal: controller.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<ActivityLog[]>(
            `/api/workspaces/${workspaceId}/activities/recent`,
            { signal: controller.signal },
            'required',
          ).catch(() => []),
        ])

        if (controller.signal.aborted) return

        setDashboard(dashboardData)
        setTasks(sortedTasks(taskData ?? []))
        setMilestones(sortedMilestones(milestoneData ?? []))
        setNotices(noticeData ?? [])
        setActivities(activityData ?? [])
      } catch (nextError) {
        if (!controller.signal.aborted) {
          setError(nextError instanceof Error ? nextError.message : '팀 마일스톤 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadWorkspace()

    return () => controller.abort()
  }, [session, workspaceId])

  const currentWeekId = useMemo(() => {
    if (milestones.length === 0) return 1

    const index = milestones.findIndex((milestone) => !isClosedMilestone(milestone))
    return Math.min(WEEK_COUNT, Math.max(1, index >= 0 ? index + 1 : Math.min(milestones.length, WEEK_COUNT)))
  }, [milestones])

  useEffect(() => {
    setSelectedWeekId(currentWeekId)
  }, [currentWeekId])

  const weeks = useMemo<WeekView[]>(() => {
    return Array.from({ length: WEEK_COUNT }, (_, index) => {
      const weekId = index + 1
      const milestone = milestones[index]

      return {
        id: weekId,
        tabLabel: milestone ? `Week ${weekId}${tabSuffix(milestone.title)}` : `Week ${weekId}`,
        isCurrent: weekId === currentWeekId,
        title: milestone?.title?.trim() || '마일스톤 목표 미설정',
        description: milestone?.description?.trim() || '아직 이번 주차의 세부 목표와 설명이 등록되지 않았습니다.',
        milestone,
      }
    })
  }, [currentWeekId, milestones])

  const selectedWeek = weeks.find((week) => week.id === selectedWeekId) ?? weeks[0]
  const weekTasks = useMemo(() => {
    const milestone = selectedWeek?.milestone
    const filtered = tasks.filter((task) => isTaskInWeek(task, milestone))

    if (!milestone && milestones.length === 0) {
      return tasks
    }

    return filtered
  }, [milestones.length, selectedWeek, tasks])

  const memberById = useMemo(() => {
    const map = new Map<number, WorkspaceMember>()
    dashboard?.members.forEach((member) => map.set(member.learnerId, member))
    return map
  }, [dashboard])

  const fallbackMembers = useMemo<WorkspaceMember[]>(() => {
    const userId = session?.userId ?? 0
    return [
      { memberId: -1, learnerId: userId, learnerName: session?.name ?? '나', profileImage: null },
      { memberId: -2, learnerId: -2, learnerName: '팀원1', profileImage: null },
      { memberId: -3, learnerId: -3, learnerName: '팀원2', profileImage: null },
      { memberId: -4, learnerId: -4, learnerName: '팀원3', profileImage: null },
    ]
  }, [session?.name, session?.userId])

  const members = dashboard?.members?.length ? dashboard.members : fallbackMembers
  const currentMember = session?.userId ? memberById.get(session.userId) : null
  const currentUserName = currentMember?.learnerName ?? session?.name ?? '사용자'
  const projectName = dashboard?.name?.trim() || 'Next.js 블로그 플랫폼 구축'
  const hasWorkspaceData = tasks.length > 0 || milestones.length > 0
  const progressPercent = percent(Math.min(currentWeekId - 1, WEEK_COUNT - 1), WEEK_COUNT - 1)
  const notificationActive = !notificationCleared && (activities.length > 0 || notices.length > 0 || hasWorkspaceData)

  const myTasks = useMemo(() => {
    if (!session?.userId) return []

    return weekTasks.filter((task) => task.assigneeId === session.userId)
  }, [session?.userId, weekTasks])

  const myPrimaryTask = myTasks[0] ?? null
  const myRoleKey = myPrimaryTask ? roleKeyForTask(myPrimaryTask) : 'frontend'
  const myRoleMeta = ROLE_META[myRoleKey]
  const mySubmissionStatus = submissionStatus(myTasks)
  const canResubmit = mySubmissionStatus !== 'pass'

  const guidelines = useMemo(() => {
    return weekTasks.slice(0, 6).map((task) => {
      const roleKey = roleKeyForTask(task)
      const roleMeta = ROLE_META[roleKey]

      return {
        id: task.taskId,
        roleKey,
        role: roleMeta.label,
        text: task.description?.trim() || task.title,
      }
    })
  }, [weekTasks])

  const feedbackThread = useMemo<FeedbackEntry[]>(() => {
    const entries: FeedbackEntry[] = []

    if (myPrimaryTask?.description?.trim()) {
      entries.push({
        id: `task-${myPrimaryTask.taskId}`,
        isMe: true,
        time: formatShortDate(myPrimaryTask.updatedAt ?? myPrimaryTask.createdAt),
        text: myPrimaryTask.description.trim(),
      })
    }

    notices.slice(0, 2).forEach((notice) => {
      entries.push({
        id: `notice-${notice.id}`,
        isMe: false,
        time: formatShortDate(notice.updatedAt ?? notice.createdAt),
        text: notice.content?.trim() || notice.title,
      })
    })

    return entries
  }, [myPrimaryTask, notices])

  const teamStatus = useMemo<TeamStatusView[]>(() => {
    return members.map((member, index) => {
      const memberTasks = weekTasks.filter((task) => task.assigneeId === member.learnerId)
      const roleKey = memberTasks[0] ? roleKeyForTask(memberTasks[0]) : roleKeyForMember(index)
      const roleMeta = ROLE_META[roleKey]
      const isMe = Boolean(session?.userId && member.learnerId === session.userId)

      return {
        id: member.memberId,
        name: isMe ? '나' : member.learnerName || `팀원${index}`,
        roleKey,
        roleLabel: roleMeta.shortLabel,
        seed: roleMeta.seed,
        profileImage: member.profileImage,
        status: teamTaskStatus(memberTasks),
      }
    })
  }, [members, session?.userId, weekTasks])

  const submittedTeamCount = teamStatus.filter((status) => status.status === 'pass' || status.status === 'wait').length
  const teamSubmitPercent = percent(submittedTeamCount, teamStatus.length)

  function goTo(path: string) {
    window.location.assign(navHref(path, workspaceId))
  }

  function openSubmitModal(mode: SubmissionMode, task: WorkspaceTask | null) {
    setSubmissionMode(mode)
    setSelectedTask(task)
    setSubmitError(null)
    setSubmissionForm({
      link: findSubmissionLink(task?.description),
      comment: mode === 'resubmit' ? '멘토님 피드백 반영하여 수정했습니다.' : '',
    })
    setSubmitModalOpen(true)
  }

  async function executeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId) return

    const link = submissionForm.link.trim()
    const comment = submissionForm.comment.trim()

    if (!link) {
      setSubmitError('결과물 링크를 입력해주세요.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      let task = selectedTask

      if (!task) {
        task = await projectApiRequest<WorkspaceTask>(
          `/api/workspaces/${workspaceId}/tasks`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: `Week ${selectedWeek.id} ${myRoleMeta.label} 과제 제출`,
              description: buildSubmissionDescription(null, link, comment),
              priority: 'MEDIUM',
              assigneeId: session?.userId ?? null,
              dueDate: selectedWeek.milestone?.dueDate ?? null,
            }),
          },
          'required',
        )
      } else {
        task = await projectApiRequest<WorkspaceTask>(
          `/api/workspaces/${workspaceId}/tasks/${task.taskId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              title: task.title,
              description: buildSubmissionDescription(task, link, comment),
              priority: task.priority ?? 'MEDIUM',
              dueDate: task.dueDate ?? null,
            }),
          },
          'required',
        )
      }

      const updated = await projectApiRequest<WorkspaceTask>(
        `/api/workspaces/${workspaceId}/tasks/${task.taskId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'DONE' }),
        },
        'required',
      )

      setTasks((list) => {
        const exists = list.some((item) => item.taskId === updated.taskId)
        const next = exists
          ? list.map((item) => (item.taskId === updated.taskId ? updated : item))
          : [...list, updated]

        return sortedTasks(next)
      })
      setSubmitModalOpen(false)
      setSuccessModalOpen(true)
    } catch (nextError) {
      setSubmitError(nextError instanceof Error ? nextError.message : '과제 제출 처리에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!session) {
    return <LoginRequiredView message="팀 마일스톤은 로그인한 사용자만 접근할 수 있습니다." />
  }

  if (!workspaceId) {
    return <ErrorState message="workspaceId가 없습니다. 워크스페이스 허브에서 다시 진입해주세요." />
  }

  if (loading) {
    return (
      <div className="team-ws-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] text-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-team"></div>
          <p className="text-sm font-bold text-gray-500">팀 마일스톤을 불러오는 중입니다.</p>
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
    return <ErrorState message={error} />
  }

  return (
    <div className="team-ws-dashboard-page team-ws-milestone-page flex h-screen overflow-hidden bg-[#F3F4F6] text-gray-800">
      <aside className={`${sidebarPinned ? 'pinned ' : ''}team-ws-sidebar group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64`}>
        <div className="flex h-20 shrink-0 cursor-pointer items-center border-b border-gray-100 px-5 transition hover:bg-gray-50">
          <a
            href="/workspace-hub"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-team text-lg font-bold text-white shadow-md"
            title="워크스페이스 허브"
          >
            <i className="fas fa-arrow-left"></i>
          </a>
          <div className="sidebar-text flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Team Workspace</p>
            <p className="w-36 truncate font-bold text-gray-900">{projectName}</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarPinned((current) => !current)}
            className="team-ws-pin-button ml-2 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-team"
            title={sidebarPinned ? '사이드바 고정 해제' : '사이드바 고정'}
          >
            <i className={sidebarPinned ? 'fas fa-thumbtack' : 'fas fa-thumbtack rotate-45'}></i>
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3">
          <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Team Dashboard</p>
          <a href={navHref('/team-ws-dashboard', workspaceId)} className="nav-item">
            <i className="fas fa-chart-line w-6 text-center text-lg"></i>
            <span className="sidebar-text">프로젝트 대시보드</span>
          </a>
          <a href={navHref('/team-ws-milestone', workspaceId)} className="nav-item active">
            <div className="relative w-6 text-center text-lg">
              <i className="fas fa-flag-checkered"></i>
              {hasWorkspaceData ? <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full border border-white bg-red-500"></span> : null}
            </div>
            <span className="sidebar-text">마일스톤 & 역할별 과제</span>
          </a>

          <div className="mx-2 my-2 h-px bg-gray-100"></div>
          <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Collaboration</p>

          <a href={navHref('/team-ws-kanban', workspaceId)} className="nav-item">
            <i className="fas fa-columns w-6 text-center text-lg"></i>
            <span className="sidebar-text">팀 칸반 (Jira)</span>
          </a>
          <a href={navHref('/team-ws-architecture', workspaceId)} className="nav-item">
            <i className="fas fa-project-diagram w-6 text-center text-lg"></i>
            <span className="sidebar-text">아키텍처 & API 설계</span>
          </a>
          <a href={navHref('/team-ws-qna', workspaceId)} className="nav-item">
            <i className="fas fa-comments w-6 text-center text-lg"></i>
            <span className="sidebar-text">멘토 Q&A</span>
          </a>

          <div className="mx-2 my-2 h-px bg-gray-100"></div>
          <p className="sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Resources & Live</p>

          <a href={navHref('/team-ws-schedule', workspaceId)} className="nav-item">
            <i className="fas fa-calendar-alt w-6 text-center text-lg"></i>
            <span className="sidebar-text">팀 캘린더 & 스케줄</span>
          </a>
          <a href={navHref('/team-ws-files', workspaceId)} className="nav-item">
            <i className="fas fa-folder-open w-6 text-center text-lg"></i>
            <span className="sidebar-text">통합 자료실</span>
          </a>
          <a href={navHref('/team-ws-meeting', workspaceId)} className="nav-item">
            <i className="fas fa-video w-6 text-center text-lg"></i>
            <span className="sidebar-text">라이브 미팅 & 회의록</span>
          </a>
        </nav>

        <a href="/profile" className="flex cursor-pointer items-center border-t border-gray-100 p-4 transition hover:bg-gray-50">
          <UserAvatar name={currentUserName} imageUrl={currentMember?.profileImage} className="h-10 w-10 border-2 border-gray-200 bg-white" iconClassName="text-sm" />
          <div className="sidebar-text">
            <p className="flex items-center gap-1 text-sm font-bold text-gray-900">
              {currentUserName}
              <span className={`rounded border px-1 py-0.5 text-[9px] ${myRoleMeta.roleBadgeClass}`}>{myRoleMeta.label}</span>
            </p>
            <p className="mt-0.5 text-[10px] text-gray-500">내 역할 확인하기</p>
          </div>
        </a>
      </aside>

      <div className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
        <TeamWorkspaceHeader
          workspaceId={workspaceId}
          pageKey="milestone"
          projectName={projectName}
          members={members}
        />
        <header className="hidden">
          <div className="flex min-w-0 items-center gap-3 font-bold text-gray-800">
            <span className="flex items-center gap-1 rounded-md border border-indigo-100 bg-team-light px-2 py-1 text-[10px] tracking-wider text-team">
              <i className="fas fa-puzzle-piece"></i> 팀 프로젝트
            </span>
            <span className="truncate">{projectName}</span>
          </div>

          <div className="relative flex shrink-0 items-center gap-4">
            <div className="mr-2 flex -space-x-2">
              {members.slice(0, 4).map((member) => (
                <UserAvatar
                  key={member.memberId}
                  name={member.learnerName ?? '팀원'}
                  imageUrl={member.profileImage}
                  className="h-8 w-8 border-2 border-white"
                  iconClassName="text-xs"
                />
              ))}
              <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-bold text-gray-500" title="멘토">
                <i className="fas fa-user-tie"></i>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen((current) => !current)}
                className="relative p-2 text-gray-400 transition hover:text-team"
                title="알림"
              >
                <i className="far fa-bell text-lg"></i>
                {notificationActive ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-red-500"></span> : null}
              </button>

              {notificationOpen ? (
                <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-50 p-4">
                    <h3 className="text-sm font-bold">팀 알림</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationCleared(true)
                        setNotificationOpen(false)
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      지우기
                    </button>
                  </div>
                  <div className="custom-scrollbar max-h-60 overflow-y-auto">
                    {notificationCleared || (!activities.length && !notices.length) ? (
                      <p className="p-6 text-center text-xs text-gray-400">새로운 팀 알림이 없습니다.</p>
                    ) : (
                      <>
                        {activities.slice(0, 2).map((activity) => (
                          <button
                            type="button"
                            key={`activity-${activity.logId}`}
                            onClick={() => goTo('/team-ws-milestone')}
                            className="block w-full cursor-pointer border-b border-gray-50 p-3 text-left hover:bg-gray-50"
                          >
                            <p className="text-xs text-gray-800">{activity.description}</p>
                            <span className="mt-1 inline-block text-[10px] text-gray-400">{formatRelativeTime(activity.createdAt)}</span>
                          </button>
                        ))}
                        {notices.slice(0, 2).map((notice) => (
                          <button
                            type="button"
                            key={`notice-${notice.id}`}
                            onClick={() => goTo('/team-ws-qna')}
                            className="block w-full cursor-pointer border-b border-gray-50 p-3 text-left hover:bg-gray-50"
                          >
                            <p className="text-xs text-gray-800">
                              <strong>{notice.title}</strong>
                            </p>
                            <span className="mt-1 inline-block text-[10px] font-bold text-brand">확인하기</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="custom-scrollbar relative flex-1 overflow-y-auto p-8">
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="mb-6 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
                  <i className="fas fa-flag-checkered text-team"></i> 마일스톤 및 역할별 과제
                </h1>
                <p className="mt-2 text-sm text-gray-500">팀 전체의 목표를 확인하고, 내 직군에 할당된 미션을 수행해 제출하세요.</p>
              </div>
            </div>

            <div className="mb-6 shrink-0 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex justify-between text-xs font-bold text-gray-500">
                <span>팀 프로젝트 로드맵</span>
                <span className="text-team">현재 Week {currentWeekId} 진행중</span>
              </div>
              <div className="relative flex items-start justify-between px-4">
                <div className="absolute left-8 right-8 top-4 z-0 h-1 rounded-full bg-gray-200"></div>
                <div className="absolute left-8 top-4 z-0 h-1 rounded-full bg-team transition-all duration-500" style={{ width: `calc((100% - 4rem) * ${progressPercent / 100})` }}></div>

                {weeks.map((week) => {
                  const isPast = week.id < selectedWeekId
                  const isActive = week.id === selectedWeekId

                  return (
                    <button
                      key={week.id}
                      type="button"
                      onClick={() => setSelectedWeekId(week.id)}
                      className="group relative z-10 flex flex-col items-center"
                    >
                      <span className={
                        isPast
                          ? 'flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-team text-xs font-bold text-white shadow-sm transition group-hover:scale-110'
                          : isActive
                            ? 'flex h-8 w-8 items-center justify-center rounded-full border-4 border-team bg-white text-xs font-bold text-team shadow-sm ring-4 ring-indigo-50 transition group-hover:scale-110'
                            : 'flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-gray-100 text-xs font-bold text-gray-400 shadow-sm transition group-hover:scale-110'
                      }>
                        {isPast ? <i className="fas fa-check"></i> : isActive ? <i className="fas fa-spinner fa-spin"></i> : week.id}
                      </span>
                      <span className={
                        isActive
                          ? 'mt-2 text-[10px] font-extrabold text-team'
                          : isPast
                            ? 'mt-2 text-[10px] font-bold text-gray-900'
                            : 'mt-2 text-[10px] font-bold text-gray-400'
                      }>
                        Week {week.id}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="custom-scrollbar mb-6 flex shrink-0 items-center gap-3 overflow-x-auto pb-2">
              {weeks.map((week) => (
                <button
                  key={week.id}
                  type="button"
                  onClick={() => setSelectedWeekId(week.id)}
                  className={
                    week.id === selectedWeekId
                      ? 'week-tab active relative flex items-center gap-2 rounded-xl border border-gray-900 px-5 py-2.5 text-sm'
                      : `week-tab rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold ${week.isCurrent ? 'bg-white text-gray-600' : 'bg-gray-50 text-gray-400'}`
                  }
                >
                  {week.tabLabel}
                  {week.isCurrent && week.id === selectedWeekId ? <span className="h-2 w-2 animate-pulse rounded-full bg-red-500"></span> : null}
                </button>
              ))}
            </div>

            <div className="relative mb-6 shrink-0 overflow-hidden rounded-2xl bg-gray-900 p-6 text-white shadow-lg">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-team opacity-20 blur-3xl"></div>
              <div className="relative z-10">
                <span className="mb-3 inline-block rounded bg-team px-2 py-1 text-[10px] font-extrabold text-white shadow-sm">WEEK {selectedWeek.id} MILESTONE</span>
                <h2 className="mb-2 text-xl font-black">{selectedWeek.title}</h2>
                <p className="mb-5 max-w-3xl text-sm leading-relaxed text-gray-300">{selectedWeek.description}</p>

                <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <h4 className="mb-2 border-b border-gray-700 pb-2 text-xs font-bold text-gray-400">멘토의 직군별 미션 안내</h4>
                  {guidelines.length > 0 ? (
                    guidelines.map((guideline) => (
                      <div key={guideline.id} className="flex items-start gap-3">
                        <span className={`mt-0.5 w-16 shrink-0 rounded border px-1.5 py-0.5 text-center text-[10px] font-extrabold ${ROLE_META[guideline.roleKey].missionBadgeClass}`}>
                          {guideline.role}
                        </span>
                        <p className="text-sm font-medium text-gray-200">{guideline.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 py-6 text-center text-sm text-gray-400">
                      이번 주차에 할당된 직군별 과제가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 pb-10 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                <div className="shrink-0 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                    <div>
                      <p className="mb-1 text-[10px] font-bold text-gray-500">내 담당 파트 제출란</p>
                      <h3 className="flex items-center gap-2 font-extrabold text-gray-900">
                        <span className={`rounded border px-2 py-0.5 text-xs ${myRoleMeta.roleBadgeClass}`}>{myRoleMeta.label}</span> 나의 과제 제출
                      </h3>
                    </div>
                    {mySubmissionStatus === 'pass' ? (
                      <span className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-extrabold text-green-600 shadow-sm">
                        <i className="fas fa-check-circle"></i> Pass 완료
                      </span>
                    ) : mySubmissionStatus === 'wait' ? (
                      <span className="flex items-center gap-1.5 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-extrabold text-yellow-600 shadow-sm">
                        <i className="fas fa-hourglass-half"></i> 리뷰 대기중
                      </span>
                    ) : (
                      <span className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-extrabold text-gray-500 shadow-sm">
                        미제출 (진행 전)
                      </span>
                    )}
                  </div>

                  {myPrimaryTask ? (
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="min-w-0">
                        <p className="mb-1 truncate text-xs font-bold text-gray-900">{myPrimaryTask.title}</p>
                        {findSubmissionLink(myPrimaryTask.description) ? (
                          <a href={findSubmissionLink(myPrimaryTask.description)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline">
                            <i className="fab fa-github"></i> GitHub PR 이동
                          </a>
                        ) : (
                          <p className="text-[11px] font-medium text-gray-400">제출 링크 미등록</p>
                        )}
                      </div>
                      {canResubmit ? (
                        <button
                          type="button"
                          onClick={() => openSubmitModal('resubmit', myPrimaryTask)}
                          className="whitespace-nowrap rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                          코드 수정/재제출
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8">
                      <i className="fas fa-cloud-upload-alt mb-3 text-3xl text-gray-300"></i>
                      <p className="mb-4 text-sm font-bold text-gray-500">이번 주 나의 역할 과제를 제출해주세요.</p>
                      <button
                        type="button"
                        onClick={() => openSubmitModal('new', null)}
                        className="rounded-xl bg-gray-900 px-6 py-2 text-xs font-bold text-white shadow-md transition hover:bg-black"
                      >
                        과제 제출하기
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex min-h-[400px] flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex shrink-0 items-center gap-2 rounded-t-2xl border-b border-gray-100 bg-gray-50 p-4">
                    <i className="fas fa-comments text-gray-400"></i>
                    <h3 className="text-sm font-bold text-gray-900">멘토 피드백 노트 ({myRoleMeta.label} 전용)</h3>
                  </div>

                  <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
                    {feedbackThread.length === 0 ? (
                      <div className="p-8 text-center text-sm font-bold text-gray-400">제출된 과제가 없거나 코멘트가 없습니다.</div>
                    ) : (
                      <>
                        {feedbackThread.map((thread) => (
                          thread.isMe ? (
                            <div key={thread.id} className="flex gap-4">
                              <UserAvatar name={currentUserName} imageUrl={currentMember?.profileImage} className="h-10 w-10 border border-gray-200 bg-white shadow-sm" iconClassName="text-sm" />
                              <div>
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-900">나 ({myRoleMeta.shortLabel})</span>
                                  <span className="text-[10px] text-gray-400">{thread.time}</span>
                                </div>
                                <div className="whitespace-pre-line rounded-2xl rounded-tl-none border border-blue-100 bg-blue-50 p-4 text-sm font-medium leading-relaxed text-gray-800">{thread.text}</div>
                              </div>
                            </div>
                          ) : (
                            <div key={thread.id} className="flex gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-lg text-white shadow-sm">
                                <i className="fas fa-user-tie"></i>
                              </div>
                              <div>
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-sm font-bold text-gray-900">
                                    프론트엔드 장인 <i className="fas fa-check-circle text-[10px] text-brand" title="공식 멘토"></i>
                                  </span>
                                  <span className="text-[10px] text-gray-400">{thread.time}</span>
                                </div>
                                <div className="whitespace-pre-line rounded-2xl rounded-tl-none border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">{thread.text}</div>
                              </div>
                            </div>
                          )
                        ))}
                        {mySubmissionStatus === 'wait' ? (
                          <div className="flex gap-4">
                            <UserAvatar name={currentUserName} imageUrl={currentMember?.profileImage} className="h-10 w-10 border border-gray-200 bg-white opacity-50 shadow-sm" iconClassName="text-sm" />
                            <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-gray-200 bg-gray-100 p-3 text-sm font-medium text-gray-500">
                              <i className="fas fa-spinner fa-spin"></i> 멘토님의 리뷰를 기다리고 있습니다.
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="shrink-0 rounded-b-2xl border-t border-gray-100 bg-white p-4">
                    <div className="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 transition focus-within:border-team">
                      <textarea
                        className="custom-scrollbar h-12 flex-1 resize-none border-none bg-transparent p-2 text-sm outline-none"
                        placeholder={myPrimaryTask ? '멘토님께 코멘트 남기기' : '과제 제출 전입니다.'}
                        disabled={!myPrimaryTask}
                      ></textarea>
                      <button
                        type="button"
                        onClick={() => setSuccessModalOpen(true)}
                        disabled={!myPrimaryTask}
                        className="flex w-12 items-center justify-center rounded-lg bg-gray-900 text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-extrabold text-gray-900">
                    <i className="fas fa-users text-team"></i> 팀원 제출 현황 (Week {selectedWeek.id})
                  </h3>

                  <div className="mb-5 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    {teamStatus.map((member) => (
                      <div key={member.id} className={`flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 transition ${member.status === 'none' ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="flex items-center gap-3">
                          {member.profileImage ? (
                            <img src={member.profileImage} alt={`${member.name} profile`} className="h-8 w-8 rounded-full border border-gray-200 bg-gray-50 object-cover" />
                          ) : (
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.seed}`} alt={`${member.name} avatar`} className="h-8 w-8 rounded-full border border-gray-200 bg-gray-50" />
                          )}
                          <div>
                            <p className="flex items-center gap-1 text-xs font-bold text-gray-900">
                              {member.name}
                              <span className={`rounded border px-1 py-0.5 text-[9px] ${ROLE_META[member.roleKey].teamBadgeClass}`}>{member.roleLabel}</span>
                            </p>
                          </div>
                        </div>
                        {member.status === 'pass' ? (
                          <span className="rounded-lg bg-green-100 px-2 py-1 text-[10px] font-bold text-green-600">
                            <i className="fas fa-check mr-0.5"></i> Pass 완료
                          </span>
                        ) : member.status === 'wait' ? (
                          <span className="rounded-lg bg-yellow-100 px-2 py-1 text-[10px] font-bold text-yellow-600">리뷰 대기중</span>
                        ) : member.status === 'working' ? (
                          <span className="rounded-lg border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
                            <i className="fas fa-spinner fa-spin mr-0.5"></i> 작업 중
                          </span>
                        ) : (
                          <span className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400">진행 전</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <p className="mb-1 text-[10px] font-bold text-gray-500">우리 팀 이번 주 제출률</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div className="h-1.5 bg-team transition-all duration-500" style={{ width: `${teamSubmitPercent}%` }}></div>
                      </div>
                      <span className="w-8 text-right text-xs font-black text-gray-800">{submittedTeamCount}/{teamStatus.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {submitModalOpen ? (
        <div className="modal-overlay active fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={executeSubmit} className="modal-content relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">{submissionMode === 'resubmit' ? '과제 수정본 제출하기' : '내 파트 과제 제출하기'}</h3>
                <p className="mt-1 text-xs font-bold text-blue-600">{myRoleMeta.label} 직군 과제</p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-700">결과물 링크 (GitHub PR 등)</label>
                <div className="relative">
                  <i className="fab fa-github absolute left-3 top-3.5 text-gray-400"></i>
                  <input
                    value={submissionForm.link}
                    onChange={(event) => setSubmissionForm((current) => ({ ...current, link: event.target.value }))}
                    type="url"
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-700">멘토님께 남길 코멘트</label>
                <textarea
                  value={submissionForm.comment}
                  onChange={(event) => setSubmissionForm((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="구현 내용이나 질문을 남겨주세요."
                  className="h-32 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                ></textarea>
              </div>
              {submitError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500">{submitError}</p> : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>} 제출하기
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {successModalOpen ? (
        <div className="modal-overlay active fixed inset-0 z-[1060] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSuccessModalOpen(false)}
          ></button>
          <div className="modal-content relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-100 bg-green-50 shadow-sm">
              <i className="fas fa-check text-3xl text-brand"></i>
            </div>
            <h3 className="mb-2 text-xl font-extrabold text-gray-900">제출 완료!</h3>
            <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">성공적으로 처리되었습니다.</p>
            <button
              type="button"
              onClick={() => setSuccessModalOpen(false)}
              className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
