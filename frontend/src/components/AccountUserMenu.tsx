import { useEffect, useRef, useState, type ReactNode } from 'react'
import { buildMyInstructorProfileHref } from '../instructor-channel-customization'
import { accountNavItems, type AccountPageKey } from '../lib/account-navigation'
import type { AuthSession } from '../types/auth'
import UserAvatar from './UserAvatar'

type AccountUserMenuProps = {
  session: AuthSession
  profileImage?: string | null
  currentPageKey?: AccountPageKey
  onLogout?: () => Promise<void> | void
}

type MenuTone = {
  iconClassName: string
  titleHoverClassName: string
}

const menuToneByKey: Record<string, MenuTone> = {
  'instructor-channel': {
    iconClassName: 'bg-violet-50 text-violet-500',
    titleHoverClassName: 'group-hover:text-violet-500',
  },
  dashboard: {
    iconClassName: 'bg-blue-50 text-blue-500',
    titleHoverClassName: 'group-hover:text-blue-600',
  },
  'my-learning': {
    iconClassName: 'bg-orange-50 text-orange-500',
    titleHoverClassName: 'group-hover:text-orange-500',
  },
  purchase: {
    iconClassName: 'bg-indigo-50 text-indigo-500',
    titleHoverClassName: 'group-hover:text-indigo-500',
  },
  'learning-log-gallery': {
    iconClassName: 'bg-teal-50 text-teal-500',
    titleHoverClassName: 'group-hover:text-teal-500',
  },
  'my-posts': {
    iconClassName: 'bg-red-50 text-red-500',
    titleHoverClassName: 'group-hover:text-red-500',
  },
  profile: {
    iconClassName: 'bg-cyan-50 text-cyan-500',
    titleHoverClassName: 'group-hover:text-cyan-500',
  },
  settings: {
    iconClassName: 'bg-gray-100 text-gray-600',
    titleHoverClassName: 'group-hover:text-gray-900',
  },
  logout: {
    iconClassName: 'bg-rose-50 text-rose-500',
    titleHoverClassName: 'group-hover:text-rose-600',
  },
}

function getMenuTone(key: string): MenuTone {
  return (
    menuToneByKey[key] ?? {
      iconClassName: 'bg-gray-100 text-gray-500',
      titleHoverClassName: 'group-hover:text-gray-900',
    }
  )
}

function getMenuItemClassName(active: boolean) {
  const baseClassName =
    'group flex items-center gap-3.5 rounded-xl px-3 py-3 transition'

  if (active) {
    return `${baseClassName} bg-gray-50`
  }

  return `${baseClassName} hover:bg-gray-50`
}

function getMenuIconClassName(key: string) {
  const tone = getMenuTone(key)

  return `flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone.iconClassName}`
}

function iconSvg(path: ReactNode) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

const menuIconByKey: Record<string, ReactNode> = {
  'instructor-channel': iconSvg(
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
    </>,
  ),
  dashboard: iconSvg(
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </>,
  ),
  'my-learning': iconSvg(
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  ),
  purchase: iconSvg(
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
  ),
  'learning-log-gallery': iconSvg(
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  ),
  'my-posts': iconSvg(
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
  ),
  profile: iconSvg(
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  ),
  settings: iconSvg(
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </>,
  ),
  logout: iconSvg(
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
  ),
}

function MenuIcon({ iconClassName, itemKey }: { iconClassName?: string; itemKey: string }) {
  return (
    <div className={getMenuIconClassName(itemKey)}>
      {menuIconByKey[itemKey] ?? (iconClassName ? <i className={iconClassName} /> : null)}
    </div>
  )
}

const menuDescriptionClassName =
  'truncate text-[12px] text-gray-500'

function MenuText({
  title,
  description,
  titleClassName,
}: {
  title: string
  description?: string
  titleClassName?: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className={`mb-0.5 text-[14px] font-bold text-gray-900 transition-colors ${titleClassName ?? ''}`}>
        {title}
      </div>
      {description ? (
        <div className={menuDescriptionClassName} title={description}>
          {description}
        </div>
      ) : null}
    </div>
  )
}

export default function AccountUserMenu({
  session,
  profileImage,
  currentPageKey,
  onLogout,
}: AccountUserMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const currentPathname = window.location.pathname.replace(/\/+$/, '')
  const instructorChannelActive =
    currentPathname === '/instructor-profile' ||
    currentPathname === '/instructor-channel'
  const instructorMenuItem =
    session.role === 'ROLE_INSTRUCTOR'
      ? {
          key: 'instructor-channel',
          href: buildMyInstructorProfileHref(session),
          shortLabel: '내 채널',
          description: '강사 프로필과 채널 홈으로 이동합니다.',
          icon: 'fas fa-circle-play',
        }
      : null

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-transparent py-1.5 pr-3 pl-2 text-left transition hover:border-gray-200 hover:bg-gray-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar
          name={session.name}
          imageUrl={profileImage}
          className="h-8 w-8 bg-white"
          iconClassName="text-sm"
          alt={`${session.name} profile`}
        />
        <span className="ml-1 max-w-[120px] truncate text-[14px] font-bold text-gray-800">{session.name}</span>
        <i className={`fas fa-chevron-down text-[10px] text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="account-profile-dropdown-enter absolute right-0 top-12 z-50 w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-3.5 border-b border-gray-100 bg-white px-5 py-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <UserAvatar
                name={session.name}
                imageUrl={profileImage}
                className="h-12 w-12 bg-gray-100"
                iconClassName="text-base"
                alt={`${session.name} profile`}
              />
              <span className="truncate text-[17px] font-extrabold text-gray-900">{session.name}</span>
            </div>
          </div>

          <ul className="account-profile-scroll flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto p-2">
            {instructorMenuItem ? (
              <li>
                <a
                  href={instructorMenuItem.href}
                  onClick={() => setOpen(false)}
                  className={getMenuItemClassName(instructorChannelActive)}
                >
                  <MenuIcon itemKey={instructorMenuItem.key} iconClassName={instructorMenuItem.icon} />
                  <MenuText
                    title={instructorMenuItem.shortLabel}
                    description={instructorMenuItem.description}
                    titleClassName={getMenuTone(instructorMenuItem.key).titleHoverClassName}
                  />
                </a>
              </li>
            ) : null}
            {accountNavItems.map((item) => {
              const active = currentPageKey === item.key

              return (
                <li key={item.key}>
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={getMenuItemClassName(active)}
                  >
                    <MenuIcon itemKey={item.key} iconClassName={item.icon} />
                    <MenuText
                      title={item.shortLabel}
                      description={item.description}
                      titleClassName={getMenuTone(item.key).titleHoverClassName}
                    />
                  </a>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-gray-100 bg-gray-50/30 p-2">
            <ul className="flex flex-col gap-0.5">
              <li>
                <button
                  type="button"
                  onClick={async () => {
                    setOpen(false)
                    await onLogout?.()
                  }}
                  className={`${getMenuItemClassName(false)} w-full text-left hover:bg-rose-50`}
                >
                  <div className="transition-colors group-hover:bg-rose-100 rounded-full">
                    <MenuIcon itemKey="logout" />
                  </div>
                  <MenuText title={'\uB85C\uADF8\uC544\uC6C3'} titleClassName={getMenuTone('logout').titleHoverClassName} />
                </button>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
