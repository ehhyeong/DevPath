import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { showAuthToast } from '../../../lib/auth-toast'
import { getUserMediaWithTimeout } from './meeting-support'
import { useMeetingMediaTracks } from './useMeetingMediaTracks'

vi.mock('../../../lib/auth-toast', () => ({ showAuthToast: vi.fn() }))
vi.mock('./meeting-support', async (importOriginal) => ({
  ...await importOriginal<typeof import('./meeting-support')>(),
  getUserMediaWithTimeout: vi.fn(),
}))

function createProps(isJoined = false) {
  const track = { stop: vi.fn(), onended: null } as unknown as MediaStreamTrack
  const stream = { getVideoTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream
  const camera = { sender: { setStreams: vi.fn(), replaceTrack: vi.fn().mockResolvedValue(undefined) } }
  const props = {
    workspaceId: 42, activeChannel: null, isJoined,
    localCameraStreamRef: { current: null as MediaStream | null },
    localScreenShareStreamRef: { current: null as MediaStream | null },
    peerTransceiversRef: { current: new Map([[79, { camera }]]) } as unknown as Parameters<typeof useMeetingMediaTracks>[0]['peerTransceiversRef'],
    setLocalCameraStream: vi.fn(), setLocalScreenShareStream: vi.fn(),
    ensurePeerConnections: vi.fn(), broadcastCameraState: vi.fn(), broadcastScreenShareState: vi.fn(),
  }
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } })
  vi.mocked(getUserMediaWithTimeout).mockResolvedValue(stream)
  return { props, stream, track, camera }
}

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })

describe('회의 카메라', () => {
  it('입장 전에는 카메라 미리보기만 켜고 상대에게 전송하지 않는다', async () => {
    const { props, stream, camera } = createProps()
    const { result } = renderHook(() => useMeetingMediaTracks(props))
    await act(() => result.current.toggleCamera())
    expect(getUserMediaWithTimeout).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.any(Object) }))
    expect(props.localCameraStreamRef.current).toBe(stream)
    expect(props.setLocalCameraStream).toHaveBeenCalledWith(stream)
    expect(props.broadcastCameraState).not.toHaveBeenCalled()
    expect(camera.sender.replaceTrack).not.toHaveBeenCalled()
  })

  it('대기실에서 끄면 카메라 트랙을 해제한다', async () => {
    const { props, track, camera } = createProps()
    const { result } = renderHook(() => useMeetingMediaTracks(props))
    await act(() => result.current.toggleCamera())
    await act(() => result.current.toggleCamera())
    expect(track.stop).toHaveBeenCalledOnce()
    expect(props.localCameraStreamRef.current).toBeNull()
    expect(camera.sender.replaceTrack).not.toHaveBeenCalled()
    expect(props.broadcastCameraState).not.toHaveBeenCalled()
  })

  it('입장 후에는 영상 트랙과 켜짐 신호를 상대에게 전달한다', async () => {
    const { props, stream, track, camera } = createProps(true)
    const { result } = renderHook(() => useMeetingMediaTracks(props))
    await act(() => result.current.toggleCamera())
    expect(props.ensurePeerConnections).toHaveBeenCalledOnce()
    expect(props.broadcastCameraState).toHaveBeenCalledWith('camera-start')
    expect(camera.sender.setStreams).toHaveBeenCalledWith(stream)
    expect(camera.sender.replaceTrack).toHaveBeenCalledWith(track)
    await act(() => result.current.toggleCamera())
    expect(props.broadcastCameraState).toHaveBeenCalledWith('camera-stop')
    expect(camera.sender.replaceTrack).toHaveBeenLastCalledWith(null)
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it('대기실에서 켠 카메라가 입장 후 종료되면 상대에게 종료 신호를 보낸다', async () => {
    const { props, track, camera } = createProps()
    const { result, rerender } = renderHook((isJoined) => useMeetingMediaTracks({ ...props, isJoined }), { initialProps: false })
    await act(() => result.current.toggleCamera())
    rerender(true)
    await act(async () => { track.onended?.call(track, new Event('ended')) })
    expect(props.broadcastCameraState).toHaveBeenCalledWith('camera-stop')
    expect(camera.sender.replaceTrack).toHaveBeenCalledWith(null)
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it.each([
    ['NotAllowedError', '카메라 권한이 차단되었습니다. 브라우저의 사이트 설정에서 카메라 접근을 허용해 주세요.'],
    ['NotFoundError', '연결된 카메라를 찾지 못했습니다. 장치 연결을 확인해 주세요.'],
    ['NotReadableError', '카메라를 사용할 수 없습니다. 다른 앱의 카메라 사용을 종료한 뒤 다시 시도해 주세요.'],
  ])('%s 오류를 한국어로 안내하고 켜짐 상태를 만들지 않는다', async (name, message) => {
    const { props } = createProps()
    vi.mocked(getUserMediaWithTimeout).mockRejectedValue(new DOMException('camera error', name))
    const { result } = renderHook(() => useMeetingMediaTracks(props))
    await act(() => result.current.toggleCamera())
    expect(props.localCameraStreamRef.current).toBeNull()
    expect(showAuthToast).toHaveBeenCalledWith(expect.objectContaining({ message }))
    expect(props.broadcastCameraState).not.toHaveBeenCalled()
  })
})
