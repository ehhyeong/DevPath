import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SiteHeaderMegaMenu from './SiteHeaderMegaMenu'
import SiteHeader from './SiteHeader'
import { instructorDashboardLinks, siteHeaderLinks } from './site-header-config'

afterEach(() => window.history.replaceState({}, '', '/'))

describe('SiteHeaderMegaMenu', () => {
  it.each([
    ['/roadmap-hub', '로드맵'], ['/roadmap?id=11', '로드맵'], ['/my-roadmap', '로드맵'],
    ['/my-roadmap-list', '로드맵'], ['/survey/', '로드맵'],
    ['/lecture-list', '강의'], ['/course-detail?id=1', '강의'], ['/learning?courseId=1', '강의'],
    ['/instructor-channel?instructorId=1', '강의'], ['/instructor-profile', '강의'], ['/instructor-course-detail', '강의'],
    ['/lounge-dashboard', '프로젝트'], ['/community-lounge', '프로젝트'], ['/mentoring-hub', '프로젝트'],
    ['/workspace-hub', '프로젝트'], ['/dev-showcase', '프로젝트'], ['/project-create', '프로젝트'],
    ['/job-matching?sort=recent', '채용분석'], ['/community-list?category=qa', '커뮤니티'], ['/community-write', '커뮤니티'],
  ])('%s에서 해당 상위 메뉴 %s 하나를 선택한다', (href, label) => {
    const { container } = render(<SiteHeaderMegaMenu links={siteHeaderLinks} activeHref={href} />)
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'true')
    expect(container.querySelectorAll('.site-header-nav-link--active')).toHaveLength(1)
  })

  it('명시적인 선택 경로가 없으면 현재 주소를 사용한다', () => {
    window.history.replaceState({}, '', '/instructor-channel?instructorId=1')
    render(<SiteHeaderMegaMenu links={siteHeaderLinks} />)
    expect(screen.getByRole('link', { name: '강의' })).toHaveAttribute('aria-current', 'true')
  })

  it.each(['/home', '/profile', '/missing-page'])('%s에서는 관계없는 메뉴를 선택하지 않는다', href => {
    const { container } = render(<SiteHeaderMegaMenu links={siteHeaderLinks} activeHref={href} />)
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('명시적 선택 경로를 변경하면 이전 선택을 해제한다', () => {
    const { rerender } = render(<SiteHeaderMegaMenu links={siteHeaderLinks} activeHref="/my-roadmap" />)
    rerender(<SiteHeaderMegaMenu links={siteHeaderLinks} activeHref="/job-matching" />)
    expect(screen.getByRole('link', { name: '로드맵' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: '채용분석' })).toHaveAttribute('aria-current', 'true')
  })

  it('모바일 헤더도 현재 상세 페이지의 상위 메뉴를 선택한다', () => {
    window.history.replaceState({}, '', '/course-detail?id=1')
    const { container } = render(<SiteHeader session={null} />)
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    expect(container.querySelector('.site-header-mobile-menu-link.active')).toHaveTextContent('강의')
    expect(container.querySelector('.site-header-mobile-menu-link.active')).toHaveAttribute('aria-current', 'true')
  })

  it('하위 목록을 각 상단 메뉴의 패널로 나누고 링크·현재 메뉴를 유지한다', () => {
    const { container } = render(
      <SiteHeaderMegaMenu
        links={siteHeaderLinks}
        activeHref="/workspace-hub"
      />,
    )

    expect(screen.getByRole('menu', { name: '로드맵 세부 메뉴' })).toBeInTheDocument()
    expect(screen.queryByText('DEVPATH NAVIGATION')).not.toBeInTheDocument()
    expect(screen.getAllByRole('menu')).toHaveLength(3)
    expect(screen.getAllByText('로드맵')).toHaveLength(1)
    expect(container.querySelectorAll('.site-header-mega-panel')).toHaveLength(3)
    expect(screen.getByRole('menu', { name: '로드맵 세부 메뉴' }).closest('.site-header-nav-group'))
      .toContainElement(screen.getByRole('link', { name: '로드맵' }))
    expect(screen.getByRole('link', { name: '프로젝트' })).toHaveClass('site-header-nav-link--active')
    expect(screen.getByRole('link', { name: '강의' })).toHaveAttribute('href', '/lecture-list')
    expect(screen.getByRole('link', { name: '채용분석' })).toHaveAttribute('href', '/job-matching')
    expect(screen.getByRole('link', { name: '강의' })).not.toHaveAttribute('aria-haspopup')
    expect(screen.getByRole('link', { name: '채용분석' })).not.toHaveAttribute('aria-haspopup')
    expect(screen.getByRole('menuitem', { name: '로드맵 추천' })).toHaveAttribute('href', '/survey')
    expect(screen.getByRole('menuitem', { name: '로드맵 탐색' })).toHaveAttribute('href', '/roadmap-hub')
    expect(screen.getByRole('menuitem', { name: '라운지 대시보드' })).toHaveAttribute('href', '/lounge-dashboard')
    expect(screen.getByRole('menuitem', { name: '로드맵 추천' }).querySelector('i')).toHaveClass('fa-magic')
    expect(container.querySelectorAll('.site-header-mega-link-icon')).toHaveLength(
      container.querySelectorAll('.site-header-mega-link').length,
    )
    expect(screen.queryByRole('menu', { name: '강사 대시보드 세부 메뉴' })).not.toBeInTheDocument()
  })

  it('강사 목록도 독립 패널로 제공하고 현재 페이지를 표시한다', () => {
    const { container } = render(<SiteHeaderMegaMenu
      links={[...siteHeaderLinks, { href: '/instructor-dashboard', label: '강사 대시보드', children: instructorDashboardLinks }]}
      activeHref="/course-management"
    />)
    expect(container.querySelectorAll('.site-header-mega-panel')).toHaveLength(4)
    expect(screen.getAllByRole('menu')).toHaveLength(4)
    expect(screen.getByRole('link', { name: '강사 대시보드' })).toHaveClass('site-header-nav-link--active')
    expect(screen.getByRole('menuitem', { name: '강의 관리' })).toHaveAttribute('href', '/course-management')
    expect(screen.getByRole('menuitem', { name: '마케팅 관리' })).toHaveAttribute('href', '/instructor-marketing')
  })
})
