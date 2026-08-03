import type { CSSProperties } from 'react'
import AccountUserMenu from '../../components/AccountUserMenu'
import HeaderAlerts from '../../components/HeaderAlerts'
import { instructorDashboardLinks, siteHeaderLinks, siteHeaderTuning } from '../../components/site-header-config'
import type { AuthSession } from '../../types/auth'

function getMoveStyle(offset: { x: number; y: number }): CSSProperties {
  return {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
  }
}

export default function InstructorHeader({
  session,
  profileImage,
  onLogout,
}: {
  session: AuthSession
  profileImage?: string | null
  onLogout?: () => Promise<void> | void
}) {
  const containerStyle: CSSProperties = {
    maxWidth: `${siteHeaderTuning.maxWidthPx}px`,
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
    transform: `translate(${siteHeaderTuning.navBaseXPx + siteHeaderTuning.navGroup.x + 58}px, ${siteHeaderTuning.navGroup.y}px)`,
  }
  const userStyle = getMoveStyle(siteHeaderTuning.userGroup)
  const defaultNavLinkClassName = 'site-header-nav-link'
  const activeNavLinkClassName = 'site-header-nav-link site-header-nav-link--active'

  return (
    <>
      <div className="app-header-rail" />

      <nav className="app-header">
        <div className="mx-auto flex h-full w-full items-center" style={containerStyle}>
          <div className="hidden items-center px-4 lg:flex" style={brandSlotStyle}>
            <a href="/home" className="group flex items-center gap-2 text-xl font-bold text-gray-900" style={getMoveStyle(siteHeaderTuning.brandGroup)}>
              <i className="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12" />
              <span className="flex -translate-y-1 flex-col leading-tight">
                <span>DevPath</span>
                <span className="text-[11px] font-extrabold tracking-wide text-gray-400">{'\uAC15\uC0AC \uB300\uC2DC\uBCF4\uB4DC'}</span>
              </span>
            </a>
          </div>

          <div className="flex items-center lg:hidden">
            <a href="/home" className="group flex items-center gap-2 text-xl font-bold text-gray-900" style={getMoveStyle(siteHeaderTuning.brandGroup)}>
              <i className="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12" />
              <span className="flex -translate-y-1 flex-col leading-tight">
                <span>DevPath</span>
                <span className="text-[11px] font-extrabold tracking-wide text-gray-400">{'\uAC15\uC0AC \uB300\uC2DC\uBCF4\uB4DC'}</span>
              </span>
            </a>
          </div>

          <div className="hidden flex-1 items-center justify-center text-sm font-bold text-gray-500 md:flex">
            <div className="relative inline-flex items-center" style={navStyle}>
              {siteHeaderLinks.map((item) => {
                const children = item.children ?? []
                const hasChildren = children.length > 0

                return (
                  <div key={item.href} className="site-header-nav-item">
                    <a
                      href={item.href}
                      className={defaultNavLinkClassName}
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
              <div className="site-header-nav-item">
                <a
                  href="/instructor-dashboard"
                  className={activeNavLinkClassName}
                  aria-haspopup="menu"
                >
                  {'\uAC15\uC0AC \uB300\uC2DC\uBCF4\uB4DC'}
                </a>

                <div
                  className="site-header-mega-menu"
                  role="menu"
                  aria-label={'\uAC15\uC0AC \uB300\uC2DC\uBCF4\uB4DC \uC138\uBD80 \uBA54\uB274'}
                >
                  <div className="site-header-mega-panel">
                    <div className="site-header-mega-links">
                      {instructorDashboardLinks.map((item) => (
                        <a key={item.href} href={item.href} className="site-header-mega-link" role="menuitem">
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-2 md:ml-0 md:w-60 md:flex-none">
            <div className="hidden items-center justify-end gap-2 md:flex" style={userStyle}>
              <HeaderAlerts session={session} />
              <div className="mx-4 h-6 w-px bg-gray-200" />
              <AccountUserMenu session={session} profileImage={profileImage} onLogout={onLogout} />
            </div>
            <div className="flex items-center justify-end gap-2 md:hidden" style={userStyle}>
              <HeaderAlerts session={session} />
              <div className="mx-4 h-6 w-px bg-gray-200" />
              <AccountUserMenu session={session} profileImage={profileImage} onLogout={onLogout} />
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
