import { useEffect,useState,type FormEvent,type ReactNode } from 'react'
import UserAvatar from '../../../components/UserAvatar'
import { loadMentoringHeaderNotifications } from './common-api'
import type { MentoringCommonPage,MentoringHeaderNotification,WorkspaceDashboard } from './common-types'
import { MENTORING_COMMON_PAGE_LOCK_CLASS_NAME,NAV_SECTIONS,PAGE_CONFIG,buildHref,buildMentoringNotificationHref,initials } from './common-workspace-support'



function renderMentoringNotificationMessage(notification: MentoringHeaderNotification) {
  const highlight = notification.highlightText?.trim()

  if (!highlight || !notification.message.includes(highlight)) {
    return notification.message
  }

  const [before, ...rest] = notification.message.split(highlight)
  const after = rest.join(highlight)

  return (
    <>
      {before}
      <strong>{highlight}</strong>
      {after}
    </>
  )
}

export function Avatar({
  name,
  image,
  className = 'h-10 w-10',
  textClassName = 'text-xs',
}: {
  name?: string | null
  image?: string | null
  className?: string
  textClassName?: string
}) {
  if (image) {
    return <img src={image} alt="" className={`${className} rounded-full object-cover`} />
  }

  return (
    <div
      className={`${className} rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center font-extrabold text-gray-500 ${textClassName}`}
    >
      {initials(name)}
    </div>
  )
}

export function EmptyPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white/70 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-2xl text-gray-300">
        <i className={icon}></i>
      </div>
      <p className="text-sm font-extrabold text-gray-800">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-gray-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function SectionCard({
  title,
  icon,
  children,
  action,
  className = '',
}: {
  title: string
  icon: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-5 flex items-center justify-between border-b border-gray-50 pb-3">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
          <i className={icon}></i>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function DashboardInlineEmpty({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: string
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`mentoring-dashboard-inline-empty ${className}`}>
      <div className="mentoring-dashboard-inline-empty-icon">
        <i className={icon}></i>
      </div>
      <p className="mentoring-dashboard-inline-empty-title">{title}</p>
      <p className="mentoring-dashboard-inline-empty-copy">{description}</p>
      {action ? <div className="mentoring-dashboard-inline-empty-action">{action}</div> : null}
    </div>
  )
}

export function SecondaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-[#00C471] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  )
}

export function SourceFormModal({
  open,
  title,
  icon,
  widthClass = 'max-w-md',
  bodyClass = 'p-6 space-y-5',
  onClose,
  onSubmit,
  children,
  footer,
}: {
  open: boolean
  title: string
  icon?: string
  widthClass?: string
  bodyClass?: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  footer: ReactNode
}) {
  if (!open) {
    return null
  }

  return (
    <div className="mentoring-workspace-modal-overlay fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className={`modal-content relative w-full overflow-hidden rounded-3xl bg-white shadow-2xl ${widthClass}`}>
        <form onSubmit={onSubmit}>
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              {icon ? <i className={`${icon} text-brand`}></i> : null}
              {title}
            </h3>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className={bodyClass}>{children}</div>

          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">{footer}</div>
        </form>
      </div>
    </div>
  )
}

export function MentoringShell({
  page,
  workspaceId,
  dashboard,
  memberName,
  memberProfileImage,
  children,
}: {
  page: MentoringCommonPage
  workspaceId: number | null
  dashboard: WorkspaceDashboard | null
  memberName?: string | null
  memberProfileImage?: string | null
  children: ReactNode
}) {
  const pageConfig = PAGE_CONFIG[page]
  const projectName = dashboard?.name ?? '멘토링 워크스페이스'
  const sourceBodyOwnsHeading = ['dashboard', 'curriculum', 'qna', 'workspace', 'schedule', 'files', 'meeting', 'erd'].includes(page)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<MentoringHeaderNotification[]>([])
  const [clearedNotifications, setClearedNotifications] = useState(false)
  const [noticeModal, setNoticeModal] = useState<{ title: string; body: string; timeLabel?: string | null } | null>(null)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const visibleNotifications = workspaceId && !clearedNotifications ? notifications : []
  const hasNotifications = visibleNotifications.length > 0
  const notificationTitle = page === 'dashboard' ? '새로운 알림' : '알림'

  useEffect(() => {
    if (!workspaceId) {
      return undefined
    }

    const controller = new AbortController()

    loadMentoringHeaderNotifications(workspaceId, page, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setNotifications(items ?? [])
          setClearedNotifications(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setNotifications([])
          setClearedNotifications(false)
        }
      })

    return () => controller.abort()
  }, [page, workspaceId])

  function openNotification(notification: MentoringHeaderNotification) {
    if (notification.modalTitle || notification.modalBody) {
      setNoticeModal({
        title: notification.modalTitle ?? '멘토 공지사항',
        body: notification.modalBody ?? notification.message,
        timeLabel: notification.timeLabel,
      })
      setNotificationOpen(false)
      return
    }

    if (notification.targetPath) {
      window.location.assign(buildMentoringNotificationHref(notification.targetPath, workspaceId))
    }
  }

  return (
    <div className={`${MENTORING_COMMON_PAGE_LOCK_CLASS_NAME} mentoring-common-page mentoring-common-${page}-page flex h-screen overflow-hidden bg-[#F3F4F6] text-gray-800`}>
      <aside className={`${sidebarPinned ? 'pinned ' : ''}mentoring-common-sidebar group z-50 flex w-20 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out hover:w-64`}>
        <div className="flex h-20 shrink-0 cursor-pointer items-center border-b border-gray-100 px-5 transition hover:bg-gray-50">
          <a href="/workspace-hub" className="flex min-w-0 flex-1 items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white shadow-md">
              <i className="fas fa-arrow-left"></i>
            </div>
            <div className="mentoring-sidebar-text ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mentoring</p>
              <p className="w-36 truncate font-bold text-gray-900">{projectName}</p>
            </div>
          </a>
          <button
            type="button"
            onClick={() => setSidebarPinned((current) => !current)}
            className="mentoring-sidebar-pin ml-0 flex h-7 w-0 items-center justify-center overflow-hidden rounded-md text-gray-400 opacity-0 transition-all duration-300 hover:bg-gray-100 hover:text-[#7C3AED] group-hover:ml-2 group-hover:w-7 group-hover:opacity-100"
            title={sidebarPinned ? '사이드바 고정 해제' : '사이드바 고정'}
          >
            <i className={sidebarPinned ? 'fas fa-thumbtack text-xs' : 'fas fa-thumbtack rotate-45 text-xs'}></i>
          </button>
        </div>

        <nav className="custom-scrollbar mt-2 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mentoring-sidebar-section h-0 overflow-hidden px-4 text-[10px] font-bold uppercase text-gray-400 opacity-0 transition-all duration-300 group-hover:mt-6 group-hover:mb-2 group-hover:h-auto group-hover:opacity-100">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = item === page

                return (
                  <a
                    key={item}
                    href={buildHref(item, workspaceId)}
                    className={
                      active
                        ? 'flex cursor-pointer items-center rounded-xl bg-[#EDE9FE] px-4 py-3 font-bold text-[#7C3AED] transition'
                        : 'flex cursor-pointer items-center rounded-xl px-4 py-3 font-medium text-gray-500 transition hover:translate-x-0.5 hover:bg-gray-50 hover:text-gray-900'
                    }
                  >
                    <i className={`${PAGE_CONFIG[item].icon} w-6 text-center text-lg`}></i>
                    <span className="mentoring-sidebar-text ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
                      {PAGE_CONFIG[item].label}
                    </span>
                  </a>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="flex cursor-pointer items-center border-t border-gray-100 p-4 transition hover:bg-gray-50">
          <UserAvatar
            name={memberName ?? 'Mentee'}
            imageUrl={memberProfileImage}
            className="h-10 w-10 shrink-0 bg-white"
            iconClassName="text-sm"
            alt={`${memberName ?? 'Mentee'} profile`}
          />
          <div className="mentoring-sidebar-text ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:w-auto group-hover:opacity-100">
            <p className="text-sm font-bold text-gray-900">{memberName ?? '학습자'}</p>
            <p className="mt-0.5 inline-block rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-[#00C471]">
              Mentee
            </p>
          </div>
        </div>
      </aside>

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-30 flex h-16 shrink-0 items-center border-b border-gray-100 bg-white px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 font-bold text-gray-800">
            <span className="rounded-md border border-purple-100 bg-[#EDE9FE] px-2 py-1 text-xs text-[#7C3AED]">
              Mentoring
            </span>
            <span className="truncate">{projectName}</span>
          </div>

          <div className="relative flex items-center gap-4">
            <button
              type="button"
              className="relative p-2 text-gray-400 transition hover:text-[#00C471]"
              title="알림"
              onClick={() => setNotificationOpen((open) => !open)}
            >
              <i className="far fa-bell text-lg"></i>
              {hasNotifications ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-red-500"></span> : null}
            </button>

            {notificationOpen ? (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-50 p-4">
                  <h3 className="text-sm font-bold">{notificationTitle}</h3>
                  <button
                    type="button"
                    className="text-xs text-gray-400 transition hover:text-gray-600"
                    onClick={() => setClearedNotifications(true)}
                  >
                    지우기
                  </button>
                </div>
                <div className="custom-scrollbar max-h-60 overflow-y-auto">
                  {visibleNotifications.length > 0 ? (
                    visibleNotifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        className="block w-full cursor-pointer border-b border-gray-50 p-3 text-left transition hover:bg-gray-50"
                        onClick={() => openNotification(notification)}
                      >
                        <p className="text-xs leading-relaxed text-gray-800">
                          {renderMentoringNotificationMessage(notification)}
                        </p>
                        {notification.actionLabel ? (
                          <span className="mt-1 inline-block text-[10px] font-bold text-[#00C471]">
                            {notification.actionLabel}
                          </span>
                        ) : null}
                        <span className={`${notification.actionLabel ? 'ml-2' : ''} mt-1 inline-block text-[10px] text-gray-400`}>
                          {notification.timeLabel}
                        </span>
                      </button>
                    ))
                  ) : page === 'dashboard' ? (
                    <div className="flex flex-col items-center justify-center py-8 opacity-70">
                      <i className="far fa-bell-slash mb-2 text-2xl text-gray-300"></i>
                      <p className="text-center text-xs text-gray-400">새로운 알림이 없습니다.</p>
                    </div>
                  ) : (
                    <p className="p-6 text-center text-xs text-gray-400">새로운 알림이 없습니다.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <div className="mentoring-common-scroll custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
          <div className="mentoring-common-container mx-auto max-w-6xl space-y-6">
            {sourceBodyOwnsHeading ? null : (
              <div className="mentoring-common-page-heading flex flex-col gap-2">
                <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
                  <i className={`${pageConfig.icon} text-[#00C471]`}></i>
                  {pageConfig.title}
                </h1>
                <p className="text-sm text-gray-500">
                  실제 워크스페이스 데이터를 기준으로 멘토링 공통과제 진행 상태를 관리합니다.
                </p>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>

      {noticeModal ? (
        <div className="mentoring-workspace-modal-overlay fixed inset-0 z-[1040] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="modal-content w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <i className="fas fa-bullhorn text-yellow-500"></i>
                {noticeModal.title}
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"
                onClick={() => setNoticeModal(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="custom-scrollbar max-h-[60vh] overflow-y-auto bg-[#F8F9FA] p-8">
              <p className="text-sm font-medium leading-relaxed text-gray-600">{noticeModal.body}</p>
              {noticeModal.timeLabel ? <p className="mt-4 text-xs font-bold text-gray-400">{noticeModal.timeLabel}</p> : null}
            </div>
            <div className="border-t border-gray-100 bg-white p-4">
              <button
                type="button"
                className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
                onClick={() => setNoticeModal(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
