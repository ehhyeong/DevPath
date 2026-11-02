import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SiteHeaderMegaMenu from './SiteHeaderMegaMenu'
import { instructorDashboardLinks, siteHeaderLinks } from './site-header-config'

describe('SiteHeaderMegaMenu', () => {
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
