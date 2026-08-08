import { useCallback, useEffect, useRef } from 'react'
import { buildVoiceSignalingUrl, type VoicePeerTransceivers } from './meeting-support'
import type { VoiceConnectionStatus } from './meeting-types'

type VoiceTransportOptions = {
  onMessage: (message: string) => Promise<void>
  onPeersClosed: () => void
  onStatusChange: (status: VoiceConnectionStatus) => void
  onError: (message: string | null) => void
}

export function useVoiceTransport(options: VoiceTransportOptions) {
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const signalingSocketRef = useRef<WebSocket | null>(null)
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map())
  const peerTransceiversRef = useRef<Map<number, VoicePeerTransceivers>>(new Map())
  const makingOffersRef = useRef<Set<number>>(new Set())
  const departedPeerIdsRef = useRef<Set<number>>(new Set())
  const pendingIceCandidatesRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map())

  const closeSignalingSocket = useCallback(() => {
    const socket = signalingSocketRef.current
    signalingSocketRef.current = null
    if (!socket) return

    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'leave' }))
      socket.close(1000, 'leave')
    } else if (socket.readyState === WebSocket.CONNECTING) {
      socket.close()
    }
  }, [])

  const closePeerConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((connection) => {
      connection.ontrack = null
      connection.onicecandidate = null
      connection.onconnectionstatechange = null
      connection.onsignalingstatechange = null
      connection.close()
    })
    peerConnectionsRef.current.clear()
    peerTransceiversRef.current.clear()
    pendingIceCandidatesRef.current.clear()
    makingOffersRef.current.clear()
    departedPeerIdsRef.current.clear()
    optionsRef.current.onPeersClosed()
  }, [])

  const send = useCallback((message: object) => {
    const socket = signalingSocketRef.current
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }, [])

  const connect = useCallback((channelId: number, accessToken: string | null | undefined) => {
    if (!accessToken) {
      optionsRef.current.onStatusChange('error')
      optionsRef.current.onError('로그인 세션이 없어 음성 시그널링에 연결할 수 없습니다.')
      return
    }

    closeSignalingSocket()
    closePeerConnections()
    optionsRef.current.onStatusChange('connecting')
    optionsRef.current.onError(null)

    const socket = new WebSocket(buildVoiceSignalingUrl(channelId, accessToken))
    signalingSocketRef.current = socket
    socket.onopen = () => {
      if (signalingSocketRef.current === socket) optionsRef.current.onStatusChange('connected')
    }
    socket.onmessage = (event) => {
      void optionsRef.current.onMessage(String(event.data)).catch(() => {
        optionsRef.current.onStatusChange('error')
        optionsRef.current.onError('음성 회의 연결 정보를 처리하지 못했습니다.')
      })
    }
    socket.onerror = () => {
      if (signalingSocketRef.current === socket) {
        optionsRef.current.onStatusChange('error')
        optionsRef.current.onError('음성 시그널링 서버에 연결하지 못했습니다.')
      }
    }
    socket.onclose = () => {
      if (signalingSocketRef.current === socket) {
        signalingSocketRef.current = null
        closePeerConnections()
        optionsRef.current.onStatusChange('idle')
      }
    }
  }, [closePeerConnections, closeSignalingSocket])

  return {
    signalingSocketRef,
    peerConnectionsRef,
    peerTransceiversRef,
    makingOffersRef,
    departedPeerIdsRef,
    pendingIceCandidatesRef,
    closeSignalingSocket,
    closePeerConnections,
    connect,
    send,
  }
}
