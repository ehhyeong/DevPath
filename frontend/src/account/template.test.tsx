import { render } from '@testing-library/react'
import { describe,expect,it } from 'vitest'
import { MyMenuSidebar } from './template'

describe('MyMenuSidebar', () => {
  it('모든 계정 메뉴와 공통 위치 구조를 렌더링한다', () => {
    const { container } = render(<MyMenuSidebar currentPageKey="profile" />)
    const wrapper = container.firstElementChild
    const links = Array.from(container.querySelectorAll('aside a'))
    const activeLink = links.find((link) => link.className.includes('bg-[#E6F9F1]'))

    expect(wrapper).toHaveClass('hidden', 'w-60', 'shrink-0', 'lg:block')
    expect(wrapper?.firstElementChild).toHaveClass('h-16')
    expect(container.querySelector('aside')).toHaveClass('sticky', 'top-24', 'pt-1.5')
    expect(links).toHaveLength(7)
    expect(activeLink).toHaveAttribute('href', '/profile')
  })
})
