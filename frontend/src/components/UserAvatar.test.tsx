import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import UserAvatar from './UserAvatar'

describe('작성자 프로필 표시', () => {
  it('기존 기본 프로필 아이콘과 실제 프로필 사진 동작을 유지한다', () => {
    const view = render(<UserAvatar name="김학습" />)
    expect(screen.getByRole('img').querySelector('.fa-user')).toBeInTheDocument()
    view.rerender(<UserAvatar name="김학습" fallback="initials" imageUrl="/profile.png" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/profile.png')
  })
  it('이니셜을 요청한 화면에서만 작성자 이름을 구분하며 색상을 일관되게 유지한다', () => {
    const view = render(<UserAvatar name="김학습" fallback="initials" />)
    const background = screen.getByRole('img').style.backgroundColor
    expect(screen.getByRole('img')).toHaveTextContent('학습')
    view.rerender(<UserAvatar name="박주승" fallback="initials" />)
    expect(screen.getByRole('img')).toHaveTextContent('주승')
    view.rerender(<UserAvatar name="김학습" fallback="initials" />)
    expect(screen.getByRole('img').style.backgroundColor).toBe(background)
    view.rerender(<UserAvatar name="Alex Kim" fallback="initials" />)
    expect(screen.getByRole('img')).toHaveTextContent('AK')
  })
})
