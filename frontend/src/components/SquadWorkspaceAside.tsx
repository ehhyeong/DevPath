import { useEffect, useState, type MouseEvent } from 'react'
import { showAuthToast } from '../lib/auth-toast'
import { projectApiRequest } from '../project-api'

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

type ExternalIntegration = {
  provider: string
  active?: boolean
  isActive?: boolean
  repositoryUrl?: string | null
}

type NavSection = {
  title: string
  items: NavItem[]
}

const SIDEBAR_PINNED_STORAGE_KEY = 'sidebarPinned'

function readSidebarPinned() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY) === 'true'
}

function storeSidebarPinned(value: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, value ? 'true' : 'false')
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

function isGithubLinked(integrations: ExternalIntegration[]) {
  const github = integrations.find((integration) => integration.provider === 'GITHUB')
  return Boolean((github?.active ?? github?.isActive) && github?.repositoryUrl?.trim())
}

export default function SquadWorkspaceAside({
  activePage,
  workspaceId,
  projectName,
  pinned,
  onTogglePinned,
  reviewBadgeCount,
  onNavigate,
}: SquadWorkspaceAsideProps) {
  const [githubLinked, setGithubLinked] = useState<boolean | null>(null)
  const [localPinned, setLocalPinned] = useState(readSidebarPinned)
  const sidebarPinned = pinned ?? localPinned
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
        { key: 'erd', label: 'ERD 설계', icon: 'fas fa-project-diagram', path: '/squad-erd' },
        {
          key: 'review',
          label: '코드 피드백',
          icon: 'fas fa-code-branch',
          path: '/squad-review',
          badgeCount: reviewBadgeCount,
        },
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

  useEffect(() => {
    if (!workspaceId) {
      setGithubLinked(false)
      return
    }

    let ignore = false

    async function loadGithubIntegration() {
      try {
        const integrations = await projectApiRequest<ExternalIntegration[]>(
          `/api/workspaces/${workspaceId}/integrations`,
          {},
          'required',
        )

        if (!ignore) {
          setGithubLinked(isGithubLinked(integrations))
        }
      } catch {
        if (!ignore) {
          setGithubLinked(false)
        }
      }
    }

    void loadGithubIntegration()

    return () => {
      ignore = true
    }
  }, [workspaceId])

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string, item?: NavItem) {
    if (item?.key === 'review' && githubLinked !== true) {
      event.preventDefault()
      showAuthToast({
        message: '코드 피드백은 GitHub 저장소를 연동한 뒤 이용할 수 있습니다.',
        variant: 'error',
        durationMs: 2200,
      })
      return
    }

    onNavigate?.(event, href)
  }

  function handleTogglePinned(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (onTogglePinned) {
      onTogglePinned(event)
      return
    }

    setLocalPinned((current) => {
      const next = !current
      storeSidebarPinned(next)
      return next
    })
  }

  return (
    <aside className={`${sidebarPinned ? 'pinned w-[256px]! ' : ''}squad-workspace-aside w-20 hover:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out group shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}>
      <div className="h-20 flex items-center px-5 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 shrink-0">
        <a
          href="/workspace-hub"
          onClick={(event) => handleNavigate(event, '/workspace-hub')}
          className="flex items-center min-w-0 flex-1"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className={`sidebar-text flex min-w-0 w-0 flex-col justify-center overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-[ease] group-hover:ml-[12px] group-hover:w-auto group-hover:opacity-100 ${sidebarPinned ? 'ml-[12px]! w-auto! opacity-100!' : ''}`}>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">목록으로 돌아가기</p>
            <p className="font-extrabold text-gray-900 truncate w-28 leading-tight">{projectLabel}</p>
          </div>
        </a>
        <button
          type="button"
          onClick={handleTogglePinned}
          className={`sidebar-text squad-dashboard-pin-button ml-2 flex h-[28px]! w-[28px]! shrink-0 basis-[28px] items-center justify-center overflow-hidden whitespace-nowrap rounded-[6px]! text-[14px]! leading-[20px]! text-gray-400 opacity-0 transition-all duration-300 ease-[ease] hover:bg-gray-100 hover:text-brand focus:outline-none group-hover:ml-[12px] group-hover:w-[28px] group-hover:opacity-100 ${sidebarPinned ? 'ml-[12px]! w-[28px]! opacity-100!' : ''}`}
          title={sidebarPinned ? '사이드바 고정 해제' : '사이드바 고정'}
        >
          <i className={`${sidebarPinned ? 'fas fa-thumbtack' : 'fas fa-thumbtack rotate-45'} text-xs`}></i>
        </button>
      </div>

      <nav className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
        {sections.map((section) => (
          <div key={section.title}>
            <p className={`sidebar-section-title px-4 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400 ${sidebarPinned ? 'mt-[24px]! mb-[8px]! h-auto! opacity-100!' : ''}`}>
              {section.title}
            </p>
            {section.items.map((item) => {
              const href = navHref(item.path, workspaceId)
              const badgeCount = item.badgeCount ?? 0
              const blocked = item.key === 'review' && githubLinked !== true

              return (
                <a
                  key={item.key}
                  href={href}
                  onClick={(event) => handleNavigate(event, href, item)}
                  className={`nav-item mb-[4px] flex min-h-[48px]! box-border items-center rounded-[12px]! px-[16px]! py-[14px]! [transition:all_0.2s_ease-in-out]! hover:translate-x-[4px]! ${activePage === item.key ? 'active bg-[#EBFDF5]! font-bold! text-[#00C471]! hover:bg-[#EBFDF5]! hover:text-[#00C471]!' : 'font-semibold! text-[#6B7280]! hover:bg-[#F3F4F6]! hover:text-[#111827]!'} ${blocked ? 'opacity-50' : ''}`}
                  aria-disabled={blocked}
                >
                  <i className={`${item.icon} w-6 shrink-0 grow-0 basis-[24px] text-center text-lg leading-[28px]!`}></i>
                  <span className={`sidebar-text squad-dashboard-review-link w-0 flex-1 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-[ease] group-hover:ml-[12px] group-hover:flex group-hover:w-auto group-hover:min-w-0 group-hover:flex-auto group-hover:items-center group-hover:justify-between group-hover:gap-[8px] group-hover:opacity-100 ${sidebarPinned ? 'ml-[12px]! flex! w-auto! min-w-0 flex-auto items-center justify-between gap-[8px] opacity-100!' : ''}`}>
                    <span className="truncate">{item.label}</span>
                    {badgeCount > 0 ? (
                      <span className="squad-dashboard-review-badge inline-flex h-[16px] w-[16px] shrink-0 basis-[16px] items-center justify-center rounded-full bg-red-500 p-0! text-[9px] leading-[16px]! font-black text-white">
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
