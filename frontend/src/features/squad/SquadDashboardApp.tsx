import { useAuthSession } from '../../lib/useAuthSession'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import AuthModal, { type AuthView } from '../../components/AuthModal'
import SquadWorkspaceAside from '../../components/SquadWorkspaceAside'
import SquadWorkspaceHeader from '../../components/SquadWorkspaceHeader'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import { PROFILE_UPDATED_EVENT, type ProfileSyncPayload } from '../../lib/profile-sync'
import { projectApiRequest } from '../project/api'
import { createSquadNotification, squadActorName } from './notifications'
import SquadDashboardContent from './SquadDashboardContent'
import SquadDashboardChatSurface from './SquadDashboardChatSurface'
import { copyDocumentPictureInPictureStyles,getWorkspaceIdFromUrl,percent,readSidebarPinned,statusLabel,storeSidebarPinned } from './squad-dashboard-support'

import type {
  ActivityLog,
  ChatTab,
  DirectMessage,
  CalendarEvent,
  Notice,
  TeamMessage,
  VoiceChannel,
  WorkspaceDashboard,
  WorkspaceErdChange,
  WorkspaceMember,
  WorkspaceTask,
} from './dashboard-types'

export default function SquadDashboardApp() {
  const workspaceId = useMemo(() => getWorkspaceIdFromUrl(), [])
  const [session,setSession] = useAuthSession()
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

  const refreshTeamMessages = useCallback(async () => {
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
  }, [workspaceId])

  const loadDirectMessages = useCallback(async (member: WorkspaceMember, silent = false) => {
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
  }, [workspaceId])

  useEffect(() => {
    document.title = 'DevPath - 스쿼드 대시보드'
    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root')
    const appViewport = document.querySelector<HTMLElement>('.app-viewport')
    html.classList.add('h-full!', 'overflow-hidden!')
    body.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    root?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    appViewport?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')

    return () => {
      html.classList.remove('h-full!', 'overflow-hidden!')
      body.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      root?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      appViewport?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
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
  }, [loadDashboardData, setSession, workspaceId])

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
  }, [workspaceId, session?.accessToken, refreshTeamMessages])

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
  }, [workspaceId, session?.accessToken, selectedDmMember, loadDirectMessages])

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

  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
          <p className="text-sm font-bold text-gray-500">스쿼드 대시보드를 불러오는 중입니다.</p>
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
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

  return (
    <div className="squad-dashboard-page flex h-screen overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800 [&_.squad-dashboard-fade-in]:[animation:squadDashboardFadeIn_0.4s_ease-in-out_forwards]">
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

        <SquadDashboardContent workspaceId={workspaceId} notices={notices} activities={activities} erdChanges={erdChanges} memberById={memberById} currentUserName={currentUserName} doingCount={doingCount} doneCount={doneCount} goalRemainingPercent={goalRemainingPercent} hasDashboardBodyData={hasDashboardBodyData} liveVoiceChannel={liveVoiceChannel} taskTotal={taskTotal} todoCount={todoCount} upcomingEvents={upcomingEvents} onOpenNotice={() => setNoticeModalOpen(true)} />
      </div>

      <SquadDashboardChatSurface
        sessionUserId={session?.userId ?? null} dashboard={dashboard} messages={messages} directMessages={directMessages} dmMembers={dmMembers} memberById={memberById}
        selectedDmMember={selectedDmMember} currentProfileImage={currentProfileImage} chatInPip={chatInPip} chatPipContainer={chatPipContainer} chatOpen={chatOpen} chatTab={chatTab}
        plusMenuOpen={plusMenuOpen} messageInput={messageInput} directInput={directInput} directLoading={directLoading} chatScrollRef={chatScrollRef} directScrollRef={directScrollRef}
        pipChatScrollRef={pipChatScrollRef} pipDirectScrollRef={pipDirectScrollRef} setChatTab={setChatTab} setPlusMenuOpen={setPlusMenuOpen} setMessageInput={setMessageInput}
        setDirectInput={setDirectInput} setSelectedDmMember={setSelectedDmMember} setDirectMessages={setDirectMessages} openChatSurface={openChatSurface}
        closeChatSurface={closeChatSurface} openDirectRoom={openDirectRoom} sendTeamMessage={sendTeamMessage} sendDirectMessage={sendDirectMessage} sendPlusMessage={sendPlusMessage}
      />

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
