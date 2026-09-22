import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from './lib/auth-session'
import type { AuthSession } from './types/auth'

vi.mock('./lib/auth-session', () => ({
  AUTH_SESSION_SYNC_EVENT: 'devpath:auth-session-sync',
  readStoredAuthSession: vi.fn(),
  clearStoredAuthSession: vi.fn(),
  getPostLoginRedirect: vi.fn(),
}))
vi.mock('./lib/api/auth', () => ({
  authApi: {},
  userApi: { getMyProfile: vi.fn().mockResolvedValue({ profileImage: null }) },
}))
vi.mock('./lib/api/home', () => ({
  homeApi: {
    getDashboard: vi.fn().mockResolvedValue({
      currentLearning: null,
      participatingProjects: [],
      recentCourses: [],
      topCourseCategories: [],
    }),
  },
}))
vi.mock('./components/SiteHeader', () => ({
  default: ({ session }: { session: AuthSession | null }) => <header>{session ? '로그인 후 공통 헤더' : '로그인 전 헤더'}</header>,
}))
vi.mock('./components/AccountUserMenu', () => ({ default: () => null }))
vi.mock('./components/AuthModal', () => ({ default: () => null }))

const session: AuthSession = {
  name: '이태형', tokenType: 'Bearer', accessToken: 'test', refreshToken: 'test',
  userId: 1, role: 'ROLE_LEARNER', exp: null, storage: 'session',
}

describe('홈 로그인 상태 전환', () => {
  afterEach(() => vi.unstubAllGlobals())

  beforeEach(() => {
    vi.mocked(readStoredAuthSession).mockReturnValue(null)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    window.history.replaceState({}, '', '/')
  })

  it('비로그인 홈을 유지하고 로그인 및 로그아웃 이벤트에 맞춰 화면과 스크롤을 전환한다', async () => {
    const { unmount } = render(<App />)
    expect(screen.getByText('로그인 전 헤더')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DevPath 소개' })).toHaveAttribute('href', '/about')
    expect(document.body).toHaveClass('overflow-hidden!')

    await act(async () => {
      vi.mocked(readStoredAuthSession).mockReturnValue(session)
      window.dispatchEvent(new Event(AUTH_SESSION_SYNC_EVENT))
    })
    expect(screen.getByRole('heading', { name: '참여 중인 프로젝트' })).toBeInTheDocument()
    expect(screen.queryByText('로그인 전 헤더')).not.toBeInTheDocument()
    expect(screen.getByText('로그인 후 공통 헤더')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DevPath 소개' })).toHaveAttribute('href', '/about')
    expect(screen.getByText('© 2026 DevPath Inc. All rights reserved.')).toHaveClass('text-xs')
    expect(screen.getByText('© 2026 DevPath Inc. All rights reserved.').closest('[class*="zoom"]')).toHaveClass('[--home-page-body-zoom:0.9]')
    expect(screen.getByTestId('home-scroll-area')).toHaveClass('mt-[var(--app-header-height)]', 'h-[calc(100dvh-var(--app-header-height))]', 'overflow-y-auto')
    expect(document.body).toHaveClass('overflow-hidden!')
    expect(document.title).toBe('DevPath - 개발자 성장의 모든 것')

    await act(async () => {
      vi.mocked(readStoredAuthSession).mockReturnValue(null)
      window.dispatchEvent(new Event('storage'))
    })
    expect(screen.getByText('로그인 전 헤더')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '참여 중인 프로젝트' })).not.toBeInTheDocument()
    expect(document.body).toHaveClass('overflow-hidden!')
    unmount()
    expect(document.body).not.toHaveClass('overflow-hidden!')
  })

  it('로그인 상태에서도 소개 페이지는 기존 로그인 전 화면을 보여준다', async () => {
    vi.mocked(readStoredAuthSession).mockReturnValue(session)
    await act(async () => { render(<App page="about" />) })

    expect(screen.getByText('로그인 후 공통 헤더')).toBeInTheDocument()
    expect(screen.getByText('Step 1. Learn')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '참여 중인 프로젝트' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DevPath 소개' })).toHaveAttribute('href', '/about')
    expect(screen.getByTestId('home-scroll-area')).toHaveClass('mt-[var(--app-header-height)]', 'h-[calc(100dvh-var(--app-header-height))]', 'overflow-y-auto')
    expect(document.body).toHaveClass('overflow-hidden!')
    expect(document.title).toBe('DevPath - 개발자 성장의 모든 것')
  })
})
