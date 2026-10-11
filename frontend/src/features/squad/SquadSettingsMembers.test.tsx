import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectApiRequest } from '../project/api'
import { showAuthToast } from '../../lib/auth-toast'
import SquadSettingsApp from './SquadSettingsApp'
import { MembersPanel } from './SquadSettingsPanels'
import type { WorkspaceSettings } from './settings-types'

vi.mock('../project/api', async (importOriginal) => ({ ...await importOriginal<typeof import('../project/api')>(), projectApiRequest: vi.fn() }))
vi.mock('../../lib/useAuthSession', () => ({ useAuthSession: () => [{ accessToken: 'test-token', userId: 77, name: '방장 사용자' }, vi.fn()] }))
vi.mock('../../lib/auth-toast', () => ({ showAuthToast: vi.fn() }))

const settings = (): WorkspaceSettings => ({
  workspaceId: 42, name: '예약 플랫폼', type: 'SQUAD', status: 'ACTIVE', ownerId: 77,
  deleted: false, canManage: true, memberCount: 1,
  members: [{ memberId: 9, learnerId: 77, learnerName: '방장 사용자', position: 'Backend 개발자', roleLabel: 'BE' }],
})

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/squad-settings?workspaceId=42&ai=1')
  vi.mocked(projectApiRequest).mockImplementation(async (path) => path.endsWith('/settings') ? settings() as never : [] as never)
})

describe('스쿼드 설정의 담당 직군', () => {
  it('방장 권한과 직군을 별도로 표시하고 방장 직군도 선택할 수 있다', () => {
    render(<MembersPanel settings={settings()} currentUserId={77} onInvite={vi.fn()} busyMemberId={null} onPositionChange={vi.fn()} />)
    expect(screen.getByText('방장', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '방장 사용자 직군' })).toHaveValue('BE')
    for (const label of ['직군 미지정', '프론트엔드', '백엔드', '풀스택', '디자이너', '인프라 / DevOps', '기획 / PM']) expect(screen.getByRole('option', { name: label })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Owner/i })).not.toBeInTheDocument()
  })

  it('기존 OWNER 직군 값은 미지정으로 표시한다', () => {
    const state = settings()
    state.members[0].position = 'OWNER'
    state.members[0].roleLabel = 'OWNER'
    render(<MembersPanel settings={state} currentUserId={77} onInvite={vi.fn()} busyMemberId={null} onPositionChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: '방장 사용자 직군' })).toHaveValue('')
    expect(screen.getByText('방장', { exact: true })).toBeInTheDocument()
  })

  it('일반 팀원에게는 직군을 읽기 전용으로 표시한다', () => {
    render(<MembersPanel settings={{ ...settings(), canManage: false }} currentUserId={88} onInvite={vi.fn()} busyMemberId={null} onPositionChange={vi.fn()} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText('백엔드', { exact: true })).toBeInTheDocument()
  })

  it('직군 변경 API가 성공한 뒤 변경 값을 반영하며 방장 표시는 유지한다', async () => {
    vi.mocked(projectApiRequest).mockImplementation(async (path) => {
      if (path.endsWith('/settings/members/9/position')) {
        const updated = settings()
        updated.members[0] = { ...updated.members[0], position: 'Frontend 개발자', roleLabel: 'FE' }
        return updated as never
      }
      return path.endsWith('/settings') ? settings() as never : [] as never
    })
    render(<SquadSettingsApp aiWorkspace />)
    await screen.findByRole('button', { name: '변경사항 저장' })
    fireEvent.click(screen.getByRole('button', { name: '팀원 관리' }))
    const select = await screen.findByRole('combobox', { name: '방장 사용자 직군' })
    fireEvent.change(select, { target: { value: 'FE' } })
    await waitFor(() => expect(select).toHaveValue('FE'))
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/42/settings/members/9/position', { method: 'PATCH', body: JSON.stringify({ position: 'FE' }) }, 'required')
    expect(screen.getByText('방장', { exact: true })).toBeInTheDocument()
  })

  it('저장 실패 시 이전 직군을 유지하고 다시 변경할 수 있다', async () => {
    vi.mocked(projectApiRequest).mockImplementation(async (path) => {
      if (path.endsWith('/settings/members/9/position')) throw new Error('직군 저장 실패')
      return path.endsWith('/settings') ? settings() as never : [] as never
    })
    render(<SquadSettingsApp aiWorkspace />)
    await screen.findByRole('button', { name: '변경사항 저장' })
    fireEvent.click(screen.getByRole('button', { name: '팀원 관리' }))
    const select = await screen.findByRole('combobox', { name: '방장 사용자 직군' })
    fireEvent.change(select, { target: { value: 'FE' } })
    await waitFor(() => expect(showAuthToast).toHaveBeenCalledWith({ message: '직군 저장 실패', variant: 'error' }))
    expect(select).toHaveValue('BE')
    expect(select).toBeEnabled()
  })
})
