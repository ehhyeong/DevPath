import {
type MouseEvent as ReactMouseEvent,
type PointerEvent as ReactPointerEvent,
type WheelEvent as ReactWheelEvent,
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
appendSquadVoiceMinutesTranscriptLine,
clearSquadVoiceChatMessages,
createSquadVoiceEvent,
createSquadVoiceMinutesKanbanTasks,
createSquadVoiceMinutesSummary,
fetchSquadVoiceChatMessages,
fetchSquadVoiceMinutes,
fetchSquadVoiceParticipants,
fetchSquadVoicePresence,
joinSquadVoiceChannel,
leaveSquadVoiceChannel,
loadSquadMeetingInitialData,
sendSquadVoiceChatMessage,
touchSquadVoicePresence,
updateSquadVoiceMinutes,
} from './meeting-api'
import { createSquadNotification,squadActorName } from '../notifications'
import { FALLBACK_AUDIO_INPUTS,FALLBACK_AUDIO_OUTPUTS,FLOATING_REACTION_VISIBLE_MS,INITIAL_AUDIO_PROCESSING_STATUS,INITIAL_NETWORK_STATUS,SCREEN_SHARE_MIN_ZOOM,SCREEN_SHARE_WHEEL_ZOOM_STEP,type VoicePeerTransceivers,buildNetworkStatus,buildSecurityStatus,buildVoiceSignalingUrl,clampScreenShareZoom,createFloatingReactionId,formatElapsedTime,getBrowserNetworkInformation,getNetworkBadgeClass,getNetworkIconClass,getSecurityBadgeClass,getSecurityIconClass,getUserMediaWithTimeout,getVoiceMeetingSessionStartedAt,getWorkspaceIdFromUrl,normalizeVoiceMeetingSummaryResponse,normalizeVoiceReaction,useLatest } from './meeting-support'
import type {
AudioDeviceOption,
AudioProcessingStatus,
CameraView,
FloatingReaction,
NetworkStatus,
RoomPanelTab,
ScreenShareDragState,
ScreenSharePan,
ScreenShareView,
SinkAudioElement,
SpeechRecognitionLike,
VoiceChannel,
VoiceChatMessage,
VoiceConnectionStatus,
VoiceEventType,
VoiceMeetingActionItem,
VoiceMeetingMinutes,
VoiceMeetingSyncPayload,
VoiceParticipant,
VoicePresence,
VoiceReactionPayload,
VoiceSignalingMessage,
VoiceSignalingPeer,
WindowWithSpeechRecognition,
WorkspaceDashboard
} from './meeting-types'

export function useSquadMeetingController() {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
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
  const [voiceChatMessages, setVoiceChatMessages] = useState<VoiceChatMessage[]>([])
  const [voiceChatInput, setVoiceChatInput] = useState('')
  const [voiceMinutes, setVoiceMinutes] = useState<VoiceMeetingMinutes | null>(null)
  const [minutesDraft, setMinutesDraft] = useState('')
  const [minutesActionItems, setMinutesActionItems] = useState<VoiceMeetingActionItem[]>([])
  const [selectedMinutesActionItems, setSelectedMinutesActionItems] = useState<number[]>([])
  const [minutesSummaryReportOpen, setMinutesSummaryReportOpen] = useState(false)
  const [chatSending, setChatSending] = useState(false)
  const [chatClearing, setChatClearing] = useState(false)
  const [minutesSaving, setMinutesSaving] = useState(false)
  const [kanbanTaskCreating, setKanbanTaskCreating] = useState(false)
  const [speechRecognitionActive, setSpeechRecognitionActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const [audioInputs, setAudioInputs] = useState<AudioDeviceOption[]>(FALLBACK_AUDIO_INPUTS)
  const [audioOutputs, setAudioOutputs] = useState<AudioDeviceOption[]>(FALLBACK_AUDIO_OUTPUTS)
  const [selectedInputId, setSelectedInputId] = useState(FALLBACK_AUDIO_INPUTS[0].deviceId)
  const [selectedOutputId, setSelectedOutputId] = useState(FALLBACK_AUDIO_OUTPUTS[0].deviceId)
  const [remoteAudioMuted, setRemoteAudioMuted] = useState(false)
  const [audioDeviceError, setAudioDeviceError] = useState<string | null>(null)
  const [audioProcessingStatus, setAudioProcessingStatus] = useState<AudioProcessingStatus>(INITIAL_AUDIO_PROCESSING_STATUS)
  const [micLevel, setMicLevel] = useState(0)
  const [speakerLevel, setSpeakerLevel] = useState(0)
  const [micTesting, setMicTesting] = useState(false)
  const [soundTesting, setSoundTesting] = useState(false)
  const [waitingMicMuted, setWaitingMicMuted] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(INITIAL_NETWORK_STATUS)
  const [voiceConnectionStatus, setVoiceConnectionStatus] = useState<VoiceConnectionStatus>('idle')
  const [voiceConnectionError, setVoiceConnectionError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [, setLocalSpeaking] = useState(false)
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null)
  const [remoteCameraStreams, setRemoteCameraStreams] = useState<Map<number, CameraView>>(() => new Map())
  const [localScreenShareStream, setLocalScreenShareStream] = useState<MediaStream | null>(null)
  const [remoteScreenShares, setRemoteScreenShares] = useState<Map<number, ScreenShareView>>(() => new Map())
  const [screenSharePlayerOpen, setScreenSharePlayerOpen] = useState(false)
  const [screenSharePlayerUserId, setScreenSharePlayerUserId] = useState<number | null>(null)
  const [screenShareZoom, setScreenShareZoom] = useState(SCREEN_SHARE_MIN_ZOOM)
  const [screenSharePan, setScreenSharePan] = useState<ScreenSharePan>({ x: 0, y: 0 })
  const [screenShareDragging, setScreenShareDragging] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const micStreamRef = useRef<MediaStream | null>(null)
  const localVoiceStreamRef = useRef<MediaStream | null>(null)
  const localVoiceRawStreamRef = useRef<MediaStream | null>(null)
  const localCameraStreamRef = useRef<MediaStream | null>(null)
  const localScreenShareStreamRef = useRef<MediaStream | null>(null)
  const remoteCameraStreamsRef = useRef<Map<number, CameraView>>(new Map())
  const remoteCameraPendingRef = useRef<Set<number>>(new Set())
  const remoteScreenShareViewsRef = useRef<Map<number, ScreenShareView>>(new Map())
  const remoteScreenSharePendingRef = useRef<Set<number>>(new Set())
  const screenShareDragRef = useRef<ScreenShareDragState | null>(null)
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
  const audioContextRef = useRef<AudioContext | null>(null)
  const micLoopbackAudioRef = useRef<SinkAudioElement | null>(null)
  const soundTestAudioRef = useRef<SinkAudioElement | null>(null)
  const soundTestContextRef = useRef<AudioContext | null>(null)
  const soundTestOscillatorRef = useRef<OscillatorNode | null>(null)
  const soundTestGainRef = useRef<GainNode | null>(null)
  const speakerMeterIntervalRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const voiceNoiseGateContextRef = useRef<AudioContext | null>(null)
  const voiceNoiseGateFrameRef = useRef<number | null>(null)
  const voiceActivityContextRef = useRef<AudioContext | null>(null)
  const voiceActivityFrameRef = useRef<number | null>(null)
  const localSpeakingRef = useRef(false)
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const speechRecognitionRestartRef = useRef(false)
  const minutesTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const minutesAppendErrorShownRef = useRef(false)
  const restoredVoiceChannelRef = useRef<number | null>(null)
  const disconnectVoiceSessionRef = useLatest(disconnectVoiceSession)
  const closeScreenSharePlayerRef = useLatest(closeScreenSharePlayer)
  const applySelectedOutputToRemoteAudioRef = useLatest(applySelectedOutputToRemoteAudio)
  const applySelectedOutputToTestAudioRef = useLatest(applySelectedOutputToTestAudio)
  const loadAudioDevicesRef = useLatest(loadAudioDevices)
  const stopMicMonitorRef = useLatest(stopMicMonitor)
  const reconnectExistingVoiceSessionRef = useLatest(reconnectExistingVoiceSession)
  const startMinutesSpeechRecognitionRef = useLatest(startMinutesSpeechRecognition)
  const startMicMonitorRef = useLatest(startMicMonitor)
  const shouldSyncMinutesDraftFromServerRef = useLatest(shouldSyncMinutesDraftFromServer)

  useEffect(() => {
    document.title = 'DevPath - 음성 회의'
    const html = document.documentElement
    const body = document.body

    const root = document.getElementById('root')
    const appViewport = document.querySelector<HTMLElement>('.app-viewport')
    html.classList.add('h-full!', 'overflow-hidden!')
    body.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    root?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    appViewport?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')

    return () => {
      html.classList.remove('h-full!', 'overflow-hidden!')
      body.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      root?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      appViewport?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    }
  }, [])

  useEffect(() => () => disconnectVoiceSessionRef.current(), [disconnectVoiceSessionRef])

  useEffect(() => () => {
    reactionTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId))
    reactionTimerIdsRef.current = []
  }, [])

  useEffect(() => {
    const selectedScreenShareExists = screenSharePlayerUserId != null
      && (screenSharePlayerUserId === session?.userId
        ? Boolean(localScreenShareStream)
        : remoteScreenShares.has(screenSharePlayerUserId))

    if ((!localScreenShareStream && remoteScreenShares.size === 0) || (screenSharePlayerOpen && !selectedScreenShareExists)) {
      resetScreenSharePlayer()
      setScreenSharePlayerOpen(false)
      setScreenSharePlayerUserId(null)
    }
  }, [localScreenShareStream, remoteScreenShares, screenSharePlayerOpen, screenSharePlayerUserId, session?.userId])

  useEffect(() => {
    if (!screenSharePlayerOpen) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeScreenSharePlayerRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeScreenSharePlayerRef, screenSharePlayerOpen])

  useEffect(() => {
    if (!screenSharePlayerOpen) {
      return undefined
    }

    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        resetScreenSharePlayer()
        setScreenSharePlayerOpen(false)
        setScreenSharePlayerUserId(null)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [screenSharePlayerOpen])

  useEffect(() => {
    void applySelectedOutputToRemoteAudioRef.current()
    void applySelectedOutputToTestAudioRef.current()
  }, [applySelectedOutputToRemoteAudioRef, applySelectedOutputToTestAudioRef, selectedOutputId])

  useEffect(() => {
    const stopCurrentMicMonitor = stopMicMonitorRef.current
    void loadAudioDevicesRef.current(false)

    function handleDeviceChange() {
      void loadAudioDevicesRef.current(false)
    }

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
      stopCurrentMicMonitor()
      stopSoundTest()
    }
  }, [loadAudioDevicesRef, stopMicMonitorRef])

  useEffect(() => {
    if (!audioSettingsOpen) {
      stopSoundTest()
    }
  }, [audioSettingsOpen])

  useEffect(() => {
    const connection = getBrowserNetworkInformation()
    let stopped = false
    let controller: AbortController | null = null

    async function measureNetwork() {
      controller?.abort()
      controller = new AbortController()

      if (!navigator.onLine) {
        setNetworkStatus(buildNetworkStatus(null))
        return
      }

      const startedAt = performance.now()
      const probePath = activeChannelId
        ? `/api/voice-channels/${activeChannelId}/participants`
        : '/api/lounge/shell'
      const headers = new Headers({ Accept: 'application/json' })

      if (session?.accessToken) {
        headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
      }

      try {
        await fetch(`${probePath}?networkCheck=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          headers,
          signal: controller.signal,
        })

        if (!stopped) {
          setNetworkStatus(buildNetworkStatus(Math.round(performance.now() - startedAt)))
        }
      } catch (networkError) {
        if (!stopped && !(networkError instanceof DOMException && networkError.name === 'AbortError')) {
          setNetworkStatus(buildNetworkStatus(null, true))
        }
      }
    }

    function handleNetworkChange() {
      void measureNetwork()
    }

    window.addEventListener('online', handleNetworkChange)
    window.addEventListener('offline', handleNetworkChange)
    connection?.addEventListener('change', handleNetworkChange)
    void measureNetwork()

    const intervalId = window.setInterval(() => {
      void measureNetwork()
    }, 15000)

    return () => {
      stopped = true
      controller?.abort()
      window.clearInterval(intervalId)
      window.removeEventListener('online', handleNetworkChange)
      window.removeEventListener('offline', handleNetworkChange)
      connection?.removeEventListener('change', handleNetworkChange)
    }
  }, [activeChannelId, session?.accessToken, session?.tokenType])

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
  const currentParticipant = participants.find((participant) => participant.userId === session?.userId) ?? null
  const isJoined = Boolean(currentParticipant?.active)
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
    if (!isJoined) {
      stopMinutesSpeechRecognition()
    }
  }, [isJoined])

  useEffect(() => {
    if (!isJoined || !voiceMinutes?.recording || isMuted) {
      stopMinutesSpeechRecognition()
      return
    }

    if (!speechRecognitionRef.current) {
      startMinutesSpeechRecognitionRef.current()
    }
  }, [activeChannel?.channelId, isJoined, isMuted, startMinutesSpeechRecognitionRef, voiceMinutes?.recording])

  useEffect(() => {
    const stopCurrentMicMonitor = stopMicMonitorRef.current

    if (!session?.accessToken || !activeChannel?.channelId) {
      stopCurrentMicMonitor()
      return
    }

    const shouldMonitorMic = audioSettingsOpen || (!isJoined && !waitingMicMuted)

    if (!shouldMonitorMic) {
      stopCurrentMicMonitor()
      return
    }

    let stopped = false

    void loadAudioDevicesRef.current(true).then(() => {
      if (!stopped) {
        void startMicMonitorRef.current(selectedInputId)
      }
    })

    return () => {
      stopped = true
      stopCurrentMicMonitor()
    }
  }, [activeChannel?.channelId, audioSettingsOpen, isJoined, loadAudioDevicesRef, selectedInputId, session?.accessToken, startMicMonitorRef, stopMicMonitorRef, waitingMicMuted])

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

  useEffect(() => {
    if (!activeChannel?.channelId || !isJoined || !session?.accessToken) {
      setVoiceChatMessages([])
      setVoiceChatInput('')
      setVoiceMinutes(null)
      setMinutesDraft('')
      setMinutesActionItems([])
      setSelectedMinutesActionItems([])
      setMinutesSummaryReportOpen(false)
      setRoomPanelTab('minutes')
      return
    }

    const channelId = activeChannel.channelId
    let stopped = false

    async function syncMeetingPanel() {
      try {
        const [messages, minutes] = await Promise.all([
          fetchVoiceChatMessages(channelId),
          fetchVoiceMinutes(channelId),
        ])

        if (stopped) {
          return
        }

        setVoiceChatMessages(messages)
        setVoiceMinutes(minutes)
        if (shouldSyncMinutesDraftFromServerRef.current()) {
          setMinutesDraft(minutes.transcript ?? '')
        }
      } catch {
        // The call itself should stay usable even if the side panel refresh misses once.
      }
    }

    async function syncRoomPanel() {
      try {
        const [messages, minutes] = await Promise.all([
          fetchVoiceChatMessages(channelId),
          fetchVoiceMinutes(channelId),
        ])

        if (stopped) {
          return
        }

        setVoiceChatMessages(messages)
        setVoiceMinutes(minutes)

        if (shouldSyncMinutesDraftFromServerRef.current()) {
          setMinutesDraft(minutes.transcript ?? '')
        }
      } catch {
        // Room panel polling is a convenience layer.
      }
    }

    void syncMeetingPanel()
    const refreshId = window.setInterval(() => {
      void syncRoomPanel()
    }, 4000)

    return () => {
      stopped = true
      window.clearInterval(refreshId)
    }
  }, [activeChannel?.channelId, isJoined, session?.accessToken, shouldSyncMinutesDraftFromServerRef])

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

  function toDeviceOption(device: MediaDeviceInfo, index: number, fallbackLabel: string): AudioDeviceOption {
    return {
      deviceId: device.deviceId || 'default',
      label: device.label || `${fallbackLabel} ${index + 1}`,
    }
  }

  async function loadAudioDevices(requestPermission: boolean) {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setAudioInputs(FALLBACK_AUDIO_INPUTS)
      setAudioOutputs(FALLBACK_AUDIO_OUTPUTS)
      setAudioDeviceError('이 브라우저에서는 오디오 장치 목록을 가져올 수 없습니다.')
      return
    }

    let permissionStream: MediaStream | null = null

    try {
      if (requestPermission) {
        permissionStream = await getUserMediaWithTimeout({ audio: true })
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const nextInputs = devices
        .filter((device) => device.kind === 'audioinput')
        .map((device, index) => toDeviceOption(device, index, '마이크'))
      const nextOutputs = devices
        .filter((device) => device.kind === 'audiooutput')
        .map((device, index) => toDeviceOption(device, index, '스피커'))
      const normalizedInputs = nextInputs.length > 0 ? nextInputs : FALLBACK_AUDIO_INPUTS
      const normalizedOutputs = nextOutputs.length > 0 ? nextOutputs : FALLBACK_AUDIO_OUTPUTS

      setAudioInputs(normalizedInputs)
      setAudioOutputs(normalizedOutputs)
      setSelectedInputId((current) =>
        normalizedInputs.some((device) => device.deviceId === current)
          ? current
          : normalizedInputs[0].deviceId,
      )
      setSelectedOutputId((current) =>
        normalizedOutputs.some((device) => device.deviceId === current)
          ? current
          : normalizedOutputs[0].deviceId,
      )
      setAudioDeviceError(null)
    } catch {
      setAudioInputs(FALLBACK_AUDIO_INPUTS)
      setAudioOutputs(FALLBACK_AUDIO_OUTPUTS)
      setAudioDeviceError('마이크 권한을 허용해야 실제 PC 오디오 장치명이 표시됩니다.')
    } finally {
      permissionStream?.getTracks().forEach((track) => track.stop())
    }
  }

  function stopMicMonitor() {
    if (animationFrameRef.current != null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    stopMicLoopback()
    micStreamRef.current?.getTracks().forEach((track) => track.stop())
    micStreamRef.current = null

    void audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    setMicLevel(0)
  }

  function stopMicLoopback() {
    if (!micLoopbackAudioRef.current) {
      setMicTesting(false)
      return
    }

    micLoopbackAudioRef.current.pause()
    micLoopbackAudioRef.current.srcObject = null
    micLoopbackAudioRef.current = null
    setMicTesting(false)
  }

  function stopSoundTest() {
    if (speakerMeterIntervalRef.current != null) {
      window.clearInterval(speakerMeterIntervalRef.current)
      speakerMeterIntervalRef.current = null
    }

    try {
      soundTestOscillatorRef.current?.stop()
    } catch {
      // The oscillator may already be stopped when cleanup runs after a failed start.
    }

    soundTestOscillatorRef.current?.disconnect()
    soundTestGainRef.current?.disconnect()
    soundTestAudioRef.current?.pause()

    if (soundTestAudioRef.current) {
      soundTestAudioRef.current.srcObject = null
    }

    void soundTestContextRef.current?.close().catch(() => undefined)
    soundTestAudioRef.current = null
    soundTestContextRef.current = null
    soundTestOscillatorRef.current = null
    soundTestGainRef.current = null
    setSpeakerLevel(0)
    setSoundTesting(false)
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

  async function applySelectedOutputToTestAudio() {
    await Promise.all(
      [micLoopbackAudioRef.current, soundTestAudioRef.current]
        .filter((audio): audio is SinkAudioElement => Boolean(audio))
        .map((audio) => applySelectedOutputToAudio(audio, '선택한 스피커로 테스트 출력을 전환하지 못했습니다.')),
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

  async function startMicLoopback(stream = micStreamRef.current) {
    if (!stream) {
      setAudioDeviceError('마이크 테스트를 시작할 수 없습니다. 입력 장치를 다시 확인해 주세요.')
      return
    }

    stopMicLoopback()

    try {
      const audio = new Audio() as SinkAudioElement

      audio.srcObject = stream
      audio.autoplay = true
      audio.volume = 0.85
      micLoopbackAudioRef.current = audio

      await applySelectedOutputToAudio(audio, '선택한 스피커로 마이크 테스트 출력을 전환하지 못했습니다.')
      await audio.play()
      setMicTesting(true)
      setAudioDeviceError(null)
    } catch {
      stopMicLoopback()
      setAudioDeviceError('마이크 테스트 소리를 재생하지 못했습니다. 브라우저 권한과 출력 장치를 확인해 주세요.')
    }
  }

  async function toggleMicTest() {
    if (micTesting) {
      stopMicLoopback()
      return
    }

    if (!micStreamRef.current) {
      await startMicMonitor(selectedInputId)
    }

    await startMicLoopback()
  }

  async function playSoundTest() {
    if (soundTesting || soundTestAudioRef.current) {
      stopSoundTest()
      return
    }

    const AudioContextClass =
      window.AudioContext
      || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!AudioContextClass) {
      setAudioDeviceError('이 브라우저에서는 스피커 테스트를 지원하지 않습니다.')
      return
    }

    stopSoundTest()

    try {
      const testAudioContext = new AudioContextClass()
      const oscillator = testAudioContext.createOscillator()
      const gain = testAudioContext.createGain()
      const destination = testAudioContext.createMediaStreamDestination()
      const audio = new Audio() as SinkAudioElement

      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.11, testAudioContext.currentTime)
      oscillator.connect(gain)
      gain.connect(destination)

      audio.srcObject = destination.stream
      audio.autoplay = true
      audio.volume = 0.85
      soundTestAudioRef.current = audio
      soundTestContextRef.current = testAudioContext
      soundTestOscillatorRef.current = oscillator
      soundTestGainRef.current = gain

      await applySelectedOutputToAudio(audio, '선택한 스피커로 테스트음을 전환하지 못했습니다.')
      oscillator.start()
      await audio.play()
      setSoundTesting(true)
      setSpeakerLevel(80)
      speakerMeterIntervalRef.current = window.setInterval(() => {
        setSpeakerLevel((current) => (current > 65 ? 42 : 82))
      }, 500)
      setAudioDeviceError(null)
    } catch {
      stopSoundTest()
      setAudioDeviceError('스피커 테스트음을 재생하지 못했습니다. 브라우저 권한과 출력 장치를 확인해 주세요.')
    }
  }

  async function startMicMonitor(deviceId: string) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioDeviceError('이 브라우저에서는 마이크 입력을 테스트할 수 없습니다.')
      return
    }

    stopMicMonitor()

    try {
      const stream = await getUserMediaWithTimeout(getAudioConstraints(deviceId))
      await applyAudioProcessingConstraints(stream)
      updateAudioProcessingStatus(stream, audioProcessingStatus.noiseGate)
      const AudioContextClass =
        window.AudioContext
        || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

      if (!AudioContextClass) {
        stream.getTracks().forEach((track) => track.stop())
        setAudioDeviceError('이 브라우저에서는 마이크 레벨 테스트를 지원하지 않습니다.')
        return
      }

      const audioContext = new AudioContextClass()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      const data = new Uint8Array(analyser.frequencyBinCount)
      let ambientRms = 0.006
      let peakSignal = 0.035
      let smoothedMeterLevel = 0

      analyser.fftSize = 256
      source.connect(analyser)
      micStreamRef.current = stream
      audioContextRef.current = audioContext

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
        const ambientSample = Math.min(rms, ambientRms + 0.012)
        ambientRms = ambientRms * 0.97 + ambientSample * 0.03

        const signal = Math.max(0, rms - ambientRms * 1.35)
        peakSignal = Math.max(0.035, signal, peakSignal * 0.985)

        const nextMeterLevel = Math.max(0, Math.min(100, Math.round((signal / peakSignal) * 100)))
        smoothedMeterLevel = smoothedMeterLevel * 0.72 + nextMeterLevel * 0.28
        setMicLevel(Math.round(smoothedMeterLevel))
        animationFrameRef.current = window.requestAnimationFrame(tick)
      }

      tick()
      if (micTesting) {
        await startMicLoopback(stream)
      }
      setAudioDeviceError(null)
    } catch {
      setAudioDeviceError('선택한 마이크를 열 수 없습니다. 브라우저 권한과 장치 연결 상태를 확인해 주세요.')
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

  async function fetchVoiceChatMessages(channelId: number) {
    return fetchSquadVoiceChatMessages(channelId)
  }

  async function fetchVoiceMinutes(channelId: number) {
    return fetchSquadVoiceMinutes(channelId)
  }

  function appendVoiceChatMessage(message: VoiceChatMessage) {
    setVoiceChatMessages((current) => {
      if (current.some((item) => item.messageId === message.messageId)) {
        return current
      }

      return [...current, message]
    })
  }

  function applyVoiceMinutes(minutes: VoiceMeetingMinutes, syncDraft = false) {
    setVoiceMinutes(minutes)

    if (syncDraft || shouldSyncMinutesDraftFromServer()) {
      setMinutesDraft(minutes.transcript ?? '')
    }
  }

  async function refreshVoiceMeetingPanel(channelId = activeChannel?.channelId, syncDraft = false) {
    if (!channelId) {
      return
    }

    const [messages, minutes] = await Promise.all([
      fetchVoiceChatMessages(channelId),
      fetchVoiceMinutes(channelId),
    ])

    setVoiceChatMessages(messages)
    applyVoiceMinutes(minutes, syncDraft)
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

  function voiceEventLabel(type: VoiceEventType) {
    if (type === 'MUTE') return '마이크를 음소거했습니다.'
    if (type === 'UNMUTE') return '마이크 음소거를 해제했습니다.'
    if (type === 'SPEAKING') return '발언을 시작했습니다.'
    return '발언을 종료했습니다.'
  }

  async function createVoiceEvent(type: VoiceEventType, memo: string) {
    if (!activeChannel) {
      return
    }

    await createSquadVoiceEvent(activeChannel.channelId, type, memo)
  }

  function getSpeechRecognitionConstructor() {
    const browserWindow = window as WindowWithSpeechRecognition

    return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null
  }

  function shouldSyncMinutesDraftFromServer() {
    return Boolean(voiceMinutes?.recording) || document.activeElement !== minutesTextareaRef.current
  }

  function formatLocalTranscriptLine(text: string) {
    const time = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const speakerName = session?.name?.trim() || '나'

    return `[${time}] ${speakerName}: ${text}`
  }

  function appendMinutesTranscript(text: string) {
    const transcript = text.trim()

    if (!transcript) {
      return
    }

    const optimisticLine = formatLocalTranscriptLine(transcript)

    setMinutesDraft((current) => {
      if (!current.trim()) {
        return optimisticLine
      }

      return `${current.trimEnd()}\n${optimisticLine}`
    })

    void appendMinutesTranscriptToServer(transcript)
  }

  async function appendMinutesTranscriptToServer(text: string) {
    if (!activeChannel) {
      return
    }

    try {
      const minutes = await appendSquadVoiceMinutesTranscriptLine(activeChannel.channelId, text)

      minutesAppendErrorShownRef.current = false
      applyVoiceMinutes(minutes)
      broadcastMeetingSync('minutes-updated', { minutes })
    } catch {
      if (!minutesAppendErrorShownRef.current) {
        minutesAppendErrorShownRef.current = true
        showAuthToast({ message: '자동 기록을 회의록에 붙이지 못했습니다.', durationMs: 2200 })
      }
    }
  }

  function startMinutesSpeechRecognition() {
    if (isMuted) {
      stopMinutesSpeechRecognition()
      return false
    }

    const SpeechRecognition = getSpeechRecognitionConstructor()

    if (!SpeechRecognition) {
      showAuthToast({ message: '이 브라우저에서는 음성 자동 기록을 지원하지 않습니다.', durationMs: 2200 })
      return false
    }

    stopMinutesSpeechRecognition()

    try {
      const recognition = new SpeechRecognition()

      recognition.lang = 'ko-KR'
      recognition.continuous = true
      recognition.interimResults = false
      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]

          if (result?.isFinal) {
            appendMinutesTranscript(result[0]?.transcript ?? '')
          }
        }
      }
      recognition.onerror = () => {
        setSpeechRecognitionActive(false)
      }
      recognition.onend = () => {
        setSpeechRecognitionActive(false)

        if (!speechRecognitionRestartRef.current || speechRecognitionRef.current !== recognition) {
          return
        }

        window.setTimeout(() => {
          if (!speechRecognitionRestartRef.current || speechRecognitionRef.current !== recognition) {
            return
          }

          try {
            recognition.start()
            setSpeechRecognitionActive(true)
          } catch {
            setSpeechRecognitionActive(false)
          }
        }, 300)
      }

      speechRecognitionRef.current = recognition
      speechRecognitionRestartRef.current = true
      recognition.start()
      setSpeechRecognitionActive(true)
      return true
    } catch {
      speechRecognitionRestartRef.current = false
      speechRecognitionRef.current = null
      setSpeechRecognitionActive(false)
      showAuthToast({ message: '음성 기록을 시작하지 못했습니다.', durationMs: 2200 })
      return false
    }
  }

  function stopMinutesSpeechRecognition() {
    speechRecognitionRestartRef.current = false
    const recognition = speechRecognitionRef.current
    speechRecognitionRef.current = null

    if (recognition) {
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null

      try {
        recognition.stop()
      } catch {
        recognition.abort()
      }
    }

    setSpeechRecognitionActive(false)
  }

  async function sendVoiceChatMessage() {
    if (!activeChannel) {
      return
    }

    const content = voiceChatInput.trim()

    if (!content) {
      return
    }

    setChatSending(true)

    try {
      const message = await sendSquadVoiceChatMessage(activeChannel.channelId, content)

      setVoiceChatInput('')
      appendVoiceChatMessage(message)
      broadcastMeetingSync('chat-message', { chatMessage: message })
      void refreshVoiceMeetingPanel(activeChannel.channelId).catch(() => undefined)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 회의 채팅에 메시지를 보냈습니다.`,
        targetPath: '/squad-meeting',
      })
    } catch (chatError) {
      showAuthToast({
        message: chatError instanceof Error ? chatError.message : '회의 채팅을 보내지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setChatSending(false)
    }
  }

  async function clearVoiceChatMessages() {
    if (!activeChannel || chatClearing) {
      return
    }

    setChatClearing(true)

    try {
      await clearSquadVoiceChatMessages(activeChannel.channelId)
      setVoiceChatMessages([])
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 회의 채팅 기록을 비웠습니다.`,
        targetPath: '/squad-meeting',
      })
      showAuthToast({
        message: '내 화면의 이전 회의 채팅을 지웠습니다. 다른 팀원에게는 그대로 보입니다.',
        durationMs: 2200,
      })
    } catch (clearError) {
      showAuthToast({
        message: clearError instanceof Error ? clearError.message : '회의 채팅 기록을 지우지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setChatClearing(false)
    }
  }

  async function updateVoiceMinutes(payload: Partial<VoiceMeetingMinutes>, syncDraft = false) {
    if (!activeChannel) {
      return false
    }

    setMinutesSaving(true)

    try {
      const minutes = await updateSquadVoiceMinutes(activeChannel.channelId, payload)

      applyVoiceMinutes(minutes, syncDraft)
      broadcastMeetingSync('minutes-updated', { minutes })

      return true
    } catch (minutesError) {
      showAuthToast({
        message: minutesError instanceof Error ? minutesError.message : '회의록을 저장하지 못했습니다.',
        durationMs: 2200,
      })
      return false
    } finally {
      setMinutesSaving(false)
    }
  }

  async function toggleMinutesRecording() {
    const nextRecording = !(voiceMinutes?.recording ?? false)
    const updated = await updateVoiceMinutes({ recording: nextRecording })

    if (!updated) {
      return
    }

    if (!nextRecording) {
      stopMinutesSpeechRecognition()
    }
    void createSquadNotification(workspaceId, {
      pageKey: 'squad-meeting',
      message: `${squadActorName(session?.name)}님이 "${activeChannel?.name ?? '음성 회의'}" 회의록 녹음을 ${nextRecording ? '시작' : '종료'}했습니다.`,
      targetPath: '/squad-meeting',
    })
  }

  async function saveMinutesDraft(showSavedToast = true) {
    if (await updateVoiceMinutes({ transcript: minutesDraft }, true)) {
      if (showSavedToast) {
        void createSquadNotification(workspaceId, {
          pageKey: 'squad-meeting',
          message: `${squadActorName(session?.name)}님이 "${activeChannel?.name ?? '음성 회의'}" 회의록을 저장했습니다.`,
          targetPath: '/squad-meeting',
        })
      }
      if (showSavedToast) {
        showAuthToast({ message: '회의록이 저장되었습니다.', durationMs: 1600 })
      }
    }
  }

  function toggleMinutesActionItem(index: number) {
    setSelectedMinutesActionItems((current) => {
      if (current.includes(index)) {
        return current.filter((itemIndex) => itemIndex !== index)
      }

      return [...current, index]
    })
  }

  async function generateMinutesSummary() {
    if (!activeChannel) {
      return
    }

    if (minutesDraft !== (voiceMinutes?.transcript ?? '')) {
      const saved = await updateVoiceMinutes({ transcript: minutesDraft }, true)

      if (!saved) {
        return
      }
    }

    setMinutesSaving(true)

    try {
      const response = await createSquadVoiceMinutesSummary(activeChannel.channelId)

      const analysis = normalizeVoiceMeetingSummaryResponse(response)
      const minutes = analysis.minutes
      const actionItems = analysis.actionItems ?? []

      if (!minutes?.channelId) {
        throw new Error('회의 요약 응답을 읽지 못했습니다.')
      }

      applyVoiceMinutes(minutes, true)
      broadcastMeetingSync('minutes-updated', { minutes })
      setMinutesActionItems(actionItems)
      setSelectedMinutesActionItems(actionItems.map((_, index) => index))
      setMinutesSummaryReportOpen(true)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 회의록 요약을 생성했습니다.`,
        targetPath: '/squad-meeting',
      })
    } catch (summaryError) {
      showAuthToast({
        message: summaryError instanceof Error ? summaryError.message : '회의 요약을 만들지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setMinutesSaving(false)
    }
  }

  async function createKanbanTasksFromMinutes() {
    if (!activeChannel || kanbanTaskCreating) {
      return
    }

    const actionItems = minutesActionItems.filter((_, index) =>
      selectedMinutesActionItems.includes(index),
    )

    if (actionItems.length === 0) {
      showAuthToast({ message: '칸반에 등록할 할 일을 선택해 주세요.', durationMs: 1800 })
      return
    }

    setKanbanTaskCreating(true)

    try {
      const result = await createSquadVoiceMinutesKanbanTasks(activeChannel.channelId, actionItems)

      showAuthToast({
        message: `${result.tasks.length}개의 할 일을 칸반 보드에 등록했습니다.`,
        durationMs: 2200,
      })
      setMinutesSummaryReportOpen(false)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(session?.name)}님이 "${activeChannel.name}" 회의록에서 칸반 작업 ${result.tasks.length}개를 만들었습니다.`,
        targetPath: '/squad-workspace',
      })
    } catch (taskError) {
      showAuthToast({
        message: taskError instanceof Error ? taskError.message : '칸반 보드에 할 일을 등록하지 못했습니다.',
        durationMs: 2200,
      })
    } finally {
      setKanbanTaskCreating(false)
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

  function resetScreenSharePlayer() {
    screenShareDragRef.current = null
    setScreenShareDragging(false)
    setScreenShareZoom(SCREEN_SHARE_MIN_ZOOM)
    setScreenSharePan({ x: 0, y: 0 })
  }

  function openScreenSharePlayer(userId: number) {
    resetScreenSharePlayer()
    setScreenSharePlayerUserId(userId)
    setScreenSharePlayerOpen(true)

    if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
      return
    }

    void document.documentElement.requestFullscreen().catch(() => undefined)
  }

  function closeScreenSharePlayer() {
    resetScreenSharePlayer()
    setScreenSharePlayerOpen(false)
    setScreenSharePlayerUserId(null)

    if (!document.fullscreenElement) {
      return
    }

    void document.exitFullscreen().catch(() => undefined)
  }

  function updateScreenShareZoom(nextValue: number, pivot?: { x: number; y: number }) {
    const nextZoom = clampScreenShareZoom(nextValue)

    if (nextZoom <= SCREEN_SHARE_MIN_ZOOM) {
      setScreenSharePan({ x: 0, y: 0 })
      setScreenShareZoom(SCREEN_SHARE_MIN_ZOOM)
      return
    }

    if (pivot) {
      const ratio = nextZoom / screenShareZoom

      setScreenSharePan((current) => ({
        x: current.x - pivot.x * (ratio - 1),
        y: current.y - pivot.y * (ratio - 1),
      }))
    }

    setScreenShareZoom(nextZoom)
  }

  function handleScreenShareWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()

    const rect = event.currentTarget.getBoundingClientRect()
    const pivot = {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    }
    const direction = event.deltaY < 0 ? 1 : -1

    updateScreenShareZoom(screenShareZoom + direction * SCREEN_SHARE_WHEEL_ZOOM_STEP, pivot)
  }

  function handleScreenSharePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (screenShareZoom <= SCREEN_SHARE_MIN_ZOOM) {
      return
    }

    if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select')) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    screenShareDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: screenSharePan.x,
      originY: screenSharePan.y,
    }
    setScreenShareDragging(true)
  }

  function handleScreenSharePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = screenShareDragRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    setScreenSharePan({
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY,
    })
  }

  function endScreenShareDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (screenShareDragRef.current?.pointerId === event.pointerId) {
      screenShareDragRef.current = null
      setScreenShareDragging(false)
    }
  }

  return { workspaceId, session, authView, setAuthView, channels, activeChannel, participants, roomPanelTab, setRoomPanelTab, roomSidePanelOpen, setRoomSidePanelOpen, voiceChatMessages, voiceChatInput, setVoiceChatInput, voiceMinutes, minutesDraft, setMinutesDraft, minutesActionItems, selectedMinutesActionItems, minutesSummaryReportOpen, setMinutesSummaryReportOpen, chatSending, chatClearing, minutesSaving, kanbanTaskCreating, speechRecognitionActive, loading, error, joining, audioSettingsOpen, setAudioSettingsOpen, audioInputs, audioOutputs, selectedInputId, setSelectedInputId, selectedOutputId, setSelectedOutputId, remoteAudioMuted, audioDeviceError, setAudioDeviceError, audioProcessingStatus, micLevel, speakerLevel, micTesting, soundTesting, networkStatus, voiceConnectionStatus, voiceConnectionError, localCameraStream, remoteCameraStreams, localScreenShareStream, remoteScreenShares, screenSharePlayerOpen, setScreenSharePlayerOpen, screenSharePlayerUserId, setScreenSharePlayerUserId, screenShareZoom, setScreenShareZoom, screenSharePan, setScreenSharePan, screenShareDragging, setScreenShareDragging, floatingReactions, localVoiceStreamRef, screenShareDragRef, remoteAudioContainerRef, controlBoxRef, minutesTextareaRef, members, projectName, currentParticipant, isJoined, isMuted, micMuted, selectedInputLabel, waitingMembers, networkBadgeClass, networkIconClass, securityStatus, securityBadgeClass, securityIconClass, voiceConnectionLabel, roomParticipants, meetingElapsedLabel, handleLogout, handleAuthenticated, loadAudioDevices, replaceLocalVoiceInput, toggleRemoteAudioMuted, toggleCamera, toggleScreenShare, sendRoomReaction, toggleMicTest, playSoundTest, startMicMonitor, selectChannel, sendVoiceChatMessage, clearVoiceChatMessages, toggleMinutesRecording, saveMinutesDraft, toggleMinutesActionItem, generateMinutesSummary, createKanbanTasksFromMinutes, toggleWaitingMic, handleJoinedNavigation, joinChannel, handleJoinPointerDown, leaveChannel, sendVoiceEvent, resetScreenSharePlayer, openScreenSharePlayer, closeScreenSharePlayer, updateScreenShareZoom, handleScreenShareWheel, handleScreenSharePointerDown, handleScreenSharePointerMove, endScreenShareDrag }
}

export type SquadMeetingViewModel = ReturnType<typeof useSquadMeetingController>
