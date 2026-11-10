import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SquadDashboardChatSurface from './SquadDashboardChatSurface'
import type { TeamMessage } from './dashboard-types'

function message(messageId: number, senderId = 8, isMine = false): TeamMessage {
  return { messageId, loungeId: 42, senderId, senderName: '팀원', isMine, content: `메시지 ${messageId}`, createdAt: '2026-11-06T07:00:00Z' }
}

function props(): ComponentProps<typeof SquadDashboardChatSurface> {
  return {
    sessionUserId: 7,
    dashboard: { workspaceId: 42, name: 'AI 프로젝트', type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [], unresolvedTaskCount: 0, activeMilestoneCount: 0 },
    messages: [message(1)], directMessages: [], dmMembers: [], memberById: new Map(), selectedDmMember: null,
    currentProfileImage: null, chatInPip: false, chatPipContainer: null, chatOpen: false, chatTab: 'team', plusMenuOpen: false,
    messageInput: '', directInput: '', directLoading: false,
    chatScrollRef: { current: null }, directScrollRef: { current: null }, pipChatScrollRef: { current: null }, pipDirectScrollRef: { current: null },
    setChatTab: vi.fn(), setPlusMenuOpen: vi.fn(), setMessageInput: vi.fn(), setDirectInput: vi.fn(), setSelectedDmMember: vi.fn(), setDirectMessages: vi.fn(),
    openChatSurface: vi.fn(), closeChatSurface: vi.fn(), openDirectRoom: vi.fn(), sendTeamMessage: vi.fn(), sendDirectMessage: vi.fn(), sendPlusMessage: vi.fn(),
  }
}

function badge() {
  return screen.getByRole('button', { name: '팀채팅' }).querySelector('.bg-red-500')
}

describe('워크스페이스 팀채팅 읽음 표시', () => {
  beforeEach(() => localStorage.clear())

  it('팀채팅을 읽으면 빨간 점이 사라지고 닫거나 같은 기록을 다시 받아도 유지한다', () => {
    const initial = props()
    const view = render(<SquadDashboardChatSurface {...initial} />)
    expect(badge()).toBeInTheDocument()
    view.rerender(<SquadDashboardChatSurface {...initial} chatOpen />)
    expect(badge()).toBeNull()
    view.rerender(<SquadDashboardChatSurface {...initial} messages={[message(1)]} />)
    expect(badge()).toBeNull()
    view.rerender(<SquadDashboardChatSurface {...initial} messages={[message(1), message(2)]} />)
    expect(badge()).toBeInTheDocument()
  })

  it('팀 탭을 보는 동안 새 메시지도 읽음 처리하고 본인 메시지는 알림에서 제외한다', () => {
    const initial = props()
    const view = render(<SquadDashboardChatSurface {...initial} chatOpen />)
    view.rerender(<SquadDashboardChatSurface {...initial} chatOpen messages={[message(1), message(2)]} />)
    view.rerender(<SquadDashboardChatSurface {...initial} messages={[message(1), message(2), message(3, 7), message(4, 9, true)]} />)
    expect(badge()).toBeNull()
  })

  it('1:1 탭은 팀채팅을 읽음 처리하지 않으며 팀 탭으로 돌아오면 해제한다', () => {
    const initial = props()
    const view = render(<SquadDashboardChatSurface {...initial} chatOpen chatTab="dm" />)
    expect(badge()).toBeInTheDocument()
    view.rerender(<SquadDashboardChatSurface {...initial} chatOpen />)
    expect(badge()).toBeNull()
  })

  it('PiP 팀채팅을 읽어도 알림이 사라지고 창을 닫아도 다시 켜지지 않는다', () => {
    const initial = props()
    const root = document.createElement('div')
    const view = render(<SquadDashboardChatSurface {...initial} />)
    view.rerender(<SquadDashboardChatSurface {...initial} chatOpen chatInPip chatPipContainer={root} />)
    expect(root).toHaveTextContent('메시지 1')
    expect(badge()).toBeNull()
    view.rerender(<SquadDashboardChatSurface {...initial} />)
    expect(badge()).toBeNull()
  })

  it('워크스페이스나 사용자가 바뀌면 이전 읽음 기준을 적용하지 않는다', () => {
    const initial = props()
    const view = render(<SquadDashboardChatSurface {...initial} chatOpen />)
    view.rerender(<SquadDashboardChatSurface {...initial} sessionUserId={9} />)
    expect(badge()).toBeInTheDocument()
    view.rerender(<SquadDashboardChatSurface {...initial} sessionUserId={9} chatOpen />)
    view.rerender(<SquadDashboardChatSurface {...initial} sessionUserId={9} dashboard={{ ...initial.dashboard!, workspaceId: 43 }} messages={[{ ...message(1), loungeId: 43 }]} />)
    expect(badge()).toBeInTheDocument()
  })

  it('다시 진입해도 저장된 읽음 기준을 복원한다', () => {
    const initial = props()
    const view = render(<SquadDashboardChatSurface {...initial} chatOpen />)
    view.unmount()
    const next = render(<SquadDashboardChatSurface {...initial} />)
    expect(badge()).toBeNull()
    next.rerender(<SquadDashboardChatSurface {...initial} messages={[message(1), message(2)]} />)
    expect(badge()).toBeInTheDocument()
  })

  it('브라우저 저장소 사용이 차단되어도 현재 화면에서 읽음 처리를 유지한다', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      const initial = props()
      const view = render(<SquadDashboardChatSurface {...initial} chatOpen />)
      view.rerender(<SquadDashboardChatSurface {...initial} />)
      expect(badge()).toBeNull()
    } finally {
      get.mockRestore()
      set.mockRestore()
    }
  })
})
