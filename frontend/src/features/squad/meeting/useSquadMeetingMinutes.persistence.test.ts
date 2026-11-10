import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appendSquadVoiceMinutesTranscriptLine, createSquadVoiceMinutesSummary, fetchSquadVoiceChatMessages, fetchSquadVoiceMinutes, updateSquadVoiceMinutes } from './meeting-api'
import type { SpeechRecognitionEventLike, SpeechRecognitionLike, VoiceMeetingMinutes, VoiceMeetingSyncPayload } from './meeting-types'
import { useSquadMeetingMinutes } from './useSquadMeetingMinutes'

vi.mock('./meeting-api', async original => ({
  ...await original<typeof import('./meeting-api')>(),
  appendSquadVoiceMinutesTranscriptLine: vi.fn(), fetchSquadVoiceChatMessages: vi.fn(),
  fetchSquadVoiceMinutes: vi.fn(), updateSquadVoiceMinutes: vi.fn(), createSquadVoiceMinutesSummary: vi.fn(),
}))
vi.mock('../notifications', () => ({ createSquadNotification: vi.fn().mockResolvedValue(undefined), squadActorName: (name: string) => name }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-03T00:05:00Z'))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

function speech(text: string, isFinal: boolean): SpeechRecognitionEventLike {
  return Object.assign(new Event('result'), { resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] }) as SpeechRecognitionEventLike
}

async function twoParticipants() {
  let stored: VoiceMeetingMinutes = { channelId: 11, recording: false, transcript: '' }
  const recognitions: Recognition[] = []
  const listenersAtStop: Array<SpeechRecognitionLike['onresult']> = []
  let lateFinalAttempts = 0
  class Recognition extends EventTarget implements SpeechRecognitionLike {
    lang = ''
    continuous = false
    interimResults = false
    onresult: SpeechRecognitionLike['onresult'] = null
    onend: SpeechRecognitionLike['onend'] = null
    onerror: SpeechRecognitionLike['onerror'] = null
    pendingFinal = ''
    start = vi.fn()
    abort = vi.fn()
    stop = vi.fn(() => {
      listenersAtStop.push(this.onresult)
      const text = this.pendingFinal
      this.pendingFinal = ''
      // stop 후 이미 수집한 음성의 결과가 비동기로 오는 순서를 재현한다.
      void Promise.resolve().then(() => {
        if (!text) return
        lateFinalAttempts += 1
        this.onresult?.(speech(text, true))
      })
    })
    constructor() { super(); recognitions.push(this) }
  }
  vi.stubGlobal('SpeechRecognition', Recognition)
  vi.mocked(fetchSquadVoiceChatMessages).mockResolvedValue([])
  vi.mocked(fetchSquadVoiceMinutes).mockImplementation(async () => ({ ...stored }))
  vi.mocked(updateSquadVoiceMinutes).mockImplementation(async (_, payload) => {
    stored = { ...stored, ...payload }
    return { ...stored }
  })
  vi.mocked(appendSquadVoiceMinutesTranscriptLine).mockImplementation(async (_, text) => {
    stored = { ...stored, transcript: [stored.transcript, `[오전 9:05] 팀원: ${text}`].filter(Boolean).join('\n') }
    return { ...stored }
  })
  vi.mocked(createSquadVoiceMinutesSummary).mockImplementation(async () => {
    stored = { ...stored, summary: '시연 대본 요약' }
    return { minutes: { ...stored }, actionItems: [] }
  })
  const recipients = new Map<number, (sender: number, payload: VoiceMeetingSyncPayload) => void>()
  const options = (userId: number, isMuted: boolean): Parameters<typeof useSquadMeetingMinutes>[0] => ({
    workspaceId: 42, activeChannel: { channelId: 11, workspaceId: 42, creatorId: 7, creatorName: '진행자', name: '회의' },
    isJoined: true, isMuted,
    session: { userId, name: userId === 7 ? '진행자' : '팀원', accessToken: 'test', refreshToken: 'test', tokenType: 'Bearer', role: 'ROLE_LEARNER', exp: null, storage: 'local' },
    setRoomPanelTab: vi.fn(),
    broadcastMeetingSync: (_, payload) => {
      for (const [recipient, apply] of recipients) if (recipient !== userId) apply(userId, payload)
    },
  })
  const hostOptions = options(7, true)
  const host = renderHook(() => useSquadMeetingMinutes(hostOptions))
  const teammateOptions = options(8, false)
  const teammate = renderHook(input => useSquadMeetingMinutes(input), { initialProps: teammateOptions })
  await act(async () => {})
  for (const [id, hook] of [[7, host], [8, teammate]] as const) recipients.set(id, (sender, payload) => {
    if (typeof payload.transcriptPreview === 'string') hook.result.current.applyTranscriptPreview(sender, payload.transcriptPreview)
    if (payload.minutes) hook.result.current.applyVoiceMinutes(payload.minutes)
  })
  await act(() => host.result.current.toggleMinutesRecording())
  expect(recognitions).toHaveLength(1)
  const recognition = recognitions[0]
  return {
    host, teammate, recognition, listenersAtStop, getStored: () => stored, lateFinalAttempts: () => lateFinalAttempts,
    emit: async (text: string, final = false) => {
      recognition.pendingFinal = final ? '' : text
      await act(async () => recognition.onresult?.(speech(text, final)))
    },
    mute: () => act(() => teammate.rerender({ ...teammateOptions, isMuted: true })),
  }
}

describe('두 참여자의 회의 기록 보존과 요약', () => {
  const script = '오늘은 로그인 화면을 마무리하고 내일 API 연동을 검증하겠습니다.'

  it('진행자가 중지하고 팀원이 음소거해도 중지 뒤 도착한 final을 한 번 저장한다', async () => {
    const room = await twoParticipants()
    await room.emit(script)
    expect(room.host.result.current.minutesInterimTranscript).toContain(script)
    expect(room.teammate.result.current.minutesInterimTranscript).toContain(script)
    expect(room.getStored().transcript).toBe('')
    await act(() => room.host.result.current.toggleMinutesRecording())
    room.mute()
    expect(room.listenersAtStop).toEqual([expect.any(Function)])
    expect(room.lateFinalAttempts()).toBe(1)
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledExactlyOnceWith(11, script)
    expect(room.host.result.current.minutesInterimTranscript).toBe('')
    expect(room.teammate.result.current.minutesInterimTranscript).toBe('')
    expect(room.host.result.current.minutesDraft).toContain(script)
    expect(room.getStored().transcript).toContain(script)
  })

  it('팀원이 음소거해도 마지막 발화를 보존하고 중복 중지하지 않는다', async () => {
    const room = await twoParticipants()
    await room.emit(script)
    room.mute()
    await act(async () => {})
    expect(room.getStored().recording).toBe(true)
    expect(room.host.result.current.minutesInterimTranscript).toBe('')
    expect(room.listenersAtStop).toEqual([expect.any(Function)])
    expect(room.lateFinalAttempts()).toBe(1)
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledExactlyOnceWith(11, script)
    expect(room.recognition.stop).toHaveBeenCalledOnce()
    expect(room.host.result.current.minutesDraft).toContain(script)
  })

  it('중지 전에 final 저장이 완료된 대본은 동일한 중지·음소거 순서에서도 유지된다', async () => {
    const room = await twoParticipants()
    await room.emit(script)
    await room.emit(script, true)
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledExactlyOnceWith(11, script)
    await act(() => room.host.result.current.toggleMinutesRecording())
    room.mute()
    expect(room.host.result.current.minutesDraft).toContain(script)
    expect(room.teammate.result.current.minutesDraft).toContain(script)
    expect(room.getStored().transcript).toContain(script)
  })

  it('중지 요청보다 나중에 저장된 final을 늦은 중지 응답이 덮지 않는다', async () => {
    const room = await twoParticipants()
    let respond!: (minutes: VoiceMeetingMinutes) => void
    vi.mocked(updateSquadVoiceMinutes).mockReturnValueOnce(new Promise(resolve => { respond = resolve }))
    let stopping!: Promise<void>
    act(() => { stopping = room.host.result.current.toggleMinutesRecording() })
    await room.emit(script, true)
    await act(async () => { respond({ channelId: 11, recording: false, transcript: '' }); await stopping })
    expect(room.host.result.current.minutesDraft).toContain(script)
    expect(room.teammate.result.current.minutesDraft).toContain(script)
    expect(room.getStored().transcript).toContain(script)
  })

  it('final도 end도 오지 않는 브라우저에서는 마지막 임시 문장을 보존한다', async () => {
    const room = await twoParticipants()
    await room.emit(script)
    room.recognition.stop.mockImplementation(() => {})
    await act(() => room.host.result.current.toggleMinutesRecording())
    expect(room.host.result.current.minutesInterimTranscript).toContain(script)
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledExactlyOnceWith(11, script)
    expect(room.getStored().transcript).toContain(script)
  })

  it('확정 전 팀원 문장으로 즉시 요약하되 원문에는 임시 문장을 저장하지 않는다', async () => {
    const room = await twoParticipants()
    await room.emit(script)
    await act(() => room.host.result.current.generateMinutesSummary())
    expect(createSquadVoiceMinutesSummary).toHaveBeenCalledExactlyOnceWith(11, `[오전 9:05] 팀원: ${script}`)
    expect(room.getStored().transcript).toBe('')
    expect(appendSquadVoiceMinutesTranscriptLine).not.toHaveBeenCalled()
    expect(room.host.result.current.minutesInterimTranscript).toContain(script)
    await room.emit('확정된 시연 대본', true)
    expect(room.getStored().transcript).toBe('[오전 9:05] 팀원: 확정된 시연 대본')
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledTimes(1)
  })

  it('늦은 요약 응답이 그 사이 확정된 원문과 새 임시 문장을 지우지 않는다', async () => {
    const room = await twoParticipants()
    await room.emit(script)
    let respond!: (response: Awaited<ReturnType<typeof createSquadVoiceMinutesSummary>>) => void
    vi.mocked(createSquadVoiceMinutesSummary).mockReturnValueOnce(new Promise(resolve => { respond = resolve }))
    let summarizing!: Promise<void>
    act(() => { summarizing = room.host.result.current.generateMinutesSummary() })
    await room.emit(script, true)
    await room.emit('계속되는 다음 발화')
    await act(async () => {
      respond({ minutes: { channelId: 11, recording: true, transcript: '', summary: '요약 결과' }, actionItems: [] })
      await summarizing
    })
    expect(room.host.result.current.minutesDraft).toContain(script)
    expect(room.host.result.current.minutesInterimTranscript).toContain('계속되는 다음 발화')
    expect(room.host.result.current.voiceMinutes?.summary).toBe('요약 결과')
  })

  it('저장 응답 대기 중에도 상대 화면에서 문장을 요약하고 이미 저장된 줄은 중복하지 않는다', async () => {
    const room = await twoParticipants()
    let respond!: (minutes: VoiceMeetingMinutes) => void
    vi.mocked(appendSquadVoiceMinutesTranscriptLine).mockReturnValueOnce(new Promise(resolve => { respond = resolve }))
    await room.emit(script, true)
    expect(room.host.result.current.minutesInterimTranscript).toContain(script)
    const canonical = `[오전 9:05] 팀원: ${script}`
    room.getStored().transcript = canonical
    await act(() => room.host.result.current.toggleMinutesRecording())
    expect(room.teammate.result.current.minutesDraft).toBe(canonical)
    await act(() => room.host.result.current.generateMinutesSummary())
    expect(createSquadVoiceMinutesSummary).toHaveBeenCalledExactlyOnceWith(11, canonical)
    await act(async () => respond({ ...room.getStored() }))
    expect(room.host.result.current.minutesDraft).toBe(canonical)
    expect(room.host.result.current.minutesInterimTranscript).toBe('')
  })

  it('연속 final은 순서대로 저장하고 첫 응답이 두 번째 대기 문장을 지우지 않는다', async () => {
    const room = await twoParticipants()
    const responses: Array<(minutes: VoiceMeetingMinutes) => void> = []
    vi.mocked(appendSquadVoiceMinutesTranscriptLine).mockImplementation(() => new Promise(resolve => { responses.push(resolve) }))
    await room.emit('첫 발화', true)
    await room.emit('다음 발화', true)
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledTimes(1)
    await act(async () => responses[0]({ channelId: 11, recording: true, transcript: '[오전 9:05] 팀원: 첫 발화' }))
    expect(appendSquadVoiceMinutesTranscriptLine).toHaveBeenCalledTimes(2)
    expect(room.teammate.result.current.minutesDraft).toBe('[오전 9:05] 팀원: 첫 발화\n[오전 9:05] 팀원: 다음 발화')
    await act(async () => responses[1]({ channelId: 11, recording: true, transcript: '[오전 9:05] 팀원: 첫 발화\n[오전 9:05] 팀원: 다음 발화' }))
    expect(room.host.result.current.minutesInterimTranscript).toBe('')
    expect(room.host.result.current.minutesDraft).toContain('다음 발화')
  })

  it('확정 저장 뒤 도착한 오래된 주기 조회 응답을 무시한다', async () => {
    const room = await twoParticipants()
    const responses: Array<(minutes: VoiceMeetingMinutes) => void> = []
    vi.mocked(fetchSquadVoiceMinutes).mockImplementation(() => new Promise(resolve => { responses.push(resolve) }))
    await act(() => vi.advanceTimersByTimeAsync(4000))
    await room.emit(script, true)
    await act(async () => {
      for (const respond of responses) respond({ channelId: 11, recording: true, transcript: '' })
    })
    expect(room.host.result.current.minutesDraft).toContain(script)
    expect(room.teammate.result.current.minutesDraft).toContain(script)
  })
})
