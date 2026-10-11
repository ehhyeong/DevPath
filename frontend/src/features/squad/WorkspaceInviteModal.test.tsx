import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectApiRequest } from '../project/api'
import WorkspaceInviteModal from './WorkspaceInviteModal'

vi.mock('../project/api', () => ({ projectApiRequest: vi.fn() }))
const invite = { workspaceId: 42, token: '42.signed-token', expiresAt: '2026-10-20T12:00:00' }
const clipboard = vi.fn()

beforeEach(() => {
  vi.mocked(projectApiRequest).mockReset().mockResolvedValue(invite)
  clipboard.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } })
})

describe('워크스페이스 팀원 초대', () => {
  it('실제 서명 토큰으로 참여 링크를 만들고 복사한다', async () => {
    render(<WorkspaceInviteModal workspaceId={42} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: '복사' })).toBeDisabled()
    const url = `${window.location.origin}/workspace-hub?inviteToken=42.signed-token`
    await waitFor(() => expect(screen.getByLabelText('초대 링크 (누구나 참여 가능)')).toHaveValue(url))
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/hub/projects/42/invite-link', expect.objectContaining({ method: 'POST' }), 'required')

    fireEvent.click(screen.getByRole('button', { name: '복사' }))
    expect(await screen.findByRole('status')).toHaveTextContent('초대 링크를 복사했습니다.')
    expect(clipboard).toHaveBeenCalledWith(url)
  })

  it('계정 이메일 초대를 실제 API로 보내고 결과를 안내한다', async () => {
    render(<WorkspaceInviteModal workspaceId={42} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('button', { name: '초대 보내기' })).toBeEnabled())
    fireEvent.change(screen.getByLabelText('팀원의 이메일 주소'), { target: { value: 'team@example.com' } })
    fireEvent.submit(screen.getByRole('button', { name: '초대 보내기' }).closest('form')!)
    expect(await screen.findByRole('status')).toHaveTextContent('DevPath 계정에 초대 알림을 보냈습니다.')
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/hub/projects/42/invites', { method: 'POST', body: JSON.stringify({ email: 'team@example.com' }) }, 'required')
    expect(screen.getByLabelText('팀원의 이메일 주소')).toHaveValue('')
  })

  it('링크 생성 실패를 표시하고 다시 시도한다', async () => {
    vi.mocked(projectApiRequest).mockRejectedValueOnce(new Error('초대 권한이 없습니다.')).mockResolvedValue(invite)
    render(<WorkspaceInviteModal workspaceId={42} onClose={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('초대 권한이 없습니다.')
    expect(screen.getByRole('button', { name: '복사' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '링크 생성 다시 시도' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '복사' })).toBeEnabled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('가입되지 않은 계정은 성공으로 표시하지 않는다', async () => {
    vi.mocked(projectApiRequest).mockResolvedValueOnce(invite).mockRejectedValueOnce(new Error('가입된 계정이 없습니다.'))
    render(<WorkspaceInviteModal workspaceId={42} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('button', { name: '초대 보내기' })).toBeEnabled())
    fireEvent.change(screen.getByLabelText('팀원의 이메일 주소'), { target: { value: 'missing@example.com' } })
    fireEvent.submit(screen.getByRole('button', { name: '초대 보내기' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('가입된 계정이 없습니다.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('팀원의 이메일 주소')).toHaveValue('missing@example.com')
  })

  it('클립보드 실패 시 수동 복사를 안내하며 닫기와 Escape가 동작한다', async () => {
    clipboard.mockRejectedValue(new Error('Unavailable'))
    const close = vi.fn()
    render(<WorkspaceInviteModal workspaceId={42} onClose={close} />)
    await waitFor(() => expect(screen.getByRole('button', { name: '복사' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: '복사' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('직접 복사')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: '초대 모달 닫기' }))
    expect(close).toHaveBeenCalledTimes(2)
  })
})
