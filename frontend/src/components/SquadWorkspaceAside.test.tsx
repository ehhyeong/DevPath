import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SquadWorkspaceAside from './SquadWorkspaceAside'

vi.mock('../features/project/api', () => ({ projectApiRequest: vi.fn(async () => []) }))

describe('AI 설계서 사이드바 반영 맵', () => {
  it.each([false, true])('AI 여부 %s에서 스쿼드 설정을 마지막 메뉴로 표시하고 선택·이동을 유지한다', (aiWorkspace) => {
    const navigate = vi.fn()
    render(<SquadWorkspaceAside activePage="settings" workspaceId={42} aiWorkspace={aiWorkspace} onNavigate={(event, href) => { event.preventDefault(); navigate(href) }} />)
    fireEvent.mouseEnter(screen.getByRole('complementary'))
    const menus = screen.getByRole('navigation').querySelectorAll('a.workspace-nav-item')
    const settings = screen.getByRole('link', { name: /스쿼드 설정/ })
    expect(menus[menus.length - 1]).toBe(settings)
    expect(screen.getByText('관리')).toBeInTheDocument()
    expect(settings).toHaveClass('active')
    fireEvent.click(settings)
    expect(navigate).toHaveBeenCalledWith(`/squad-settings?workspaceId=42${aiWorkspace ? '&ai=1' : ''}`)
    fireEvent.pointerMove(document.body)
  })

  it.each(['dashboard', 'workspace', 'schedule'] as const)('%s 메뉴 전환으로 다시 마운트되어도 펼침 상태를 유지하고 마우스가 나가면 접힌다', (page) => {
    const previous = render(<SquadWorkspaceAside activePage="api" workspaceId={42} aiWorkspace onNavigate={(event) => event.preventDefault()} />)
    fireEvent.mouseEnter(screen.getByRole('complementary'))
    const menu = Array.from(screen.getByRole('navigation').querySelectorAll('a')).find((link) => link.getAttribute('href') === `/squad-${page}?workspaceId=42&ai=1`)!
    fireEvent.click(menu)
    fireEvent.mouseLeave(screen.getByRole('complementary'))
    previous.unmount()

    render(<SquadWorkspaceAside activePage={page} workspaceId={42} aiWorkspace />)
    const aside = screen.getByRole('complementary')
    expect(aside).toHaveClass('is-expanded')
    expect(screen.getByText('로드맵 기반 작업 카드')).toBeInTheDocument()
    fireEvent.pointerMove(aside)
    fireEvent.mouseLeave(aside)
    expect(aside).not.toHaveClass('is-expanded')
    expect(screen.queryByText('로드맵 기반 작업 카드')).not.toBeInTheDocument()
  })

  it('네 설계 바로가기 없이 AI 설계서 메뉴의 선택·프로젝트 이동을 유지한다', () => {
    const navigate = vi.fn()
    render(<SquadWorkspaceAside activePage="blueprint" workspaceId={42} aiWorkspace onNavigate={(event, href) => { event.preventDefault(); navigate(href) }} />)
    fireEvent.mouseEnter(screen.getByRole('complementary'))
    expect(screen.queryByRole('link', { name: /설계서 열기/ })).not.toBeInTheDocument()
    const blueprint = screen.getByRole('link', { name: /프로젝트 설계서/ })
    expect(blueprint).toHaveAttribute('href', '/squad-blueprint?workspaceId=42&ai=1')
    expect(blueprint).toHaveClass('active')
    fireEvent.click(blueprint)
    expect(navigate).toHaveBeenCalledWith('/squad-blueprint?workspaceId=42&ai=1')
    expect(screen.getByText('로드맵 기반 작업 카드')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /코드 피드백/ })).toHaveAttribute('aria-disabled', 'true')
    fireEvent.pointerMove(document.body)
    fireEvent.mouseLeave(screen.getByRole('complementary'))
    expect(screen.queryByText('로드맵 기반 작업 카드')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /설계서 열기/ })).not.toBeInTheDocument()
  })

  it('대시보드부터 설정까지 기능 흐름대로 배치하고 관련 기능을 같은 그룹에 둔다', () => {
    render(<SquadWorkspaceAside activePage="api" workspaceId={42} aiWorkspace />)
    fireEvent.mouseEnter(screen.getByRole('complementary'))
    const menus = Array.from(screen.getByRole('navigation').querySelectorAll('a.workspace-nav-item'))
    expect(menus.map((menu) => menu.getAttribute('href'))).toEqual(['dashboard', 'blueprint', 'workspace', 'schedule', 'erd', 'api', 'review', 'meeting', 'files', 'interview', 'settings'].map((page) => `/squad-${page}?workspaceId=42&ai=1`))
    for (const [title, pages] of [
      ['프로젝트 진행', ['workspace', 'schedule']],
      ['설계/리뷰', ['erd', 'api', 'review']],
      ['팀 협업', ['meeting', 'files']],
    ] as const) {
      const group = screen.getByText(title).parentElement!
      expect(Array.from(group.querySelectorAll('a.workspace-nav-item')).map((menu) => menu.getAttribute('href'))).toEqual(pages.map((page) => `/squad-${page}?workspaceId=42&ai=1`))
    }
    expect(menus[5]).toHaveClass('active')
  })

  it('일반 스쿼드에는 기존 메뉴와 그룹을 유지한다', () => {
    render(<SquadWorkspaceAside activePage="workspace" workspaceId={42} />)
    fireEvent.mouseEnter(screen.getByRole('complementary'))
    expect(screen.getByText('프로젝트 진행')).toBeInTheDocument()
    expect(screen.getByText('설계/리뷰')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /설계서 열기/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /작업 현황판/ })).toHaveAttribute('href', '/squad-workspace?workspaceId=42')
  })
})
