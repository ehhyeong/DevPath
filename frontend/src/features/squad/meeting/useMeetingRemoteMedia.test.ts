import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CameraView } from './meeting-types'
import { useMeetingRemoteMedia } from './useMeetingRemoteMedia'

function camera() {
  const track = { kind: 'video', onended: null, onunmute: null } as unknown as MediaStreamTrack
  const stream = { getVideoTracks: () => [track] } as unknown as MediaStream
  return {
    track, stream,
    end: () => track.onended?.call(track, new Event('ended')),
    unmute: () => track.onunmute?.call(track, new Event('unmute')),
  }
}

function room() {
  let visible = new Map<number, CameraView>()
  const props: Parameters<typeof useMeetingRemoteMedia>[0] = {
    audioControls: { stopRemoteAudio: vi.fn(), detachRemoteAudio: vi.fn() } as unknown as Parameters<typeof useMeetingRemoteMedia>[0]['audioControls'],
    members: [], participants: [], activeParticipants: [],
    remoteAudioElementsRef: { current: new Map() }, remoteAudioMutedRef: { current: false },
    remoteAudioContainerRef: { current: null }, remoteCameraStreamsRef: { current: new Map() },
    remoteCameraPendingRef: { current: new Set([8]) }, remoteScreenShareViewsRef: { current: new Map() },
    remoteScreenSharePendingRef: { current: new Set() }, peerConnectionsRef: { current: new Map() },
    peerTransceiversRef: { current: new Map() }, makingOffersRef: { current: new Set() },
    pendingIceCandidatesRef: { current: new Map() },
    setRemoteCameraStreams: update => { visible = typeof update === 'function' ? update(visible) : update },
    setRemoteScreenShares: vi.fn(), applySelectedOutputToAudio: vi.fn(async () => {}),
  }
  const { result } = renderHook(() => useMeetingRemoteMedia(props))
  const media = result.current
  return {
    props, media, visible: () => visible,
    attach: (source: ReturnType<typeof camera>) => media.attachRemoteTrack(8, '팀원', source.stream, source.track, 1),
  }
}

afterEach(() => vi.restoreAllMocks())

describe('원격 카메라 트랙 수명', () => {
  it('교체된 이전 트랙의 종료가 현재 카메라를 지우지 않는다', () => {
    const session = room()
    const old = camera(), current = camera()
    session.attach(old)
    session.attach(current)
    old.end()
    expect(session.visible().get(8)?.stream).toBe(current.stream)
    expect(session.props.remoteCameraStreamsRef.current.get(8)?.stream).toBe(current.stream)
    expect(session.props.remoteCameraPendingRef.current.has(8)).toBe(true)
  })

  it('교체된 이전 트랙의 unmute가 옛 영상을 다시 표시하지 않는다', () => {
    const session = room()
    const old = camera(), current = camera()
    session.attach(old)
    session.attach(current)
    old.unmute()
    expect(session.visible().get(8)?.stream).toBe(current.stream)
  })

  it('수신 트랙이 끝나도 켜짐 의도를 유지하고 새 트랙이 오면 복구한다', () => {
    const session = room()
    const old = camera(), current = camera()
    session.attach(old)
    old.end()
    expect(session.visible().has(8)).toBe(false)
    session.attach(current)
    expect(session.visible().get(8)?.stream).toBe(current.stream)
  })

  it('명시적인 카메라 끄기 뒤에는 unmute나 새 트랙으로 켜지지 않는다', () => {
    const session = room()
    const old = camera(), current = camera()
    session.attach(old)
    session.media.clearRemoteCameraStream(8)
    old.unmute()
    session.attach(current)
    expect(session.visible().has(8)).toBe(false)
    expect(session.props.remoteCameraPendingRef.current.has(8)).toBe(false)
  })

  it('퇴장한 피어의 이전 트랙 이벤트가 재입장한 영상을 지우지 않는다', () => {
    const session = room()
    const old = camera(), current = camera()
    session.attach(old)
    session.media.removeRemotePeer(8)
    session.props.remoteCameraPendingRef.current.add(8)
    session.attach(current)
    old.end()
    old.unmute()
    expect(session.visible().get(8)?.stream).toBe(current.stream)
  })
})
