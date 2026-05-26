import type { MouseEvent } from 'react'

export type SquadWorkspaceAsidePage =
  | 'dashboard'
  | 'workspace'
  | 'review'
  | 'erd'
  | 'schedule'
  | 'files'
  | 'meeting'
  | 'settings'

type SquadWorkspaceAsideProps = {
  activePage: SquadWorkspaceAsidePage
  workspaceId: number | null
  projectName?: string | null
  pinned?: boolean
  onTogglePinned?: (event: MouseEvent<HTMLButtonElement>) => void
  reviewBadgeCount?: number | null
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

type NavItem = {
  key: SquadWorkspaceAsidePage
  label: string
  icon: string
  path: string
  badgeCount?: number | null
}

type NavSection = {
  title: string
  items: NavItem[]
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

export default function SquadWorkspaceAside({
  activePage,
  workspaceId,
  projectName,
  pinned = false,
  onTogglePinned,
  reviewBadgeCount,
  onNavigate,
}: SquadWorkspaceAsideProps) {
  const projectLabel = projectName?.trim() || '스쿼드 프로젝트'
  const sections: NavSection[] = [
    {
      title: '개요',
      items: [{ key: 'dashboard', label: '대시보드', icon: 'fas fa-chart-pie', path: '/squad-dashboard' }],
    },
    {
      title: '프로젝트 진행',
      items: [
        { key: 'workspace', label: '작업 현황판', icon: 'fas fa-columns', path: '/squad-workspace' },
        { key: 'schedule', label: '일정 관리', icon: 'fas fa-calendar-alt', path: '/squad-schedule' },
        { key: 'files', label: '팀 자료실', icon: 'fas fa-folder-open', path: '/squad-files' },
      ],
    },
    {
      title: '설계/리뷰',
      items: [
        {
          key: 'review',
          label: '코드 피드백',
          icon: 'fas fa-code-branch',
          path: '/squad-review',
          badgeCount: reviewBadgeCount,
        },
        { key: 'erd', label: 'ERD 설계', icon: 'fas fa-project-diagram', path: '/squad-erd' },
      ],
    },
    {
      title: '커뮤니케이션',
      items: [{ key: 'meeting', label: '음성 회의', icon: 'fas fa-headset', path: '/squad-meeting' }],
    },
    {
      title: '관리',
      items: [{ key: 'settings', label: '스쿼드 설정', icon: 'fas fa-cog', path: '/squad-settings' }],
    },
  ]

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    onNavigate?.(event, href)
  }

  return (
    <aside className={`${pinned ? 'pinned ' : ''}squad-workspace-aside w-20 hover:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out group shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}>
      <div className="h-20 flex items-center px-5 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 shrink-0">
        <a
          href="/workspace-hub"
          onClick={(event) => handleNavigate(event, '/workspace-hub')}
          className="flex items-center min-w-0 flex-1"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className="sidebar-text flex flex-col justify-center min-w-0">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">목록으로 돌아가기</p>
            <p className="font-extrabold text-gray-900 truncate w-28 leading-tight">{projectLabel}</p>
          </div>
        </a>
        {onTogglePinned ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onTogglePinned(event)
            }}
            className="sidebar-text squad-dashboard-pin-button w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-brand transition-colors focus:outline-none ml-2"
            title={pinned ? '사이드바 고정 해제' : '사이드바 고정'}
          >
            <i className="fas fa-thumbtack text-xs"></i>
          </button>
        ) : null}
      </div>

      <nav className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="sidebar-section-title px-4 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
              {section.title}
            </p>
            {section.items.map((item) => {
              const href = navHref(item.path, workspaceId)
              const badgeCount = item.badgeCount ?? 0

              return (
                <a
                  key={item.key}
                  href={href}
                  onClick={(event) => handleNavigate(event, href)}
                  className={activePage === item.key ? 'nav-item active' : 'nav-item'}
                >
                  <i className={`${item.icon} w-6 text-center text-lg`}></i>
                  <span className="sidebar-text squad-dashboard-review-link flex-1">
                    <span className="truncate">{item.label}</span>
                    {badgeCount > 0 ? (
                      <span className="squad-dashboard-review-badge bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {badgeCount}
                      </span>
                    ) : null}
                  </span>
                </a>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
