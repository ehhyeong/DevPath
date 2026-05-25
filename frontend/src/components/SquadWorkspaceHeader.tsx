import { useEffect, useState } from 'react'
import UserAvatar from './UserAvatar'
import { projectApiRequest } from '../project-api'
import {
  SQUAD_NOTIFICATION_CREATED_EVENT,
  type SquadHeaderNotification,
} from '../squad-notifications'

type SquadHeaderMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

type SquadWorkspaceHeaderProps = {
  workspaceId: number | null
  projectName: string
  members: SquadHeaderMember[]
  statusLabel?: string
  statusActive?: boolean
  currentUserName?: string | null
  onLogout: () => void
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

function memberLabel(member: SquadHeaderMember, index: number) {
  return member.learnerName?.trim() || `팀원 ${index + 1}`
}

export default function SquadWorkspaceHeader({
  workspaceId,
  projectName,
  members,
  statusLabel = '진행 중',
  statusActive = true,
  onLogout,
}: SquadWorkspaceHeaderProps) {
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<SquadHeaderNotification[]>([])
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    if (!workspaceId) return

    const controller = new AbortController()

    function loadNotifications() {
      projectApiRequest<SquadHeaderNotification[]>(
        `/api/workspaces/${workspaceId}/squad-header-notifications`,
        { signal: controller.signal },
        'required',
      )
        .then((items) => {
          if (!controller.signal.aborted) {
            setNotifications(items ?? [])
            setCleared(false)
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setNotifications([])
          }
        })
    }

    loadNotifications()
    window.addEventListener(SQUAD_NOTIFICATION_CREATED_EVENT, loadNotifications)

    return () => {
      controller.abort()
      window.removeEventListener(SQUAD_NOTIFICATION_CREATED_EVENT, loadNotifications)
    }
  }, [workspaceId])

  const visibleNotifications = workspaceId && !cleared ? notifications : []
  const hasNotifications = visibleNotifications.length > 0

  function openNotification(notification: SquadHeaderNotification) {
    if (notification.targetPath) {
      window.location.assign(navHref(notification.targetPath, workspaceId))
    }
  }

  function clearNotifications() {
    setCleared(true)
    setNotifications([])

    if (!workspaceId) return

    projectApiRequest<void>(
      `/api/workspaces/${workspaceId}/squad-header-notifications`,
      { method: 'DELETE' },
      'required',
    ).catch(() => undefined)
  }

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center border-b border-gray-100 bg-white px-8 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3 font-bold text-gray-800">
        <span className={`${statusActive ? 'border-green-100 bg-green-50 text-brand' : 'border-gray-200 bg-gray-50 text-gray-500'} flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs`}>
          <span className={`${statusActive ? 'animate-pulse bg-brand' : 'bg-gray-400'} h-1.5 w-1.5 rounded-full`}></span>
          {statusLabel}
        </span>
        <span className="truncate tracking-tight">{projectName}</span>
      </div>

      <div className="relative flex items-center gap-5">
        <div className="hidden items-center border-r border-gray-200 pr-5 mr-2 md:flex">
          <div className="flex -space-x-2.5 transition-all duration-300 hover:-space-x-1">
            {members.map((member, index) => {
              const label = memberLabel(member, index)

              return (
                <div key={member.memberId} className="group relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center hover:z-30" aria-label={label} title={label}>
                  <UserAvatar
                    name={label}
                    imageUrl={member.profileImage}
                    className="h-8 w-8 border-2 border-white bg-gray-100 shadow-sm transition-transform group-hover:scale-110"
                    iconClassName="text-xs"
                  />
                  <span className="pointer-events-none absolute left-1/2 top-10 z-50 max-w-[140px] -translate-x-1/2 -translate-y-1 truncate rounded-md bg-gray-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationOpen((current) => !current)}
            className="relative cursor-pointer text-gray-400 transition hover:text-brand"
            title="알림"
          >
            <i className="far fa-bell text-xl"></i>
            {hasNotifications ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"></span> : null}
          </button>

          {notificationOpen ? (
            <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-50 p-4">
                <h3 className="text-sm font-bold text-gray-900">스쿼드 알림</h3>
                <button type="button" onClick={clearNotifications} className="text-xs font-bold text-gray-400 hover:text-gray-600">
                  지우기
                </button>
              </div>
              <div className="custom-scrollbar max-h-72 overflow-y-auto">
                {visibleNotifications.length > 0 ? (
                  visibleNotifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                      className="block w-full border-b border-gray-50 p-3 text-left transition hover:bg-gray-50"
                    >
                      <p className="text-xs leading-relaxed text-gray-800">{notification.message}</p>
                      <span className="mt-1 inline-block text-[10px] font-bold text-gray-400">{notification.timeLabel}</span>
                    </button>
                  ))
                ) : (
                  <p className="p-6 text-center text-xs font-bold text-gray-400">새 스쿼드 알림이 없습니다.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <button type="button" onClick={onLogout} className="text-[11px] font-bold text-gray-400 transition hover:text-gray-700">
          로그아웃
        </button>
      </div>
    </header>
  )
}
