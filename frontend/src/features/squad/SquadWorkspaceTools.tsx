import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SquadWorkspaceAiPanel from '../../components/SquadWorkspaceAiPanel'
import { useAuthSession } from '../../lib/useAuthSession'
import { readStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import { PROFILE_UPDATED_EVENT, type ProfileSyncPayload } from '../../lib/profile-sync'
import { WORKSPACE_DATA_CHANGED_EVENT } from '../../lib/workspace-events'
import { projectApiRequest } from '../project/api'
import { createSquadNotification, squadActorName } from './notifications'
import { copyDocumentPictureInPictureStyles } from './squad-dashboard-support'
import SquadDashboardChatSurface from './SquadDashboardChatSurface'
import type { ChatTab, DirectMessage, TeamMessage, WorkspaceDashboard, WorkspaceMember } from './dashboard-types'

export default function SquadWorkspaceTools({ workspaceId }: { workspaceId: number }) {
  const [session] = useAuthSession()
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [selectedDmMember, setSelectedDmMember] = useState<WorkspaceMember | null>(null)
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [directInput, setDirectInput] = useState('')
  const [directLoading, setDirectLoading] = useState(false)
  const [profileImageOverride, setProfileImageOverride] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInPip, setChatInPip] = useState(false)
  const [chatPipContainer, setChatPipContainer] = useState<HTMLElement | null>(null)
  const [chatTab, setChatTab] = useState<ChatTab>('team')
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  const directScrollRef = useRef<HTMLDivElement | null>(null)
  const pipChatScrollRef = useRef<HTMLDivElement | null>(null)
  const pipDirectScrollRef = useRef<HTMLDivElement | null>(null)
  const chatPipWindowRef = useRef<Window | null>(null)

  const refreshTeamMessages = useCallback(async () => {
    if (!workspaceId || !readStoredAuthSession()?.accessToken) {
      return
    }

    try {
      const nextMessages = await projectApiRequest<TeamMessage[]>(
        `/api/lounge/chats/messages?loungeId=${workspaceId}`,
        {},
        'required',
        { cache: false },
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
        { cache: false },
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
    if (!session?.accessToken) return
    const controller = new AbortController()
    const refresh = async () => {
      try {
        const data = await projectApiRequest<WorkspaceDashboard>(
          `/api/workspaces/${workspaceId}/dashboard`, { signal: controller.signal }, 'required',
        )
        if (!controller.signal.aborted) setDashboard(data)
      } catch {
        // 최초 조회 실패 시 도구를 숨기고, 일시적인 갱신 실패에는 마지막 정상 정보를 유지한다.
      }
    }
    void refresh()
    const intervalId = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, 5000)
    window.addEventListener('focus', refresh)
    window.addEventListener(WORKSPACE_DATA_CHANGED_EVENT, refresh)
    return () => {
      controller.abort()
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
      window.removeEventListener(WORKSPACE_DATA_CHANGED_EVENT, refresh)
    }
  }, [session?.accessToken, workspaceId])

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
    if (!workspaceId || !session?.accessToken) {
      return undefined
    }

    void refreshTeamMessages()
    const intervalId = window.setInterval(() => {
      if (!document.hidden) void refreshTeamMessages()
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

  const memberById = useMemo(() => new Map((dashboard?.members ?? []).map((member) => [member.learnerId, member])), [dashboard])
  const currentMember = session?.userId ? memberById.get(session.userId) : null
  const currentProfileImage = profileImageOverride ?? currentMember?.profileImage ?? null
  const dmMembers = (dashboard?.members ?? []).filter((member) => member.learnerId !== session?.userId)

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

  if (!dashboard || !session?.accessToken) return null

  return <>
      <SquadDashboardChatSurface
        sessionUserId={session?.userId ?? null} dashboard={dashboard} messages={messages} directMessages={directMessages} dmMembers={dmMembers} memberById={memberById}
        selectedDmMember={selectedDmMember} currentProfileImage={currentProfileImage} chatInPip={chatInPip} chatPipContainer={chatPipContainer} chatOpen={chatOpen} chatTab={chatTab}
        plusMenuOpen={plusMenuOpen} messageInput={messageInput} directInput={directInput} directLoading={directLoading} chatScrollRef={chatScrollRef} directScrollRef={directScrollRef}
        pipChatScrollRef={pipChatScrollRef} pipDirectScrollRef={pipDirectScrollRef} setChatTab={setChatTab} setPlusMenuOpen={setPlusMenuOpen} setMessageInput={setMessageInput}
        setDirectInput={setDirectInput} setSelectedDmMember={setSelectedDmMember} setDirectMessages={setDirectMessages} openChatSurface={openChatSurface}
        closeChatSurface={closeChatSurface} openDirectRoom={openDirectRoom} sendTeamMessage={sendTeamMessage} sendDirectMessage={sendDirectMessage} sendPlusMessage={sendPlusMessage}
      />

    <SquadWorkspaceAiPanel />
  </>
}
