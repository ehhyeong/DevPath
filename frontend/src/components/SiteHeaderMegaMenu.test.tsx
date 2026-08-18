import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SiteHeaderMegaMenu from './SiteHeaderMegaMenu'

describe('SiteHeaderMegaMenu', () => {
  it('메뉴 제목과 모든 하위 링크를 접근 가능한 메뉴로 표시한다', () => {
    render(
      <SiteHeaderMegaMenu
        label="로드맵"
        items={[
          { href: '/survey', label: '로드맵 추천' },
          { href: '/roadmap-hub', label: '로드맵 탐색' },
        ]}
      />,
    )

    expect(screen.getByRole('menu', { name: '로드맵 세부 메뉴' })).toBeInTheDocument()
    expect(screen.getByText('DEVPATH NAVIGATION')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '로드맵 추천' })).toHaveAttribute('href', '/survey')
    expect(screen.getByRole('menuitem', { name: '로드맵 탐색' })).toHaveAttribute('href', '/roadmap-hub')
  })
})
