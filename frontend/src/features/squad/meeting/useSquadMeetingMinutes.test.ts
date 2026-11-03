import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

beforeEach(() => vi.clearAllMocks())

async function startRecording() {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-03T00:05:00Z'))
  const recognitions: SpeechRecognitionLike[] = []
  class Recognition extends EventTarget implements SpeechRecognitionLike {
    lang = ''
    continuous = false
    interimResults = false
    onresult: SpeechRecognitionLike['onresult'] = null
    onend: SpeechRecognitionLike['onend'] = null
    onerror: SpeechRecognitionLike['onerror'] = null
    start = vi.fn()
    stop = vi.fn()
    abort = vi.fn()
    constructor() { super(); recognitions.push(this) }
  }
  vi.stubGlobal('SpeechRecognition', Recognition)
  const minutes = { channelId: 11, recording: true, transcript: '기존 기록' }
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
  const recognition = recognitions[0]
  function emit(resultIndex: number, ...parts: Array<[string, boolean]>) {
    const event = Object.assign(new Event('result'), {
      resultIndex,
      results: parts.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal })),
    }) as SpeechRecognitionEventLike
    act(() => recognition.onresult?.(event))
  }
  return { result, recognition, emit, resolveSave, minutes, broadcastMeetingSync }
}

describe('음성 중간 인식 표시', () => {
  it('중간 문장을 즉시 표시·교체하고 삭제되면 제거하며 저장하지 않는다', async () => {
    const { result, recognition, emit, broadcastMeetingSync } = await startRecording()
    expect(recognition.interimResults).toBe(true)
    emit(0, ['로그인', false])
    expect(result.current.minutesInterimTranscript).toBe('[오전 9:05] 박주승: 로그인')
    emit(0, ['로그인 기능 테스트', false])
    expect(result.current.minutesInterimTranscript).toBe('[오전 9:05] 박주승: 로그인 기능 테스트')
    expect(result.current.minutesDraft).toBe('기존 기록')
    expect(appendSquadVoiceMinutesTranscriptLine).not.toHaveBeenCalled()
    expect(broadcastMeetingSync).toHaveBeenLastCalledWith('minutes-updated', { transcriptPreview: '[오전 9:05] 박주승: 로그인 기능 테스트' })
    emit(0)
    expect(result.current.minutesInterimTranscript).toBe('')
    expect(broadcastMeetingSync).toHaveBeenLastCalledWith('minutes-updated', { transcriptPreview: '' })
  })

  it('새 확정 문장만 한 번 저장하고 다음 중간 문장은 서버 응답 후에도 표시한다', async () => {
    const { result, emit, resolveSave, minutes } = await startRecording()
    emit(0, ['로그인 테스트', false])
    emit(0, ['로그인 테스트 완료', true], ['다음 작업', false])
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledExactlyOnceWith(11, '로그인 테스트 완료')
    emit(1, ['로그인 테스트 완료', true], ['다음 작업은 배포', false])
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledTimes(1)
    await act(async () => resolveSave({ ...minutes, transcript: '기존 기록\n[오전 9:05] 박주승: 로그인 테스트 완료' }))
    expect(result.current.minutesDraft).toBe('기존 기록\n[오전 9:05] 박주승: 로그인 테스트 완료')
    expect(result.current.minutesInterimTranscript).toBe('[오전 9:05] 박주승: 다음 작업은 배포')
  })

  it('다른 팀원과 내 중간 문장을 함께 표시하고 중지·퇴장한 발언자의 문장만 지운다', async () => {
    const { result, emit } = await startRecording()
    emit(0, ['로그인 테스트', false])
    act(() => result.current.applyTranscriptPreview(8, '[오전 9:05] 김태형: API 테스트'))
    expect(result.current.minutesInterimTranscript).toContain('박주승: 로그인 테스트')
    expect(result.current.minutesInterimTranscript).toContain('김태형: API 테스트')
    act(() => result.current.stopMinutesSpeechRecognition())
    expect(result.current.minutesInterimTranscript).toBe('[오전 9:05] 김태형: API 테스트')
    act(() => result.current.applyTranscriptPreview(8, ''))
    expect(result.current.minutesInterimTranscript).toBe('')
    expect(result.current.minutesDraft).toBe('기존 기록')
  })

  it.each(['종료', '오류'])('인식 %s 시 임시 문장을 지우고 확정 기록을 유지한다', async (event) => {
    const { result, emit, recognition } = await startRecording()
    emit(0, ['임시 문장', false])
    act(() => { if (event === '종료') recognition.onend?.(); else recognition.onerror?.({ error: 'no-speech' }) })
    expect(result.current.minutesInterimTranscript).toBe('')
    expect(result.current.minutesDraft).toBe('기존 기록')
    expect(appendSquadVoiceMinutesTranscriptLine).not.toHaveBeenCalled()
  })
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
