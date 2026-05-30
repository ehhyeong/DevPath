import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import AuthModal, { type AuthView } from './components/AuthModal'
import SquadWorkspaceAside from './components/SquadWorkspaceAside'
import SquadWorkspaceHeader from './components/SquadWorkspaceHeader'
import UserAvatar from './components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { PROFILE_UPDATED_EVENT, type ProfileSyncPayload } from './lib/profile-sync'
import { projectApiRequest } from './project-api'
import { createSquadNotification, squadActorName } from './squad-notifications'

type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
type ChatTab = 'team' | 'dm'

type DocumentPictureInPictureOptions = {
  width?: number
  height?: number
  disallowReturnToOpener?: boolean
  preferInitialWindowPlacement?: boolean
}

type DocumentPictureInPictureController = {
  window: Window | null
  requestWindow: (options?: DocumentPictureInPictureOptions) => Promise<Window>
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureController
  }
}

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  joinedAt?: string | null
}

type WorkspaceDashboard = {
  workspaceId: number
  name: string
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

type CalendarEvent = {
  eventId: number
  workspaceId: number
  title: string
  description?: string | null
  startAt: string
  endAt?: string | null
  createdById?: number | null
}

type Notice = {
  id: number
  workspaceId: number
  title: string
  content: string
  createdAt?: string | null
  updatedAt?: string | null
}

type ActivityLog = {
  logId: number
  workspaceId: number
  actorId?: number | null
  activityType?: string | null
  description?: string | null
  createdAt?: string | null
}

type WorkspaceErdChange = {
  versionId: number
  workspaceId: number
  version: number
  summary?: string | null
  updatedById?: number | null
  updatedByName?: string | null
  createdAt?: string | null
}

type VoiceChannel = {
  channelId: number
  workspaceId: number
  name: string
  description?: string | null
  activeParticipantCount?: number | null
  currentSessionStartedAt?: string | null
  createdAt?: string | null
}

type TeamMessage = {
  messageId: number
  loungeId: number
  senderId: number
  senderName: string
  isMine: boolean
  content: string
  createdAt: string
}

type DirectMessage = {
  messageId: number
  senderId: number
  senderName: string
  receiverId: number
  receiverName: string
  isMine: boolean
  content: string
  createdAt: string
}

function copyDocumentPictureInPictureStyles(pipWindow: Window) {
  const baseStyle = pipWindow.document.createElement('style')
  baseStyle.textContent = `
    html, body, #squad-dashboard-pip-root {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
    }

    body {
      background: #F8F9FA;
      font-family: 'Pretendard', sans-serif;
    }
  `
  pipWindow.document.head.appendChild(baseStyle)

  Array.from(document.styleSheets).forEach((styleSheet) => {
    if (styleSheet.href) {
      const link = pipWindow.document.createElement('link')
      link.rel = 'stylesheet'
      link.href = styleSheet.href
      link.media = styleSheet.media.mediaText
      pipWindow.document.head.appendChild(link)
      return
    }

    try {
      const rules = Array.from(styleSheet.cssRules).map((rule) => rule.cssText).join('\n')
      const style = pipWindow.document.createElement('style')
      style.textContent = rules
      pipWindow.document.head.appendChild(style)
    } catch {
      // Cross-origin or browser-managed inline styles can be skipped safely.
    }
  })
}

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return '방금 전'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffHours < 1) {
    return '방금 전'
  }

  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  if (diffDays === 1) {
    return '어제'
  }

  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

function formatChatTime(value?: string | null) {
  if (!value) {
    return new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  }

  return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

function formatEventMonth(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Now'
  }

  return date.toLocaleString('en-US', { month: 'short' })
}

function formatEventDay(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return String(date.getDate())
}

function getDday(value: string) {
  const target = new Date(value)

  if (Number.isNaN(target.getTime())) {
    return 'D-?'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)

  if (diff <= 0) {
    return 'D-Day'
  }

  return `D-${diff}`
}

function stripScheduleCategoryDescription(value?: string | null) {
  return (value ?? '').replace(/^\[schedule-category:(milestone|meeting|task-fe|task-be)\]\n?/, '').trim()
}

function stripNoticePrefix(title: string) {
  return title.replace(/^\[필독]\s*/, '')
}

function isImportantNotice(notice: Notice, index: number) {
  return notice.title.startsWith('[필독]') || index === 0
}

function percent(count: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.max(8, Math.round((count / total) * 100))
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

function activityIcon(type?: string | null) {
  switch (type) {
    case 'TASK_CREATED':
      return { icon: 'fa-tasks', className: 'bg-blue-50 text-blue-500' }
    case 'FILE_UPLOADED':
      return { icon: 'fa-folder-open', className: 'bg-purple-50 text-purple-500' }
    case 'MEETING_NOTE_CREATED':
      return { icon: 'fa-headset', className: 'bg-orange-50 text-orange-500' }
    case 'MEMBER_JOINED':
      return { icon: 'fa-user-plus', className: 'bg-brand/10 text-brand' }
    default:
      return { icon: 'fa-check', className: 'bg-brand/10 text-brand' }
  }
}

function activityFallback(type?: string | null) {
  switch (type) {
    case 'TASK_CREATED':
      return '새 작업 카드가 생성되었습니다.'
    case 'FILE_UPLOADED':
      return '새 팀 자료가 업로드되었습니다.'
    case 'DOC_UPDATED':
      return '문서가 업데이트되었습니다.'
    case 'MEETING_NOTE_CREATED':
      return '회의록이 작성되었습니다.'
    case 'MILESTONE_CREATED':
      return '새 마일스톤이 생성되었습니다.'
    case 'MEMBER_JOINED':
      return '새 팀원이 합류했습니다.'
    default:
      return '팀 활동이 기록되었습니다.'
  }
}

function statusLabel(status?: WorkspaceStatus | null) {
  return status === 'ARCHIVED' ? '완료' : '진행 중'
}

function readSidebarPinned() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem('sidebarPinned') === 'true'
}

function storeSidebarPinned(value: boolean) {
  window.localStorage.setItem('sidebarPinned', value ? 'true' : 'false')
}

export default function SquadDashboardApp() {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [erdChanges, setErdChanges] = useState<WorkspaceErdChange[]>([])
  const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([])
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [selectedDmMember, setSelectedDmMember] = useState<WorkspaceMember | null>(null)
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [directInput, setDirectInput] = useState('')
  const [directLoading, setDirectLoading] = useState(false)
  const [profileImageOverride, setProfileImageOverride] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInPip, setChatInPip] = useState(false)
  const [chatPipContainer, setChatPipContainer] = useState<HTMLElement | null>(null)
  const [chatTab, setChatTab] = useState<ChatTab>('team')
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [noticeType, setNoticeType] = useState<'important' | 'normal'>('important')
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [sidebarPinned, setSidebarPinned] = useState(readSidebarPinned)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  const directScrollRef = useRef<HTMLDivElement | null>(null)
  const pipChatScrollRef = useRef<HTMLDivElement | null>(null)
  const pipDirectScrollRef = useRef<HTMLDivElement | null>(null)
  const chatPipWindowRef = useRef<Window | null>(null)
  const dashboardRefreshRef = useRef(false)

  const loadDashboardData = useCallback(async (options?: { signal?: AbortSignal; blocking?: boolean; silent?: boolean }) => {
    if (!workspaceId) {
      return
    }

    if (options?.blocking) {
      setLoading(true)
    }
    if (!options?.silent) {
      setError(null)
    }

    try {
      const [dashboardData, taskData, eventData, noticeData, activityData, erdChangeData, voiceChannelData, messageData] =
        await Promise.all([
          projectApiRequest<WorkspaceDashboard>(
            `/api/workspaces/${workspaceId}/dashboard`,
            { signal: options?.signal },
            'required',
          ),
          projectApiRequest<WorkspaceTask[]>(
            `/api/workspaces/${workspaceId}/tasks`,
            { signal: options?.signal },
            'required',
          ),
          projectApiRequest<CalendarEvent[]>(
            `/api/workspaces/${workspaceId}/calendar-events`,
            { signal: options?.signal },
            'required',
          ),
          projectApiRequest<Notice[]>(
            `/api/workspaces/${workspaceId}/notices`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<ActivityLog[]>(
            `/api/workspaces/${workspaceId}/activities/recent`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<WorkspaceErdChange[]>(
            `/api/workspaces/${workspaceId}/erd/recent-changes`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<VoiceChannel[]>(
            `/api/workspaces/${workspaceId}/voice-channels`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
          projectApiRequest<TeamMessage[]>(
            `/api/lounge/chats/messages?loungeId=${workspaceId}`,
            { signal: options?.signal },
            'required',
          ).catch(() => []),
        ])

      if (options?.signal?.aborted) {
        return
      }

      setDashboard(dashboardData)
      setTasks(taskData ?? [])
      setEvents((eventData ?? []).sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()))
      setNotices(noticeData ?? [])
      setActivities(activityData ?? [])
      setErdChanges(erdChangeData ?? [])
      setVoiceChannels(voiceChannelData ?? [])
      setMessages(messageData ?? [])
    } catch (loadError) {
      if (!options?.signal?.aborted && !options?.silent) {
        const message = loadError instanceof Error ? loadError.message : '스쿼드 대시보드를 불러오지 못했습니다.'
        setError(message)
      }
    } finally {
      if (!options?.signal?.aborted && options?.blocking) {
        setLoading(false)
      }
    }
  }, [workspaceId])

  useEffect(() => {
    document.title = 'DevPath - 스쿼드 대시보드'
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
    const syncProfile = (event: Event) => {
      const profileEvent = event as CustomEvent<ProfileSyncPayload>
      setProfileImageOverride(profileEvent.detail?.profileImage ?? null)
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, syncProfile)

    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, syncProfile)
  }, [])

  useEffect(() => {
    return () => {
      if (chatPipWindowRef.current && !chatPipWindowRef.current.closed) {
        chatPipWindowRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    const currentSession = readStoredAuthSession()
    setSession(currentSession)

    if (!workspaceId) {
      setError('워크스페이스 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    if (!currentSession?.accessToken) {
      setLoading(false)
      setAuthView('login')
      showAuthToast({ message: '스쿼드 대시보드는 로그인 후 이용할 수 있습니다.', durationMs: 2200 })
      return
    }

    const controller = new AbortController()
    void loadDashboardData({ signal: controller.signal, blocking: true })

    return () => controller.abort()
  }, [loadDashboardData, workspaceId])

  useEffect(() => {
    if (!workspaceId || !session?.accessToken || loading) {
      return undefined
    }

    async function refreshDashboardData() {
      if (document.hidden || dashboardRefreshRef.current) {
        return
      }

      dashboardRefreshRef.current = true
      try {
        await loadDashboardData({ silent: true })
      } finally {
        dashboardRefreshRef.current = false
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshDashboardData()
    }, 5000)
    const refreshOnFocus = () => {
      void refreshDashboardData()
    }
    const refreshOnVisible = () => {
      if (!document.hidden) {
        void refreshDashboardData()
      }
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisible)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [loadDashboardData, loading, session?.accessToken, workspaceId])

  useEffect(() => {
    if (!workspaceId || !session?.accessToken) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      void refreshTeamMessages()
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [workspaceId, session?.accessToken])

  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }

    if (chatOpen && pipChatScrollRef.current) {
      pipChatScrollRef.current.scrollTop = pipChatScrollRef.current.scrollHeight
    }
  }, [chatOpen, messages])

  useEffect(() => {
    if (!workspaceId || !session?.accessToken || !selectedDmMember) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      void loadDirectMessages(selectedDmMember, true)
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [workspaceId, session?.accessToken, selectedDmMember])

  useEffect(() => {
    if (directScrollRef.current) {
      directScrollRef.current.scrollTop = directScrollRef.current.scrollHeight
    }

    if (pipDirectScrollRef.current) {
      pipDirectScrollRef.current.scrollTop = pipDirectScrollRef.current.scrollHeight
    }
  }, [selectedDmMember, directMessages])

  const memberById = useMemo(() => {
    const map = new Map<number, WorkspaceMember>()
    dashboard?.members.forEach((member) => map.set(member.learnerId, member))
    return map
  }, [dashboard])

  const currentMember = session?.userId ? memberById.get(session.userId) : null
  const currentUserName = currentMember?.learnerName ?? session?.name ?? '사용자'
  const currentProfileImage = profileImageOverride ?? currentMember?.profileImage ?? null
  const activeMembers = dashboard?.members ?? []
  const myTasks = tasks.filter((task) => session?.userId && task.assigneeId === session.userId)
  const taskTotal = myTasks.length
  const todoCount = myTasks.filter((task) => task.status === 'TODO').length
  const doingCount = myTasks.filter((task) => task.status === 'IN_PROGRESS').length
  const doneCount = myTasks.filter((task) => task.status === 'DONE').length
  const liveVoiceChannel = voiceChannels.find((channel) => (channel.activeParticipantCount ?? 0) > 0)
  const goalRemainingPercent = taskTotal > 0 ? Math.max(0, 100 - percent(doneCount, taskTotal)) : 35
  const hasAnyDashboardData =
    taskTotal > 0 || events.length > 0 || notices.length > 0 || activities.length > 0 || messages.length > 0
  const hasDashboardBodyData =
    taskTotal > 0 || events.length > 0 || notices.length > 0 || activities.length > 0 || erdChanges.length > 0 || Boolean(liveVoiceChannel)
  const upcomingEvents = events.slice(0, 3)
  const sideProjectName = dashboard?.name ?? '새로운 스쿼드'
  const dmMembers = activeMembers.filter((member) => member.learnerId !== session?.userId)

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

  function closeChatSurface() {
    if (chatPipWindowRef.current && !chatPipWindowRef.current.closed) {
      chatPipWindowRef.current.close()
    }

    chatPipWindowRef.current = null
    setChatPipContainer(null)
    setChatInPip(false)
    setChatOpen(false)
  }

  async function openChatSurface() {
    const documentPictureInPicture = window.documentPictureInPicture

    if (!documentPictureInPicture) {
      setChatInPip(false)
      setChatOpen(true)
      return
    }

    if (chatPipWindowRef.current && !chatPipWindowRef.current.closed) {
      chatPipWindowRef.current.focus()
      return
    }

    try {
      const pipWindow = await documentPictureInPicture.requestWindow({
        width: 400,
        height: 640,
      })
      const root = pipWindow.document.createElement('div')

      pipWindow.document.title = dashboard?.name?.trim() || '스쿼드 소통방'
      root.id = 'squad-dashboard-pip-root'
      pipWindow.document.body.append(root)
      try {
        copyDocumentPictureInPictureStyles(pipWindow)
      } catch {
        // Keep the PiP window open even if one stylesheet cannot be mirrored.
      }
      pipWindow.addEventListener(
        'pagehide',
        () => {
          chatPipWindowRef.current = null
          setChatPipContainer(null)
          setChatInPip(false)
          setChatOpen(false)
        },
        { once: true },
      )

      chatPipWindowRef.current = pipWindow
      setChatPipContainer(root)
      setChatInPip(true)
      setChatOpen(true)
    } catch {
      setChatInPip(false)
      setChatOpen(true)
      showAuthToast({ message: 'PiP 창을 열 수 없어 일반 채팅창으로 열었습니다.', durationMs: 1800 })
    }
  }

  async function refreshTeamMessages() {
    if (!workspaceId || !readStoredAuthSession()?.accessToken) {
      return
    }

    try {
      const nextMessages = await projectApiRequest<TeamMessage[]>(
        `/api/lounge/chats/messages?loungeId=${workspaceId}`,
        {},
        'required',
      )

      setMessages(nextMessages ?? [])
    } catch {
      // Keep the last successful chat snapshot during transient polling failures.
    }
  }

  async function sendTeamMessage(content = messageInput.trim()) {
    if (!workspaceId || !content) {
      return
    }

    try {
      const created = await projectApiRequest<TeamMessage>(
        '/api/lounge/chats/messages',
        {
          method: 'POST',
          body: JSON.stringify({ loungeId: workspaceId, content }),
        },
        'required',
      )

      setMessages((current) => [...current, created])
      setMessageInput('')
      setPlusMenuOpen(false)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-dashboard',
        message: `${squadActorName(session?.name)}님이 스쿼드 채팅에 메시지를 보냈습니다.`,
        targetPath: '/squad-dashboard',
      })
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : '메시지를 보내지 못했습니다.'
      showAuthToast({ message, variant: 'error', durationMs: 2200 })
    }
  }

  async function loadDirectMessages(member: WorkspaceMember, silent = false) {
    if (!workspaceId) {
      return
    }

    if (!silent) {
      setDirectLoading(true)
    }

    try {
      const nextMessages = await projectApiRequest<DirectMessage[]>(
        `/api/workspaces/${workspaceId}/direct-messages/${member.learnerId}`,
        {},
        'required',
      )

      setDirectMessages(nextMessages ?? [])
    } catch (loadError) {
      if (!silent) {
        const message = loadError instanceof Error ? loadError.message : '1:1 메시지를 불러오지 못했습니다.'
        showAuthToast({ message, variant: 'error', durationMs: 2200 })
      }
    } finally {
      if (!silent) {
        setDirectLoading(false)
      }
    }
  }

  async function openDirectRoom(member: WorkspaceMember) {
    setSelectedDmMember(member)
    setDirectMessages([])
    await loadDirectMessages(member)
  }

  async function sendDirectMessage() {
    if (!workspaceId || !selectedDmMember || !directInput.trim()) {
      return
    }

    const content = directInput.trim()

    try {
      const created = await projectApiRequest<DirectMessage>(
        `/api/workspaces/${workspaceId}/direct-messages`,
        {
          method: 'POST',
          body: JSON.stringify({ receiverId: selectedDmMember.learnerId, content }),
        },
        'required',
      )

      setDirectMessages((current) => [...current, created])
      setDirectInput('')
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-dashboard',
        message: `${squadActorName(session?.name)}님이 ${selectedDmMember.learnerName ?? '팀원'}님에게 1:1 메시지를 보냈습니다.`,
        targetPath: '/squad-dashboard',
      })
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : '1:1 메시지를 보내지 못했습니다.'
      showAuthToast({ message, variant: 'error', durationMs: 2200 })
    }
  }

  function sendPlusMessage(type: 'code' | 'meeting' | 'remind') {
    const contentByType = {
      code: '[코드 공유] 확인이 필요한 코드 스니펫을 공유했습니다.',
      meeting: '[회의 초대] 주간 스프린트 회의 링크를 공유했습니다.',
      remind: '[마감 리마인더] 오늘 마감 작업을 확인해주세요.',
    }

    void sendTeamMessage(contentByType[type])
  }

  async function createNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !noticeTitle.trim() || !noticeContent.trim()) {
      return
    }

    const title = noticeType === 'important' ? `[필독] ${noticeTitle.trim()}` : noticeTitle.trim()

    try {
      const created = await projectApiRequest<Notice>(
        `/api/workspaces/${workspaceId}/notices`,
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            content: noticeContent.trim(),
          }),
        },
        'required',
      )

      setNotices((current) => [created, ...current])
      setNoticeTitle('')
      setNoticeContent('')
      setNoticeType('important')
      setNoticeModalOpen(false)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-dashboard',
        message: `${squadActorName(session?.name)}님이 공지 "${created.title}"을 등록했습니다.`,
        targetPath: '/squad-dashboard',
      })
      showAuthToast({ message: '공지사항이 등록되었습니다.', durationMs: 1800 })
    } catch (noticeError) {
      const message = noticeError instanceof Error ? noticeError.message : '공지사항을 등록하지 못했습니다.'
      showAuthToast({ message, variant: 'error', durationMs: 2200 })
    }
  }

  function toggleSidebarPin(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    setSidebarPinned((current) => {
      const next = !current
      storeSidebarPinned(next)
      return next
    })
  }

  function renderMemberAvatar(member: WorkspaceMember, className: string, iconClassName = 'text-sm') {
    const imageUrl = member.learnerId === session?.userId ? currentProfileImage : member.profileImage

    return (
      <UserAvatar
        key={member.memberId}
        name={member.learnerName ?? '사용자'}
        imageUrl={imageUrl}
        className={className}
        iconClassName={iconClassName}
        alt={member.learnerName ?? '사용자'}
      />
    )
  }

  function renderActivity(activity: ActivityLog) {
    const actor = activity.actorId ? memberById.get(activity.actorId) : null
    const icon = activityIcon(activity.activityType)

    return (
      <div key={activity.logId} className="relative flex gap-5 pb-6 timeline-item timeline-line group">
        <div className={`w-10 h-10 rounded-full ${icon.className} flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10 relative group-hover:scale-110 transition`}>
          <i className={`fas ${icon.icon}`}></i>
        </div>
        <div className="flex-1 bg-gray-50 border border-gray-100 p-4 rounded-2xl hover-card">
          <div className="flex justify-between items-start mb-1.5">
            <p className="text-sm font-bold text-gray-900">
              {actor?.learnerName ? <span className="text-blue-600">{actor.learnerName}</span> : null}
              {actor?.learnerName ? '님이 ' : ''}
              {activity.description || activityFallback(activity.activityType)}
            </p>
            <span className="text-[10px] text-gray-400 font-bold bg-white px-2 py-0.5 rounded border border-gray-100 shadow-sm">
              {formatShortDate(activity.createdAt)}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{activity.activityType ?? 'TEAM_ACTIVITY'}</p>
        </div>
      </div>
    )
  }

  function renderErdChange(change: WorkspaceErdChange) {
    const title = change.summary?.trim() || `ERD v${change.version} 저장`
    const authorName = change.updatedByName?.trim() || '팀원'

    return (
      <div key={change.versionId} className="hover-card p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100">
          <i className="fas fa-table text-sm"></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
            <span className="text-[10px] text-gray-400 font-bold shrink-0 ml-2">{formatShortDate(change.createdAt)}</span>
          </div>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            {authorName}님이 <code className="px-1.5 py-0.5 bg-gray-200 text-red-500 rounded font-mono text-[11px]">v{change.version}</code> 설계를 저장했습니다.
          </p>
        </div>
      </div>
    )
  }

  function renderTeamMessage(message: TeamMessage) {
    const sender = memberById.get(message.senderId)
    const imageUrl = message.isMine ? currentProfileImage : sender?.profileImage ?? null
    const senderName = sender?.learnerName ?? message.senderName

    if (message.isMine) {
      return (
        <div key={message.messageId} className="flex flex-col items-end gap-1 fade-in">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-[9px] font-bold text-gray-400">{formatChatTime(message.createdAt)}</span>
          </div>
          <div className="bg-gray-900 text-white text-sm px-3.5 py-2 rounded-2xl rounded-tr-none shadow-sm inline-block max-w-[80%] leading-relaxed">
            {message.content}
          </div>
        </div>
      )
    }

    return (
      <div key={message.messageId} className="flex gap-2.5 items-start fade-in">
        <UserAvatar
          name={senderName}
          imageUrl={imageUrl}
          className="w-8 h-8 border border-gray-200 shadow-sm bg-white"
          iconClassName="text-xs"
        />
        <div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xs font-bold text-gray-900">{senderName}</span>
            <span className="text-[9px] font-bold text-gray-400">{formatChatTime(message.createdAt)}</span>
          </div>
          <div className="bg-white border border-gray-100 text-sm text-gray-700 px-3.5 py-2 rounded-2xl rounded-tl-none shadow-sm inline-block leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  function renderDirectMessage(message: DirectMessage) {
    const sender = memberById.get(message.senderId)
    const imageUrl = message.isMine ? currentProfileImage : sender?.profileImage ?? selectedDmMember?.profileImage ?? null
    const senderName = sender?.learnerName ?? message.senderName

    if (message.isMine) {
      return (
        <div key={message.messageId} className="flex flex-col items-end gap-1 fade-in">
          <span className="text-[9px] font-bold text-gray-400">{formatChatTime(message.createdAt)}</span>
          <div className="bg-gray-900 text-white text-sm px-3.5 py-2 rounded-2xl rounded-tr-none shadow-sm inline-block max-w-[80%] leading-relaxed">
            {message.content}
          </div>
        </div>
      )
    }

    return (
      <div key={message.messageId} className="flex gap-2.5 items-start fade-in">
        <UserAvatar
          name={senderName}
          imageUrl={imageUrl}
          className="w-8 h-8 border border-gray-200 shadow-sm bg-white"
          iconClassName="text-xs"
        />
        <div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xs font-bold text-gray-900">{senderName}</span>
            <span className="text-[9px] font-bold text-gray-400">{formatChatTime(message.createdAt)}</span>
          </div>
          <div className="bg-white border border-gray-100 text-sm text-gray-700 px-3.5 py-2 rounded-2xl rounded-tl-none shadow-sm inline-block leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  function renderPipChat() {
    return (
      <div className="squad-dashboard-page flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-gray-800">
        <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4 bg-white shrink-0">
          <h2 className="font-extrabold text-sm text-gray-900 flex items-center gap-2 truncate">
            <i className="fas fa-comments text-brand"></i>
            <span className="truncate">{dashboard?.name ?? '스쿼드 소통방'}</span>
          </h2>
          <button
            onClick={closeChatSurface}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
            title="닫기"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50/50 shrink-0 px-2">
          <button onClick={() => setChatTab('team')} className={chatTab === 'team' ? 'flex-1 py-2.5 text-xs font-bold text-brand border-b-2 border-brand transition' : 'flex-1 py-2.5 text-xs font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition'}>
            팀 채팅
          </button>
          <button onClick={() => setChatTab('dm')} className={chatTab === 'dm' ? 'flex-1 py-2.5 text-xs font-bold text-gray-900 border-b-2 border-gray-900 transition' : 'flex-1 py-2.5 text-xs font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition'}>
            1:1 메시지
          </button>
        </div>

        {chatTab === 'team' ? (
          <div className="flex-1 flex min-h-0 flex-col overflow-hidden bg-[#F8F9FA]">
            <div ref={pipChatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length > 0 ? (
                <>
                  <div className="flex justify-center"><span className="bg-gray-200/70 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">오늘</span></div>
                  {messages.map(renderTeamMessage)}
                </>
              ) : (
                <div className="min-h-full flex flex-col items-center justify-center text-center opacity-70">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <i className="fas fa-hand-sparkles text-xl text-gray-400"></i>
                  </div>
                  <p className="text-gray-700 font-bold text-sm">스쿼드 소통방이 열렸습니다.</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">팀원들에게 첫 메시지를 보내보세요.</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 pr-2 focus-within:border-gray-400 transition shadow-sm">
                <input
                  type="text"
                  className="flex-1 bg-transparent text-sm outline-none px-3 font-medium"
                  placeholder="메시지 보내기..."
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void sendTeamMessage()
                    }
                  }}
                />
                <button onClick={() => void sendTeamMessage()} className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-green-600 transition shrink-0 shadow-sm">
                  <i className="fas fa-paper-plane text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 flex-col overflow-hidden bg-white">
            {selectedDmMember ? (
              <>
                <div className="h-12 border-b border-gray-100 px-3 flex items-center gap-2 shrink-0 bg-white">
                  <button
                    onClick={() => {
                      setSelectedDmMember(null)
                      setDirectMessages([])
                      setDirectInput('')
                    }}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition"
                    title="대화 목록"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>
                  {renderMemberAvatar(selectedDmMember, 'w-8 h-8 border border-gray-200 bg-gray-50', 'text-xs')}
                  <p className="text-sm font-extrabold text-gray-900 truncate">{selectedDmMember.learnerName ?? '팀원'}</p>
                </div>

                <div ref={pipDirectScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#F8F9FA]">
                  {directLoading ? (
                    <div className="min-h-full flex items-center justify-center text-xs font-bold text-gray-400">
                      메시지를 불러오는 중입니다.
                    </div>
                  ) : directMessages.length > 0 ? (
                    <>
                      <div className="flex justify-center"><span className="bg-gray-200/70 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">오늘</span></div>
                      {directMessages.map(renderDirectMessage)}
                    </>
                  ) : (
                    <div className="min-h-full flex flex-col items-center justify-center text-center opacity-70">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <i className="fas fa-paper-plane text-xl text-gray-400"></i>
                      </div>
                      <p className="text-gray-700 font-bold text-sm">아직 메시지가 없습니다.</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">첫 1:1 메시지를 보내보세요.</p>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 pr-2 focus-within:border-gray-400 transition shadow-sm">
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-sm outline-none px-3 font-medium"
                      placeholder="1:1 메시지 보내기..."
                      value={directInput}
                      onChange={(event) => setDirectInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void sendDirectMessage()
                        }
                      }}
                    />
                    <button onClick={() => void sendDirectMessage()} className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-green-600 transition shrink-0 shadow-sm">
                      <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                  </div>
                </div>
              </>
            ) : dmMembers.length > 0 ? (
              <div className="p-2 overflow-y-auto custom-scrollbar">
                {dmMembers.map((member) => (
                  <button
                    type="button"
                    key={member.memberId}
                    onClick={() => void openDirectRoom(member)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl cursor-pointer transition border-b border-gray-50"
                  >
                    <div className="relative">
                      {renderMemberAvatar(member, 'w-10 h-10 border border-gray-200 bg-gray-50', 'text-sm')}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900">{member.learnerName ?? '팀원'}</h4>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">1:1 메시지를 시작해보세요.</p>
                    </div>
                    <i className="fas fa-chevron-right text-[10px] text-gray-300"></i>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                <i className="fas fa-user-friends text-3xl text-gray-200 mb-3"></i>
                <p className="text-gray-500 font-bold text-sm">대화 가능한 팀원이 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
          <p className="text-sm font-bold text-gray-500">스쿼드 대시보드를 불러오는 중입니다.</p>
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
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
          <AuthModal
            view={authView}
            onClose={() => setAuthView(null)}
            onViewChange={setAuthView}
            onAuthenticated={handleAuthenticated}
          />
        ) : null}
      </div>
    )
  }

  const showChatPanel = chatOpen && !chatInPip

  return (
    <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800">
      <SquadWorkspaceAside
        activePage="dashboard"
        workspaceId={workspaceId}
        projectName={sideProjectName}
        pinned={sidebarPinned}
        onTogglePinned={toggleSidebarPin}
        reviewBadgeCount={hasAnyDashboardData ? 1 : 0}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          workspaceId={workspaceId}
          projectName={dashboard?.name ?? '새 스쿼드 프로젝트'}
          members={activeMembers}
          statusLabel={hasAnyDashboardData ? statusLabel(dashboard?.status) : '시작 전'}
          statusActive={hasAnyDashboardData}
          currentUserName={currentUserName}
          onLogout={handleLogout}
        />

        <main className="squad-dashboard-main flex-1 overflow-y-auto custom-scrollbar p-8 relative">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-brand opacity-[0.03] rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

              <div>
                {hasDashboardBodyData ? (
                  <>
                    <p className="text-sm font-bold text-gray-500 mb-1">스프린트 2주차 진행 중</p>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">반갑습니다, {currentUserName}님! 👋</h2>
                    <p className="text-sm text-gray-600 mt-2 font-medium">
                      이번 주 팀 목표 달성까지 <span className="text-brand font-bold">{goalRemainingPercent}%</span> 남았습니다. 화이팅!
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-brand mb-1"><i className="fas fa-rocket mr-1"></i> 스쿼드 준비 완료!</p>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">반갑습니다, {currentUserName}님! 👋</h2>
                    <p className="text-sm text-gray-600 mt-2 font-medium">새로운 스쿼드 워크스페이스가 생성되었습니다. 첫 목표를 세우고 작업을 시작해보세요.</p>
                  </>
                )}
              </div>

              <div className="flex gap-3 w-full md:w-auto shrink-0 z-10">
                <a href={navHref('/squad-workspace', workspaceId)} className="squad-dashboard-action-button flex-1 md:flex-none px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:border-brand hover:text-brand transition shadow-sm flex items-center justify-center gap-2">
                  <i className="fas fa-columns"></i> {hasDashboardBodyData ? '내 칸반 보기' : '칸반보드 가기'}
                </a>
                <a href={navHref('/squad-meeting', workspaceId)} className="squad-dashboard-action-button flex-1 md:flex-none px-6 py-3 bg-gray-900 text-white font-bold rounded-xl text-sm hover:bg-black transition shadow-lg shadow-gray-900/20 flex items-center justify-center gap-2">
                  <i className="fas fa-headset"></i> {hasDashboardBodyData ? '회의실 입장' : '첫 회의 열기'}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-lg">
                      <i className={`fas fa-tasks ${taskTotal > 0 ? 'text-brand' : 'text-gray-400'}`}></i> 내 이번 주 할 일
                    </h3>
                    {taskTotal > 0 ? (
                      <a className="text-xs font-bold text-gray-400 hover:text-brand transition" href={navHref('/squad-workspace', workspaceId)}>
                        전체보기 <i className="fas fa-chevron-right ml-1"></i>
                      </a>
                    ) : null}
                  </div>

                  {taskTotal > 0 ? (
                    <div className="grid grid-cols-3 gap-6 mb-2">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-gray-500">할 일 (To Do)</span>
                          <span className="text-lg font-black text-gray-800">{todoCount}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-gray-300 h-2.5 rounded-full" style={{ width: `${percent(todoCount, taskTotal)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-blue-600">진행 중 (Doing)</span>
                          <span className="text-lg font-black text-blue-600">{doingCount}</span>
                        </div>
                        <div className="w-full bg-blue-50 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percent(doingCount, taskTotal)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-brand">완료 (Done)</span>
                          <span className="text-lg font-black text-brand">{doneCount}</span>
                        </div>
                        <div className="w-full bg-green-50 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-brand h-2.5 rounded-full" style={{ width: `${percent(doneCount, taskTotal)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 text-center">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-gray-300">
                        <i className="fas fa-clipboard-list text-2xl"></i>
                      </div>
                      <h4 className="text-gray-700 font-bold mb-1">아직 할당된 작업이 없습니다</h4>
                      <p className="text-xs text-gray-500 font-medium mb-5">작업 현황판에서 새로운 카드를 만들고 본인에게 할당해보세요.</p>
                      <a href={navHref('/squad-workspace', workspaceId)} className="text-sm font-bold text-brand bg-green-50 px-4 py-2 rounded-lg hover:bg-green-100 transition">
                        <i className="fas fa-plus mr-1"></i> 작업 카드 만들기
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                  <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-lg mb-6">
                    <i className="fas fa-history text-gray-400"></i> 최근 팀 활동
                  </h3>

                  {activities.length > 0 ? (
                    <div className="space-y-0 pl-2">
                      {activities.slice(0, 5).map(renderActivity)}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <i className="fas fa-shoe-prints text-3xl text-gray-200 mb-3 rotate-[-45deg]"></i>
                      <p className="text-gray-500 font-bold text-sm mb-1">기록된 팀 활동이 없습니다</p>
                      <p className="text-[11px] text-gray-400 font-medium">작업 완료, 코드 리뷰 등의 활동이 시작되면 기록됩니다.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-lg">
                      <i className="fas fa-project-diagram text-indigo-500"></i> 최근 설계 변경 알림 (ERD 연동)
                    </h3>
                    {erdChanges.length > 0 ? (
                      <a className="text-xs font-bold text-gray-400 hover:text-brand transition" href={navHref('/squad-erd', workspaceId)}>
                        ERD 열기 <i className="fas fa-chevron-right ml-1"></i>
                      </a>
                    ) : null}
                  </div>

                  {erdChanges.length > 0 ? (
                    <div className="space-y-3">
                      {erdChanges.slice(0, 3).map(renderErdChange)}
                    </div>
                  ) : (
                    <div className="fade-in flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                      <i className="fas fa-project-diagram text-xl text-gray-200 mb-2"></i>
                      <p className="text-gray-500 font-bold text-sm">설계 변경 내역이 없습니다</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="squad-dashboard-side-card squad-dashboard-compact-side-card squad-dashboard-schedule-card bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                  <h3 className="squad-dashboard-side-title font-extrabold text-gray-900 flex items-center gap-2 text-lg mb-5 pb-3 border-b border-gray-100">
                    <i className={`fas fa-clock ${upcomingEvents.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}></i> 마감 임박 일정
                  </h3>

                  {upcomingEvents.length > 0 ? (
                    <ul className="space-y-3">
                      {upcomingEvents.map((event, index) => (
                        <li key={event.eventId} className="squad-dashboard-schedule-item hover-card bg-white p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                          <div className="squad-dashboard-schedule-content flex items-center gap-3 min-w-0">
                            <div className={`${index === 0 ? 'bg-red-50 text-red-500 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-200'} squad-dashboard-schedule-date w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border`}>
                              <span className="text-[9px] font-bold uppercase">{formatEventMonth(event.startAt)}</span>
                              <span className="text-sm font-black leading-none">{formatEventDay(event.startAt)}</span>
                            </div>
                            <div className="squad-dashboard-schedule-text min-w-0">
                              <p className="squad-dashboard-schedule-title text-sm font-bold text-gray-900 mb-0.5 truncate" title={event.title}>{event.title}</p>
                              <p className="squad-dashboard-schedule-meta text-[10px] text-gray-500 font-medium truncate" title={stripScheduleCategoryDescription(event.description) || formatChatTime(event.startAt)}>
                                {stripScheduleCategoryDescription(event.description) || formatChatTime(event.startAt)}
                              </p>
                            </div>
                          </div>
                          <span className={`${index === 0 ? 'bg-red-500 text-white' : 'bg-orange-100 text-orange-600 border border-orange-200'} squad-dashboard-dday-badge text-[10px] font-extrabold px-2 py-1 rounded shadow-sm`}>
                            {getDday(event.startAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="squad-dashboard-empty-panel squad-dashboard-schedule-empty-panel flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                      <i className="far fa-calendar-times text-2xl text-gray-300 mb-2"></i>
                      <p className="text-gray-500 font-bold text-sm">등록된 일정이 없습니다</p>
                    </div>
                  )}
                </div>

                <div className="squad-dashboard-side-card bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                  <h3 className="squad-dashboard-side-title font-extrabold text-gray-900 flex items-center gap-2 text-lg mb-5 pb-3 border-b border-gray-100">
                    <i className={`fas fa-headset ${liveVoiceChannel ? 'text-red-500' : 'text-gray-400'}`}></i> 라이브 음성 회의
                  </h3>

                  {liveVoiceChannel ? (
                    <div className="squad-dashboard-meeting-card hover-card bg-white p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                      <div className="squad-dashboard-meeting-copy flex items-center gap-3 min-w-0">
                        <span className="relative flex h-3 w-3 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{liveVoiceChannel.name} 진행 중</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500 font-semibold">{liveVoiceChannel.activeParticipantCount ?? 0}명 참여 중</span>
                          </div>
                        </div>
                      </div>
                      <a href={navHref('/squad-meeting', workspaceId)} className="squad-dashboard-compact-button px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs transition shadow-sm shrink-0">
                        참여하기
                      </a>
                    </div>
                  ) : (
                    <div className="squad-dashboard-empty-panel squad-dashboard-compact-empty-panel fade-in flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                      <i className="fas fa-headset text-xl text-gray-200 mb-2"></i>
                      <p className="text-gray-500 font-bold text-sm">진행 중인 회의가 없습니다</p>
                      <a href={navHref('/squad-meeting', workspaceId)} className="squad-dashboard-compact-button mt-3 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-lg text-xs transition shadow-sm">
                        새 회의 시작
                      </a>
                    </div>
                  )}
                </div>

                <div className="squad-dashboard-side-card squad-dashboard-compact-side-card bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                  <div className="squad-dashboard-side-title flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                    <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-lg">
                      <i className={`fas fa-bullhorn ${notices.length > 0 ? 'text-brand' : 'text-gray-400'}`}></i> 팀 공지사항
                    </h3>
                    <button onClick={() => setNoticeModalOpen(true)} className="squad-dashboard-icon-button w-7 h-7 rounded-md bg-gray-50 hover:bg-gray-200 text-gray-500 hover:text-brand flex items-center justify-center transition" title="새 공지 추가">
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {notices.length > 0 ? notices.slice(0, 3).map((notice, index) => {
                      const important = isImportantNotice(notice, index)

                      return (
                        <div key={notice.id} className={important ? 'squad-dashboard-notice-item hover-card p-4 bg-brand/5 border border-brand/20 rounded-xl relative overflow-hidden' : 'squad-dashboard-notice-item hover-card p-4 bg-gray-50 border border-gray-100 rounded-xl'}>
                          {important ? <div className="absolute top-0 right-0 w-10 h-10 bg-brand/10 rounded-bl-full"></div> : null}
                          <div className="flex justify-between items-start mb-1.5 relative z-10">
                            <span className={important ? 'bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-extrabold shadow-sm' : 'bg-gray-200 text-gray-600 text-[9px] px-1.5 py-0.5 rounded font-extrabold'}>
                              {important ? '필독' : '일반'}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold">{formatShortDate(notice.createdAt)}</span>
                          </div>
                          <p className="font-extrabold text-sm text-gray-900 mb-1.5 relative z-10">{stripNoticePrefix(notice.title)}</p>
                          <p className="text-xs text-gray-600 leading-relaxed font-medium line-clamp-2 relative z-10">{notice.content}</p>
                        </div>
                      )
                    }) : (
                    <div className="squad-dashboard-empty-panel squad-dashboard-compact-empty-panel flex flex-col items-center justify-center text-center py-8 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                      <p className="text-gray-500 font-bold text-sm mb-1">작성된 공지가 없습니다</p>
                      <button onClick={() => setNoticeModalOpen(true)} className="squad-dashboard-empty-notice-action text-xs font-bold text-brand hover:underline">첫 공지 작성하기</button>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <button
        onClick={() => void openChatSurface()}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gray-900 text-white rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.3)] flex items-center justify-center hover:bg-black transition-transform hover:scale-105 z-40 group"
        title={window.documentPictureInPicture ? 'PiP 채팅 열기' : '채팅 열기'}
      >
        <i className="fas fa-comment-dots text-2xl group-hover:animate-bounce"></i>
        {messages.length > 0 ? <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span> : null}
      </button>

      <div className={`${showChatPanel ? '' : 'hidden'} fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[900] transition-opacity`} onClick={closeChatSurface}></div>

      <div className={`${showChatPanel ? 'translate-x-0' : 'translate-x-full'} fixed top-0 right-0 w-full sm:w-[400px] h-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-[1000] transform transition-transform duration-300 flex flex-col`}>
        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-5 bg-white shrink-0">
          <h2 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
            <i className="fas fa-comments text-brand"></i> 스쿼드 소통방
          </h2>
          <button onClick={closeChatSurface} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"><i className="fas fa-times"></i></button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50/50 shrink-0 px-2">
          <button onClick={() => setChatTab('team')} className={chatTab === 'team' ? 'flex-1 py-3 text-sm font-bold text-brand border-b-2 border-brand transition' : 'flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition'}>
            🔥 {dashboard?.name ?? '전체 소통방'}
          </button>
          <button onClick={() => setChatTab('dm')} className={chatTab === 'dm' ? 'flex-1 py-3 text-sm font-bold text-gray-900 border-b-2 border-gray-900 transition relative' : 'flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition relative'}>
            1:1 메시지
          </button>
        </div>

        {chatTab === 'team' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length > 0 ? (
                <>
                  <div className="flex justify-center"><span className="bg-gray-200/70 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">오늘</span></div>
                  {messages.map(renderTeamMessage)}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 min-h-full">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <i className="fas fa-hand-sparkles text-xl text-gray-400"></i>
                  </div>
                  <p className="text-gray-700 font-bold text-sm">스쿼드 소통방이 개설되었습니다!</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">아래 입력창을 통해 팀원들에게 첫 인사를 남겨보세요.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0 relative">
              <div className={`${plusMenuOpen ? '' : 'hidden'} absolute bottom-[85px] left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 plus-menu-enter z-50`}>
                <div className="grid grid-cols-4 gap-1">
                  <button onClick={() => showAuthToast({ message: '파일 업로드는 팀 자료실에서 이용해주세요.', durationMs: 1800 })} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><i className="fas fa-file-alt"></i></div>
                    <span className="text-[10px] font-bold text-gray-600">파일</span>
                  </button>
                  <button onClick={() => sendPlusMessage('code')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center"><i className="fas fa-code"></i></div>
                    <span className="text-[10px] font-bold text-gray-600">코드</span>
                  </button>
                  <button onClick={() => sendPlusMessage('meeting')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="w-10 h-10 rounded-full bg-green-50 text-brand flex items-center justify-center"><i className="fas fa-headset"></i></div>
                    <span className="text-[10px] font-bold text-gray-600">회의초대</span>
                  </button>
                  <button onClick={() => sendPlusMessage('remind')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><i className="fas fa-clock"></i></div>
                    <span className="text-[10px] font-bold text-gray-600">리마인드</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 pr-2 focus-within:border-gray-400 transition shadow-sm">
                <button onClick={() => setPlusMenuOpen((open) => !open)} className="w-8 h-8 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition flex items-center justify-center shrink-0">
                  <i className={`${plusMenuOpen ? 'fas fa-times rotate-90 transition-transform duration-200' : 'fas fa-plus transition-transform duration-200'}`}></i>
                </button>
                <input
                  type="text"
                  className="flex-1 bg-transparent text-sm outline-none px-2 font-medium"
                  placeholder="메시지 보내기..."
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void sendTeamMessage()
                    }
                  }}
                />
                <button onClick={() => void sendTeamMessage()} className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-green-600 transition shrink-0 shadow-sm"><i className="fas fa-paper-plane text-xs"></i></button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {selectedDmMember ? (
              <>
                <div className="h-14 border-b border-gray-100 px-4 flex items-center gap-3 shrink-0 bg-white">
                  <button
                    onClick={() => {
                      setSelectedDmMember(null)
                      setDirectMessages([])
                      setDirectInput('')
                    }}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition"
                    title="대화 목록"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>
                  {renderMemberAvatar(selectedDmMember, 'w-9 h-9 border border-gray-200 bg-gray-50', 'text-sm')}
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900 truncate">{selectedDmMember.learnerName ?? '팀원'}</p>
                    <p className="text-[10px] font-bold text-green-600">워크스페이스 멤버</p>
                  </div>
                </div>

                <div ref={directScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#F8F9FA]">
                  {directLoading ? (
                    <div className="min-h-full flex items-center justify-center text-xs font-bold text-gray-400">
                      메시지를 불러오는 중입니다.
                    </div>
                  ) : directMessages.length > 0 ? (
                    <>
                      <div className="flex justify-center"><span className="bg-gray-200/70 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">오늘</span></div>
                      {directMessages.map(renderDirectMessage)}
                    </>
                  ) : (
                    <div className="min-h-full flex flex-col items-center justify-center text-center opacity-70">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <i className="fas fa-paper-plane text-xl text-gray-400"></i>
                      </div>
                      <p className="text-gray-700 font-bold text-sm">아직 주고받은 메시지가 없습니다.</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">아래 입력창으로 첫 1:1 메시지를 보내보세요.</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 pr-2 focus-within:border-gray-400 transition shadow-sm">
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-sm outline-none px-3 font-medium"
                      placeholder="1:1 메시지 보내기..."
                      value={directInput}
                      onChange={(event) => setDirectInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void sendDirectMessage()
                        }
                      }}
                    />
                    <button onClick={() => void sendDirectMessage()} className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-green-600 transition shrink-0 shadow-sm">
                      <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                  </div>
                </div>
              </>
            ) : dmMembers.length > 0 ? (
              <div className="p-2 overflow-y-auto custom-scrollbar">
                {dmMembers.map((member) => (
                  <button
                    type="button"
                    key={member.memberId}
                    onClick={() => void openDirectRoom(member)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl cursor-pointer transition border-b border-gray-50"
                  >
                    <div className="relative">
                      {renderMemberAvatar(member, 'w-11 h-11 border border-gray-200 bg-gray-50', 'text-sm')}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900">{member.learnerName ?? '팀원'}</h4>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">1:1 메시지를 시작해보세요.</p>
                    </div>
                    <i className="fas fa-chevron-right text-[10px] text-gray-300"></i>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                <i className="fas fa-user-friends text-3xl text-gray-200 mb-3"></i>
                <p className="text-gray-500 font-bold text-sm">진행 중인 1:1 대화가 없습니다.</p>
                <p className="text-[11px] text-gray-400 mt-1">스쿼드 설정에서 팀원을 확인하고 대화를 시작해보세요.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {chatInPip && chatPipContainer ? createPortal(renderPipChat(), chatPipContainer) : null}

      {noticeModalOpen ? (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1050]">
          <form onSubmit={createNotice} className="bg-white w-full max-w-md rounded-2xl shadow-xl relative overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2"><i className="fas fa-bullhorn text-brand"></i> 새 공지사항 등록</h3>
              <button type="button" onClick={() => setNoticeModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-900 shadow-sm flex items-center justify-center transition"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">분류 <span className="text-red-500">*</span></label>
                <select value={noticeType} onChange={(event) => setNoticeType(event.target.value as 'important' | 'normal')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand bg-white font-medium shadow-sm transition">
                  <option value="important">🚨 필독 (중요)</option>
                  <option value="normal">📌 일반</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">제목 <span className="text-red-500">*</span></label>
                <input type="text" value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand font-medium shadow-sm transition" placeholder="공지 제목을 입력하세요" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">내용 <span className="text-red-500">*</span></label>
                <textarea value={noticeContent} onChange={(event) => setNoticeContent(event.target.value)} className="w-full border border-gray-200 rounded-xl p-4 text-sm h-32 resize-none outline-none focus:border-brand font-medium shadow-sm transition custom-scrollbar" placeholder="팀원들에게 알릴 내용을 입력하세요"></textarea>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button type="button" onClick={() => setNoticeModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm">취소</button>
              <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition shadow-md flex items-center gap-1">
                <i className="fas fa-check"></i> 등록하기
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </div>
  )
}
