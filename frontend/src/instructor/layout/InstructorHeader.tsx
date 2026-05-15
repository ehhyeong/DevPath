import type { CSSProperties } from 'react'
import AccountUserMenu from '../../components/AccountUserMenu'
import { siteHeaderTuning } from '../../components/SiteHeader'
import type { AuthSession } from '../../types/auth'

const headerLinks = [
  { href: 'roadmap-hub.html', label: '로드맵' },
  { href: 'lecture-list.html', label: '강의' },
  { href: 'lounge-dashboard.html', label: '프로젝트' },
  { href: 'community-list.html', label: '커뮤니티' },
  { href: '/job-matching', label: '채용분석' },
]

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
    transform: `translate(${siteHeaderTuning.navBaseXPx + siteHeaderTuning.navGroup.x}px, ${siteHeaderTuning.navGroup.y}px)`,
  }
  const instructorStyle: CSSProperties = {
    marginLeft: `${siteHeaderTuning.instructorGapPx}px`,
  }
  const userStyle = getMoveStyle(siteHeaderTuning.userGroup)

  return (
    <>
      <div className="app-header-rail" />

      <nav className="app-header">
        <div className="mx-auto flex h-full w-full items-center" style={containerStyle}>
          <div className="hidden items-center px-4 lg:flex" style={brandSlotStyle}>
            <a href="home.html" className="group flex items-center gap-2 text-xl font-bold text-gray-900" style={getMoveStyle(siteHeaderTuning.brandGroup)}>
              <i className="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12" />
              <span className="flex -translate-y-1 flex-col leading-tight">
                <span>DevPath</span>
                <span className="text-[11px] font-extrabold tracking-wide text-gray-400">Instructor Center</span>
              </span>
            </a>
          </div>

          <div className="flex items-center lg:hidden">
            <a href="home.html" className="group flex items-center gap-2 text-xl font-bold text-gray-900" style={getMoveStyle(siteHeaderTuning.brandGroup)}>
              <i className="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12" />
              <span className="flex -translate-y-1 flex-col leading-tight">
                <span>DevPath</span>
                <span className="text-[11px] font-extrabold tracking-wide text-gray-400">Instructor Center</span>
              </span>
            </a>
          </div>

          <div className="hidden flex-1 items-center justify-center text-sm font-bold text-gray-500 md:flex">
            <div className="relative inline-flex items-center" style={navStyle}>
              {headerLinks.map((item) => (
                <a key={item.href} href={item.href} className="inline-block whitespace-nowrap transition hover:text-brand">
                  {item.label}
                </a>
              ))}
              <a
                href="instructor-dashboard.html"
                className="absolute top-1/2 left-full inline-block -translate-y-1/2 whitespace-nowrap border-b-2 border-brand pb-1 text-brand"
                style={instructorStyle}
              >
                강사 대시보드
              </a>
            </div>
          </div>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-2 md:ml-0 md:w-60 md:flex-none">
            <div className="hidden md:block" style={userStyle}>
              <AccountUserMenu session={session} profileImage={profileImage} onLogout={onLogout} />
            </div>
            <div className="md:hidden" style={userStyle}>
              <AccountUserMenu session={session} profileImage={profileImage} onLogout={onLogout} />
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
