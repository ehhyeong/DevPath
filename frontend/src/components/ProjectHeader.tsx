import { projectHeaderLinks } from '../project-shell'
import type { AuthSession } from '../types/auth'
import AccountUserMenu from './AccountUserMenu'

type ProjectHeaderProps = {
  session: AuthSession | null
  profileImage?: string | null
  activeHref?: string
  onLoginClick?: () => void
  onLogout?: () => Promise<void> | void
}

export default function ProjectHeader({
  session,
  profileImage,
  activeHref = 'lounge-dashboard.html',
  onLoginClick,
  onLogout,
}: ProjectHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-8 sticky top-0 z-30 shrink-0">
      <div className="flex-1"></div>

      <nav className="flex items-center gap-10 text-sm font-bold text-gray-500">
        {projectHeaderLinks.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={item.href === activeHref ? 'text-brand transition border-b-2 border-brand pb-1' : 'hover:text-brand transition'}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex-1 flex items-center justify-end gap-2">
        <button
          type="button"
          aria-label="받은 메시지"
          className="relative cursor-pointer rounded-full p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-brand"
        >
          <i className="far fa-envelope text-lg"></i>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <button
          type="button"
          aria-label="알림"
          className="relative cursor-pointer rounded-full p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-brand"
        >
          <i className="far fa-bell text-lg"></i>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="w-px h-6 bg-gray-200 mx-4"></div>

        {session ? (
          <AccountUserMenu session={session} profileImage={profileImage} onLogout={onLogout} />
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  )
}
