import { useEffect, useState } from 'react'
import UserAvatar from './UserAvatar'
import { projectApiRequest } from '../project-api'

type TeamWorkspaceHeaderMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

type TeamWorkspaceHeaderNotification = {
  id: number
  workspaceId: number
  pageKey: string
  message: string
  timeLabel: string
  targetPath?: string | null
}

type TeamWorkspaceHeaderProps = {
  workspaceId: number | null
  pageKey: string
  projectName: string
  members: TeamWorkspaceHeaderMember[]
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

export default function TeamWorkspaceHeader({
  workspaceId,
  pageKey,
  projectName,
  members,
}: TeamWorkspaceHeaderProps) {
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<TeamWorkspaceHeaderNotification[]>([])
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    if (!workspaceId) {
      setNotifications([])
      return
    }

    const controller = new AbortController()

    projectApiRequest<TeamWorkspaceHeaderNotification[]>(
      `/api/workspaces/${workspaceId}/team-header-notifications?page=${encodeURIComponent(pageKey)}`,
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

    return () => controller.abort()
  }, [pageKey, workspaceId])

  const visibleNotifications = cleared ? [] : notifications
  const hasNotifications = visibleNotifications.length > 0

  function openNotification(notification: TeamWorkspaceHeaderNotification) {
    if (notification.targetPath) {
      window.location.assign(navHref(notification.targetPath, workspaceId))
    }
  }

  return (
    <header className="team-ws-header relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-8 shadow-sm">
      <div className="flex min-w-0 items-center gap-3 font-bold text-gray-800">
        <span className="flex items-center gap-1 rounded-md border border-indigo-100 bg-team-light px-2 py-1 text-[10px] tracking-wider text-team">
          <i className="fas fa-puzzle-piece"></i>
          팀 프로젝트
        </span>
        <span className="truncate">{projectName}</span>
      </div>

      <div className="relative flex shrink-0 items-center gap-4">
        <div className="mr-2 hidden items-center -space-x-2 md:flex">
          {members.slice(0, 4).map((member, index) => (
            <UserAvatar
              key={member.memberId}
              name={member.learnerName || `팀원 ${index + 1}`}
              imageUrl={member.profileImage}
              className="h-8 w-8 border-2 border-white bg-gray-100"
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
            {hasNotifications ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-red-500"></span> : null}
          </button>

          {notificationOpen ? (
            <div className="team-ws-notification-popup absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-50 p-4">
                <h3 className="text-sm font-bold">팀 알림</h3>
                <button type="button" onClick={() => setCleared(true)} className="text-xs text-gray-400 hover:text-gray-600">
                  지우기
                </button>
              </div>
              <div className="custom-scrollbar max-h-60 overflow-y-auto">
                {visibleNotifications.length > 0 ? (
                  visibleNotifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                      className="block w-full cursor-pointer border-b border-gray-50 p-3 text-left transition hover:bg-gray-50"
                    >
                      <p className="text-xs leading-relaxed text-gray-800">{notification.message}</p>
                      <span className="mt-1 inline-block text-[10px] text-gray-400">{notification.timeLabel}</span>
                    </button>
                  ))
                ) : (
                  <p className="p-6 text-center text-xs text-gray-400">새로운 팀 알림이 없습니다.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
