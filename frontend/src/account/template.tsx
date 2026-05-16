import type { CSSProperties, ReactNode } from 'react'
import SiteHeader from '../components/SiteHeader'
import type { AccountPageKey } from '../lib/account-navigation'
import { useInternalPageScroll } from '../lib/useInternalPageScroll'
import type { AuthSession } from '../types/auth'

const myMenuItems: Array<{
  key: AccountPageKey
  href: string
  label: string
  icon: string
}> = [
  { key: 'dashboard', href: 'dashboard.html', label: '대시보드', icon: 'fas fa-columns' },
  { key: 'profile', href: 'profile.html', label: '프로필 관리', icon: 'fas fa-user-circle' },
  { key: 'my-learning', href: 'my-learning.html', label: '내 학습 (강의)', icon: 'fas fa-book-reader' },
  { key: 'learning-log-gallery', href: 'learning-log-gallery.html', label: '학습일지', icon: 'fas fa-clipboard-list' },
  { key: 'purchase', href: 'purchase.html', label: '구매 / 보관함', icon: 'fas fa-folder-open' },
  { key: 'my-posts', href: 'my-posts.html', label: '작성한 게시글', icon: 'fas fa-pen-nib' },
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
  asideClassName = 'sticky top-24 space-y-1',
  spacerClassName,
  wrapperStyle,
}: {
  currentPageKey: AccountPageKey
  wrapperClassName?: string
  asideClassName?: string
  spacerClassName?: string
  wrapperStyle?: CSSProperties
}) {
  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      {spacerClassName ? <div className={spacerClassName} /> : null}
      <aside className={asideClassName}>
        <div className="mb-6 px-4">
          <h2 className="mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">My Menu</h2>
        </div>

        {myMenuItems.map((item) => (
          <a key={item.key} href={item.href} className={`nav-item ${currentPageKey === item.key ? 'active' : ''}`}>
            <i className={`${item.icon} w-6 text-center text-lg`} />
            <span className="sidebar-text !opacity-100 !w-auto !ml-3">{item.label}</span>
          </a>
        ))}

        <div className="my-4 border-t border-gray-100" />

        <a href="settings.html" className={`nav-item ${currentPageKey === 'settings' ? 'active' : ''}`}>
          <i className="fas fa-cog w-6 text-center text-lg" />
          <span className="sidebar-text !opacity-100 !w-auto !ml-3">계정 설정</span>
        </a>
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
