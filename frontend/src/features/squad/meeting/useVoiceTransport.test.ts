import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useVoiceTransport } from './useVoiceTransport'

class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  readyState = FakeWebSocket.OPEN
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  send = vi.fn()
  close = vi.fn()
}

describe('voice transport cleanup', () => {
  it('퇴장 시 leave 신호를 보내고 소켓 이벤트를 해제한다', () => {
    const originalWebSocket = globalThis.WebSocket
    Object.assign(FakeWebSocket, { OPEN: 1, CONNECTING: 0 })
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
    const onPeersClosed = vi.fn()
    const { result } = renderHook(() => useVoiceTransport({
      onMessage: vi.fn(async () => undefined),
      onPeersClosed,
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    }))

    act(() => result.current.connect(11, 'token'))
    const socket = result.current.signalingSocketRef.current as unknown as FakeWebSocket
    act(() => result.current.closeSignalingSocket())

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'leave' }))
    expect(socket.close).toHaveBeenCalledWith(1000, 'leave')
    expect(socket.onopen).toBeNull()
    expect(socket.onmessage).toBeNull()
    expect(result.current.signalingSocketRef.current).toBeNull()
    expect(onPeersClosed).toHaveBeenCalledOnce()
    globalThis.WebSocket = originalWebSocket
  })

  it('피어 연결과 협상 상태를 모두 정리한다', () => {
    const onPeersClosed = vi.fn()
    const { result } = renderHook(() => useVoiceTransport({
      onMessage: vi.fn(async () => undefined),
      onPeersClosed,
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    }))
    const connection = {
      ontrack: vi.fn(),
      onicecandidate: vi.fn(),
      onconnectionstatechange: vi.fn(),
      onsignalingstatechange: vi.fn(),
      close: vi.fn(),
    } as unknown as RTCPeerConnection
    result.current.peerConnectionsRef.current.set(7, connection)
    result.current.pendingIceCandidatesRef.current.set(7, [{ candidate: 'candidate' }])
    result.current.makingOffersRef.current.add(7)
    result.current.departedPeerIdsRef.current.add(7)

    act(() => result.current.closePeerConnections())

    expect(connection.close).toHaveBeenCalledOnce()
    expect(result.current.peerConnectionsRef.current.size).toBe(0)
    expect(result.current.pendingIceCandidatesRef.current.size).toBe(0)
    expect(result.current.makingOffersRef.current.size).toBe(0)
    expect(result.current.departedPeerIdsRef.current.size).toBe(0)
    expect(onPeersClosed).toHaveBeenCalledOnce()
  })
})
