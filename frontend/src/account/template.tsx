import type { CSSProperties, ReactNode } from 'react'
import SiteHeader from '../components/SiteHeader'
import type { AccountPageKey } from '../lib/account-navigation'
import { useInternalPageScroll } from '../lib/useInternalPageScroll'
import type { AuthSession } from '../types/auth'

type MyMenuItem = {
  key: AccountPageKey
  href: string
  label: string
  icon: string
}

const accountMenuSections: Array<{
  title: string
  items: MyMenuItem[]
}> = [
  {
    title: 'My Menu',
    items: [
      { key: 'dashboard', href: '/dashboard', label: '대시보드', icon: 'fas fa-th-large' },
      { key: 'profile', href: '/profile', label: '프로필 관리', icon: 'fas fa-user-circle' },
      { key: 'my-learning', href: '/my-learning', label: '내 학습 현황', icon: 'fas fa-play-circle' },
      { key: 'learning-log-gallery', href: '/learning-log-gallery', label: '학습일지', icon: 'fas fa-clipboard-list' },
    ],
  },
  {
    title: 'Activity',
    items: [
      { key: 'my-posts', href: '/my-posts', label: '내 게시글', icon: 'fas fa-edit' },
      { key: 'purchase', href: '/purchase', label: '구매 및 보관함', icon: 'fas fa-archive' },
    ],
  },
  {
    title: 'System',
    items: [{ key: 'settings', href: '/settings', label: '계정 설정', icon: 'fas fa-cog' }],
  },
]

export function LearnerPageShell({ children }: { children: ReactNode }) {
  useInternalPageScroll()

  return (
    <main className="app-main flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="app-responsive-container pt-6 pb-10 md:pt-8 md:pb-12">{children}</div>
    </main>
  )
}

export function LearnerContentRow({ children }: { children: ReactNode }) {
  return <div className="app-responsive-row">{children}</div>
}

export function MyMenuSidebar({
  currentPageKey,
  wrapperClassName = 'w-60 shrink-0 hidden lg:block -ml-0',
  asideClassName = 'sticky top-24 pt-1.5',
  spacerClassName,
  wrapperStyle,
}: {
  currentPageKey: AccountPageKey
  wrapperClassName?: string
  asideClassName?: string
  spacerClassName?: string
  wrapperStyle?: CSSProperties
}) {
  const mergedWrapperClassName = ['account-menu-sidebar', wrapperClassName].filter(Boolean).join(' ')

  return (
    <div className={mergedWrapperClassName} style={wrapperStyle}>
      {spacerClassName ? <div className={spacerClassName} /> : null}
      <aside className={asideClassName}>
        {accountMenuSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {sectionIndex > 0 ? <div className="mx-3 my-5 border-t border-gray-200" /> : null}
            <div className="mb-5 px-3">
              <h2 className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">{section.title}</h2>
            </div>

            {section.items.map((item) => (
              <a key={item.key} href={item.href} className={`nav-item ${currentPageKey === item.key ? 'active' : ''}`}>
                <i className={item.icon} />
                <span className="sidebar-text">{item.label}</span>
              </a>
            ))}
          </div>
        ))}
      </aside>
    </div>
  )
}

export function LearnerHeader({
  session,
  profileImage,
  onLogout,
}: {
  session: AuthSession
  profileImage?: string | null
  onLogout?: () => Promise<void> | void
}) {
  return <SiteHeader session={session} profileImage={profileImage} onLogout={onLogout} />
}
