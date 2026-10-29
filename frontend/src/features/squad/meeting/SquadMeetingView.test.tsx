import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SquadMeetingView from './SquadMeetingView'
import type { SquadMeetingViewModel } from './useSquadMeetingController'
import { DEMO_TEXT } from '../../../lib/demo-typing'
import { getWorkspaceAiDesign } from '../../project/api'
import { userApi } from '../../../lib/api/auth'

vi.mock('../../../lib/auth-session', async (original) => ({ ...await original<typeof import('../../../lib/auth-session')>(), readStoredAuthSession: () => ({ userId: 7 }) }))
vi.mock('../../project/api', async (original) => ({ ...await original<typeof import('../../project/api')>(), getWorkspaceAiDesign: vi.fn() }))
vi.mock('../../../components/SquadWorkspaceAside', () => ({ default: () => null }))
vi.mock('./MeetingParticipantStage', () => ({ default: () => null }))
vi.mock('./MeetingAudioSettings', () => ({ default: () => null }))

beforeEach(() => {
  vi.spyOn(userApi, 'getMyProfile').mockResolvedValue({ userId: 7, email: 'kim.hakseup@devpath.com' } as never)
})

function Room({ send, saving = false }: { send: (text: string) => void; saving?: boolean }) {
  const [voiceChatInput, setVoiceChatInput] = useState('')
  const [roomPanelTab, setRoomPanelTab] = useState<'minutes' | 'chat'>('chat')
  const [recording, setRecording] = useState(false)
  return <SquadMeetingView {...{
    workspaceId: 42, session: { userId: 7, name: '김학습' }, activeChannel: { channelId: 1, name: '회의실' },
    channels: [], participants: [], members: [], roomParticipants: [], waitingMembers: [], voiceChatMessages: [],
    roomPanelTab, setRoomPanelTab, roomSidePanelOpen: true, voiceChatInput, setVoiceChatInput,
    voiceMinutes: { channelId: 1, recording, transcript: '' }, minutesSaving: saving,
    toggleMinutesRecording: () => setRecording((current) => !current),
    minutesDraft: '', minutesActionItems: [], selectedMinutesActionItems: [], remoteScreenShares: [], remoteCameraStreams: [],
    floatingReactions: [], localCameraStream: null, localScreenShareStream: null, micLevel: 0,
    securityStatus: { detail: '연결됨' }, networkStatus: { detail: '연결됨', label: '온라인', tone: 'good' },
    isJoined: true, loading: false, projectName: 'RoutineCare', sendVoiceChatMessage: () => send(voiceChatInput),
  } as unknown as SquadMeetingViewModel} aiWorkspace />
}

describe('회의실 시연 채팅', () => {
  it.each([true, false])('시연 여부 %s에서 회의실 채팅 클릭만 처리하고 여러 줄과 전송 내용을 보존한다', async (demoWorkspace) => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace } as never)
    const send = vi.fn()
    await act(async () => render(<Room send={send} />))
    const input = screen.getByPlaceholderText('메시지 입력...')
    fireEvent.click(input)
    expect(input).toHaveValue(demoWorkspace ? DEMO_TEXT.meeting : '')
    expect(input.tagName).toBe('TEXTAREA')
    expect(send).not.toHaveBeenCalled()
    if (demoWorkspace) {
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(send).toHaveBeenCalledWith(DEMO_TEXT.meeting)
    }
  })
})

describe('회의 기록 공통 제어', () => {
  it('팀 채팅방에서 기록을 시작·중지하고 탭 전환 뒤에도 상태와 입력을 유지한다', async () => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace: false } as never)
    await act(async () => render(<Room send={vi.fn()} />))
    const input = screen.getByPlaceholderText('메시지 입력...')
    fireEvent.change(input, { target: { value: '계속 작성 중인 회의 채팅' } })
    expect(screen.getAllByRole('button', { name: '기록 시작' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '기록 시작' }))
    expect(screen.getByRole('button', { name: '기록 중지' })).toBeVisible()
    expect(input).toHaveValue('계속 작성 중인 회의 채팅')
    fireEvent.click(screen.getByRole('button', { name: /AI 회의록$/ }))
    expect(screen.getAllByRole('button', { name: '기록 중지' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '기록 중지' }))
    fireEvent.click(screen.getByRole('button', { name: /팀 채팅방$/ }))
    expect(screen.getByPlaceholderText('메시지 입력...')).toHaveValue('계속 작성 중인 회의 채팅')
    fireEvent.click(screen.getByRole('button', { name: '기록 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '기록 중지' }))
    expect(screen.getByRole('button', { name: '기록 시작' })).toBeVisible()
  })

  it('저장 중에는 두 탭 모두에서 기록 버튼을 비활성화한다', async () => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace: false } as never)
    await act(async () => render(<Room send={vi.fn()} saving />))
    const start = screen.getByRole('button', { name: '기록 시작' })
    expect(start).toBeDisabled()
    fireEvent.click(start)
    expect(screen.queryByRole('button', { name: '기록 중지' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /AI 회의록$/ }))
    expect(screen.getByRole('button', { name: '기록 시작' })).toBeDisabled()
  })
})
