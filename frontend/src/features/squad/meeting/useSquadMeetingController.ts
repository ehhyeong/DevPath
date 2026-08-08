import { useSquadMeetingMinutes } from './useSquadMeetingMinutes'
import { useScreenSharePlayer } from './useScreenSharePlayer'
import { useAudioDeviceDiagnostics } from './useAudioDeviceDiagnostics'
import { useSquadMeetingNetworkStatus } from './useSquadMeetingNetworkStatus'
import { useSquadMeetingViewport } from './useSquadMeetingViewport'
import {
type MouseEvent as ReactMouseEvent,
type PointerEvent as ReactPointerEvent,
useEffect,
useMemo,
useRef,
} from 'react'
import { clearStoredAuthSession,getPostLoginRedirect,readStoredAuthSession } from '../../../lib/auth-session'
import { showAuthToast } from '../../../lib/auth-toast'
import { getVoiceIceServers } from '../../../lib/voice-webrtc'
import {
fetchSquadVoiceParticipants,
fetchSquadVoicePresence,
joinSquadVoiceChannel,
leaveSquadVoiceChannel,
loadSquadMeetingInitialData,
} from './meeting-api'
import { createSquadNotification,squadActorName } from '../notifications'
import { FALLBACK_AUDIO_INPUTS,buildSecurityStatus,collectRemoteVoicePeers,formatElapsedTime,getNetworkBadgeClass,getNetworkIconClass,getSecurityBadgeClass,getSecurityIconClass,getVoiceMeetingSessionStartedAt,getWorkspaceIdFromUrl,normalizeVoiceReaction,useLatest } from './meeting-support'
import type {
CameraView,
ScreenShareView,
SinkAudioElement,
VoiceChannel,
VoiceEventType,
VoiceMeetingSyncPayload,
VoiceReactionPayload,
VoiceSignalingMessage,
VoiceSignalingPeer,
} from './meeting-types'
import { useSquadMeetingMediaState,useSquadMeetingRoomState } from './useSquadMeetingState'
import { applyAudioProcessingConstraints,getAudioConstraints,readAudioProcessingStatus } from './meeting-media'
import { useVoiceTransport } from './useVoiceTransport'
import { useMeetingPresence } from './useMeetingPresence'
import { useMeetingVoiceInput } from './useMeetingVoiceInput'
import { useMeetingMediaTracks } from './useMeetingMediaTracks'
import { useMeetingRemoteMedia } from './useMeetingRemoteMedia'
import { useMeetingReactions } from './useMeetingReactions'
export function useSquadMeetingController() {
  useSquadMeetingViewport()
  const workspaceId = useMemo(() => getWorkspaceIdFromUrl(), [])
  const { session,setSession,authView,setAuthView,dashboard,setDashboard,channels,setChannels,activeChannel,setActiveChannel,participants,setParticipants,presentUsers,setPresentUsers,roomPanelTab,setRoomPanelTab,roomSidePanelOpen,setRoomSidePanelOpen,loading,setLoading,error,setError,joining,setJoining,audioSettingsOpen,setAudioSettingsOpen,now,setNow } = useSquadMeetingRoomState()
  const activeChannelId = activeChannel?.channelId ?? null
  const { remoteAudioMuted,setRemoteAudioMuted,waitingMicMuted,setWaitingMicMuted,voiceConnectionStatus,setVoiceConnectionStatus,voiceConnectionError,setVoiceConnectionError,setLocalSpeaking,localCameraStream,setLocalCameraStream,remoteCameraStreams,setRemoteCameraStreams,localScreenShareStream,setLocalScreenShareStream,remoteScreenShares,setRemoteScreenShares,floatingReactions,setFloatingReactions } = useSquadMeetingMediaState()
  const localVoiceStreamRef = useRef<MediaStream | null>(null)
  const localVoiceRawStreamRef = useRef<MediaStream | null>(null)
  const localCameraStreamRef = useRef<MediaStream | null>(null)
  const localScreenShareStreamRef = useRef<MediaStream | null>(null)
  const remoteCameraStreamsRef = useRef<Map<number, CameraView>>(new Map())
  const remoteCameraPendingRef = useRef<Set<number>>(new Set())
  const remoteScreenShareViewsRef = useRef<Map<number, ScreenShareView>>(new Map())
  const remoteScreenSharePendingRef = useRef<Set<number>>(new Set())
  const remoteAudioElementsRef = useRef<Map<number, SinkAudioElement>>(new Map())
  const remoteAudioMutedRef = useRef(false)
  const remoteAudioContainerRef = useRef<HTMLDivElement | null>(null)
  const controlBoxRef = useRef<HTMLDivElement | null>(null)
  const joiningRef = useRef(false)
  const reactionTimerIdsRef = useRef<number[]>([])
  const voiceNoiseGateStopRef = useRef<(() => void) | null>(null)
  const voiceActivityStopRef = useRef<(() => void) | null>(null)
  const localSpeakingRef = useRef(false)
  const restoredVoiceChannelRef = useRef<number | null>(null)
  const { signalingSocketRef,peerConnectionsRef,peerTransceiversRef,makingOffersRef,departedPeerIdsRef,pendingIceCandidatesRef,closeSignalingSocket,closePeerConnections,connect: connectVoiceTransport,send: sendVoiceTransportMessage } = useVoiceTransport({
    onMessage: handleVoiceSignalingMessage,
    onPeersClosed: handlePeersClosed,
    onStatusChange: setVoiceConnectionStatus,
    onError: setVoiceConnectionError,
  })
  const { showFloatingReaction,sendRoomReaction } = useMeetingReactions({ currentUserId: session?.userId, currentUserName: session?.name, controlBoxRef, reactionTimerIdsRef, setFloatingReactions, sendReaction: (reaction) => sendVoiceTransportMessage({ type: 'reaction', payload: { reaction } }) })
  const disconnectVoiceSessionRef = useLatest(disconnectVoiceSession)
  const applySelectedOutputToRemoteAudioRef = useLatest(applySelectedOutputToRemoteAudio)
  const reconnectExistingVoiceSessionRef = useLatest(reconnectExistingVoiceSession)
  const currentParticipant = participants.find((participant) => participant.userId === session?.userId) ?? null
  const isJoined = Boolean(currentParticipant?.active)
  const {
    audioInputs,audioOutputs,selectedInputId,setSelectedInputId,selectedOutputId,setSelectedOutputId,
    audioDeviceError,setAudioDeviceError,audioProcessingStatus,setAudioProcessingStatus,
    micLevel,speakerLevel,micTesting,soundTesting,
    loadAudioDevices,toggleMicTest,playSoundTest,startMicMonitor,
  } = useAudioDeviceDiagnostics({
    accessToken: session?.accessToken,
    activeChannelId,
    audioSettingsOpen,
    isJoined,
    waitingMicMuted,
    applyAudioProcessingConstraints,
    applySelectedOutputToAudio,
    getAudioConstraints,
    updateAudioProcessingStatus,
  })
  const networkStatus = useSquadMeetingNetworkStatus({
    accessToken: session?.accessToken,
    activeChannelId,
    tokenType: session?.tokenType,
  })
  const {
    screenSharePlayerOpen,setScreenSharePlayerOpen,screenSharePlayerUserId,setScreenSharePlayerUserId,
    screenShareZoom,setScreenShareZoom,screenSharePan,setScreenSharePan,screenShareDragging,setScreenShareDragging,
    screenShareDragRef,resetScreenSharePlayer,openScreenSharePlayer,closeScreenSharePlayer,
    updateScreenShareZoom,handleScreenShareWheel,handleScreenSharePointerDown,handleScreenSharePointerMove,endScreenShareDrag,
  } = useScreenSharePlayer({
    currentUserId: session?.userId ?? undefined,
    localScreenShareStream,
    remoteScreenShares,
  })

  useEffect(() => () => disconnectVoiceSessionRef.current(), [disconnectVoiceSessionRef])

  useEffect(() => () => {
    reactionTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId))
    reactionTimerIdsRef.current = []
  }, [])

  useEffect(() => {
    void applySelectedOutputToRemoteAudioRef.current()
  }, [applySelectedOutputToRemoteAudioRef, selectedOutputId])

  useEffect(() => {
    if (!workspaceId) {
      setError('워크스페이스 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    const currentSession = readStoredAuthSession()

    if (!currentSession?.accessToken) {
      setSession(null)
      setLoading(false)
      setAuthView('login')
      showAuthToast({ message: '음성 회의는 로그인 후 이용할 수 있습니다.', durationMs: 2200 })
      return
    }

    let ignore = false
    const targetWorkspaceId = workspaceId

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const { dashboard: dashboardData, channels: channelData, selectedChannel, participants: participantData } = await loadSquadMeetingInitialData(targetWorkspaceId)

        if (ignore) {
          return
        }

        setSession(currentSession)
        setDashboard(dashboardData)
        setChannels(channelData)
        setActiveChannel(selectedChannel)
        setParticipants(participantData)
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : '음성 회의 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [setActiveChannel, setAuthView, setChannels, setDashboard, setError, setLoading, setParticipants, setSession, workspaceId])

  useMeetingPresence({ channelId: activeChannelId, accessToken: session?.accessToken, setParticipants, setPresentUsers })

  const members = dashboard?.members ?? []
  const projectName = dashboard?.name ?? '스쿼드 프로젝트'
  const isMuted = currentParticipant?.muted ?? false
  const micMuted = isJoined ? isMuted : waitingMicMuted
  const selectedInputLabel =
    audioInputs.find((device) => device.deviceId === selectedInputId)?.label ?? FALLBACK_AUDIO_INPUTS[0].label
  const activeParticipants = participants.filter((participant) => participant.active)
  const { handlePeersClosed: handleRemotePeersClosed,getVoiceDisplayName,attachRemoteTrack,removeRemotePeer,clearRemoteCameraStream,clearRemoteScreenShare } = useMeetingRemoteMedia({ members, participants, activeParticipants, remoteAudioElementsRef, remoteAudioMutedRef, remoteAudioContainerRef, remoteCameraStreamsRef, remoteCameraPendingRef, remoteScreenShareViewsRef, remoteScreenSharePendingRef, peerConnectionsRef, peerTransceiversRef, makingOffersRef, pendingIceCandidatesRef, setRemoteCameraStreams, setRemoteScreenShares, applySelectedOutputToAudio })
  const activeUserIds = new Set(activeParticipants.map((participant) => participant.userId))
  const presentUserIds = new Set(presentUsers.map((presence) => presence.userId))
  const waitingMembers = members.filter(
    (member) =>
      !activeUserIds.has(member.learnerId)
      && (presentUserIds.has(member.learnerId) || member.learnerId === session?.userId),
  )
  const networkBadgeClass = getNetworkBadgeClass(networkStatus.tone)
  const networkIconClass = getNetworkIconClass(networkStatus.tone)
  const securityStatus = buildSecurityStatus(Boolean(session?.accessToken), Boolean(dashboard && activeChannel))
  const securityBadgeClass = getSecurityBadgeClass(securityStatus.tone)
  const securityIconClass = getSecurityIconClass(securityStatus.tone)
  const voiceConnectionLabel =
    voiceConnectionStatus === 'connected'
      ? '음성 연결됨'
      : voiceConnectionStatus === 'connecting'
        ? '음성 연결 중입니다.'
        : voiceConnectionStatus === 'error'
          ? '음성 연결을 확인해 주세요.'
          : '입장하면 음성 연결이 시작됩니다.'
  const roomParticipants = activeParticipants.length > 0 ? activeParticipants : participants
  const meetingSessionStartedAt = getVoiceMeetingSessionStartedAt(activeParticipants)
  const meetingElapsedLabel = formatElapsedTime(meetingSessionStartedAt, now)
  const { voiceChatMessages,voiceChatInput,setVoiceChatInput,voiceMinutes,minutesDraft,setMinutesDraft,minutesActionItems,selectedMinutesActionItems,minutesSummaryReportOpen,setMinutesSummaryReportOpen,chatSending,chatClearing,minutesSaving,kanbanTaskCreating,speechRecognitionActive,minutesTextareaRef,appendVoiceChatMessage,applyVoiceMinutes,refreshVoiceMeetingPanel,voiceEventLabel,createVoiceEvent,stopMinutesSpeechRecognition,sendVoiceChatMessage,clearVoiceChatMessages,toggleMinutesRecording,saveMinutesDraft,toggleMinutesActionItem,generateMinutesSummary,createKanbanTasksFromMinutes } = useSquadMeetingMinutes({ workspaceId,activeChannel,isJoined,isMuted,session,broadcastMeetingSync,setRoomPanelTab })
  const { stopLocalVoiceStream,setLocalVoiceMuted,startLocalVoiceStreamIfAvailable,replaceLocalVoiceInput } = useMeetingVoiceInput({ selectedInputId, micMuted, currentUserId: session?.userId, localVoiceStreamRef, localVoiceRawStreamRef, voiceNoiseGateStopRef, voiceActivityStopRef, localSpeakingRef, peerTransceiversRef, setLocalSpeaking, setParticipants, setAudioProcessingStatus, setAudioDeviceError, setWaitingMicMuted, stopMinutesSpeechRecognition, createVoiceEvent, broadcastSpeakingState })
  const { clearLocalCameraStream,clearLocalScreenShareStream,attachLocalVoiceTrackToPeers,toggleCamera,toggleScreenShare } = useMeetingMediaTracks({ workspaceId, activeChannel, isJoined, currentUserName: session?.name, localCameraStreamRef, localScreenShareStreamRef, peerTransceiversRef, setLocalCameraStream, setLocalScreenShareStream, ensurePeerConnections: ensurePeerConnectionsForCurrentParticipants, broadcastCameraState, broadcastScreenShareState })

  useEffect(() => {
    if (!isJoined) {
      restoredVoiceChannelRef.current = null
      return
    }

    if (!activeChannel?.channelId || !session?.accessToken) {
      return
    }

    if (restoredVoiceChannelRef.current === activeChannel.channelId) {
      return
    }

    if (localVoiceStreamRef.current || signalingSocketRef.current) {
      return
    }

    restoredVoiceChannelRef.current = activeChannel.channelId
    void reconnectExistingVoiceSessionRef.current()
  }, [activeChannel?.channelId, isJoined, reconnectExistingVoiceSessionRef, session?.accessToken, signalingSocketRef])

  useEffect(() => {
    if (!isJoined) {
      return undefined
    }

    function resumeRemoteAudio() {
      remoteAudioElementsRef.current.forEach((audio) => {
        if (audio.paused) {
          void audio.play().catch(() => undefined)
        }
      })
    }

    window.addEventListener('pointerdown', resumeRemoteAudio, { capture: true })
    window.addEventListener('keydown', resumeRemoteAudio, { capture: true })

    return () => {
      window.removeEventListener('pointerdown', resumeRemoteAudio, { capture: true })
      window.removeEventListener('keydown', resumeRemoteAudio, { capture: true })
    }
  }, [isJoined])

  useEffect(() => {
    if (!isJoined) {
      return
    }

    setNow(Date.now())
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(intervalId)
  }, [isJoined, setNow])

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
    setAuthView('login')
  }
  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
    window.location.reload()
  }
  function handlePeersClosed() {
    handleRemotePeersClosed()
  }
  function disconnectVoiceSession() {
    closeSignalingSocket()
    closePeerConnections()
    stopMinutesSpeechRecognition()
    clearLocalCameraStream()
    clearLocalScreenShareStream()
    stopLocalVoiceStream()
    setVoiceConnectionStatus('idle')
    setVoiceConnectionError(null)
  }

  function updateAudioProcessingStatus(stream: MediaStream, noiseGate: boolean) {
    setAudioProcessingStatus(readAudioProcessingStatus(stream, noiseGate))
  }

  function applyRemoteAudioMuted(muted: boolean) {
    remoteAudioElementsRef.current.forEach((audio) => {
      audio.muted = muted
    })
  }

  async function resumeRemoteAudioPlayback() {
    await Promise.all(
      Array.from(remoteAudioElementsRef.current.values())
        .filter((audio) => audio.paused)
        .map((audio) => audio.play().catch(() => undefined)),
    )
  }

  function toggleRemoteAudioMuted() {
    const nextMuted = !remoteAudioMutedRef.current

    remoteAudioMutedRef.current = nextMuted
    applyRemoteAudioMuted(nextMuted)
    if (!nextMuted) {
      void resumeRemoteAudioPlayback()
    }
    setRemoteAudioMuted(nextMuted)
    showAuthToast({
      message: nextMuted ? '회의 듣기를 껐습니다.' : '회의 듣기를 켰습니다.',
      durationMs: 1400,
    })
  }

  async function applySelectedOutputToAudio(
    audio: SinkAudioElement,
    failureMessage = '선택한 스피커로 음성 회의 출력을 전환하지 못했습니다.',
  ) {
    if (!audio.setSinkId) {
      return
    }

    try {
      await audio.setSinkId(selectedOutputId || 'default')
    } catch {
      setAudioDeviceError(failureMessage)
    }
  }

  async function applySelectedOutputToRemoteAudio() {
    await Promise.all(
      Array.from(remoteAudioElementsRef.current.values()).map((audio) => applySelectedOutputToAudio(audio)),
    )
  }

  function sendSignalingMessage(
    type: 'offer' | 'answer' | 'ice-candidate',
    targetUserId: number,
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ) {
    sendVoiceTransportMessage({ type, targetUserId, payload })
  }

  function broadcastScreenShareState(type: 'screen-share-start' | 'screen-share-stop') {
    sendVoiceTransportMessage({
      type,
      payload: {
        sharing: type === 'screen-share-start',
        streamId: localScreenShareStreamRef.current?.id,
        trackId: localScreenShareStreamRef.current?.getVideoTracks()[0]?.id,
      },
    })
  }

  function broadcastMeetingSync(type: 'chat-message' | 'minutes-updated', payload: VoiceMeetingSyncPayload) {
    sendVoiceTransportMessage({ type, payload })
  }

  function broadcastCameraState(type: 'camera-start' | 'camera-stop') {
    sendVoiceTransportMessage({
      type,
      payload: {
        enabled: type === 'camera-start',
        streamId: localCameraStreamRef.current?.id,
      },
    })
  }

  function broadcastSpeakingState(speaking: boolean) {
    sendVoiceTransportMessage({ type: speaking ? 'speaking' : 'stop-speaking', payload: { speaking } })
  }

  function getCurrentRemoteVoicePeers() {
    return collectRemoteVoicePeers([roomParticipants, participants, activeParticipants], session?.userId, getVoiceDisplayName)
  }

  function ensurePeerConnectionsForCurrentParticipants() {
    getCurrentRemoteVoicePeers().forEach((peer) => {
      getOrCreatePeerConnection(peer)
    })
  }

  function getOrCreatePeerConnection(peer: VoiceSignalingPeer) {
    const existingPeerConnection = peerConnectionsRef.current.get(peer.userId)

    if (existingPeerConnection) {
      return existingPeerConnection
    }

    const peerConnection = new RTCPeerConnection({ iceServers: getVoiceIceServers() })
    const voiceStream = localVoiceStreamRef.current
    const cameraStream = localCameraStreamRef.current
    const screenStream = localScreenShareStreamRef.current
    const microphoneTrack = voiceStream?.getAudioTracks()[0] ?? null
    const cameraTrack = cameraStream?.getVideoTracks()[0] ?? null
    const screenTrack = screenStream?.getVideoTracks()[0] ?? null

    if (session?.userId && session.userId < peer.userId) {
      const microphone = peerConnection.addTransceiver(microphoneTrack ?? 'audio', {
        direction: 'sendrecv',
        ...(voiceStream ? { streams: [voiceStream] } : {}),
      })
      const camera = peerConnection.addTransceiver(cameraTrack ?? 'video', {
        direction: 'sendrecv',
        ...(cameraStream ? { streams: [cameraStream] } : {}),
      })
      const screen = peerConnection.addTransceiver(screenTrack ?? 'video', {
        direction: 'sendrecv',
        ...(screenStream ? { streams: [screenStream] } : {}),
      })

      peerTransceiversRef.current.set(peer.userId, { microphone, camera, screen })
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage('ice-candidate', peer.userId, event.candidate.toJSON())
      }
    }

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0] ?? new MediaStream([event.track])
      const transceiverIndex = peerConnection.getTransceivers().indexOf(event.transceiver)

      if (departedPeerIdsRef.current.has(peer.userId)) {
        return
      }
      attachRemoteTrack(peer.userId, peer.userName, remoteStream, event.track, transceiverIndex)
    }

    peerConnection.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peerConnection.connectionState)) {
        removeRemotePeer(peer.userId)
      }
    }

    peerConnectionsRef.current.set(peer.userId, peerConnection)

    return peerConnection
  }

  async function startVoiceOffer(peer: VoiceSignalingPeer) {
    const peerConnection = getOrCreatePeerConnection(peer)

    if (peerConnection.signalingState !== 'stable' || makingOffersRef.current.has(peer.userId)) {
      return
    }

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
  }

  async function handlePeerAvailable(peer: VoiceSignalingPeer) {
    if (!session?.userId || peer.userId === session.userId) {
      return
    }

    getOrCreatePeerConnection(peer)

    if (localCameraStreamRef.current) {
      broadcastCameraState('camera-start')
    }

    if (localScreenShareStreamRef.current) {
      broadcastScreenShareState('screen-share-start')
    }

    if (session.userId < peer.userId) {
      await startVoiceOffer(peer)
    }
  }

  async function bindLocalTracksToRemoteOffer(userId: number, peerConnection: RTCPeerConnection) {
    const [microphone, camera, screen] = peerConnection.getTransceivers()

    if (!microphone || !camera || !screen) {
      throw new Error('스쿼드 회의의 미디어 채널 구성이 올바르지 않습니다.')
    }

    const voiceStream = localVoiceStreamRef.current
    const cameraStream = localCameraStreamRef.current
    const screenStream = localScreenShareStreamRef.current

    microphone.direction = 'sendrecv'
    camera.direction = 'sendrecv'
    screen.direction = 'sendrecv'
    if (voiceStream) {
      microphone.sender.setStreams(voiceStream)
    }
    if (cameraStream) {
      camera.sender.setStreams(cameraStream)
    }
    if (screenStream) {
      screen.sender.setStreams(screenStream)
    }

    await Promise.all([
      microphone.sender.replaceTrack(voiceStream?.getAudioTracks()[0] ?? null),
      camera.sender.replaceTrack(cameraStream?.getVideoTracks()[0] ?? null),
      screen.sender.replaceTrack(screenStream?.getVideoTracks()[0] ?? null),
    ])
    peerTransceiversRef.current.set(userId, { microphone, camera, screen })
  }

  async function flushPendingIceCandidates(userId: number, peerConnection: RTCPeerConnection) {
    const candidates = pendingIceCandidatesRef.current.get(userId) ?? []

    pendingIceCandidatesRef.current.delete(userId)

    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(candidate).catch(() => undefined)
    }
  }

  async function handleVoiceOffer(message: VoiceSignalingMessage) {
    if (!message.fromUserId || !message.fromUserName || !message.payload) {
      return
    }

    if (departedPeerIdsRef.current.has(message.fromUserId)) {
      return
    }

    const peer = { userId: message.fromUserId, userName: message.fromUserName }
    const peerConnection = getOrCreatePeerConnection(peer)

    if (peerConnection.signalingState !== 'stable') {
      await peerConnection.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit).catch(() => undefined)
    }

    await peerConnection.setRemoteDescription(message.payload as RTCSessionDescriptionInit)
    await bindLocalTracksToRemoteOffer(peer.userId, peerConnection)
    await flushPendingIceCandidates(peer.userId, peerConnection)

    const answer = await peerConnection.createAnswer()

    await peerConnection.setLocalDescription(answer)

    if (peerConnection.localDescription) {
      sendSignalingMessage('answer', peer.userId, peerConnection.localDescription.toJSON())
    }
  }

  async function handleVoiceAnswer(message: VoiceSignalingMessage) {
    if (!message.fromUserId || !message.fromUserName || !message.payload) {
      return
    }

    if (departedPeerIdsRef.current.has(message.fromUserId)) {
      return
    }

    const peer = { userId: message.fromUserId, userName: message.fromUserName }
    const peerConnection = getOrCreatePeerConnection(peer)

    if (peerConnection.signalingState !== 'stable') {
      await peerConnection.setRemoteDescription(message.payload as RTCSessionDescriptionInit)
      await flushPendingIceCandidates(peer.userId, peerConnection)
    }
  }

  async function handleVoiceIceCandidate(message: VoiceSignalingMessage) {
    if (!message.fromUserId || !message.fromUserName || !message.payload) {
      return
    }

    if (departedPeerIdsRef.current.has(message.fromUserId)) {
      return
    }

    const peer = { userId: message.fromUserId, userName: message.fromUserName }
    const peerConnection = getOrCreatePeerConnection(peer)
    const candidate = message.payload as RTCIceCandidateInit

    if (!peerConnection.remoteDescription) {
      const candidates = pendingIceCandidatesRef.current.get(peer.userId) ?? []

      candidates.push(candidate)
      pendingIceCandidatesRef.current.set(peer.userId, candidates)
      return
    }

    await peerConnection.addIceCandidate(candidate).catch(() => undefined)
  }

  async function handleVoiceSignalingMessage(rawMessage: string) {
    const message = JSON.parse(rawMessage) as VoiceSignalingMessage

    switch (message.type) {
      case 'peer-list':
        await Promise.all((message.peers ?? []).map((peer) => {
          departedPeerIdsRef.current.delete(peer.userId)
          return handlePeerAvailable(peer)
        }))
        break
      case 'peer-joined':
        if (message.fromUserId && message.fromUserName) {
          departedPeerIdsRef.current.delete(message.fromUserId)
          await handlePeerAvailable({ userId: message.fromUserId, userName: message.fromUserName })
          if (activeChannel) {
            void refreshVoiceRoomState(activeChannel.channelId).catch(() => undefined)
          }
        }
        break
      case 'peer-left':
        if (message.fromUserId) {
          departedPeerIdsRef.current.add(message.fromUserId)
          removeRemotePeer(message.fromUserId)
          if (activeChannel) {
            void refreshVoiceRoomState(activeChannel.channelId).catch(() => undefined)
          }
        }
        break
      case 'offer':
        await handleVoiceOffer(message)
        break
      case 'answer':
        await handleVoiceAnswer(message)
        break
      case 'ice-candidate':
        await handleVoiceIceCandidate(message)
        break
      case 'reaction': {
        const payload = message.payload as VoiceReactionPayload | null | undefined
        const reaction = normalizeVoiceReaction(payload?.reaction)

        if (reaction) {
          showFloatingReaction(reaction, message.fromUserId, message.fromUserName)
        }
        break
      }
      case 'chat-message': {
        const payload = message.payload as VoiceMeetingSyncPayload | null | undefined

        if (payload?.chatMessage) {
          appendVoiceChatMessage(payload.chatMessage)
        } else if (activeChannel) {
          void refreshVoiceMeetingPanel(activeChannel.channelId).catch(() => undefined)
        }
        break
      }
      case 'minutes-updated': {
        const payload = message.payload as VoiceMeetingSyncPayload | null | undefined

        if (payload?.minutes) {
          applyVoiceMinutes(payload.minutes)
        } else if (activeChannel) {
          void refreshVoiceMeetingPanel(activeChannel.channelId).catch(() => undefined)
        }
        break
      }
      case 'speaking':
      case 'stop-speaking':
        if (message.fromUserId) {
          const nextSpeaking = message.type === 'speaking'

          setParticipants((currentParticipants) =>
            currentParticipants.map((participant) =>
              participant.userId === message.fromUserId
                ? { ...participant, speaking: nextSpeaking }
                : participant,
            ),
          )
        }
        break
      case 'camera-start':
        if (message.fromUserId) {
          remoteCameraPendingRef.current.add(message.fromUserId)
          const cameraView = remoteCameraStreamsRef.current.get(message.fromUserId)

          if (cameraView) {
            setRemoteCameraStreams((current) => new Map(current).set(message.fromUserId as number, cameraView))
          }
        }
        break
      case 'camera-stop':
        if (message.fromUserId) {
          clearRemoteCameraStream(message.fromUserId)
        }
        break
      case 'screen-share-start': {
        if (message.fromUserId) {
          remoteScreenSharePendingRef.current.add(message.fromUserId)
          const screenShareView = remoteScreenShareViewsRef.current.get(message.fromUserId)

          if (screenShareView) {
            setRemoteScreenShares((current) => new Map(current).set(message.fromUserId as number, screenShareView))
          }
        }
        if (message.fromUserId && message.fromUserName) {
          showAuthToast({ message: `${message.fromUserName}님이 화면 공유를 시작했습니다.`, durationMs: 1600 })
        }
        break
      }
      case 'screen-share-stop':
        if (message.fromUserId) {
          clearRemoteScreenShare(message.fromUserId)
        }
        break
      case 'error':
        setVoiceConnectionStatus('error')
        setVoiceConnectionError(message.detail ?? '음성 회의 연결 오류가 발생했습니다.')
        break
    }
  }

  function connectVoiceSignaling(channelId: number) {
    connectVoiceTransport(channelId, session?.accessToken)
  }

  async function fetchParticipants(channelId: number) {
    return fetchSquadVoiceParticipants(channelId)
  }

  async function fetchPresence(channelId: number) {
    return fetchSquadVoicePresence(channelId)
  }

  async function refreshVoiceRoomState(channelId = activeChannel?.channelId) {
    if (!channelId) {
      return
    }

    const [participantData, presenceData] = await Promise.all([
      fetchParticipants(channelId),
      fetchPresence(channelId),
    ])

    setParticipants(participantData)
    setPresentUsers(presenceData)
  }

  async function refreshParticipants(channelId = activeChannel?.channelId) {
    if (!channelId) {
      return
    }

    const participantData = await fetchParticipants(channelId)
    setParticipants(participantData)
  }

  async function selectChannel(channel: VoiceChannel) {
    if (isJoined && activeChannel?.channelId !== channel.channelId) {
      await leaveChannel()
    }

    setActiveChannel(channel)
    setParticipants([])
    setPresentUsers([])

    try {
      await refreshVoiceRoomState(channel.channelId)
    } catch (selectError) {
      showAuthToast({
        message: selectError instanceof Error ? selectError.message : '참가자 목록을 불러오지 못했습니다.',
        durationMs: 2200,
      })
    }
  }

  function toggleWaitingMic() {
    setWaitingMicMuted((current) => {
      const next = !current

      showAuthToast({
        message: next ? '마이크가 꺼졌습니다.' : '마이크가 켜졌습니다.',
        durationMs: 1400,
      })

      return next
    })
  }

  function handleJoinedNavigation(event: ReactMouseEvent<HTMLAnchorElement>, href: string) {
    if (!isJoined) {
      return
    }

    event.preventDefault()

    const openedWindow = window.open(href, '_blank', 'noopener,noreferrer')

    showAuthToast({
      message: openedWindow
        ? '통화는 이 탭에서 유지하고 선택한 메뉴를 새 탭으로 열었습니다.'
        : '브라우저가 새 탭 열기를 막았습니다. 통화 종료 후 이동해 주세요.',
      durationMs: 2400,
    })
  }

  async function reconnectExistingVoiceSession() {
    if (!activeChannel || !session?.accessToken) {
      return
    }

    setJoining(true)
    setVoiceConnectionStatus('connecting')
    setVoiceConnectionError(null)

    try {
      let toastMessage = '진행 중인 음성 회의에 다시 연결했습니다.'
      connectVoiceSignaling(activeChannel.channelId)
      const localVoiceAvailable = await startLocalVoiceStreamIfAvailable(isMuted)

      if (!localVoiceAvailable) {
        try {
          if (!isMuted) {
            await createVoiceEvent('MUTE', '마이크 감지 실패로 재입장 시 음소거')
          }
          toastMessage = '마이크를 감지하지 못해 음소거 상태로 음성 회의에 다시 연결했습니다.'
        } catch {
          toastMessage = '다시 연결했지만 마이크 음소거 반영에 실패했습니다.'
        }
      }

      await Promise.all([
        refreshVoiceRoomState(activeChannel.channelId),
        refreshVoiceMeetingPanel(activeChannel.channelId, true).catch(() => undefined),
      ])
      showAuthToast({ message: toastMessage, durationMs: 1800 })
    } catch (restoreError) {
      disconnectVoiceSession()
      setVoiceConnectionStatus('error')
      setVoiceConnectionError('음성 회의에 다시 연결하지 못했습니다.')
      showAuthToast({
        message: restoreError instanceof Error ? restoreError.message : '음성 회의에 다시 연결하지 못했습니다.',
        durationMs: 2400,
      })
    } finally {
      setJoining(false)
    }
  }

  async function joinChannel() {
    if (!activeChannel || joiningRef.current) {
      return
    }

    joiningRef.current = true
    setJoining(true)
    setVoiceConnectionStatus('connecting')
    setVoiceConnectionError(null)

    try {
      let toastMessage = '음성 회의에 입장했습니다.'

      await joinSquadVoiceChannel(activeChannel.channelId)
      connectVoiceSignaling(activeChannel.channelId)

      const localVoiceAvailable = await startLocalVoiceStreamIfAvailable(waitingMicMuted)
      const shouldMuteOnEntry = waitingMicMuted || !localVoiceAvailable

      if (shouldMuteOnEntry) {
        try {
          await createVoiceEvent(
            'MUTE',
            localVoiceAvailable ? '대기실에서 마이크 음소거 후 입장' : '마이크 감지 실패로 음소거 후 입장',
          )
          toastMessage = localVoiceAvailable
            ? '마이크를 끄고 음성 회의에 입장했습니다.'
            : '마이크를 감지하지 못해 음소거 상태로 음성 회의에 입장했습니다.'
        } catch {
          toastMessage = '입장은 완료됐지만 마이크 음소거 반영에 실패했습니다.'
        }
      }

      await Promise.all([
        refreshVoiceRoomState(activeChannel.channelId),
        refreshVoiceMeetingPanel(activeChannel.channelId, true).catch(() => undefined),
      ])
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 음성 회의에 참여했습니다.`,
        targetPath: '/squad-meeting',
      })
      showAuthToast({ message: toastMessage, durationMs: 1800 })
    } catch (joinError) {
      disconnectVoiceSession()
      await leaveSquadVoiceChannel(activeChannel.channelId).catch(() => undefined)
      await refreshVoiceRoomState(activeChannel.channelId).catch(() => undefined)
      showAuthToast({
        message: joinError instanceof Error ? joinError.message : '음성 회의 입장에 실패했습니다.',
        durationMs: 2200,
      })
    } finally {
      joiningRef.current = false
      setJoining(false)
    }
  }

  function handleJoinPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || joining || !activeChannel) {
      return
    }

    void joinChannel()
  }

  async function leaveChannel() {
    if (!activeChannel || !isJoined) {
      return
    }

    const nextWaitingMicMuted = isMuted
    setJoining(true)
    disconnectVoiceSession()

    try {
      await leaveSquadVoiceChannel(activeChannel.channelId)
      await refreshVoiceRoomState(activeChannel.channelId)
      setWaitingMicMuted(nextWaitingMicMuted)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 음성 회의에서 나갔습니다.`,
        targetPath: '/squad-meeting',
      })
      showAuthToast({ message: '음성 회의에서 나왔습니다.', durationMs: 1600 })
    } catch (leaveError) {
      showAuthToast({
        message: leaveError instanceof Error ? leaveError.message : '음성 회의 퇴장에 실패했습니다.',
        durationMs: 2200,
      })
    } finally {
      setJoining(false)
    }
  }

  async function sendVoiceEvent(type: VoiceEventType, memo: string) {
    if (!activeChannel || !isJoined) {
      showAuthToast({ message: '먼저 음성 회의에 입장해 주세요.', durationMs: 1800 })
      return
    }

    try {
      if (type === 'UNMUTE' && !localVoiceStreamRef.current) {
        const localVoiceAvailable = await startLocalVoiceStreamIfAvailable(false)

        if (!localVoiceAvailable || !localVoiceStreamRef.current) {
          setWaitingMicMuted(true)
          setAudioDeviceError('사용 가능한 마이크를 감지하지 못했습니다.')
          showAuthToast({ message: '사용 가능한 마이크를 감지하지 못해 음소거 상태를 유지합니다.', durationMs: 2200 })
          return
        }

        setWaitingMicMuted(false)
        setAudioDeviceError(null)
        await attachLocalVoiceTrackToPeers(localVoiceStreamRef.current)
      }

      await createVoiceEvent(type, memo)
      if (type === 'MUTE' || type === 'UNMUTE') {
        setLocalVoiceMuted(type === 'MUTE')
      }
      await refreshParticipants(activeChannel.channelId)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}"에서 ${voiceEventLabel(type)}`,
        targetPath: '/squad-meeting',
      })
    } catch (eventError) {
      showAuthToast({
        message: eventError instanceof Error ? eventError.message : '음성 상태를 변경하지 못했습니다.',
        durationMs: 2200,
      })
    }
  }

  return { workspaceId, session, authView, setAuthView, channels, activeChannel, participants, roomPanelTab, setRoomPanelTab, roomSidePanelOpen, setRoomSidePanelOpen, voiceChatMessages, voiceChatInput, setVoiceChatInput, voiceMinutes, minutesDraft, setMinutesDraft, minutesActionItems, selectedMinutesActionItems, minutesSummaryReportOpen, setMinutesSummaryReportOpen, chatSending, chatClearing, minutesSaving, kanbanTaskCreating, speechRecognitionActive, loading, error, joining, audioSettingsOpen, setAudioSettingsOpen, audioInputs, audioOutputs, selectedInputId, setSelectedInputId, selectedOutputId, setSelectedOutputId, remoteAudioMuted, audioDeviceError, setAudioDeviceError, audioProcessingStatus, micLevel, speakerLevel, micTesting, soundTesting, networkStatus, voiceConnectionStatus, voiceConnectionError, localCameraStream, remoteCameraStreams, localScreenShareStream, remoteScreenShares, screenSharePlayerOpen, setScreenSharePlayerOpen, screenSharePlayerUserId, setScreenSharePlayerUserId, screenShareZoom, setScreenShareZoom, screenSharePan, setScreenSharePan, screenShareDragging, setScreenShareDragging, floatingReactions, localVoiceStreamRef, screenShareDragRef, remoteAudioContainerRef, controlBoxRef, minutesTextareaRef, members, projectName, currentParticipant, isJoined, isMuted, micMuted, selectedInputLabel, waitingMembers, networkBadgeClass, networkIconClass, securityStatus, securityBadgeClass, securityIconClass, voiceConnectionLabel, roomParticipants, meetingElapsedLabel, handleLogout, handleAuthenticated, loadAudioDevices, replaceLocalVoiceInput, toggleRemoteAudioMuted, toggleCamera, toggleScreenShare, sendRoomReaction, toggleMicTest, playSoundTest, startMicMonitor, selectChannel, sendVoiceChatMessage, clearVoiceChatMessages, toggleMinutesRecording, saveMinutesDraft, toggleMinutesActionItem, generateMinutesSummary, createKanbanTasksFromMinutes, toggleWaitingMic, handleJoinedNavigation, joinChannel, handleJoinPointerDown, leaveChannel, sendVoiceEvent, resetScreenSharePlayer, openScreenSharePlayer, closeScreenSharePlayer, updateScreenShareZoom, handleScreenShareWheel, handleScreenSharePointerDown, handleScreenSharePointerMove, endScreenShareDrag }
}

export type SquadMeetingViewModel = ReturnType<typeof useSquadMeetingController>
