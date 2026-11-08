import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { homeApi } from '../../lib/api/home'
import { navigateTo } from '../../lib/spa-navigation'
import type { AuthenticatedHomeDashboard } from '../../types/home'
import WelcomeHome from './WelcomeHome'

vi.mock('../../lib/api/home', () => ({
  homeApi: { getDashboard: vi.fn() },
}))
vi.mock('../../lib/spa-navigation', () => ({ navigateTo: vi.fn() }))

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

  it('환영 인사의 이름과 문구를 공백으로 이어서 표시한다', async () => {
    render(<WelcomeHome displayName="김학습" />)
    const greeting = await screen.findByRole('heading', { name: /김학습님, 오늘도/ })
    expect(greeting).toHaveTextContent('김학습님, 오늘도 성장을 이어가세요!')
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
    expect(screen.getByRole('button', { name: '스쿼드 라운지 입장', hidden: true }).closest('[aria-hidden]')).toHaveAttribute('inert')
    expect(screen.queryByRole('button', { name: '특가 수강권 확인하기', hidden: true })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /테스터님, 오늘도\s*성장을 이어가세요!/ })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByRole('button', { name: '1번 배너 보기' })).toHaveAttribute('aria-pressed', 'true')
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    [1, 'AI 아키텍처 생성하기', '/project-create', 'ai-builder-artwork.png', '토이 프로젝트는 그만'],
    [2, '스쿼드 라운지 입장', '/community-lounge', 'team-squad-artwork.png', '최고의 팀원'],
    [3, '내 맞춤 로드맵 찾기', '/roadmap-hub', 'curated-roadmap-artwork.png', '막막하신가요'],
    [4, '내 시장 가치 확인하기', '/job-matching', 'job-analysis-artwork.png', '기업 리스트'],
    [5, '런칭된 프로젝트 구경하기', '/dev-showcase', 'showcase-artwork.png', '완벽한 이력서'],
  ])('%i번 배너의 그림과 실제 제목·버튼을 분리하고 기존 페이지로 이동한다', async (number, label, href, filename, title) => {
    render(<WelcomeHome displayName="테스터" />)
    await screen.findByRole('heading', { name: /테스터님, 오늘도/ })
    fireEvent.click(screen.getByRole('button', { name: `${number}번 배너 보기` }))
    const button = screen.getByRole('button', { name: label })
    const image = button.closest('[aria-hidden]')?.querySelector('img')
    expect(image).toHaveAttribute('src', `/images/home/${filename}`)
    expect(image).toHaveAttribute('width', '1774')
    expect(image).toHaveAttribute('height', '887')
    expect(image).toHaveAttribute('alt', expect.stringMatching(/[가-힣]/))
    expect(screen.getByRole('heading', { level: 2, name: new RegExp(title) })).toBeVisible()
    expect(button).toHaveTextContent(label)
    fireEvent.click(button)
    expect(navigateTo).toHaveBeenLastCalledWith(href)
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
