import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthSession } from '../../../types/auth'
import { appendSquadVoiceMinutesTranscriptLine, fetchSquadVoiceChatMessages, fetchSquadVoiceMinutes } from './meeting-api'
import type { SpeechRecognitionEventLike, SpeechRecognitionLike, VoiceMeetingMinutes } from './meeting-types'
import { useSquadMeetingMinutes } from './useSquadMeetingMinutes'

vi.mock('./meeting-api', async (original) => ({
  ...await original<typeof import('./meeting-api')>(),
  appendSquadVoiceMinutesTranscriptLine: vi.fn(),
  fetchSquadVoiceChatMessages: vi.fn(),
  fetchSquadVoiceMinutes: vi.fn(),
}))

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})


describe('음성 기록 시각', () => {
  it.each([
    ['2026-11-03T00:05:00Z', '오전 9:05'],
    ['2026-11-03T03:05:00Z', '오후 12:05'],
    ['2026-11-03T14:59:00Z', '오후 11:59'],
    ['2026-11-03T15:05:00Z', '오전 12:05'],
  ])('%s의 임시 기록을 한국 시간 %s로 표시하고 서버 응답 후에도 유지한다', async (instant, expectedTime) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(instant))
    const recognitions: SpeechRecognitionLike[] = []
    class Recognition extends EventTarget implements SpeechRecognitionLike {
      lang = ''
      continuous = false
      interimResults = false
      onresult: SpeechRecognitionLike['onresult'] = null
      onend = null
      onerror = null
      start = vi.fn()
      stop = vi.fn()
      abort = vi.fn()
      constructor() { super(); recognitions.push(this) }
    }
    vi.stubGlobal('SpeechRecognition', Recognition)
    const minutes = { channelId: 11, recording: true, transcript: '기존 음성 기록' }
    vi.mocked(fetchSquadVoiceChatMessages).mockResolvedValue([])
    vi.mocked(fetchSquadVoiceMinutes).mockResolvedValue(minutes)
    let resolveSave!: (value: VoiceMeetingMinutes) => void
    vi.mocked(appendSquadVoiceMinutesTranscriptLine).mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))
    const broadcastMeetingSync = vi.fn()
    const options = {
      workspaceId: 42,
      activeChannel: { channelId: 11, workspaceId: 42, creatorId: 7, creatorName: '박주승', name: '회의' },
      isJoined: true, isMuted: false,
      session: { userId: 7, name: '박주승', accessToken: 'test', refreshToken: 'test', tokenType: 'Bearer', role: 'ROLE_LEARNER', exp: null, storage: 'local' } satisfies AuthSession,
      broadcastMeetingSync, setRoomPanelTab: vi.fn(),
    }
    const { result } = renderHook(() => useSquadMeetingMinutes(options))
    await act(async () => {})
    expect(recognitions).toHaveLength(1)
    const event = Object.assign(new Event('result'), {
      resultIndex: 0,
      results: [Object.assign([{ transcript: '로그인 기능을 테스트하겠습니다.' }], { isFinal: true })],
    }) as SpeechRecognitionEventLike

    act(() => recognitions[0].onresult?.(event))

    const expectedTranscript = `기존 음성 기록\n[${expectedTime}] 박주승: 로그인 기능을 테스트하겠습니다.`
    expect(result.current.minutesDraft).toBe(expectedTranscript)
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledWith(11, '로그인 기능을 테스트하겠습니다.')
    await act(async () => resolveSave({ ...minutes, transcript: expectedTranscript }))
    expect(result.current.minutesDraft).toBe(expectedTranscript)
    expect(broadcastMeetingSync).toHaveBeenCalledWith('minutes-updated', { minutes: { ...minutes, transcript: expectedTranscript } })
  })
})
