import { useEffect, useMemo, useRef, useState } from 'react'
import { projectApiRequest } from '../project-api'
import type { AuthSession } from '../types/auth'

type HeaderMessage = {
  source?: string | null
  id: number
  sender?: string | null
  senderId?: number | null
  senderImage?: string | null
  text?: string | null
  dateText?: string | null
  read?: boolean | null
}

type HeaderNotification = {
  id: number
  type?: string | null
  text?: string | null
  dateText?: string | null
  read?: boolean | null
  targetPath?: string | null
}

type HeaderShellResponse = {
  messages?: HeaderMessage[] | null
  notifications?: HeaderNotification[] | null
}

type HeaderAlertsProps = {
  session: AuthSession
}

type OpenPanel = 'messages' | 'notifications' | null

const HEADER_TEXT = {
  messages: '\uBC1B\uC740 \uBA54\uC2DC\uC9C0',
  notifications: '\uC54C\uB9BC',
  markAllRead: '\uBAA8\uB450 \uC77D\uC74C',
  noMessages: '\uCD5C\uADFC \uBA54\uC2DC\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  noNotifications: '\uC0C8 \uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  allMessages: '\uBAA8\uB4E0 \uBA54\uC2DC\uC9C0 \uBCF4\uAE30',
  allNotifications: '\uBAA8\uB4E0 \uC54C\uB9BC \uBCF4\uAE30',
}

function avatarUrl(seed: string | number | null | undefined) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(seed || 'DevPath'))}`
}

function iconForNotification(type: string | null | undefined) {
  const normalized = String(type || '').toUpperCase()

  if (normalized.includes('MEETING') || normalized.includes('SCHEDULE')) {
    return 'fas fa-calendar-check'
  }
  if (normalized.includes('DEADLINE')) {
    return 'fas fa-flag-checkered'
  }
  if (normalized.includes('APPLICATION_APPROVED')) {
    return 'fas fa-user-check'
  }
  if (normalized.includes('APPLICATION_REJECTED')) {
    return 'fas fa-user-times'
  }
  if (normalized.includes('APPLICATION') || normalized.includes('INVITED')) {
    return 'fas fa-user-plus'
  }
  if (normalized.includes('REVIEW') || normalized.includes('COMMENT')) {
    return 'fas fa-comments'
  }
  if (normalized.includes('FILE')) {
    return 'fas fa-folder-open'
  }
  if (normalized.includes('DESIGN') || normalized.includes('ERD') || normalized.includes('ARCHITECTURE')) {
    return 'fas fa-diagram-project'
  }
  if (normalized.includes('PROJECT') || normalized.includes('SQUAD')) {
    return 'fas fa-rocket'
  }
  if (normalized.includes('CERTIFICATE') || normalized.includes('COURSE')) {
    return 'fas fa-award'
  }

  return 'fas fa-bell'
}

export default function HeaderAlerts({ session }: HeaderAlertsProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [messages, setMessages] = useState<HeaderMessage[]>([])
  const [notifications, setNotifications] = useState<HeaderNotification[]>([])
  const [messagesExpanded, setMessagesExpanded] = useState(false)
  const [notificationsExpanded, setNotificationsExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    Promise.allSettled([
      projectApiRequest<HeaderShellResponse>('/api/lounge/shell', { signal: controller.signal }, 'optional'),
      projectApiRequest<HeaderNotification[]>('/api/project-header-notifications', { signal: controller.signal }, 'required'),
    ])
      .then(([shellResult, notificationsResult]) => {
        if (controller.signal.aborted) {
          return
        }

        const shell = shellResult.status === 'fulfilled' ? shellResult.value : null
        setMessages(shell?.messages ?? [])
        setNotifications(
          notificationsResult.status === 'fulfilled'
            ? notificationsResult.value
            : shell?.notifications ?? [],
        )
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMessages([])
          setNotifications([])
        }
      })

    return () => controller.abort()
  }, [session.accessToken])

  useEffect(() => {
    if (!openPanel) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpenPanel(null)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenPanel(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openPanel])

  const unreadMessageCount = useMemo(
    () => messages.filter((message) => message.read === false).length,
    [messages],
  )
  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => notification.read === false).length,
    [notifications],
  )
  const visibleMessages = messagesExpanded ? messages : messages.slice(0, 5)
  const visibleNotifications = notificationsExpanded ? notifications : notifications.slice(0, 5)

  async function markAllNotificationsRead() {
    const unread = notifications.filter((notification) => notification.read === false)

    if (unread.length === 0) {
      return
    }

    try {
      const nextNotifications = await projectApiRequest<HeaderNotification[]>(
        '/api/project-header-notifications/read-all',
        { method: 'PATCH' },
        'required',
      )
      setNotifications(nextNotifications)
    } catch {
      await Promise.allSettled(
        unread
          .filter((notification) => notification.id > 0)
          .map((notification) =>
            projectApiRequest(`/api/notifications/${notification.id}/read`, { method: 'PATCH' }, 'required'),
          ),
      )
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
    }
  }

  function openNotification(notification: HeaderNotification) {
    if (notification.read === false && notification.id > 0) {
      void projectApiRequest(`/api/notifications/${notification.id}/read`, { method: 'PATCH' }, 'required')
        .then(() => {
          setNotifications((current) =>
            current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
          )
        })
        .catch(() => undefined)
    }

    if (notification.targetPath) {
      window.location.assign(notification.targetPath)
    }
  }

  return (
    <div ref={panelRef} className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          aria-label={HEADER_TEXT.messages}
          onClick={() => setOpenPanel((current) => (current === 'messages' ? null : 'messages'))}
          className="relative cursor-pointer rounded-full p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-brand"
        >
          <i className="far fa-envelope text-lg"></i>
          {unreadMessageCount > 0 ? (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          ) : null}
        </button>

        {openPanel === 'messages' ? (
          <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-xl z-50 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-extrabold text-sm text-gray-900">{HEADER_TEXT.messages}</h3>
              <span className="text-[11px] text-gray-400 font-bold">{messages.length}</span>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-white">
              {visibleMessages.length > 0 ? (
                visibleMessages.map((message) => (
                  <div
                    key={`${message.source || 'message'}-${message.id}`}
                    className="p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer flex gap-3 items-start"
                  >
                    <img
                      src={message.senderImage || avatarUrl(message.senderId || message.sender)}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5 gap-3">
                        <span className="text-xs font-bold text-gray-900 truncate">{message.sender || 'DevPath'}</span>
                        <span className="text-[9px] text-gray-400 shrink-0">{message.dateText || ''}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{message.text || ''}</p>
                    </div>
                    {message.read === false ? <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></span> : null}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <i className="far fa-envelope-open text-2xl text-gray-300"></i>
                  <p className="mt-2 text-xs font-bold text-gray-400">{HEADER_TEXT.noMessages}</p>
                </div>
              )}
            </div>

            {messages.length > 5 ? (
              <button
                type="button"
                onClick={() => setMessagesExpanded((value) => !value)}
                className="p-3 border-t border-gray-100 bg-gray-50 text-center hover:bg-gray-100 transition"
              >
                <span className="text-xs font-bold text-gray-600">
                  {HEADER_TEXT.allMessages} <i className={`fas fa-chevron-${messagesExpanded ? 'up' : 'down'} ml-1 text-[10px]`}></i>
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label={HEADER_TEXT.notifications}
          onClick={() => setOpenPanel((current) => (current === 'notifications' ? null : 'notifications'))}
          className="relative cursor-pointer rounded-full p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-brand"
        >
          <i className="far fa-bell text-lg"></i>
          {unreadNotificationCount > 0 ? (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          ) : null}
        </button>

        {openPanel === 'notifications' ? (
          <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-xl z-50 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-extrabold text-sm text-gray-900">{HEADER_TEXT.notifications}</h3>
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-[11px] text-gray-500 hover:text-brand cursor-pointer font-bold transition disabled:cursor-default disabled:text-gray-300"
                disabled={unreadNotificationCount === 0}
              >
                {HEADER_TEXT.markAllRead}
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-white">
              {visibleNotifications.length > 0 ? (
                visibleNotifications.map((notification) => (
                  <div
                    key={`notification-${notification.id}`}
                    onClick={() => openNotification(notification)}
                    title={notification.text || ''}
                    className="p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer flex gap-3 items-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-50 text-brand flex items-center justify-center text-xs shrink-0 border border-green-100">
                      <i className={iconForNotification(notification.type)}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 leading-relaxed truncate">{notification.text || ''}</p>
                      <span className="text-[10px] text-gray-400">{notification.dateText || ''}</span>
                    </div>
                    {notification.read === false ? <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></span> : null}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <i className="far fa-bell-slash text-2xl text-gray-300"></i>
                  <p className="mt-2 text-xs font-bold text-gray-400">{HEADER_TEXT.noNotifications}</p>
                </div>
              )}
            </div>

            {notifications.length > 5 ? (
              <button
                type="button"
                onClick={() => setNotificationsExpanded((value) => !value)}
                className="p-3 border-t border-gray-100 bg-gray-50 text-center hover:bg-gray-100 transition"
              >
                <span className="text-xs font-bold text-gray-600">
                  {HEADER_TEXT.allNotifications} <i className={`fas fa-chevron-${notificationsExpanded ? 'up' : 'down'} ml-1 text-[10px]`}></i>
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
