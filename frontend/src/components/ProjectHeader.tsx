import type { CSSProperties } from 'react'
import { projectHeaderLinks } from '../project-shell'
import type { AuthSession } from '../types/auth'
import AccountUserMenu from './AccountUserMenu'
import HeaderAlerts from './HeaderAlerts'
import { siteHeaderTuning } from './SiteHeader'

type ProjectHeaderProps = {
  session: AuthSession | null
  profileImage?: string | null
  activeHref?: string
  onLoginClick?: () => void
  onLogout?: () => Promise<void> | void
}

const LOGIN_TEXT = '\uB85C\uADF8\uC778'
const PROJECT_HEADER_NAV_OFFSET_X = 0
const PROJECT_HEADER_USER_OFFSET_X = 0

function getMoveStyle(offset: { x: number; y: number }): CSSProperties {
  return {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
  }
}

export default function ProjectHeader({
  session,
  profileImage,
  activeHref = '/lounge-dashboard',
  onLoginClick,
  onLogout,
}: ProjectHeaderProps) {
  const containerStyle: CSSProperties = {
    maxWidth: siteHeaderTuning.maxWidthPx == null ? 'none' : `${siteHeaderTuning.maxWidthPx}px`,
    paddingLeft: `clamp(16px, 3vw, ${siteHeaderTuning.horizontalPaddingPx}px)`,
    paddingRight: `clamp(16px, 3vw, ${siteHeaderTuning.horizontalPaddingPx}px)`,
    gap: `clamp(12px, 2vw, ${siteHeaderTuning.containerGapPx}px)`,
    ...getMoveStyle(siteHeaderTuning.headerGroup),
  }
  const brandSlotStyle: CSSProperties = {
    width: `${siteHeaderTuning.sideWidthPx}px`,
    transform: `translateX(${siteHeaderTuning.brandSlotOffsetXPx}px)`,
  }
  const navStyle: CSSProperties = {
    gap: `${siteHeaderTuning.navGapPx}px`,
    transform: `translate(${siteHeaderTuning.navBaseXPx + siteHeaderTuning.navGroup.x + PROJECT_HEADER_NAV_OFFSET_X}px, ${siteHeaderTuning.navGroup.y}px)`,
  }
  const userStyle: CSSProperties = {
    transform: `translate(${siteHeaderTuning.userGroup.x + PROJECT_HEADER_USER_OFFSET_X}px, ${siteHeaderTuning.userGroup.y}px)`,
  }

  return (
    <header className="h-16 bg-white border-b border-gray-100 sticky top-0 z-30 shrink-0">
      <div className="mx-auto flex h-full w-full items-center" style={containerStyle}>
        <div className="hidden items-center px-4 lg:flex" style={brandSlotStyle}></div>

        <div className="flex items-center lg:hidden"></div>

        <nav className="hidden flex-1 items-center justify-center text-sm font-bold text-gray-500 md:flex">
          <div className="relative inline-flex items-center" style={navStyle}>
            {projectHeaderLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={item.href === activeHref ? 'site-header-nav-link site-header-nav-link--active' : 'site-header-nav-link'}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-2 md:ml-0 md:w-60 md:flex-none">
          <div className="hidden md:flex items-center justify-end gap-2" style={userStyle}>
            {session ? (
              <>
                <HeaderAlerts session={session} />
                <div className="w-px h-6 bg-gray-200 mx-4"></div>
                <AccountUserMenu session={session} profileImage={profileImage} onLogout={onLogout} />
              </>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
              >
                {LOGIN_TEXT}
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 md:hidden" style={userStyle}>
            {session ? (
              <>
                <HeaderAlerts session={session} />
                <div className="w-px h-6 bg-gray-200 mx-4"></div>
                <AccountUserMenu session={session} profileImage={profileImage} onLogout={onLogout} />
              </>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
              >
                {LOGIN_TEXT}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
