import type { CSSProperties } from 'react'
import AccountUserMenu from '../../components/AccountUserMenu'
import HeaderAlerts from '../../components/HeaderAlerts'
import SiteHeaderMegaMenu from '../../components/SiteHeaderMegaMenu'
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
    columnGap: `${siteHeaderTuning.navGapPx}px`,
    transform: `translate(${siteHeaderTuning.navBaseXPx + siteHeaderTuning.navGroup.x + 58}px, ${siteHeaderTuning.navGroup.y}px)`,
  }
  const userStyle = getMoveStyle(siteHeaderTuning.userGroup)

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
            <SiteHeaderMegaMenu
              links={[...siteHeaderLinks, { href: '/instructor-dashboard', label: '강사 대시보드', children: instructorDashboardLinks }]}
              activeHref="/instructor-dashboard"
              style={navStyle}
            />
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
