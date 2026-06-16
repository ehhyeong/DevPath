import { useState, type CSSProperties, type ReactNode } from 'react'
import type { AuthSession } from '../types/auth'
import AccountUserMenu from './AccountUserMenu'
import HeaderAlerts from './HeaderAlerts'

type HeaderSubLink = {
  href: string
  label: string
}

type HeaderLink = HeaderSubLink & {
  children?: HeaderSubLink[]
}

export const siteHeaderLinks: HeaderLink[] = [
  {
    href: '/roadmap-hub',
    label: '\uB85C\uB4DC\uB9F5',
    children: [
      { href: '/survey', label: '\uB85C\uB4DC\uB9F5 \uCD94\uCC9C' },
      { href: '/roadmap-hub', label: '\uB85C\uB4DC\uB9F5 \uD0D0\uC0C9' },
      { href: '/my-roadmap-list', label: '\uB0B4 \uB85C\uB4DC\uB9F5' },
    ],
  },
  { href: '/lecture-list', label: '\uAC15\uC758' },
  {
    href: '/lounge-dashboard',
    label: '\uD504\uB85C\uC81D\uD2B8',
    children: [
      { href: '/lounge-dashboard', label: '\uD504\uB85C\uC81D\uD2B8 \uB300\uC2DC\uBCF4\uB4DC' },
      { href: '/community-lounge', label: '\uB77C\uC6B4\uC9C0 (\uD300 \uCC3E\uAE30)' },
      { href: '/mentoring-hub', label: '\uBA58\uD1A0\uB9C1 \uCC3E\uAE30' },
      { href: '/workspace-hub', label: '\uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4' },
      { href: '/dev-showcase', label: '\uB7F0\uCE6D \uC1FC\uCF00\uC774\uC2A4' },
    ],
  },
  { href: '/job-matching', label: '\uCC44\uC6A9\uBD84\uC11D' },
  {
    href: '/community-list',
    label: '\uCEE4\uBBA4\uB2C8\uD2F0',
    children: [
      { href: '/community-list?category=all', label: '\uC804\uCCB4\uAE00' },
      { href: '/community-list?category=qa', label: 'Q&A' },
      { href: '/community-list?category=tech', label: '\uAE30\uC220 \uACF5\uC720' },
      { href: '/community-list?category=career', label: '\uCEE4\uB9AC\uC5B4/\uC774\uC9C1' },
      { href: '/community-list?category=free', label: '\uC790\uC720\uAC8C\uC2DC\uD310' },
    ],
  },
]

export const instructorDashboardLinks: HeaderSubLink[] = [
  { href: '/instructor-dashboard', label: '\uB300\uC2DC\uBCF4\uB4DC' },
  { href: '/course-management', label: '\uAC15\uC758 \uAD00\uB9AC' },
  { href: '/instructor-mentoring', label: '\uBA58\uD1A0\uB9C1 \uAD00\uB9AC' },
  { href: '/student-analytics', label: '\uC218\uAC15\uC0DD \uBD84\uC11D' },
  { href: '/instructor-qna', label: '\uC9C8\uBB38 \uAC8C\uC2DC\uD310' },
  { href: '/instructor-reviews', label: '\uC218\uAC15\uD3C9 \uAD00\uB9AC' },
  { href: '/instructor-revenue', label: '\uC815\uC0B0 \uAD00\uB9AC' },
  { href: '/instructor-marketing', label: '\uB9C8\uCF00\uD305 \uAD00\uB9AC' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const showInstructorDashboard = session?.role === 'ROLE_INSTRUCTOR'
  const instructorHeaderLinks = showInstructorDashboard
    ? [{ href: '/instructor-dashboard', label: '\uAC15\uC0AC \uB300\uC2DC\uBCF4\uB4DC', children: instructorDashboardLinks }]
    : []
  const mobileMenuLinks = [...siteHeaderLinks, ...instructorHeaderLinks]
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
  const mobileMenuStyle: CSSProperties = {
    top: `calc(var(--app-header-height) + ${offsetTopPx}px)`,
    maxHeight: `calc(100dvh - var(--app-header-height) - ${offsetTopPx}px)`,
  }
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

          <div className="site-header-mobile-brand flex min-w-0 items-center lg:hidden">
            <a
              href="/home"
              className="group flex min-w-0 items-center gap-2 text-xl font-bold text-gray-900"
            >
              <i className="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12" />
              {brandLabel}
            </a>
          </div>

          <div className="hidden flex-1 items-center justify-center text-sm font-bold text-gray-500 lg:flex">
            <div className="relative inline-flex items-center" style={navStyle}>
              {siteHeaderLinks.map((item) => {
                const children = item.children ?? []
                const hasChildren = children.length > 0
                const isActive =
                  activeNavHref === item.href ||
                  children.some((child) => activeNavHref === child.href.split('?')[0])

                return (
                  <div key={item.href} className="site-header-nav-item">
                    <a
                      href={item.href}
                      className={isActive ? activeNavLinkClassName : defaultNavLinkClassName}
                      aria-haspopup={hasChildren ? 'menu' : undefined}
                    >
                      {item.label}
                    </a>

                    {hasChildren ? (
                      <div
                        className="site-header-mega-menu"
                        role="menu"
                        aria-label={`${item.label} \uC138\uBD80 \uBA54\uB274`}
                      >
                        <div className="site-header-mega-panel">
                          <div className="site-header-mega-links">
                            {children.map((child) => (
                              <a key={child.href + child.label} href={child.href} className="site-header-mega-link" role="menuitem">
                                {child.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}

              {showInstructorDashboard ? (
                <div
                  className="absolute top-1/2 left-full inline-flex -translate-y-1/2 whitespace-nowrap"
                  style={instructorStyle}
                >
                  {instructorHeaderLinks.map((item) => {
                    const children = item.children ?? []
                    const isActive =
                      activeNavHref === item.href ||
                      children.some((child) => activeNavHref === child.href)

                    return (
                      <div key={item.href} className="site-header-nav-item">
                        <a
                          href={item.href}
                          className={isActive ? activeNavLinkClassName : defaultNavLinkClassName}
                          aria-haspopup="menu"
                        >
                          {item.label}
                        </a>

                        <div
                          className="site-header-mega-menu"
                          role="menu"
                          aria-label={`${item.label} \uC138\uBD80 \uBA54\uB274`}
                        >
                          <div className="site-header-mega-panel">
                            <div className="site-header-mega-links">
                              {children.map((child) => (
                                <a key={child.href} href={child.href} className="site-header-mega-link" role="menuitem">
                                  {child.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-2 lg:ml-0 lg:w-60 lg:flex-none">
            <div className="hidden lg:flex items-center justify-end gap-2" style={userStyle}>
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

            <div className="site-header-mobile-user flex min-w-0 items-center justify-end gap-2 lg:hidden">
              <button
                type="button"
                className="site-header-mobile-menu-button"
                aria-label={mobileMenuOpen ? '\uBA54\uB274 \uB2EB\uAE30' : '\uBA54\uB274 \uC5F4\uAE30'}
                aria-expanded={mobileMenuOpen}
                aria-controls="site-header-mobile-menu"
                onClick={() => setMobileMenuOpen((current) => !current)}
              >
                <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`} aria-hidden="true" />
              </button>

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

        {mobileMenuOpen ? (
          <>
            <button
              type="button"
              className="site-header-mobile-menu-backdrop lg:hidden"
              style={mobileMenuStyle}
              aria-label={"\uBA54\uB274 \uB2EB\uAE30"}
              onClick={() => setMobileMenuOpen(false)}
            />

            <div
              id="site-header-mobile-menu"
              className="site-header-mobile-menu-panel lg:hidden"
              style={mobileMenuStyle}
            >
              <div className="site-header-mobile-menu-inner">
                <div className="site-header-mobile-menu-title">{'\uBA54\uB274'}</div>
                <div className="site-header-mobile-menu-links">
                  {mobileMenuLinks.map((item) => {
                    const children = item.children ?? []
                    const isActive =
                      activeNavHref === item.href ||
                      children.some((child) => activeNavHref === child.href.split('?')[0])

                    return (
                      <div key={item.href} className="site-header-mobile-menu-group">
                        <a
                          href={item.href}
                          className={isActive ? 'site-header-mobile-menu-link active' : 'site-header-mobile-menu-link'}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <span>{item.label}</span>
                          <i className="fas fa-chevron-right" aria-hidden="true" />
                        </a>

                        {children.length > 0 ? (
                          <div className="site-header-mobile-sub-links">
                            {children.map((child) => (
                              <a
                                key={child.href + child.label}
                                href={child.href}
                                className="site-header-mobile-sub-link"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                {child.label}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        ) : null}

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
