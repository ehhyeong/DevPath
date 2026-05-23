import type { CSSProperties, ReactNode } from 'react'
import type { AuthSession } from '../types/auth'
import AccountUserMenu from './AccountUserMenu'
import HeaderAlerts from './HeaderAlerts'

const headerLinks = [
  { href: '/roadmap-hub', label: '\uB85C\uB4DC\uB9F5' },
  { href: '/lecture-list', label: '\uAC15\uC758' },
  { href: '/lounge-dashboard', label: '\uD504\uB85C\uC81D\uD2B8' },
  { href: '/job-matching', label: '\uCC44\uC6A9\uBD84\uC11D' },
  { href: '/community-list', label: '\uCEE4\uBBA4\uB2C8\uD2F0' },
]

// Edit only this object when you want pixel-level header tuning.
export const siteHeaderTuning = {
  maxWidthPx: null,
  horizontalPaddingPx: 32,
  containerGapPx: 32,
  sideWidthPx: 240,
  brandSlotOffsetXPx: -54,
  navBaseXPx: -30,
  navGapPx: 40,
  instructorGapPx: 40,
  instructorLinkGapPx: 24,
  headerGroup: { x: 0, y: 0 },
  brandGroup: { x: 50, y: 0 },
  navGroup: { x: -50, y: 0 },
  userGroup: { x: -50, y: 0 },
} as const

function getMoveStyle(offset: { x: number; y: number }): CSSProperties {
  return {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
  }
}

type SiteHeaderProps = {
  session: AuthSession | null
  profileImage?: string | null
  onLogout?: () => Promise<void> | void
  onLoginClick?: () => void
  activeNavHref?: string | null
  brandSuffix?: string
  offsetTopPx?: number
  userGroupOffsetOverride?: { x: number; y: number }
  startOverlay?: ReactNode
  endOverlay?: ReactNode
}

export default function SiteHeader({
  session,
  profileImage,
  onLogout,
  onLoginClick,
  activeNavHref = null,
  brandSuffix,
  offsetTopPx = 0,
  userGroupOffsetOverride,
  startOverlay,
  endOverlay,
}: SiteHeaderProps) {
  const showInstructorDashboard = session?.role === 'ROLE_INSTRUCTOR'
  const instructorHeaderLinks = showInstructorDashboard
    ? [{ href: '/instructor-dashboard', label: '\uAC15\uC0AC \uB300\uC2DC\uBCF4\uB4DC' }]
    : []
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
    transform: `translate(${siteHeaderTuning.navBaseXPx + siteHeaderTuning.navGroup.x}px, ${siteHeaderTuning.navGroup.y}px)`,
  }
  const instructorStyle: CSSProperties = {
    marginLeft: `${siteHeaderTuning.instructorGapPx}px`,
    gap: `${siteHeaderTuning.instructorLinkGapPx}px`,
  }
  const userStyle = getMoveStyle(userGroupOffsetOverride ?? siteHeaderTuning.userGroup)
  const railStyle: CSSProperties = { top: `${offsetTopPx}px` }
  const headerStyle: CSSProperties = { top: `${offsetTopPx}px` }
  const defaultNavLinkClassName = 'site-header-nav-link'
  const activeNavLinkClassName = 'site-header-nav-link site-header-nav-link--active'
  const showHeaderAlerts = Boolean(session && activeNavHref !== '/roadmap-hub')
  const brandLabel = (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
      <span className="inline-block">DevPath</span>
      {brandSuffix ? (
        <span className="text-sm font-semibold text-gray-400">{brandSuffix}</span>
      ) : null}
    </span>
  )

  return (
    <>
      <div className="app-header-rail" style={railStyle} />

      <nav className="app-header" style={headerStyle}>
        <div className="mx-auto flex h-full w-full items-center" style={containerStyle}>
          <div className="hidden items-center px-4 lg:flex" style={brandSlotStyle}>
            <a
              href="/home"
              className="group flex items-center gap-2 text-xl font-bold text-gray-900"
              style={getMoveStyle(siteHeaderTuning.brandGroup)}
            >
              <i className="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12" />
              {brandLabel}
            </a>
          </div>

          <div className="flex items-center lg:hidden">
            <a
              href="/home"
              className="group flex items-center gap-2 text-xl font-bold text-gray-900"
              style={getMoveStyle(siteHeaderTuning.brandGroup)}
            >
              <i className="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12" />
              {brandLabel}
            </a>
          </div>

          <div className="hidden flex-1 items-center justify-center text-sm font-bold text-gray-500 md:flex">
            <div className="relative inline-flex items-center" style={navStyle}>
              {headerLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={activeNavHref === item.href ? activeNavLinkClassName : defaultNavLinkClassName}
                >
                  {item.label}
                </a>
              ))}

              {showInstructorDashboard ? (
                <div
                  className="absolute top-1/2 left-full inline-flex -translate-y-1/2 whitespace-nowrap"
                  style={instructorStyle}
                >
                  {instructorHeaderLinks.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={activeNavHref === item.href ? activeNavLinkClassName : defaultNavLinkClassName}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-2 md:ml-0 md:w-60 md:flex-none">
            <div className="hidden md:flex items-center justify-end gap-2" style={userStyle}>
              {session ? (
                <>
                  {showHeaderAlerts ? <HeaderAlerts session={session} /> : null}
                  {showHeaderAlerts ? <div className="w-px h-6 bg-gray-200 mx-4"></div> : null}
                  <AccountUserMenu session={session} profileImage={profileImage} onLogout={onLogout} />
                </>
              ) : (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
                >
                  {'\uB85C\uADF8\uC778'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 md:hidden" style={userStyle}>
              {session ? (
                <>
                  {showHeaderAlerts ? <HeaderAlerts session={session} /> : null}
                  {showHeaderAlerts ? <div className="w-px h-6 bg-gray-200 mx-4"></div> : null}
                  <AccountUserMenu session={session} profileImage={profileImage} onLogout={onLogout} />
                </>
              ) : (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
                >
                  {'\uB85C\uADF8\uC778'}
                </button>
              )}
            </div>
          </div>
        </div>

        {startOverlay ? (
          <div className="absolute inset-0 pointer-events-none">
            {startOverlay}
          </div>
        ) : null}

        {endOverlay ? (
          <div className="absolute inset-0 pointer-events-none">
            {endOverlay}
          </div>
        ) : null}
      </nav>
    </>
  )
}
