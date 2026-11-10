import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMeetingVoiceInput } from './useMeetingVoiceInput'
import { getUserMediaWithTimeout } from './meeting-support'
import { createNoiseGatedVoiceStream } from './meeting-media'

vi.mock('./meeting-support', async (original) => ({ ...await original<typeof import('./meeting-support')>(), getUserMediaWithTimeout: vi.fn() }))
vi.mock('./meeting-media', () => ({
  applyAudioProcessingConstraints: vi.fn().mockResolvedValue(undefined),
  createNoiseGatedVoiceStream: vi.fn(),
  createVoiceActivityMonitor: vi.fn(() => vi.fn()),
  getAudioConstraints: () => ({ audio: true }),
  readAudioProcessingStatus: () => ({ echoCancellation: true, noiseSuppression: true, autoGainControl: true, noiseGate: false }),
}))

function stream() {
  const track = { enabled: true, stop: vi.fn() } as unknown as MediaStreamTrack
  return { track, stream: { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream }
}
function props(): Parameters<typeof useMeetingVoiceInput>[0] {
  return {
    microphoneVolume: 100, noiseGateEnabled: false, selectedInputId: 'default', micMuted: false, currentUserId: 7,
    localVoiceStreamRef: { current: null }, localVoiceRawStreamRef: { current: null }, voiceNoiseGateStopRef: { current: null }, voiceActivityStopRef: { current: null }, localSpeakingRef: { current: false }, peerTransceiversRef: { current: new Map() },
    setLocalSpeaking: vi.fn(), setParticipants: vi.fn(), setAudioProcessingStatus: vi.fn(), setAudioDeviceError: vi.fn(), setWaitingMicMuted: vi.fn(), stopMinutesSpeechRecognition: vi.fn(), createVoiceEvent: vi.fn().mockResolvedValue(undefined), broadcastSpeakingState: vi.fn(),
  }
}
function processing() {
  return { ...stream(), setVolume: vi.fn(), setNoiseGateEnabled: vi.fn(), stop: vi.fn(), resume: vi.fn().mockResolvedValue(undefined) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } })
})
afterEach(() => vi.unstubAllGlobals())

describe('회의 마이크 음량과 장치 전환', () => {
  it('입력 음량과 게이트는 장치를 다시 열지 않고 즉시 바뀌며 전환 후에도 적용된다', async () => {
    const initial = props()
    const raw = stream()
    const first = processing()
    vi.mocked(getUserMediaWithTimeout).mockResolvedValue(raw.stream)
    vi.mocked(createNoiseGatedVoiceStream).mockReturnValue(first)
    const { result, rerender } = renderHook((input) => useMeetingVoiceInput(input), { initialProps: initial })
    await act(() => result.current.startLocalVoiceStreamIfAvailable(false))
    rerender({ ...initial, microphoneVolume: 175, noiseGateEnabled: true, micMuted: true })
    expect(first.setVolume).toHaveBeenLastCalledWith(175)
    expect(first.setNoiseGateEnabled).toHaveBeenLastCalledWith(true)
    expect(getUserMediaWithTimeout).toHaveBeenCalledOnce()
    const secondRaw = stream()
    const second = processing()
    vi.mocked(getUserMediaWithTimeout).mockResolvedValue(secondRaw.stream)
    vi.mocked(createNoiseGatedVoiceStream).mockReturnValue(second)
    await act(() => result.current.replaceLocalVoiceInput())
    expect(createNoiseGatedVoiceStream).toHaveBeenLastCalledWith(secondRaw.stream, 175, true)
    expect(second.track.enabled).toBe(false)
    expect(initial.localVoiceStreamRef.current).toBe(second.stream)
    expect(first.stop).toHaveBeenCalledOnce()
    expect(raw.track.stop).toHaveBeenCalledOnce()
    act(() => result.current.stopLocalVoiceStream())
    expect(second.stop).toHaveBeenCalledOnce()
    expect(secondRaw.track.stop).toHaveBeenCalledOnce()
  })

  it('새 트랙 교체 실패 시 기존 마이크·음량을 유지하고 실패한 장치만 정리한다', async () => {
    const initial = props()
    const raw = stream()
    const first = processing()
    vi.mocked(getUserMediaWithTimeout).mockResolvedValue(raw.stream)
    vi.mocked(createNoiseGatedVoiceStream).mockReturnValue(first)
    const { result, rerender } = renderHook((input) => useMeetingVoiceInput(input), { initialProps: initial })
    await act(() => result.current.startLocalVoiceStreamIfAvailable(false))
    const sender = { setStreams: vi.fn(), replaceTrack: vi.fn().mockRejectedValueOnce(new Error('replace failed')).mockResolvedValue(undefined) }
    initial.peerTransceiversRef.current.set(8, { microphone: { sender } } as unknown as NonNullable<ReturnType<typeof initial.peerTransceiversRef.current.get>>)
    const nextRaw = stream()
    const next = processing()
    vi.mocked(getUserMediaWithTimeout).mockResolvedValue(nextRaw.stream)
    vi.mocked(createNoiseGatedVoiceStream).mockReturnValue(next)
    await act(async () => { await expect(result.current.replaceLocalVoiceInput()).rejects.toThrow('replace failed') })
    expect(sender.replaceTrack).toHaveBeenLastCalledWith(first.track)
    expect(initial.localVoiceStreamRef.current).toBe(first.stream)
    expect(first.stop).not.toHaveBeenCalled()
    expect(raw.track.stop).not.toHaveBeenCalled()
    expect(next.stop).toHaveBeenCalledOnce()
    expect(nextRaw.track.stop).toHaveBeenCalledOnce()
    rerender({ ...initial, microphoneVolume: 180 })
    expect(first.setVolume).toHaveBeenLastCalledWith(180)
    act(() => result.current.stopLocalVoiceStream())
  })
})
