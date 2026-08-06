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
useState
} from 'react'
import { type AuthView } from '../../../components/AuthModal'
import { clearStoredAuthSession,getPostLoginRedirect,readStoredAuthSession } from '../../../lib/auth-session'
import { showAuthToast } from '../../../lib/auth-toast'
import { getVoiceIceServers } from '../../../lib/voice-webrtc'
import {
fetchSquadVoiceParticipants,
fetchSquadVoicePresence,
joinSquadVoiceChannel,
leaveSquadVoiceChannel,
loadSquadMeetingInitialData,
touchSquadVoicePresence,
} from './meeting-api'
import { createSquadNotification,squadActorName } from '../notifications'
import { FALLBACK_AUDIO_INPUTS,FLOATING_REACTION_VISIBLE_MS,type VoicePeerTransceivers,buildSecurityStatus,buildVoiceSignalingUrl,createFloatingReactionId,formatElapsedTime,getNetworkBadgeClass,getNetworkIconClass,getSecurityBadgeClass,getSecurityIconClass,getUserMediaWithTimeout,getVoiceMeetingSessionStartedAt,getWorkspaceIdFromUrl,normalizeVoiceReaction,useLatest } from './meeting-support'
import type {
CameraView,
FloatingReaction,
RoomPanelTab,
ScreenShareView,
SinkAudioElement,
VoiceChannel,
VoiceConnectionStatus,
VoiceEventType,
VoiceMeetingSyncPayload,
VoiceParticipant,
VoicePresence,
VoiceReactionPayload,
VoiceSignalingMessage,
VoiceSignalingPeer,
WorkspaceDashboard
} from './meeting-types'

export function useSquadMeetingController() {
  useSquadMeetingViewport()
  const workspaceId = useMemo(() => getWorkspaceIdFromUrl(), [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [channels, setChannels] = useState<VoiceChannel[]>([])
  const [activeChannel, setActiveChannel] = useState<VoiceChannel | null>(null)
  const activeChannelId = activeChannel?.channelId ?? null
  const [participants, setParticipants] = useState<VoiceParticipant[]>([])
  const [presentUsers, setPresentUsers] = useState<VoicePresence[]>([])
  const [roomPanelTab, setRoomPanelTab] = useState<RoomPanelTab>('minutes')
  const [roomSidePanelOpen, setRoomSidePanelOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const [remoteAudioMuted, setRemoteAudioMuted] = useState(false)
  const [waitingMicMuted, setWaitingMicMuted] = useState(false)
  const [voiceConnectionStatus, setVoiceConnectionStatus] = useState<VoiceConnectionStatus>('idle')
  const [voiceConnectionError, setVoiceConnectionError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [, setLocalSpeaking] = useState(false)
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null)
  const [remoteCameraStreams, setRemoteCameraStreams] = useState<Map<number, CameraView>>(() => new Map())
  const [localScreenShareStream, setLocalScreenShareStream] = useState<MediaStream | null>(null)
  const [remoteScreenShares, setRemoteScreenShares] = useState<Map<number, ScreenShareView>>(() => new Map())
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const localVoiceStreamRef = useRef<MediaStream | null>(null)
  const localVoiceRawStreamRef = useRef<MediaStream | null>(null)
  const localCameraStreamRef = useRef<MediaStream | null>(null)
  const localScreenShareStreamRef = useRef<MediaStream | null>(null)
  const remoteCameraStreamsRef = useRef<Map<number, CameraView>>(new Map())
  const remoteCameraPendingRef = useRef<Set<number>>(new Set())
  const remoteScreenShareViewsRef = useRef<Map<number, ScreenShareView>>(new Map())
  const remoteScreenSharePendingRef = useRef<Set<number>>(new Set())
  const signalingSocketRef = useRef<WebSocket | null>(null)
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map())
  const peerTransceiversRef = useRef<Map<number, VoicePeerTransceivers>>(new Map())
  const makingOffersRef = useRef<Set<number>>(new Set())
  const departedPeerIdsRef = useRef<Set<number>>(new Set())
  const remoteAudioElementsRef = useRef<Map<number, SinkAudioElement>>(new Map())
  const remoteAudioMutedRef = useRef(false)
  const remoteAudioContainerRef = useRef<HTMLDivElement | null>(null)
  const controlBoxRef = useRef<HTMLDivElement | null>(null)
  const joiningRef = useRef(false)
  const reactionTimerIdsRef = useRef<number[]>([])
  const pendingIceCandidatesRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map())
  const voiceNoiseGateContextRef = useRef<AudioContext | null>(null)
  const voiceNoiseGateFrameRef = useRef<number | null>(null)
  const voiceActivityContextRef = useRef<AudioContext | null>(null)
  const voiceActivityFrameRef = useRef<number | null>(null)
  const localSpeakingRef = useRef(false)
  const restoredVoiceChannelRef = useRef<number | null>(null)
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
  }, [workspaceId])

  const members = dashboard?.members ?? []
  const projectName = dashboard?.name ?? '스쿼드 프로젝트'
  const isMuted = currentParticipant?.muted ?? false
  const micMuted = isJoined ? isMuted : waitingMicMuted
  const selectedInputLabel =
    audioInputs.find((device) => device.deviceId === selectedInputId)?.label ?? FALLBACK_AUDIO_INPUTS[0].label
  const activeParticipants = participants.filter((participant) => participant.active)
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
  }, [activeChannel?.channelId, isJoined, reconnectExistingVoiceSessionRef, session?.accessToken])

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
  }, [isJoined])

  useEffect(() => {
    if (!activeChannel?.channelId || !session?.accessToken) {
      setPresentUsers([])
      return
    }

    let stopped = false
    const channelId = activeChannel.channelId

    async function syncWaitingRoom() {
      try {
        await touchPresence(channelId)
        const [participantData, presenceData] = await Promise.all([
          fetchParticipants(channelId),
          fetchPresence(channelId),
        ])

        if (stopped) {
          return
        }

        setParticipants(participantData)
        setPresentUsers(presenceData)
      } catch {
        // Presence is a convenience layer for the waiting room; keep the page usable if it misses a beat.
      }
    }

    void syncWaitingRoom()

    const heartbeatId = window.setInterval(() => {
      void touchPresence(channelId).catch(() => undefined)
    }, 10000)
    const refreshId = window.setInterval(() => {
      void syncWaitingRoom()
    }, 5000)
    const handleFocus = () => {
      if (!document.hidden) {
        void syncWaitingRoom()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      stopped = true
      window.clearInterval(heartbeatId)
      window.clearInterval(refreshId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [activeChannel?.channelId, session?.accessToken])

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

  function closeSignalingSocket() {
    const socket = signalingSocketRef.current

    signalingSocketRef.current = null

    if (socket) {
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
    }
  }

  function stopLocalVoiceStream() {
    stopVoiceActivityMonitor()
    stopVoiceNoiseGate()
    const tracks = new Set([
      ...(localVoiceRawStreamRef.current?.getTracks() ?? []),
      ...(localVoiceStreamRef.current?.getTracks() ?? []),
    ])

    tracks.forEach((track) => track.stop())
    localVoiceRawStreamRef.current = null
    localVoiceStreamRef.current = null
    setAudioProcessingStatus((current) => ({ ...current, noiseGate: false }))
  }

  function clearLocalScreenShareStream() {
    const stream = localScreenShareStreamRef.current

    stream?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    localScreenShareStreamRef.current = null
    setLocalScreenShareStream(null)
  }

  function clearLocalCameraStream() {
    const stream = localCameraStreamRef.current

    stream?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    localCameraStreamRef.current = null
    setLocalCameraStream(null)
  }

  function stopVoiceNoiseGate() {
    if (voiceNoiseGateFrameRef.current != null) {
      window.cancelAnimationFrame(voiceNoiseGateFrameRef.current)
      voiceNoiseGateFrameRef.current = null
    }

    void voiceNoiseGateContextRef.current?.close().catch(() => undefined)
    voiceNoiseGateContextRef.current = null
  }

  function stopVoiceActivityMonitor() {
    if (voiceActivityFrameRef.current != null) {
      window.cancelAnimationFrame(voiceActivityFrameRef.current)
      voiceActivityFrameRef.current = null
    }

    void voiceActivityContextRef.current?.close().catch(() => undefined)
    voiceActivityContextRef.current = null
    publishLocalSpeaking(false)
  }

  function publishLocalSpeaking(nextSpeaking: boolean) {
    if (localSpeakingRef.current === nextSpeaking) {
      return
    }

    localSpeakingRef.current = nextSpeaking
    setLocalSpeaking(nextSpeaking)
    setParticipants((currentParticipants) =>
      currentParticipants.map((participant) =>
        participant.userId === session?.userId
          ? { ...participant, speaking: nextSpeaking }
          : participant,
      ),
    )

    void createVoiceEvent(
      nextSpeaking ? 'SPEAKING' : 'STOP_SPEAKING',
      nextSpeaking ? '마이크 입력 감지' : '마이크 입력 종료',
    ).catch(() => undefined)
    broadcastSpeakingState(nextSpeaking)
  }

  function startVoiceActivityMonitor(stream: MediaStream) {
    const AudioContextClass =
      window.AudioContext
      || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    stopVoiceActivityMonitor()

    if (!AudioContextClass) {
      return
    }

    const audioContext = new AudioContextClass()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    const data = new Uint8Array(analyser.frequencyBinCount)
    let ambientLevel = 3
    let speechFrames = 0
    let silentFrames = 0

    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.75
    source.connect(analyser)
    voiceActivityContextRef.current = audioContext

    function tick() {
      if (localVoiceStreamRef.current !== stream) {
        return
      }

      const hasEnabledTrack = stream.getAudioTracks().some((track) => track.enabled && track.readyState === 'live')

      if (!hasEnabledTrack) {
        publishLocalSpeaking(false)
        voiceActivityFrameRef.current = window.requestAnimationFrame(tick)
        return
      }

      analyser.getByteTimeDomainData(data)
      let sum = 0

      for (const value of data) {
        const normalized = (value - 128) / 128
        sum += normalized * normalized
      }

      const level = Math.round(Math.sqrt(sum / data.length) * 240)
      const threshold = Math.max(10, Math.min(42, ambientLevel * 2.6 + 6))

      if (!localSpeakingRef.current || level < threshold) {
        ambientLevel = ambientLevel * 0.96 + Math.min(level, threshold) * 0.04
      }

      if (level >= threshold) {
        speechFrames += 1
        silentFrames = 0

        if (speechFrames >= 3) {
          publishLocalSpeaking(true)
        }
      } else {
        speechFrames = 0
        silentFrames += 1

        if (silentFrames >= 12) {
          publishLocalSpeaking(false)
        }
      }

      voiceActivityFrameRef.current = window.requestAnimationFrame(tick)
    }

    tick()
  }

  function stopRemoteAudioElements() {
    remoteAudioElementsRef.current.forEach((audio) => {
      audio.pause()
      audio.srcObject = null
      audio.remove()
    })
    remoteAudioElementsRef.current.clear()
  }

  function closePeerConnections() {
    peerConnectionsRef.current.forEach((peerConnection) => {
      peerConnection.ontrack = null
      peerConnection.onicecandidate = null
      peerConnection.onconnectionstatechange = null
      peerConnection.onsignalingstatechange = null
      peerConnection.close()
    })
    peerConnectionsRef.current.clear()
    peerTransceiversRef.current.clear()
    pendingIceCandidatesRef.current.clear()
    makingOffersRef.current.clear()
    departedPeerIdsRef.current.clear()
    stopRemoteAudioElements()
    remoteCameraStreamsRef.current.clear()
    remoteCameraPendingRef.current.clear()
    remoteScreenShareViewsRef.current.clear()
    remoteScreenSharePendingRef.current.clear()
    setRemoteCameraStreams(new Map())
    setRemoteScreenShares(new Map())
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

  function setLocalVoiceMuted(muted: boolean) {
    localVoiceStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted
    })

    if (muted) {
      stopMinutesSpeechRecognition()
      publishLocalSpeaking(false)
    }
  }

  function getAudioConstraints(deviceId: string): MediaStreamConstraints {
    const baseConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }

    return {
      audio:
        deviceId && deviceId !== 'default'
          ? { ...baseConstraints, deviceId: { exact: deviceId } }
          : baseConstraints,
    }
  }

  function getCameraConstraints(): MediaStreamConstraints {
    return {
      audio: false,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
    }
  }

  function updateAudioProcessingStatus(stream: MediaStream, noiseGate: boolean) {
    const settings = stream.getAudioTracks()[0]?.getSettings() as MediaTrackSettings & {
      echoCancellation?: boolean
      noiseSuppression?: boolean
      autoGainControl?: boolean
    }

    setAudioProcessingStatus({
      echoCancellation: settings.echoCancellation ?? null,
      noiseSuppression: settings.noiseSuppression ?? null,
      autoGainControl: settings.autoGainControl ?? null,
      noiseGate,
    })
  }

  async function applyAudioProcessingConstraints(stream: MediaStream) {
    await Promise.all(
      stream.getAudioTracks().map((track) =>
        track.applyConstraints({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }).catch(() => undefined),
      ),
    )
  }

  function createNoiseGatedVoiceStream(rawStream: MediaStream) {
    const AudioContextClass =
      window.AudioContext
      || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    stopVoiceNoiseGate()

    if (!AudioContextClass) {
      return rawStream
    }

    const audioContext = new AudioContextClass()
    const source = audioContext.createMediaStreamSource(rawStream)
    const analyser = audioContext.createAnalyser()
    const gate = audioContext.createGain()
    const destination = audioContext.createMediaStreamDestination()
    const data = new Uint8Array(analyser.frequencyBinCount)
    let ambientRms = 0.006

    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.65
    gate.gain.setValueAtTime(1, audioContext.currentTime)
    source.connect(analyser)
    source.connect(gate)
    gate.connect(destination)
    voiceNoiseGateContextRef.current = audioContext

    function tick() {
      analyser.getByteTimeDomainData(data)
      let mean = 0

      for (const value of data) {
        mean += value
      }

      mean /= data.length

      let sum = 0

      for (const value of data) {
        const normalized = (value - mean) / 128
        sum += normalized * normalized
      }

      const rms = Math.sqrt(sum / data.length)
      const ambientSample = Math.min(rms, ambientRms + 0.008)
      ambientRms = ambientRms * 0.985 + ambientSample * 0.015

      const threshold = Math.max(0.014, ambientRms * 2.3)
      const targetGain = rms > threshold ? 1 : 0.08

      gate.gain.setTargetAtTime(targetGain, audioContext.currentTime, targetGain === 1 ? 0.015 : 0.08)
      voiceNoiseGateFrameRef.current = window.requestAnimationFrame(tick)
    }

    tick()

    return destination.stream
  }

  async function startLocalVoiceStream(muted: boolean) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('이 브라우저에서는 음성 회의 마이크를 사용할 수 없습니다.')
    }

    stopLocalVoiceStream()

    const rawStream = await getUserMediaWithTimeout(getAudioConstraints(selectedInputId))
    await applyAudioProcessingConstraints(rawStream)
    const stream = createNoiseGatedVoiceStream(rawStream)

    localVoiceRawStreamRef.current = rawStream
    localVoiceStreamRef.current = stream
    updateAudioProcessingStatus(rawStream, stream !== rawStream)
    setLocalVoiceMuted(muted)
    startVoiceActivityMonitor(stream)

    return stream
  }

  async function startLocalVoiceStreamIfAvailable(muted: boolean) {
    try {
      await startLocalVoiceStream(muted)
      return true
    } catch (voiceError) {
      stopLocalVoiceStream()
      setAudioDeviceError(voiceError instanceof Error ? voiceError.message : '마이크를 사용할 수 없습니다.')
      setWaitingMicMuted(true)
      return false
    }
  }

  async function replaceLocalVoiceInput() {
    if (!localVoiceStreamRef.current || !navigator.mediaDevices?.getUserMedia) {
      return
    }

    const nextRawStream = await getUserMediaWithTimeout(getAudioConstraints(selectedInputId))
    await applyAudioProcessingConstraints(nextRawStream)
    const nextStream = createNoiseGatedVoiceStream(nextRawStream)
    const [nextTrack] = nextStream.getAudioTracks()

    if (!nextTrack) {
      nextRawStream.getTracks().forEach((track) => track.stop())
      nextStream.getTracks().forEach((track) => track.stop())
      return
    }

    nextTrack.enabled = !micMuted

    await Promise.all(
      Array.from(peerTransceiversRef.current.values()).map(({ microphone }) => {
        microphone.sender.setStreams(nextStream)
        return microphone.sender.replaceTrack(nextTrack)
      }),
    )

    const oldTracks = new Set([
      ...(localVoiceRawStreamRef.current?.getTracks() ?? []),
      ...(localVoiceStreamRef.current?.getTracks() ?? []),
    ])

    oldTracks.forEach((track) => track.stop())
    localVoiceRawStreamRef.current = nextRawStream
    localVoiceStreamRef.current = nextStream
    updateAudioProcessingStatus(nextRawStream, nextStream !== nextRawStream)
    startVoiceActivityMonitor(nextStream)
  }

  function createRemoteAudioElement(userId: number) {
    const existingAudio = remoteAudioElementsRef.current.get(userId)

    if (existingAudio) {
      existingAudio.muted = remoteAudioMutedRef.current
      return existingAudio
    }

    const audio = document.createElement('audio') as SinkAudioElement

    audio.autoplay = true
    audio.muted = remoteAudioMutedRef.current
    audio.dataset.voicePeerId = String(userId)
    remoteAudioElementsRef.current.set(userId, audio)
    remoteAudioContainerRef.current?.appendChild(audio)
    void applySelectedOutputToAudio(audio)

    return audio
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

  function getVoiceDisplayName(userId: number, fallbackName?: string) {
    return members.find((member) => member.learnerId === userId)?.learnerName
      ?? participants.find((participant) => participant.userId === userId)?.userName
      ?? activeParticipants.find((participant) => participant.userId === userId)?.userName
      ?? fallbackName
      ?? '참가자'
  }

  function clearRemoteScreenShare(userId: number, removeTrack = false) {
    if (removeTrack) {
      remoteScreenShareViewsRef.current.delete(userId)
    }
    remoteScreenSharePendingRef.current.delete(userId)
    setRemoteScreenShares((current) => {
      if (!current.has(userId)) {
        return current
      }

      const next = new Map(current)

      next.delete(userId)
      return next
    })
  }

  function clearRemoteCameraStream(userId: number, removeTrack = false) {
    if (removeTrack) {
      remoteCameraStreamsRef.current.delete(userId)
    }
    remoteCameraPendingRef.current.delete(userId)

    setRemoteCameraStreams((current) => {
      if (!current.has(userId)) {
        return current
      }

      const next = new Map(current)

      next.delete(userId)
      return next
    })
  }

  function attachRemoteScreenStream(userId: number, userName: string, stream: MediaStream, track: MediaStreamTrack) {
    const screenStream = stream.getVideoTracks().includes(track) ? stream : new MediaStream([track])
    const screenShareView = {
      userId,
      userName: getVoiceDisplayName(userId, userName),
      stream: screenStream,
      local: false,
    }

    remoteScreenShareViewsRef.current.set(userId, screenShareView)
    if (remoteScreenSharePendingRef.current.has(userId)) {
      setRemoteScreenShares((current) => new Map(current).set(userId, screenShareView))
    }

    track.onended = () => {
      clearRemoteScreenShare(userId, true)
    }
    track.onunmute = () => {
      if (remoteScreenSharePendingRef.current.has(userId)) {
        setRemoteScreenShares((current) => new Map(current).set(userId, screenShareView))
      }
    }
  }

  function attachRemoteCameraStream(userId: number, userName: string, stream: MediaStream, track: MediaStreamTrack) {
    const cameraStream = stream.getVideoTracks().includes(track) ? stream : new MediaStream([track])
    const cameraView = {
      userId,
      userName: getVoiceDisplayName(userId, userName),
      stream: cameraStream,
      local: false,
    }

    remoteCameraStreamsRef.current.set(userId, cameraView)
    if (remoteCameraPendingRef.current.has(userId)) {
      setRemoteCameraStreams((current) => {
        const next = new Map(current)

        next.set(userId, cameraView)
        return next
      })
    }

    track.onended = () => {
      clearRemoteCameraStream(userId, true)
    }
    track.onunmute = () => {
      if (remoteCameraPendingRef.current.has(userId)) {
        setRemoteCameraStreams((current) => new Map(current).set(userId, cameraView))
      }
    }
  }

  function attachRemoteTrack(
    userId: number,
    userName: string,
    stream: MediaStream,
    track: MediaStreamTrack,
    transceiverIndex: number,
  ) {
    if (transceiverIndex === 1) {
      attachRemoteCameraStream(userId, userName, stream, track)
      return
    }

    if (transceiverIndex === 2) {
      attachRemoteScreenStream(userId, userName, stream, track)
      return
    }

    const audio = createRemoteAudioElement(userId)

    audio.muted = remoteAudioMutedRef.current
    audio.srcObject = stream
    void audio.play().catch(() => undefined)
  }

  function removeRemotePeer(userId: number) {
    const peerConnection = peerConnectionsRef.current.get(userId)

    if (peerConnection) {
      peerConnection.close()
      peerConnectionsRef.current.delete(userId)
    }

    peerTransceiversRef.current.delete(userId)
    makingOffersRef.current.delete(userId)
    pendingIceCandidatesRef.current.delete(userId)

    const audio = remoteAudioElementsRef.current.get(userId)

    if (audio) {
      audio.pause()
      audio.srcObject = null
      audio.remove()
      remoteAudioElementsRef.current.delete(userId)
    }

    clearRemoteCameraStream(userId, true)
    clearRemoteScreenShare(userId, true)
  }

  function sendSignalingMessage(
    type: 'offer' | 'answer' | 'ice-candidate',
    targetUserId: number,
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ) {
    const socket = signalingSocketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(JSON.stringify({ type, targetUserId, payload }))
  }

  function broadcastScreenShareState(type: 'screen-share-start' | 'screen-share-stop') {
    const socket = signalingSocketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(JSON.stringify({
      type,
      payload: {
        sharing: type === 'screen-share-start',
        streamId: localScreenShareStreamRef.current?.id,
        trackId: localScreenShareStreamRef.current?.getVideoTracks()[0]?.id,
      },
    }))
  }

  function broadcastMeetingSync(type: 'chat-message' | 'minutes-updated', payload: VoiceMeetingSyncPayload) {
    const socket = signalingSocketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(JSON.stringify({ type, payload }))
  }

  function broadcastCameraState(type: 'camera-start' | 'camera-stop') {
    const socket = signalingSocketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(JSON.stringify({
      type,
      payload: {
        enabled: type === 'camera-start',
        streamId: localCameraStreamRef.current?.id,
      },
    }))
  }

  function broadcastSpeakingState(speaking: boolean) {
    const socket = signalingSocketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(JSON.stringify({ type: speaking ? 'speaking' : 'stop-speaking', payload: { speaking } }))
  }

  function getCurrentRemoteVoicePeers() {
    const peers = new Map<number, VoiceSignalingPeer>()

    function collectPeer(userId: number | null | undefined, userName: string | null | undefined, active = true) {
      if (!active || !userId || userId === session?.userId || peers.has(userId)) {
        return
      }

      peers.set(userId, {
        userId,
        userName: userName ?? getVoiceDisplayName(userId),
      })
    }

    roomParticipants.forEach((participant) => {
      collectPeer(participant.userId, participant.userName, participant.active)
    })
    participants.forEach((participant) => {
      collectPeer(participant.userId, participant.userName, participant.active)
    })
    activeParticipants.forEach((participant) => {
      collectPeer(participant.userId, participant.userName, participant.active)
    })

    return Array.from(peers.values())
  }

  function ensurePeerConnectionsForCurrentParticipants() {
    getCurrentRemoteVoicePeers().forEach((peer) => {
      getOrCreatePeerConnection(peer)
    })
  }

  async function addCameraTrackToPeers(stream: MediaStream) {
    const [videoTrack] = stream.getVideoTracks()

    if (!videoTrack) {
      return
    }

    ensurePeerConnectionsForCurrentParticipants()
    await Promise.all(
      Array.from(peerTransceiversRef.current.values()).map(({ camera }) => {
        camera.sender.setStreams(stream)
        return camera.sender.replaceTrack(videoTrack)
      }),
    )
  }

  async function removeCameraTracksFromPeers() {
    await Promise.all(
      Array.from(peerTransceiversRef.current.values()).map(({ camera }) => camera.sender.replaceTrack(null)),
    )
  }

  async function addScreenShareTrackToPeers(stream: MediaStream) {
    const [videoTrack] = stream.getVideoTracks()

    if (!videoTrack) {
      return
    }

    ensurePeerConnectionsForCurrentParticipants()
    await Promise.all(
      Array.from(peerTransceiversRef.current.values()).map(({ screen }) => {
        screen.sender.setStreams(stream)
        return screen.sender.replaceTrack(videoTrack)
      }),
    )
  }

  async function removeScreenShareTracksFromPeers() {
    await Promise.all(
      Array.from(peerTransceiversRef.current.values()).map(({ screen }) => screen.sender.replaceTrack(null)),
    )
  }

  async function attachLocalVoiceTrackToPeers(stream: MediaStream) {
    const [audioTrack] = stream.getAudioTracks()

    if (!audioTrack) {
      return
    }

    ensurePeerConnectionsForCurrentParticipants()
    await Promise.all(
      Array.from(peerTransceiversRef.current.values()).map(({ microphone }) => {
        microphone.sender.setStreams(stream)
        return microphone.sender.replaceTrack(audioTrack)
      }),
    )
  }

  async function stopLocalCamera({
    notify = true,
    renegotiate = true,
  }: {
    notify?: boolean
    renegotiate?: boolean
  } = {}) {
    if (!localCameraStreamRef.current) {
      return
    }

    if (notify) {
      broadcastCameraState('camera-stop')
    }

    if (renegotiate) {
      await removeCameraTracksFromPeers()
    }

    clearLocalCameraStream()
  }

  async function startLocalCamera() {
    if (!activeChannel || !isJoined) {
      showAuthToast({ message: 'Join the meeting before turning on camera.', durationMs: 1800 })
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      showAuthToast({ message: 'Camera is not available in this browser.', durationMs: 2200 })
      return
    }

    try {
      const stream = await getUserMediaWithTimeout(getCameraConstraints())
      const [videoTrack] = stream.getVideoTracks()

      if (!videoTrack) {
        stream.getTracks().forEach((track) => track.stop())
        showAuthToast({ message: 'No camera video track was found.', durationMs: 2200 })
        return
      }

      await stopLocalCamera({ notify: false })
      localCameraStreamRef.current = stream
      setLocalCameraStream(stream)
      videoTrack.onended = () => {
        void stopLocalCamera()
      }

      broadcastCameraState('camera-start')
      await addCameraTrackToPeers(stream)
      showAuthToast({ message: 'Camera turned on.', durationMs: 1600 })
    } catch (cameraError) {
      clearLocalCameraStream()

      if (cameraError instanceof DOMException && cameraError.name === 'NotAllowedError') {
        showAuthToast({ message: 'Camera permission was denied.', durationMs: 1800 })
        return
      }

      showAuthToast({ message: 'Could not turn on camera.', durationMs: 2200 })
    }
  }

  async function toggleCamera() {
    if (localCameraStreamRef.current) {
      await stopLocalCamera()
      showAuthToast({ message: 'Camera turned off.', durationMs: 1600 })
      return
    }

    await startLocalCamera()
  }

  async function stopScreenShare({
    notify = true,
    renegotiate = true,
  }: {
    notify?: boolean
    renegotiate?: boolean
  } = {}) {
    if (!localScreenShareStreamRef.current) {
      return
    }

    if (notify) {
      broadcastScreenShareState('screen-share-stop')
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel?.name ?? '음성 회의'}" 화면 공유를 종료했습니다.`,
        targetPath: '/squad-meeting',
      })
    }

    if (renegotiate) {
      await removeScreenShareTracksFromPeers()
    }

    clearLocalScreenShareStream()
  }

  async function startScreenShare() {
    if (!activeChannel || !isJoined) {
      showAuthToast({ message: '먼저 음성 회의에 입장해 주세요.', durationMs: 1800 })
      return
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      showAuthToast({ message: '이 브라우저에서는 화면 공유를 사용할 수 없습니다.', durationMs: 2200 })
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const [videoTrack] = stream.getVideoTracks()

      if (!videoTrack) {
        stream.getTracks().forEach((track) => track.stop())
        showAuthToast({ message: '공유할 화면 비디오를 찾지 못했습니다.', durationMs: 2200 })
        return
      }

      await stopScreenShare({ notify: false })

      localScreenShareStreamRef.current = stream
      setLocalScreenShareStream(stream)
      videoTrack.onended = () => {
        void stopScreenShare()
      }

      broadcastScreenShareState('screen-share-start')
      await addScreenShareTrackToPeers(stream)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}"에서 화면 공유를 시작했습니다.`,
        targetPath: '/squad-meeting',
      })
      showAuthToast({ message: '화면 공유를 시작했습니다.', durationMs: 1800 })
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'NotAllowedError') {
        showAuthToast({ message: '화면 공유가 취소되었습니다.', durationMs: 1800 })
        return
      }

      showAuthToast({ message: '화면 공유를 시작하지 못했습니다.', durationMs: 2200 })
    }
  }

  async function toggleScreenShare() {
    if (localScreenShareStreamRef.current) {
      await stopScreenShare()
      showAuthToast({ message: '화면 공유를 종료했습니다.', durationMs: 1600 })
      return
    }

    await startScreenShare()
  }

  function showFloatingReaction(reaction: string, fromUserId?: number, fromUserName?: string) {
    const normalizedReaction = normalizeVoiceReaction(reaction)

    if (!normalizedReaction) {
      return
    }

    const controlRect = controlBoxRef.current?.getBoundingClientRect()
    const id = createFloatingReactionId()
    const timerId = window.setTimeout(() => {
      setFloatingReactions((current) => current.filter((item) => item.id !== id))
      reactionTimerIdsRef.current = reactionTimerIdsRef.current.filter((item) => item !== timerId)
    }, FLOATING_REACTION_VISIBLE_MS)

    reactionTimerIdsRef.current.push(timerId)
    setFloatingReactions((current) => [
      ...current.slice(-7),
      {
        id,
        reaction: normalizedReaction,
        left: controlRect ? controlRect.left + controlRect.width / 2 : window.innerWidth / 2,
        dx: (Math.random() - 0.5) * 300,
        fromUserId,
        fromUserName,
      },
    ])
  }

  function broadcastVoiceReaction(reaction: string) {
    const socket = signalingSocketRef.current
    const normalizedReaction = normalizeVoiceReaction(reaction)

    if (!socket || socket.readyState !== WebSocket.OPEN || !normalizedReaction) {
      return
    }

    socket.send(JSON.stringify({ type: 'reaction', payload: { reaction: normalizedReaction } }))
  }

  function sendRoomReaction(reaction: string) {
    showFloatingReaction(reaction, session?.userId ?? undefined, session?.name)
    broadcastVoiceReaction(reaction)
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
    if (!session?.accessToken) {
      setVoiceConnectionStatus('error')
      setVoiceConnectionError('로그인 세션이 없어 음성 시그널링에 연결할 수 없습니다.')
      return
    }

    closeSignalingSocket()
    closePeerConnections()
    setVoiceConnectionStatus('connecting')
    setVoiceConnectionError(null)

    const socket = new WebSocket(buildVoiceSignalingUrl(channelId, session.accessToken))

    signalingSocketRef.current = socket
    socket.onopen = () => {
      if (signalingSocketRef.current === socket) {
        setVoiceConnectionStatus('connected')
      }
    }
    socket.onmessage = (event) => {
      void handleVoiceSignalingMessage(event.data).catch(() => {
        setVoiceConnectionStatus('error')
        setVoiceConnectionError('음성 회의 연결 정보를 처리하지 못했습니다.')
      })
    }
    socket.onerror = () => {
      if (signalingSocketRef.current === socket) {
        setVoiceConnectionStatus('error')
        setVoiceConnectionError('음성 시그널링 서버에 연결하지 못했습니다.')
      }
    }
    socket.onclose = () => {
      if (signalingSocketRef.current === socket) {
        signalingSocketRef.current = null
        closePeerConnections()
        setVoiceConnectionStatus('idle')
      }
    }
  }

  async function fetchParticipants(channelId: number) {
    return fetchSquadVoiceParticipants(channelId)
  }

  async function fetchPresence(channelId: number) {
    return fetchSquadVoicePresence(channelId)
  }

  async function touchPresence(channelId: number) {
    return touchSquadVoicePresence(channelId)
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
