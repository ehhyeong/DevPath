import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectApiRequest } from '../project/api'
import { WORKSPACE_DATA_CHANGED_EVENT } from '../../lib/workspace-events'
import AiSquadIntegrationsPanel from './AiSquadIntegrationsPanel'
import type { ExternalIntegration } from './settings-types'

vi.mock('../project/api', () => ({ projectApiRequest: vi.fn() }))
vi.mock('../../lib/auth-toast', () => ({ showAuthToast: vi.fn() }))

const github: ExternalIntegration = { id: 1, workspaceId: 42, provider: 'GITHUB', isActive: false }
beforeEach(() => { vi.mocked(projectApiRequest).mockReset() })

describe('AI 스쿼드 GitHub 연동', () => {
  it('소유자가 실제 토큰을 저장하며 성공 후 입력을 비우고 PR를 다시 동기화한다', async () => {
    const changed = vi.fn()
    window.addEventListener(WORKSPACE_DATA_CHANGED_EVENT, changed)
    vi.mocked(projectApiRequest).mockImplementation(async (path) => path.endsWith('/settings')
      ? { canManage: true } as never
      : { ...github, isActive: true, repositoryUrl: 'https://github.com/team/project', githubTokenConfigured: true } as never)
    render(<AiSquadIntegrationsPanel workspaceId={42} initialIntegrations={[github]} />)
    const token = screen.getByLabelText('GitHub Access Token')
    await waitFor(() => expect(token).toBeEnabled())
    expect(token).toHaveAttribute('type', 'password')
    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: ' https://github.com/team/project ' } })
    fireEvent.change(token, { target: { value: ' test-only-token ' } })
    fireEvent.click(screen.getByRole('button', { name: '연동하기' }))
    await waitFor(() => expect(token).toHaveValue(''))
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/42/integrations/GITHUB', {
      method: 'PATCH', body: JSON.stringify({ isActive: true, repositoryUrl: 'https://github.com/team/project', githubToken: 'test-only-token' }),
    }, 'required')
    expect(changed).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'GitHub PR만 다시 동기화' }))
    await waitFor(() => expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/42/integrations/GITHUB/sync', { method: 'POST' }, 'required'))
    window.removeEventListener(WORKSPACE_DATA_CHANGED_EVENT, changed)
  })

  it('관리 권한이 없는 팀원은 입력하거나 저장할 수 없다', async () => {
    vi.mocked(projectApiRequest).mockResolvedValue({ canManage: false } as never)
    render(<AiSquadIntegrationsPanel workspaceId={42} initialIntegrations={[github]} />)
    await waitFor(() => expect(projectApiRequest).toHaveBeenCalledOnce())
    expect(screen.getByLabelText('GitHub Access Token')).toBeDisabled()
    expect(screen.getByLabelText('Repository URL')).toBeDisabled()
    expect(screen.getByRole('button', { name: '연동하기' })).toBeDisabled()
  })

  it('저장 실패 시 입력을 유지하고 성공 상태로 바꾸지 않는다', async () => {
    vi.mocked(projectApiRequest).mockImplementation(async (path) => {
      if (path.endsWith('/settings')) return { canManage: true } as never
      throw new Error('GitHub 토큰을 확인해 주세요.')
    })
    render(<AiSquadIntegrationsPanel workspaceId={42} initialIntegrations={[github]} />)
    const token = screen.getByLabelText('GitHub Access Token')
    await waitFor(() => expect(token).toBeEnabled())
    fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: 'https://github.com/team/project' } })
    fireEvent.change(token, { target: { value: 'test-invalid-token' } })
    fireEvent.click(screen.getByRole('button', { name: '연동하기' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '연동하기' })).toBeEnabled())
    expect(token).toHaveValue('test-invalid-token')
    expect(screen.queryByText('연결됨')).not.toBeInTheDocument()
  })
})
