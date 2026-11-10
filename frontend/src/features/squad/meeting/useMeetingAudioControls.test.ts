import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createVolumeControlledStream } from './meeting-media'
import { useMeetingAudioControls } from './useMeetingAudioControls'
import type { SinkAudioElement } from './meeting-types'

vi.mock('./meeting-media', () => ({ createVolumeControlledStream: vi.fn() }))

function playback() {
  const stream = {} as MediaStream
  const processing = { stream: {} as MediaStream, setVolume: vi.fn(), stop: vi.fn(), resume: vi.fn().mockResolvedValue(undefined) }
  vi.mocked(createVolumeControlledStream).mockReturnValue(processing)
  const audio = { play: vi.fn().mockResolvedValue(undefined), volume: 1, muted: false } as unknown as SinkAudioElement
  return { stream, processing, audio }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

describe('회의 개인 음량', () => {
  it('전체·개인 음량을 곱해 100% 이상 증폭하고 다른 참가자는 독립적으로 유지한다', () => {
    const { result } = renderHook(() => useMeetingAudioControls(7, { current: false }))
    const first = playback()
    act(() => result.current.attachRemoteAudio(8, first.stream, first.audio))
    const second = playback()
    act(() => result.current.attachRemoteAudio(9, second.stream, second.audio))
    act(() => result.current.setOutputVolume(150))
    act(() => result.current.setParticipantAudio(8, { volume: 200, muted: false }))
    expect(first.processing.setVolume).toHaveBeenLastCalledWith(300)
    expect(second.processing.setVolume).toHaveBeenLastCalledWith(150)
    expect(first.audio.srcObject).toBe(first.processing.stream)
    expect(first.audio.volume).toBe(1)
  })

  it('전체 듣기를 다시 켜도 개인 음소거는 유지하고 개인 해제도 전체 음소거를 풀지 않는다', () => {
    const globalMute = { current: false }
    const { result } = renderHook(() => useMeetingAudioControls(7, globalMute))
    const { stream, processing, audio } = playback()
    act(() => result.current.attachRemoteAudio(8, stream, audio))
    act(() => result.current.setParticipantAudio(8, { volume: 160, muted: true }))
    globalMute.current = true
    act(() => result.current.resumeRemoteAudio())
    act(() => result.current.setParticipantAudio(8, { volume: 160, muted: false }))
    expect(audio.muted).toBe(true)
    globalMute.current = false
    act(() => result.current.setParticipantAudio(8, { volume: 160, muted: true }))
    act(() => result.current.resumeRemoteAudio())
    expect(audio.muted).toBe(true)
    act(() => result.current.setParticipantAudio(8, { volume: 160, muted: false }))
    expect(audio.muted).toBe(false)
    expect(processing.setVolume).toHaveBeenLastCalledWith(160)
  })

  it('퇴장·재접속·새로고침에서 값은 보존하고 오디오 그래프는 정리한다', () => {
    const first = playback()
    const view = renderHook(({ userId }) => useMeetingAudioControls(userId, { current: false }), { initialProps: { userId: 7 } })
    act(() => view.result.current.setMicrophoneVolume(175))
    act(() => view.result.current.setOutputVolume(125))
    act(() => view.result.current.setNoiseGateEnabled(true))
    act(() => view.result.current.setParticipantAudio(8, { volume: 180, muted: true }))
    act(() => view.result.current.attachRemoteAudio(8, first.stream, first.audio))
    act(() => view.result.current.detachRemoteAudio(8))
    expect(first.processing.stop).toHaveBeenCalledOnce()
    const second = playback()
    act(() => view.result.current.attachRemoteAudio(8, second.stream, second.audio))
    expect(second.audio.muted).toBe(true)
    expect(second.processing.setVolume).toHaveBeenLastCalledWith(225)
    view.rerender({ userId: 9 })
    expect(view.result.current.microphoneVolume).toBe(100)
    expect(second.audio.muted).toBe(false)
    view.rerender({ userId: 7 })
    expect(view.result.current.microphoneVolume).toBe(175)
    view.unmount()
    expect(second.processing.stop).toHaveBeenCalledOnce()
    const reopened = renderHook(() => useMeetingAudioControls(7, { current: false }))
    expect(reopened.result.current.getParticipantAudio(8)).toEqual({ volume: 180, muted: true })
    expect(reopened.result.current.outputVolume).toBe(125)
    expect(reopened.result.current.noiseGateEnabled).toBe(true)
  })

  it('잘못 저장된 값과 조절 범위를 정규화하고 Web Audio 실패 시 원본 소리를 유지한다', () => {
    localStorage.setItem('devpath.meeting.audio.7', '{broken')
    const { result } = renderHook(() => useMeetingAudioControls(7, { current: false }))
    expect(result.current.microphoneVolume).toBe(100)
    act(() => result.current.setMicrophoneVolume(500))
    expect(result.current.microphoneVolume).toBe(200)
    act(() => result.current.setOutputVolume(-10))
    expect(result.current.outputVolume).toBe(0)
    const { stream, audio } = playback()
    vi.mocked(createVolumeControlledStream).mockImplementation(() => { throw new Error('unsupported') })
    act(() => result.current.setOutputVolume(50))
    act(() => result.current.attachRemoteAudio(8, stream, audio))
    expect(audio.srcObject).toBe(stream)
    expect(audio.volume).toBe(0.5)
  })
})
