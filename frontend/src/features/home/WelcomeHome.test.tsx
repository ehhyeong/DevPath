import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { homeApi } from '../../lib/api/home'
import type { AuthenticatedHomeDashboard } from '../../types/home'
import WelcomeHome from './WelcomeHome'

vi.mock('../../lib/api/home', () => ({
  homeApi: { getDashboard: vi.fn() },
}))

const emptyDashboard: AuthenticatedHomeDashboard = {
  currentLearning: null,
  participatingProjects: [],
  recentCourses: [],
  topCourseCategories: [],
}

describe('로그인 후 홈 배너', () => {
  beforeEach(() => vi.mocked(homeApi.getDashboard).mockResolvedValue(emptyDashboard))
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('5초마다 다음 배너를 표시하고 마지막 배너 이후 처음으로 돌아온다', () => {
    vi.useFakeTimers()
    render(<WelcomeHome displayName="이태형" />)

    expect(screen.getByRole('button', { name: '1번 배너 보기' })).toHaveAttribute('aria-pressed', 'true')
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('button', { name: '2번 배너 보기' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('welcome-carousel-track')).toHaveStyle({ transform: 'translateX(-100%)' })

    act(() => vi.advanceTimersByTime(20000))
    expect(screen.getByRole('button', { name: '1번 배너 보기' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('배너를 직접 선택하면 자동 전환 시간을 다시 시작하고 숨은 배너의 링크를 비활성화한다', () => {
    vi.useFakeTimers()
    const { unmount } = render(<WelcomeHome displayName="테스터" />)
    act(() => vi.advanceTimersByTime(4000))
    fireEvent.click(screen.getByRole('button', { name: '5번 배너 보기' }))

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: '5번 배너 보기' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'AI 아키텍처 생성하기', hidden: true }).closest('[aria-hidden]')).toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: '스쿼드 라운지 입장', hidden: true })).toHaveClass('text-[#1e3a8a]')
    expect(screen.queryByRole('button', { name: '특가 수강권 확인하기', hidden: true })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /테스터님, 오늘도\s*성장을 이어가세요!/ })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByRole('button', { name: '1번 배너 보기' })).toHaveAttribute('aria-pressed', 'true')
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('로그인 사용자의 실제 홈 API 응답을 화면에 표시하고 인기 강의를 좌우로 이동한다', async () => {
    vi.mocked(homeApi.getDashboard).mockResolvedValueOnce({
      currentLearning: {
        courseId: 10,
        lessonId: 101,
        courseTitle: '실제 Spring 강의',
        lessonTitle: '실제 AOP 레슨',
        progressPercentage: 42,
        href: '/learning?courseId=10&lessonId=101',
        lastWatchedAt: '2026-09-22T10:00:00',
      },
      participatingProjects: [{
        projectId: 20,
        typeLabel: '스쿼드',
        title: '실제 프로젝트',
        description: '실제 프로젝트 설명',
        progressPercentage: 30,
        href: '/squad-dashboard?workspaceId=20',
      }],
      recentCourses: [{
        courseId: 10,
        title: '실제 Spring 강의',
        thumbnailUrl: null,
        progressPercentage: 42,
        href: '/course-detail?courseId=10',
        lastWatchedAt: '2026-09-22T10:00:00',
      }],
      topCourseCategories: [{
        key: 'all',
        label: '전체',
        courses: [{
          courseId: 11,
          title: '실제 인기 강의',
          thumbnailUrl: null,
          categoryLabel: '전체',
          averageRating: 4.7,
          enrollmentCount: 12,
          price: 55000,
          currency: 'KRW',
          href: '/course-detail?courseId=11',
        }, {
          courseId: 12,
          title: '두 번째 실제 인기 강의',
          thumbnailUrl: null,
          categoryLabel: '전체',
          averageRating: 4.5,
          enrollmentCount: 8,
          price: 0,
          currency: 'KRW',
          href: '/course-detail?courseId=12',
        }],
      }],
    })

    render(<WelcomeHome displayName="김학습" />)

    expect(await screen.findByText('실제 AOP 레슨')).toBeInTheDocument()
    expect(screen.getAllByText('실제 Spring 강의')).toHaveLength(2)
    expect(screen.getByText('실제 프로젝트')).toBeInTheDocument()
    expect(screen.getByText('실제 인기 강의')).toBeInTheDocument()
    expect(screen.getAllByText('42%')).toHaveLength(2)
    expect(screen.queryByText('Spring AOP/DI 프레임워크 핵심')).not.toBeInTheDocument()

    const courseList = screen.getByTestId('top-course-list')
    const scrollBy = vi.fn()
    Object.defineProperties(courseList, {
      clientWidth: { configurable: true, value: 600 },
      scrollWidth: { configurable: true, value: 1000 },
      scrollBy: { configurable: true, value: scrollBy },
    })
    fireEvent(window, new Event('resize'))
    await waitFor(() => expect(screen.getByRole('button', { name: '다음 강의 보기' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: '다음 강의 보기' }))
    expect(scrollBy).toHaveBeenCalledWith({ left: 510, behavior: 'smooth' })
  })
})
