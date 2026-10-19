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

function Room({ send }: { send: (text: string) => void }) {
  const [voiceChatInput, setVoiceChatInput] = useState('')
  return <SquadMeetingView {...{
    workspaceId: 42, session: { userId: 7, name: '김학습' }, activeChannel: { channelId: 1, name: '회의실' },
    channels: [], participants: [], members: [], roomParticipants: [], waitingMembers: [], voiceChatMessages: [],
    roomPanelTab: 'chat', roomSidePanelOpen: true, voiceChatInput, setVoiceChatInput, voiceMinutes: null,
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
