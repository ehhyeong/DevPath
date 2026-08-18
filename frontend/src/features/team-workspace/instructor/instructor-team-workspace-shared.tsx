import { useEffect,useMemo,useState,type ReactNode } from 'react';
import type { InstructorTeamWsPage,TeamData,TeamNotification } from './instructor-types';
import { MAX_TEAM_NOTIFICATIONS,NAV_SECTIONS,PAGE_CONFIG,TEAM_NOTIFICATION_EVENT,avatarUrl,buildHref,buildTeamNotifications,isAnswered,membersOnly,readStoredTeamNotifications,readTeamNotificationIds,relativeTime,writeTeamNotificationIds } from './instructor-workspace-support';



export function EmptyPanel({ icon, title, description, action }: { icon: string; title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/50 px-6 py-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl text-gray-300">
        <i className={icon} />
      </div>
      <h3 className="text-sm font-extrabold text-gray-700">{title}</h3>
      <p className="mt-2 max-w-md text-xs leading-6 text-gray-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function Modal({ title, icon, onClose, children, maxWidth = 'max-w-lg' }: { title: string; icon: string; onClose: () => void; children: ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className={`${icon} text-[#7C3AED]`} />{title}</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar max-h-[calc(90vh-88px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function TeamShell({ page, workspaceId, data, children }: { page: InstructorTeamWsPage; workspaceId: number | null; data: TeamData; children: ReactNode }) {
  const [notiOpen, setNotiOpen] = useState(false)
  const [localNotifications, setLocalNotifications] = useState<TeamNotification[]>(() => readStoredTeamNotifications(workspaceId))
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => readTeamNotificationIds(workspaceId))
  const dashboard = data.dashboard
  const workspaceName = dashboard?.name ?? '팀 프로젝트 워크스페이스'
  const learners = membersOnly(data)
  const pendingMilestones = data.milestones.filter((item) => item.status !== 'COMPLETED').length
  const unanswered = data.questions.filter((question) => !isAnswered(question)).length
  const notifications = useMemo(() => buildTeamNotifications(data, workspaceId, localNotifications), [data, workspaceId, localNotifications])
  const unreadNotificationIds = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).map((notification) => notification.id)

  useEffect(() => {
    setLocalNotifications(readStoredTeamNotifications(workspaceId))
    setReadNotificationIds(readTeamNotificationIds(workspaceId))
  }, [workspaceId])

  useEffect(() => {
    function handleNotification(event: Event) {
      const detail = (event as CustomEvent<{ workspaceId: number; notification: TeamNotification }>).detail
      if (!detail || detail.workspaceId !== workspaceId) return
      setLocalNotifications((current) => [detail.notification, ...current.filter((item) => item.id !== detail.notification.id)].slice(0, MAX_TEAM_NOTIFICATIONS))
    }
    window.addEventListener(TEAM_NOTIFICATION_EVENT, handleNotification)
    return () => window.removeEventListener(TEAM_NOTIFICATION_EVENT, handleNotification)
  }, [workspaceId])

  function markNotificationsRead(ids: string[]) {
    if (!workspaceId || ids.length === 0) return
    setReadNotificationIds((current) => {
      const next = [...new Set([...current, ...ids])]
      writeTeamNotificationIds(workspaceId, next)
      return next
    })
  }

  function toggleNotifications() {
    setNotiOpen((current) => {
      const next = !current
      if (next) markNotificationsRead(notifications.map((notification) => notification.id))
      return next
    })
  }

  return (
    <div className="instructor-team-ws-page flex h-screen overflow-hidden bg-[#F3F4F6] font-['Pretendard'] text-gray-800" onClick={() => setNotiOpen(false)}>
      <aside className="group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64">
        <a href="/instructor-mentoring" className="flex h-20 shrink-0 items-center border-b border-gray-100 px-5 transition hover:bg-gray-50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white shadow-md"><i className="fas fa-arrow-left" /></div>
          <div className="sidebar-text flex flex-col">
            <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">강사 센터로 복귀</p>
            <p className="w-36 truncate font-bold text-gray-900">{workspaceName}</p>
          </div>
        </a>

        <nav className="custom-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="workspace-sidebar-section-title px-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">{section.title}</p>
              {section.pages.map((item) => {
                const config = PAGE_CONFIG[item]
                const active = item === page
                const count = item === 'milestone' ? pendingMilestones : item === 'qna' ? unanswered : 0
                return (
                  <a key={item} href={buildHref(item, workspaceId)} className={`workspace-nav-item ${active ? 'active' : ''}`}>
                    <div className="relative w-6 text-center text-lg">
                      <i className={config.icon} />
                      {count > 0 ? <span className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full border border-white bg-red-500" /> : null}
                    </div>
                    <span className="sidebar-text flex-1">
                      {config.label}
                      {count > 0 ? <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600">{count}</span> : null}
                    </span>
                  </a>
                )
              })}
              {section.title !== 'Resources & Live' ? <div className="mx-2 my-4 h-px bg-gray-100" /> : null}
            </div>
          ))}
        </nav>

        <div className="flex items-center border-t border-gray-100 p-4">
          <img src={dashboard?.ownerProfileImage ?? avatarUrl(dashboard?.ownerName)} className="h-10 w-10 shrink-0 rounded-full border-2 border-[#7C3AED] bg-white shadow-sm" alt="" />
          <div className="sidebar-text">
            <p className="text-sm font-bold text-gray-900">{dashboard?.ownerName ?? '강사'}</p>
            <p className="mt-0.5 inline-block rounded bg-[#7C3AED] px-1.5 py-0.5 text-[10px] font-bold text-white">Instructor (PM)</p>
          </div>
        </div>
      </aside>

      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
        <header className="relative z-30 flex h-16 shrink-0 items-center border-b border-gray-100 bg-white px-8 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3 font-bold text-gray-800">
            <span className="rounded-md bg-gray-900 px-2 py-1 text-[10px] tracking-wider text-white">ADMIN</span>
            <span className="truncate">{workspaceName}</span>
            <span className="shrink-0 rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]"><i className="fas fa-puzzle-piece mr-1" />팀 프로젝트형</span>
          </div>
          <div className="relative flex items-center gap-4">
            <div className="mr-2 flex items-center gap-2 border-r border-gray-200 pr-4">
              <span className="text-[10px] font-bold text-gray-500">담당 팀원 ({learners.length}명)</span>
              <div className="flex -space-x-2">
                {learners.slice(0, 5).map((member) => <img key={member.memberId} src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-8 w-8 rounded-full border-2 border-white bg-blue-50" title={member.learnerName ?? '팀원'} alt="" />)}
                {learners.length === 0 ? <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400"><i className="fas fa-plus text-xs" /></div> : null}
              </div>
            </div>
            <button type="button" className="relative p-2 text-gray-400 transition hover:text-[#7C3AED]" onClick={(event) => { event.stopPropagation(); toggleNotifications() }}>
              <i className="far fa-bell text-lg" />
              {unreadNotificationIds.length > 0 ? <span className="absolute top-1 right-1 h-2 w-2 rounded-full border border-white bg-red-500" /> : null}
            </button>
            {notiOpen ? (
              <div className="absolute top-12 right-0 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-gray-50 p-4">
                  <h3 className="text-sm font-bold">알림</h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">최근 {notifications.length}개</span>
                </div>
                <div className="custom-scrollbar max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="flex flex-col items-center p-8 text-center text-xs text-gray-400"><i className="far fa-bell-slash mb-2 text-2xl text-gray-300" />새로운 알림이 없습니다.</p>
                  ) : notifications.map((notification) => (
                    <a key={notification.id} href={notification.href} onClick={() => markNotificationsRead([notification.id])} className="flex gap-3 border-b border-gray-50 p-3 transition hover:bg-gray-50">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs text-[#7C3AED]"><i className={notification.icon} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <strong className="truncate text-xs text-gray-900">{notification.title}</strong>
                          {!readNotificationIds.includes(notification.id) ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" /> : null}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-gray-500">{notification.description}</span>
                        <span className="mt-1 inline-block text-[10px] font-bold text-[#7C3AED]">{relativeTime(notification.createdAt)}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </header>
        <div className={`custom-scrollbar flex-1 ${page === 'schedule' ? 'overflow-hidden p-5' : page === 'kanban' || page === 'architecture' ? 'overflow-hidden' : 'overflow-y-auto p-8'}`}>
          <div className={`mx-auto ${page === 'schedule' ? 'flex h-full max-w-6xl flex-col' : page === 'kanban' || page === 'architecture' ? 'h-full max-w-none' : page === 'qna' ? 'flex h-full max-w-5xl flex-col' : page === 'files' ? 'flex h-full max-w-6xl flex-col' : page === 'meeting' ? 'max-w-6xl space-y-8' : 'max-w-7xl space-y-6'}`}>{children}</div>
        </div>
      </main>
    </div>
  )
}

export function PageHeading({ page, description, action }: { page: InstructorTeamWsPage; description: ReactNode; action?: ReactNode }) {
  const config = PAGE_CONFIG[page]
  return (
    <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className={`${config.icon} text-[#7C3AED]`} />{config.title}</h1>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function StatCard({ icon, label, value, suffix, tone = 'text-[#7C3AED]', onClick }: { icon: string; label: string; value: string | number; suffix?: string; tone?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition ${onClick ? 'hover:-translate-y-0.5 hover:border-purple-200' : ''}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-50 text-xl ${tone}`}><i className={icon} /></div>
      <div><p className="mb-0.5 text-[10px] font-extrabold text-gray-400">{label}</p><p className="text-2xl font-black text-gray-900">{value}<span className="ml-1 text-sm font-medium text-gray-500">{suffix}</span></p></div>
    </button>
  )
}
