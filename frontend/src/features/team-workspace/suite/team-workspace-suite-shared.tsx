import { useState,type ReactNode } from 'react'
import TeamWorkspaceHeader from '../../../components/TeamWorkspaceHeader'
import UserAvatar from '../../../components/UserAvatar'
import { readStoredAuthSession } from '../../../lib/auth-session'
import { TEAM_WORKSPACE_PAGE_LOCK_CLASS_NAME } from './constants'
import { TEAM_WORKSPACE_COLLABORATION_NAV,TEAM_WORKSPACE_RESOURCE_NAV } from './nav'
import type { SuiteData,TeamWorkspacePage,WorkspaceDashboard,WorkspaceTask } from './types'
import { fallbackMemberPosition,memberAssignedPosition,memberPositionLightBadgeClass,navHref } from './utils'


export function Sidebar({
  activePage,
  dashboard,
  tasks,
  workspaceId,
}: {
  activePage: TeamWorkspacePage
  dashboard: WorkspaceDashboard | null
  tasks: WorkspaceTask[]
  workspaceId: number | null
}) {
  const projectName = dashboard?.name?.trim() || 'Next.js 블로그 플랫폼 구축'
  const session = readStoredAuthSession()
  const currentMember = dashboard?.members.find((member) => member.learnerId === session?.userId) ?? dashboard?.members[0]
  const currentMemberPosition = currentMember ? memberAssignedPosition(currentMember, tasks) ?? fallbackMemberPosition(0) : fallbackMemberPosition(0)
  const [sidebarPinned, setSidebarPinned] = useState(false)

  return (
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

      <nav className="custom-scrollbar mt-4 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3">
        <p className="workspace-sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Team Dashboard</p>
        <a href={navHref('/team-ws-dashboard', workspaceId)} className="workspace-nav-item">
          <i className="fas fa-chart-line w-6 text-center text-lg"></i>
          <span className="sidebar-text">프로젝트 대시보드</span>
        </a>
        <a href={navHref('/team-ws-milestone', workspaceId)} className="workspace-nav-item">
          <i className="fas fa-flag-checkered w-6 text-center text-lg"></i>
          <span className="sidebar-text">마일스톤 & 주간 과제</span>
        </a>

        <div className="mx-2 my-2 h-px bg-gray-100"></div>
        <p className="workspace-sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Collaboration</p>
        {TEAM_WORKSPACE_COLLABORATION_NAV.map((item) => (
          <a key={item.key} href={navHref(item.path, workspaceId)} className={`workspace-nav-item ${activePage === item.key ? 'active' : ''}`}>
            <i className={`fas ${item.icon} w-6 text-center text-lg`}></i>
            <span className="sidebar-text">{item.title}</span>
          </a>
        ))}

        <div className="mx-2 my-2 h-px bg-gray-100"></div>
        <p className="workspace-sidebar-section-title px-4 text-[10px] font-bold uppercase text-gray-400">Resources & Live</p>
        {TEAM_WORKSPACE_RESOURCE_NAV.map((item) => (
          <a key={item.key} href={navHref(item.path, workspaceId)} className={`workspace-nav-item ${activePage === item.key ? 'active' : ''}`}>
            <i className={`fas ${item.icon} w-6 text-center text-lg`}></i>
            <span className="sidebar-text">{item.title}</span>
          </a>
        ))}
      </nav>

      <div className="flex cursor-pointer items-center border-t border-gray-100 p-4 transition hover:bg-gray-50">
        <UserAvatar
          name={currentMember?.learnerName || '나'}
          imageUrl={currentMember?.profileImage}
          className="h-10 w-10 shrink-0 border-2 border-gray-200 bg-white"
          iconClassName="text-sm"
        />
        <div className="sidebar-text min-w-0">
          <p className="flex items-center gap-1 text-sm font-bold text-gray-900">
            <span className="truncate">{currentMember?.learnerName || '나'}</span>
            <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] ${memberPositionLightBadgeClass(currentMemberPosition)}`}>
              {currentMemberPosition}
            </span>
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500">내 역할 확인하기</p>
        </div>
      </div>
    </aside>
  )
}

export function PageFrame({
  activePage,
  title,
  subtitle,
  action,
  data,
  workspaceId,
  children,
  mainClassName = 'custom-scrollbar flex-1 overflow-y-auto p-8 relative',
  contentClassName = 'mx-auto flex h-full max-w-6xl flex-col',
}: {
  activePage: TeamWorkspacePage
  title: string
  subtitle: string
  action?: ReactNode
  data: SuiteData
  workspaceId: number | null
  children: ReactNode
  mainClassName?: string
  contentClassName?: string
}) {
  const members = data.dashboard?.members ?? []
  const projectName = data.dashboard?.name?.trim() || 'AI 기반 맞춤 여행 코스 추천 서비스 구현'
  const hasPageAction = Boolean(action)

  return (
    <div className={`${TEAM_WORKSPACE_PAGE_LOCK_CLASS_NAME} team-ws-dashboard-page team-ws-suite-page flex h-screen overflow-hidden bg-[#F3F4F6] text-gray-800`}>
      <Sidebar activePage={activePage} dashboard={data.dashboard} tasks={data.tasks} workspaceId={workspaceId} />
      <div className="team-ws-main flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
        <TeamWorkspaceHeader
          workspaceId={workspaceId}
          pageKey={activePage}
          projectName={projectName}
          members={members}
        />

        <main aria-label={title} data-subtitle={subtitle} data-has-page-action={hasPageAction ? 'true' : 'false'} className={mainClassName}>
          <div className={contentClassName}>{children}</div>
        </main>
      </div>
    </div>
  )
}

export function EmptyPanel({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionTone = 'dark',
}: {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionTone?: 'dark' | 'team' | 'muted'
}) {
  const buttonClassName =
    actionTone === 'team'
      ? 'bg-team text-white shadow-md hover:bg-indigo-700'
      : actionTone === 'muted'
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
        : 'bg-gray-900 text-white shadow-md hover:bg-black'

  return (
    <div className="team-ws-empty-panel flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-8 py-20 text-center shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-2xl text-gray-300 shadow-sm">
        <i className={`fas ${icon}`}></i>
      </div>
      <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-md text-xs font-medium leading-5 text-gray-500">{description}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={`mt-6 inline-flex h-10 items-center gap-1.5 rounded-xl px-5 text-xs font-bold transition ${buttonClassName}`}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  iconClassName,
  description,
  panelClassName = 'w-full max-w-lg',
  headerClassName = 'items-center',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  iconClassName?: string
  description?: string
  panelClassName?: string
  headerClassName?: string
}) {
  return (
    <div className="team-workspace-modal-overlay fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <button type="button" aria-label="닫기" className="absolute inset-0" onClick={onClose}></button>
      <div className={`modal-content team-ws-modal-panel relative z-10 overflow-hidden rounded-3xl bg-white shadow-2xl [&>div:first-child]:min-h-[74px] [&_label]:mb-[8px] [&_label]:block [&_label]:text-[12px] [&_label]:font-bold [&_label]:text-[#1F2937] [&_input]:rounded-[12px]! [&_input]:border-[#E5E7EB]! [&_input]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)] [&_select]:rounded-[12px]! [&_select]:border-[#E5E7EB]! [&_select]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)] [&_textarea]:rounded-[12px]! [&_textarea]:border-[#E5E7EB]! [&_textarea]:leading-[1.6] [&_textarea]:[box-shadow:0_1px_2px_rgba(15,23,42,0.04)] ${panelClassName}`}>
        <div className={`flex justify-between border-b border-gray-100 bg-gray-50 p-6 ${headerClassName}`}>
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              {iconClassName ? <i className={`fas ${iconClassName} text-team`}></i> : null}
              {title}
            </h3>
            {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-900">
            <i className="fas fa-times"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function LoadingView() {
  return (
    <div className={`${TEAM_WORKSPACE_PAGE_LOCK_CLASS_NAME} team-ws-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] text-gray-800`}>
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-team"></div>
        <p className="text-sm font-bold text-gray-500">팀 워크스페이스를 불러오는 중입니다.</p>
      </div>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className={`${TEAM_WORKSPACE_PAGE_LOCK_CLASS_NAME} team-ws-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] text-gray-800`}>
      <div className="team-ws-card w-[420px] border border-gray-100 bg-white p-8 text-center shadow-sm">
        <i className="fas fa-circle-exclamation mb-3 text-3xl text-red-400"></i>
        <h1 className="text-xl font-black text-gray-900">팀 워크스페이스를 열 수 없습니다.</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-gray-500">{message}</p>
        <a href="/workspace-hub" className="mt-6 inline-flex h-11 items-center rounded-xl bg-gray-900 px-5 text-sm font-black text-white hover:bg-black">
          워크스페이스 허브로 이동
        </a>
      </div>
    </div>
  )
}
