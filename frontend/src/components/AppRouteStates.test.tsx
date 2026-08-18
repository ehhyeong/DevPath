import { render,screen } from '@testing-library/react'
import { describe,expect,it } from 'vitest'
import { NotFoundPage,RouteLoadingView } from './AppRouteStates'

describe('route states', () => {
  it('lazy 화면 로딩 상태를 안내한다', () => {
    render(<RouteLoadingView />)

    expect(screen.getByText('화면을 불러오는 중입니다.')).toBeInTheDocument()
  })

  it('등록되지 않은 경로에 404 화면을 표시한다', () => {
    render(<NotFoundPage pathname="/missing-page" />)

    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeInTheDocument()
    expect(screen.getByText(/\/missing-page/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/')
  })
})
