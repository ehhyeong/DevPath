import { useCallback,useEffect,useMemo,useRef,useState } from 'react'
import { navigateTo as navigateSpa } from '../../../lib/spa-navigation'
import { readStoredAuthSession } from '../../../lib/auth-session'
import { getVoiceIceServers } from '../../../lib/voice-webrtc'
import { avatarUrl,buildHref,buildVoiceSignalingUrl,type LivePeer,type LivePeerTransceivers,type LiveSignalMessage } from './instructor-workspace-support'
import type { WorkspaceData } from './instructor-workspace-types'



export function StreamVideo({ stream, className, muted = false }: { stream: MediaStream | null; className: string; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return <video ref={videoRef} className={className} autoPlay playsInline muted={muted} />
}

export function LiveMeetingPage({ data, workspaceId }: { data: WorkspaceData; workspaceId: number | null }) {
  const session = useMemo(() => readStoredAuthSession(), [])
  const participantMode = window.location.pathname === '/mentoring-live-meeting'
  const channelId = data.voiceChannels[0]?.channelId ?? null
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [remotePeers, setRemotePeers] = useState<LivePeer[]>([])
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [connected, setConnected] = useState(false)
  const [recording, setRecording] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; content: string; own?: boolean }>>([])
  const [sideTab, setSideTab] = useState<'chat' | 'users'>('chat')
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map())
  const peerTransceiversRef = useRef<Map<number, LivePeerTransceivers>>(new Map())
  const pendingIceCandidatesRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map())
  const makingOffersRef = useRef<Set<number>>(new Set())
  const departedPeerIdsRef = useRef<Set<number>>(new Set())
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const members = data.dashboard?.members ?? []
  const participantCount = remotePeers.length + 1
  const startupError = !channelId || !session?.accessToken
    ? '로그인 세션이나 워크스페이스 정보가 없어 라이브 룸을 열 수 없습니다.'
    : !navigator.mediaDevices?.getUserMedia
      ? '현재 브라우저에서 카메라와 마이크를 사용할 수 없습니다.'
      : null
  const visibleError = startupError ?? error

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop())
  }, [])

  const closePeerConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((connection) => connection.close())
    peerConnectionsRef.current.clear()
    peerTransceiversRef.current.clear()
    pendingIceCandidatesRef.current.clear()
    makingOffersRef.current.clear()
    departedPeerIdsRef.current.clear()
    setRemotePeers([])
  }, [])

  const sendSignalingMessage = useCallback((type: 'offer' | 'answer' | 'ice-candidate', targetUserId: number, payload: RTCSessionDescriptionInit | RTCIceCandidateInit) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type, targetUserId, payload }))
  }, [])

  const broadcastRoomEvent = useCallback((type: 'camera-start' | 'screen-share-start' | 'screen-share-stop', payload: Record<string, unknown> = {}) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type, payload }))
  }, [])

  const updateRemotePeer = useCallback((
    userId: number,
    userName: string,
    update: (peer: LivePeer) => LivePeer,
  ) => {
    setRemotePeers((current) => {
      if (departedPeerIdsRef.current.has(userId)) return current
      const existing = current.find((peer) => peer.userId === userId)
      if (existing) {
        return current.map((peer) => peer.userId === userId ? update({ ...peer, userName }) : peer)
      }
      return [...current, update({
        userId,
        userName,
        cameraStream: null,
        screenStream: null,
        screenSharing: false,
      })]
    })
  }, [])

  const attachRemoteCameraTrack = useCallback((userId: number, userName: string, track: MediaStreamTrack) => {
    updateRemotePeer(userId, userName, (peer) => {
      const stream = peer.cameraStream ?? new MediaStream()
      if (!stream.getTracks().some((currentTrack) => currentTrack.id === track.id)) {
        stream.addTrack(track)
      }
      return { ...peer, cameraStream: stream }
    })
  }, [updateRemotePeer])

  const attachRemoteScreenTrack = useCallback((userId: number, userName: string, track: MediaStreamTrack) => {
    const stream = new MediaStream([track])
    updateRemotePeer(userId, userName, (peer) => ({ ...peer, screenStream: stream }))
    track.addEventListener('ended', () => {
      updateRemotePeer(userId, userName, (peer) => ({ ...peer, screenStream: null, screenSharing: false }))
    })
  }, [updateRemotePeer])

  const getOrCreatePeerConnection = useCallback((peer: { userId: number; userName: string }) => {
    const existing = peerConnectionsRef.current.get(peer.userId)
    if (existing) return existing

    const peerConnection = new RTCPeerConnection({ iceServers: getVoiceIceServers() })
    const currentLocalStream = localStreamRef.current
    const currentScreenStream = screenStreamRef.current
    const currentMicrophoneTrack = currentLocalStream?.getAudioTracks()[0] ?? null
    const currentCameraTrack = currentLocalStream?.getVideoTracks()[0] ?? null
    const currentScreenTrack = currentScreenStream?.getVideoTracks()[0] ?? null

    if (session?.userId && session.userId < peer.userId) {
      const microphoneTransceiver = peerConnection.addTransceiver(currentMicrophoneTrack ?? 'audio', {
        direction: 'sendrecv',
        ...(currentLocalStream ? { streams: [currentLocalStream] } : {}),
      })
      const cameraTransceiver = peerConnection.addTransceiver(currentCameraTrack ?? 'video', {
        direction: 'sendrecv',
        ...(currentLocalStream ? { streams: [currentLocalStream] } : {}),
      })
      const screenTransceiver = peerConnection.addTransceiver(currentScreenTrack ?? 'video', {
        direction: 'sendrecv',
        ...(currentScreenStream ? { streams: [currentScreenStream] } : {}),
      })
      peerTransceiversRef.current.set(peer.userId, {
        microphone: microphoneTransceiver,
        camera: cameraTransceiver,
        screen: screenTransceiver,
      })
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage('ice-candidate', peer.userId, event.candidate.toJSON())
      }
    }
    peerConnection.ontrack = (event) => {
      const transceiverIndex = peerConnection.getTransceivers().indexOf(event.transceiver)
      if (transceiverIndex === 2) {
        attachRemoteScreenTrack(peer.userId, peer.userName, event.track)
        return
      }
      attachRemoteCameraTrack(peer.userId, peer.userName, event.track)
    }
    peerConnection.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peerConnection.connectionState)) {
        peerConnectionsRef.current.delete(peer.userId)
        peerTransceiversRef.current.delete(peer.userId)
        pendingIceCandidatesRef.current.delete(peer.userId)
        setRemotePeers((current) => current.filter((item) => item.userId !== peer.userId))
      }
    }

    peerConnectionsRef.current.set(peer.userId, peerConnection)
    return peerConnection
  }, [attachRemoteCameraTrack, attachRemoteScreenTrack, sendSignalingMessage, session?.userId])

  const bindLocalTracksToRemoteOffer = useCallback(async (userId: number, peerConnection: RTCPeerConnection) => {
    const [microphone, camera, screen] = peerConnection.getTransceivers()
    if (!microphone || !camera || !screen) {
      throw new Error('라이브 미팅의 미디어 채널 구성이 올바르지 않습니다.')
    }

    const currentLocalStream = localStreamRef.current
    const currentScreenStream = screenStreamRef.current
    microphone.direction = 'sendrecv'
    camera.direction = 'sendrecv'
    screen.direction = 'sendrecv'
    if (currentLocalStream) {
      microphone.sender.setStreams(currentLocalStream)
      camera.sender.setStreams(currentLocalStream)
    }
    if (currentScreenStream) {
      screen.sender.setStreams(currentScreenStream)
    }
    await Promise.all([
      microphone.sender.replaceTrack(currentLocalStream?.getAudioTracks()[0] ?? null),
      camera.sender.replaceTrack(currentLocalStream?.getVideoTracks()[0] ?? null),
      screen.sender.replaceTrack(currentScreenStream?.getVideoTracks()[0] ?? null),
    ])
    peerTransceiversRef.current.set(userId, { microphone, camera, screen })
  }, [])

  const startOffer = useCallback(async (peer: { userId: number; userName: string }) => {
    const peerConnection = getOrCreatePeerConnection(peer)
    if (peerConnection.signalingState !== 'stable') {
      await new Promise<void>((resolve) => {
        const timeoutId = window.setTimeout(finish, 5000)

        function finish() {
          window.clearTimeout(timeoutId)
          peerConnection.removeEventListener('signalingstatechange', handleSignalingStateChange)
          resolve()
        }

        function handleSignalingStateChange() {
          if (peerConnection.signalingState === 'stable' || peerConnection.signalingState === 'closed') {
            finish()
          }
        }

        peerConnection.addEventListener('signalingstatechange', handleSignalingStateChange)
      })
    }
    if (peerConnection.signalingState !== 'stable' || makingOffersRef.current.has(peer.userId)) return

    makingOffersRef.current.add(peer.userId)
    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      if (peerConnection.localDescription) {
        sendSignalingMessage('offer', peer.userId, peerConnection.localDescription.toJSON())
      }
    } finally {
      makingOffersRef.current.delete(peer.userId)
    }
  }, [getOrCreatePeerConnection, sendSignalingMessage])

  const handlePeerAvailable = useCallback(async (peer: { userId: number; userName: string }) => {
    if (!session?.userId || peer.userId === session.userId) return
    updateRemotePeer(peer.userId, peer.userName, (currentPeer) => currentPeer)
    getOrCreatePeerConnection(peer)
    if (screenStreamRef.current) {
      broadcastRoomEvent('screen-share-start')
    }
    if (session.userId < peer.userId) {
      await startOffer(peer)
    }
  }, [broadcastRoomEvent, getOrCreatePeerConnection, session?.userId, startOffer, updateRemotePeer])

  const handleSignalMessage = useCallback(async (rawMessage: string) => {
    const message = JSON.parse(rawMessage) as LiveSignalMessage

    if (message.type === 'peer-list') {
      await Promise.all((message.peers ?? []).map((peer) => {
        departedPeerIdsRef.current.delete(peer.userId)
        return handlePeerAvailable(peer)
      }))
      return
    }
    if (message.type === 'peer-joined' && message.fromUserId && message.fromUserName) {
      departedPeerIdsRef.current.delete(message.fromUserId)
      await handlePeerAvailable({ userId: message.fromUserId, userName: message.fromUserName })
      return
    }
    if (message.type === 'peer-left' && message.fromUserId) {
      departedPeerIdsRef.current.add(message.fromUserId)
      peerConnectionsRef.current.get(message.fromUserId)?.close()
      peerConnectionsRef.current.delete(message.fromUserId)
      peerTransceiversRef.current.delete(message.fromUserId)
      pendingIceCandidatesRef.current.delete(message.fromUserId)
      setRemotePeers((current) => current.filter((peer) => peer.userId !== message.fromUserId))
      return
    }
    if (message.type === 'offer' && message.fromUserId && message.fromUserName && message.payload) {
      if (departedPeerIdsRef.current.has(message.fromUserId)) return
      const peer = { userId: message.fromUserId, userName: message.fromUserName }
      const peerConnection = getOrCreatePeerConnection(peer)
      if (peerConnection.signalingState !== 'stable') {
        await peerConnection.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit).catch(() => undefined)
      }
      await peerConnection.setRemoteDescription(message.payload as RTCSessionDescriptionInit)
      await bindLocalTracksToRemoteOffer(peer.userId, peerConnection)
      const candidates = pendingIceCandidatesRef.current.get(peer.userId) ?? []
      pendingIceCandidatesRef.current.delete(peer.userId)
      await Promise.all(candidates.map((candidate) => peerConnection.addIceCandidate(candidate).catch(() => undefined)))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      if (peerConnection.localDescription) {
        sendSignalingMessage('answer', peer.userId, peerConnection.localDescription.toJSON())
      }
      return
    }
    if (message.type === 'answer' && message.fromUserId && message.fromUserName && message.payload) {
      if (departedPeerIdsRef.current.has(message.fromUserId)) return
      const peerConnection = getOrCreatePeerConnection({ userId: message.fromUserId, userName: message.fromUserName })
      const answer = message.payload as RTCSessionDescriptionInit
      if (peerConnection.signalingState !== 'stable') {
        await peerConnection.setRemoteDescription(answer)
      }
      const candidates = pendingIceCandidatesRef.current.get(message.fromUserId) ?? []
      pendingIceCandidatesRef.current.delete(message.fromUserId)
      await Promise.all(candidates.map((candidate) => peerConnection.addIceCandidate(candidate).catch(() => undefined)))
      return
    }
    if (message.type === 'ice-candidate' && message.fromUserId && message.fromUserName && message.payload) {
      if (departedPeerIdsRef.current.has(message.fromUserId)) return
      const peerConnection = getOrCreatePeerConnection({ userId: message.fromUserId, userName: message.fromUserName })
      const candidate = message.payload as RTCIceCandidateInit
      if (!peerConnection.remoteDescription) {
        const candidates = pendingIceCandidatesRef.current.get(message.fromUserId) ?? []
        candidates.push(candidate)
        pendingIceCandidatesRef.current.set(message.fromUserId, candidates)
        return
      }
      await peerConnection.addIceCandidate(candidate).catch(() => undefined)
      return
    }
    if (message.type === 'camera-start' && message.fromUserId && message.fromUserName) {
      if (session?.userId && session.userId < message.fromUserId) {
        await startOffer({ userId: message.fromUserId, userName: message.fromUserName })
      }
      return
    }
    if ((message.type === 'screen-share-start' || message.type === 'screen-share-stop') && message.fromUserId) {
      updateRemotePeer(message.fromUserId, message.fromUserName ?? '참여자', (peer) => ({
        ...peer,
        screenSharing: message.type === 'screen-share-start',
      }))
      return
    }
    if (message.type === 'error') {
      setError(message.detail ?? '라이브 룸 연결 오류가 발생했습니다.')
    }
  }, [bindLocalTracksToRemoteOffer, getOrCreatePeerConnection, handlePeerAvailable, sendSignalingMessage, session?.userId, startOffer, updateRemotePeer])

  const attachLocalMediaToPeerConnections = useCallback(async (stream: MediaStream) => {
    const microphoneTrack = stream.getAudioTracks()[0] ?? null
    const cameraTrack = stream.getVideoTracks()[0] ?? null

    await Promise.all([...peerTransceiversRef.current.values()].flatMap((transceivers) => {
      transceivers.microphone.sender.setStreams(stream)
      transceivers.camera.sender.setStreams(stream)
      return [
        transceivers.microphone.sender.replaceTrack(microphoneTrack),
        transceivers.camera.sender.replaceTrack(cameraTrack),
      ]
    }))
    broadcastRoomEvent('camera-start')
    const localUserId = session?.userId
    if (localUserId) {
      await Promise.all([...peerConnectionsRef.current.entries()]
        .filter(([userId]) => localUserId < userId)
        .map(([userId]) => startOffer({ userId, userName: '참여자' })))
    }
  }, [broadcastRoomEvent, session?.userId, startOffer])

  useEffect(() => {
    if (!channelId || !session?.accessToken || !navigator.mediaDevices?.getUserMedia) {
      return
    }

    let active = true

    const socket = new WebSocket(buildVoiceSignalingUrl(channelId, session.accessToken))
    socketRef.current = socket
    socket.onopen = () => {
      if (active) setConnected(true)
    }
    socket.onmessage = (event) => {
      void handleSignalMessage(event.data).catch(() => setError('시그널링 메시지를 처리하지 못했습니다.'))
    }
    socket.onerror = () => {
      if (active) setError('시그널링 서버에 연결하지 못했습니다.')
    }
    socket.onclose = (event) => {
      if (!active) return
      setConnected(false)
      setError(`시그널링 연결이 종료되었습니다. 잠시 후 다시 입장해 주세요. (${event.code})`)
      socketRef.current = null
      closePeerConnections()
    }

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(async (stream) => {
        if (!active) {
          stopStream(stream)
          return
        }

        localStreamRef.current = stream
        setLocalStream(stream)
        setMicOn(true)
        setCamOn(true)
        setError(null)
        await attachLocalMediaToPeerConnections(stream)
      })
      .catch(() => {
        if (active) {
          setError('내 카메라 또는 마이크를 열지 못했습니다. 아래 마이크 또는 카메라 버튼을 눌러 다시 시도해 주세요.')
        }
      })

    return () => {
      active = false
      socket.close()
      if (socketRef.current === socket) socketRef.current = null
      closePeerConnections()
      stopStream(localStreamRef.current)
      stopStream(screenStreamRef.current)
      localStreamRef.current = null
      screenStreamRef.current = null
    }
  }, [attachLocalMediaToPeerConnections, channelId, closePeerConnections, handleSignalMessage, session?.accessToken, stopStream])

  const leaveMeeting = useCallback(() => {
    const socket = socketRef.current
    const meetingHref = participantMode
      ? `/mentoring-meeting${workspaceId ? `?workspaceId=${workspaceId}` : ''}`
      : buildHref('meeting', workspaceId)
    let navigationStarted = false
    const navigateToMeeting = () => {
      if (navigationStarted) return
      navigationStarted = true
      navigateSpa(meetingHref)
    }

    mediaRecorderRef.current?.stop()
    socketRef.current = null
    closePeerConnections()
    stopStream(localStreamRef.current)
    stopStream(screenStreamRef.current)
    localStreamRef.current = null
    screenStreamRef.current = null
    setLocalStream(null)
    setScreenStream(null)
    setConnected(false)
    if (socket?.readyState === WebSocket.OPEN) {
      socket.addEventListener('close', navigateToMeeting, { once: true })
      socket.send(JSON.stringify({ type: 'leave' }))
      socket.close(1000, 'leave')
      window.setTimeout(navigateToMeeting, 1000)
      return
    }

    socket?.close()
    navigateToMeeting()
  }, [closePeerConnections, participantMode, stopStream, workspaceId])

  async function retryLocalMedia() {
    if (localStreamRef.current || !navigator.mediaDevices?.getUserMedia) return

    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (!socketRef.current) {
        stopStream(stream)
        return
      }
      if (localStreamRef.current) {
        stopStream(stream)
        return
      }

      localStreamRef.current = stream
      setLocalStream(stream)
      setMicOn(true)
      setCamOn(true)
      await attachLocalMediaToPeerConnections(stream)
    } catch {
      setError('내 카메라 또는 마이크를 열지 못했습니다. 브라우저 권한과 다른 앱의 장치 사용 여부를 확인해 주세요.')
    }
  }

  function toggleMic() {
    if (!localStreamRef.current) {
      void retryLocalMedia()
      return
    }
    const enabled = !micOn
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = enabled })
    setMicOn(enabled)
  }

  function toggleCam() {
    if (!localStreamRef.current) {
      void retryLocalMedia()
      return
    }
    const enabled = !camOn
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = enabled })
    setCamOn(enabled)
  }

  async function toggleScreenShare() {
    if (screenStreamRef.current) {
      const currentScreenStream = screenStreamRef.current
      screenStreamRef.current = null
      setScreenStream(null)
      await Promise.all([...peerTransceiversRef.current.values()].map((transceivers) => transceivers.screen.sender.replaceTrack(null)))
      broadcastRoomEvent('screen-share-stop')
      stopStream(currentScreenStream)
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('현재 브라우저에서 화면 공유를 사용할 수 없습니다.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const screenTrack = stream.getVideoTracks()[0]
      if (!screenTrack) {
        stopStream(stream)
        setError('공유할 화면 영상 트랙을 열지 못했습니다.')
        return
      }
      screenStreamRef.current = stream
      setScreenStream(stream)
      screenTrack.addEventListener('ended', () => {
        if (screenStreamRef.current !== stream) return
        screenStreamRef.current = null
        setScreenStream(null)
        void Promise.all([...peerTransceiversRef.current.values()].map((transceivers) => transceivers.screen.sender.replaceTrack(null)))
        broadcastRoomEvent('screen-share-stop')
      })
      await Promise.all([...peerTransceiversRef.current.values()].map((transceivers) => {
        transceivers.screen.sender.setStreams(stream)
        return transceivers.screen.sender.replaceTrack(screenTrack)
      }))
      broadcastRoomEvent('screen-share-start')
    } catch {
      setError('화면 공유가 취소되었거나 권한이 허용되지 않았습니다.')
    }
  }

  function toggleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      return
    }
    const sourceStream = screenStreamRef.current ?? localStreamRef.current
    if (!sourceStream) {
      setError('녹화할 미디어 스트림이 없습니다.')
      return
    }
    const recorder = new MediaRecorder(sourceStream)
    recordedChunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      setRecording(false)
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `devpath-live-meeting-${Date.now()}.webm`
      link.click()
      URL.revokeObjectURL(url)
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setRecording(true)
  }

  function sendChat() {
    const content = messageInput.trim()
    if (!content) return
    setMessages((current) => [...current, { id: Date.now(), sender: session?.name ?? '나', content, own: true }])
    setMessageInput('')
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-950 text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={leaveMeeting} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white"><i className="fas fa-arrow-left" /></button>
          <div>
            <div className="mb-0.5 flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ${connected ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'}`}><i className="fas fa-circle mr-1 animate-pulse" />{connected ? 'LIVE' : '연결 중'}</span>
              <span className="rounded border border-purple-500/30 bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-400">{participantMode ? 'MENTEE' : 'HOST 권한'}</span>
            </div>
            <h1 className="text-sm font-bold leading-none text-white">3주차 라이브 코드 리뷰</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-300"><i className="far fa-clock mr-1" />실시간</span>
          <button type="button" onClick={() => setSideTab('users')} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400"><i className="fas fa-users" /><span className="ml-1 text-[10px] text-[#00C471]">{participantCount}</span></button>
        </div>
      </header>
      {visibleError ? <div className="bg-red-500 px-6 py-2 text-xs font-bold text-white">{visibleError}</div> : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <main className="flex min-h-0 flex-col bg-black">
          <div className="custom-scrollbar grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
            <div className="group relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-gray-700 bg-gray-900">
              {localStream && camOn ? <StreamVideo stream={localStream} muted className="h-full w-full object-cover" /> : (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#7C3AED] text-2xl font-black">M</div>
                  <p className="text-lg font-extrabold">{session?.name ?? data.dashboard?.ownerName ?? '멘토'}</p>
                  <p className="mt-1 text-xs font-bold text-gray-400">{localStream ? '카메라 꺼짐' : '카메라 연결 중'}</p>
                </div>
              )}
              <span className="absolute top-4 left-4 rounded bg-red-500 px-2 py-1 text-[10px] font-extrabold">{participantMode ? 'MENTEE' : 'HOST'}</span>
              {!micOn ? <span className="absolute right-4 bottom-4 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold"><i className="fas fa-microphone-slash mr-1" />음소거</span> : null}
            </div>
            {screenStream ? (
              <div className="relative min-h-[260px] overflow-hidden rounded-2xl border border-[#00C471] bg-gray-900">
                <StreamVideo stream={screenStream} muted className="h-full w-full object-contain" />
                <span className="absolute top-4 left-4 rounded bg-[#00C471] px-2 py-1 text-[10px] font-extrabold text-white">내 화면 공유</span>
              </div>
            ) : null}
            {remotePeers.map((peer) => (
              <div key={peer.userId} className="group relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
                {peer.cameraStream ? <StreamVideo stream={peer.cameraStream} className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-gray-500">카메라 연결 중</span>}
                <div className="absolute right-3 bottom-3 rounded bg-black/70 px-2 py-1 text-[10px] font-bold">{peer.userName}</div>
              </div>
            ))}
            {remotePeers.filter((peer) => peer.screenSharing && peer.screenStream).map((peer) => (
              <div key={`${peer.userId}-screen`} className="relative min-h-[260px] overflow-hidden rounded-2xl border border-[#00C471] bg-gray-900">
                <StreamVideo stream={peer.screenStream} className="h-full w-full object-contain" />
                <span className="absolute top-4 left-4 rounded bg-[#00C471] px-2 py-1 text-[10px] font-extrabold text-white">{peer.userName} 화면 공유</span>
              </div>
            ))}
            {remotePeers.length === 0 && members.slice(0, 3).map((member) => (
              <div key={member.memberId} className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-900/70">
                <div className="text-center">
                  <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="mx-auto mb-3 h-16 w-16 rounded-full border border-gray-700 bg-gray-800" alt="" />
                  <p className="text-sm font-bold">{member.learnerName ?? '수강생'}</p>
                  <p className="mt-1 text-[10px] text-gray-500">입장 대기</p>
                </div>
              </div>
            ))}
          </div>
          <footer className="flex h-20 shrink-0 items-center justify-center border-t border-gray-900 bg-gray-950">
            <div className="flex items-center gap-4">
              <button type="button" onClick={toggleMic} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${micOn ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-red-500/30 bg-red-500 text-white'}`}><i className={micOn ? 'fas fa-microphone' : 'fas fa-microphone-slash'} /></button>
              <button type="button" onClick={toggleCam} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${camOn ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-red-500/30 bg-red-500 text-white'}`}><i className={camOn ? 'fas fa-video' : 'fas fa-video-slash'} /></button>
              <button type="button" onClick={() => void toggleScreenShare()} className={`flex h-12 w-12 items-center justify-center rounded-full text-lg text-white shadow-lg transition ${screenStream ? 'bg-blue-500 shadow-blue-900/30' : 'bg-[#00C471] shadow-green-900/30'}`}><i className="fas fa-desktop" /></button>
              <button type="button" onClick={toggleRecord} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${recording ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-900/50' : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'}`}><i className="fas fa-record-vinyl" /></button>
              <button type="button" onClick={leaveMeeting} className="flex h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-6 font-bold text-white shadow-lg shadow-red-900/50"><i className="fas fa-phone-slash" /> {participantMode ? '나가기' : '밋업 종료'}</button>
            </div>
          </footer>
        </main>
        <aside className="flex min-h-0 flex-col border-l border-gray-800 bg-gray-900">
          <div className="flex shrink-0 border-b border-gray-800">
            <button type="button" onClick={() => setSideTab('chat')} className={`flex-1 border-b-2 py-4 text-sm font-bold ${sideTab === 'chat' ? 'border-[#00C471] text-white' : 'border-transparent text-gray-500'}`}>실시간 채팅</button>
            <button type="button" onClick={() => setSideTab('users')} className={`flex-1 border-b-2 py-4 text-sm font-bold ${sideTab === 'users' ? 'border-[#00C471] text-white' : 'border-transparent text-gray-500'}`}>참여자 ({participantCount})</button>
          </div>
          {sideTab === 'chat' ? (
            <>
              <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                <div className="my-2 text-center"><span className="rounded-full bg-gray-800 px-3 py-1 text-[10px] font-medium text-gray-400">밋업이 시작되었습니다.</span></div>
                {messages.map((message) => (
                  <div key={message.id} className={`flex items-start gap-3 ${message.own ? 'flex-row-reverse' : ''}`}>
                    <div className="h-8 w-8 shrink-0 rounded-full bg-[#7C3AED]" />
                    <div>
                      <p className={`mb-1 text-[10px] font-bold text-gray-400 ${message.own ? 'text-right' : ''}`}>{message.sender}</p>
                      <div className={`max-w-[220px] rounded-2xl p-3 text-xs leading-5 ${message.own ? 'rounded-tr-none bg-[#00C471] text-white' : 'rounded-tl-none bg-gray-800 text-gray-200'}`}>{message.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t border-gray-800 p-4">
                <div className="flex gap-2 rounded-xl border border-gray-700 bg-gray-800 p-2">
                  <input value={messageInput} onChange={(event) => setMessageInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendChat() }} className="flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-gray-500" placeholder="메시지를 입력하세요..." />
                  <button type="button" onClick={sendChat} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C471] text-white"><i className="fas fa-paper-plane text-xs" /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
              <button type="button" onClick={toggleMic} className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-800 py-2 text-xs font-bold text-white transition hover:bg-gray-700"><i className="fas fa-volume-mute mr-1" /> 내 마이크 {micOn ? '끄기' : '켜기'}</button>
              <div className="rounded-xl bg-gray-800 p-3">
                <p className="text-sm font-bold">{session?.name ?? '나'}</p>
                <p className="mt-1 text-[10px] text-[#00C471]">호스트 · 접속 중</p>
              </div>
              {remotePeers.map((peer) => (
                <div key={peer.userId} className="rounded-xl bg-gray-800 p-3">
                  <p className="text-sm font-bold">{peer.userName}</p>
                  <p className="mt-1 text-[10px] text-gray-400">{peer.screenSharing ? '화면 공유 중' : '접속 중'}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
