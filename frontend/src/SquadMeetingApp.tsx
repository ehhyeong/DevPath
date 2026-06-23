import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SquadWorkspaceAside from './components/SquadWorkspaceAside'
import SquadWorkspaceHeader from './components/SquadWorkspaceHeader'
import UserAvatar from './components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { createSquadNotification, squadActorName } from './squad-notifications'
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
} from './squad-meeting-api'

import type {
  AudioDeviceOption,
  AudioProcessingStatus,
  CameraSignalPayload,
  CameraView,
  FloatingReaction,
  NavigatorWithNetworkInformation,
  NetworkStatus,
  NetworkTone,
  RoomPanelTab,
  ScreenShareDragState,
  ScreenSharePan,
  ScreenShareSignalPayload,
  ScreenShareView,
  SecurityStatus,
  SecurityTone,
  SinkAudioElement,
  SpeechRecognitionLike,
  VoiceMeetingSyncPayload,
  VoiceChannel,
  VoiceChatMessage,
  VoiceConnectionStatus,
  VoiceEventType,
  VoiceMeetingActionItem,
  VoiceMeetingAnalysis,
  VoiceMeetingMinutes,
  VoiceMeetingSummaryResponse,
  VoiceParticipant,
  VoicePresence,
  VoiceReactionPayload,
  VoiceSignalingMessage,
  VoiceSignalingPeer,
  WindowWithSpeechRecognition,
  WorkspaceDashboard,
  WorkspaceMember,
} from './squad-meeting-types'

function MediaStreamVideo({
  stream,
  className,
  muted = false,
  style,
}: {
  stream: MediaStream
  className?: string
  muted?: boolean
  style?: CSSProperties
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return undefined
    }

    video.srcObject = stream
    void video.play().catch(() => undefined)

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null
      }
    }
  }, [stream])

  return <video ref={videoRef} className={className} style={style} autoPlay playsInline muted={muted} />
}

const FALLBACK_AUDIO_INPUTS: AudioDeviceOption[] = [{ deviceId: 'default', label: '기본 마이크' }]
const FALLBACK_AUDIO_OUTPUTS: AudioDeviceOption[] = [{ deviceId: 'default', label: '기본 스피커' }]
const INITIAL_AUDIO_PROCESSING_STATUS: AudioProcessingStatus = {
  echoCancellation: null,
  noiseSuppression: null,
  autoGainControl: null,
  noiseGate: false,
}

const INITIAL_NETWORK_STATUS: NetworkStatus = {
  label: '네트워크 확인 중',
  detail: '실시간 API 왕복 시간을 확인하고 있습니다.',
  latencyMs: null,
  tone: 'checking',
}

const DEFAULT_VOICE_STUN_URLS = ['stun:stun.l.google.com:19302']
const VOICE_REACTIONS = ['👍', '👏', '❤️', '🎉', '💡'] as const
const FLOATING_REACTION_VISIBLE_MS = 2500
const SCREEN_SHARE_MIN_ZOOM = 1
const SCREEN_SHARE_MAX_ZOOM = 4
const SCREEN_SHARE_WHEEL_ZOOM_STEP = 0.16
const SCREEN_SHARE_BUTTON_ZOOM_STEP = 0.25

function getVoiceStunUrls() {
  const raw = (import.meta.env.VITE_VOICE_STUN_URLS as string | undefined)?.trim()

  if (!raw) {
    return DEFAULT_VOICE_STUN_URLS
  }

  const urls = raw.split(',').map((url) => url.trim()).filter(Boolean)

  return urls.length > 0 ? urls : DEFAULT_VOICE_STUN_URLS
}

function getVoiceIceServers(): RTCIceServer[] {
  return [{ urls: getVoiceStunUrls() }]
}

function buildVoiceSignalingUrl(channelId: number, accessToken: string) {
  const configuredUrl = (import.meta.env.VITE_VOICE_SIGNALING_URL as string | undefined)?.trim()
  const fallbackUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/voice-signaling`
  const url = new URL(configuredUrl || fallbackUrl, window.location.href)

  url.searchParams.set('channelId', String(channelId))
  url.searchParams.set('token', accessToken)

  return url.toString()
}

function isVoiceReaction(value: string): value is (typeof VOICE_REACTIONS)[number] {
  return VOICE_REACTIONS.some((reaction) => reaction === value)
}

function normalizeVoiceReaction(value: unknown) {
  return typeof value === 'string' && isVoiceReaction(value) ? value : null
}

function createFloatingReactionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function clampScreenShareZoom(value: number) {
  return Math.min(SCREEN_SHARE_MAX_ZOOM, Math.max(SCREEN_SHARE_MIN_ZOOM, Number(value.toFixed(2))))
}

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

function formatMeetingTime(value?: string | null) {
  if (!value) {
    return '방금 전'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

function formatElapsedTime(value: string | null | undefined, now: number) {
  if (!value) {
    return '00:00:00'
  }

  const startedAt = new Date(value).getTime()

  if (Number.isNaN(startedAt)) {
    return '00:00:00'
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  const hours = Math.floor(elapsedSeconds / 3600)
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
  const seconds = elapsedSeconds % 60

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

function getVoiceMeetingSessionStartedAt(activeParticipants: VoiceParticipant[]) {
  if (activeParticipants.length === 0) {
    return null
  }

  const sessionStartedAt = activeParticipants.find((participant) => participant.currentSessionStartedAt)
    ?.currentSessionStartedAt

  if (sessionStartedAt) {
    return sessionStartedAt
  }

  return activeParticipants
    .map((participant) => participant.joinedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ?? null
}

function getBrowserNetworkInformation() {
  const navigatorWithConnection = navigator as NavigatorWithNetworkInformation

  return (
    navigatorWithConnection.connection
    ?? navigatorWithConnection.mozConnection
    ?? navigatorWithConnection.webkitConnection
    ?? null
  )
}

function buildNetworkStatus(latencyMs: number | null, failed = false): NetworkStatus {
  if (!navigator.onLine) {
    return {
      label: '오프라인',
      detail: '브라우저가 오프라인 상태로 감지했습니다.',
      latencyMs: null,
      tone: 'offline',
    }
  }

  const connection = getBrowserNetworkInformation()
  const effectiveType = connection?.effectiveType?.toLowerCase() ?? null
  const browserRtt = typeof connection?.rtt === 'number' ? connection.rtt : null
  const rtt = latencyMs ?? browserRtt
  const downlink = typeof connection?.downlink === 'number' ? connection.downlink : null
  const saveData = Boolean(connection?.saveData)
  const details = [
    latencyMs != null ? `API ${latencyMs}ms` : null,
    effectiveType ? `회선 ${effectiveType.toUpperCase()}` : null,
    downlink != null ? `다운링크 ${downlink.toFixed(1)}Mbps` : null,
  ].filter(Boolean)
  const detailText = details.length > 0 ? details.join(', ') : '브라우저 네트워크 상태를 기준으로 표시합니다.'

  if (failed || saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || (rtt != null && rtt >= 800) || (downlink != null && downlink < 0.7)) {
    return {
      label: '네트워크 불안정',
      detail: failed ? '실시간 API 연결 확인에 실패했습니다.' : detailText,
      latencyMs,
      tone: 'poor',
    }
  }

  if (effectiveType === '3g' || (rtt != null && rtt >= 350) || (downlink != null && downlink < 2)) {
    return {
      label: '네트워크 보통',
      detail: detailText,
      latencyMs,
      tone: 'fair',
    }
  }

  return {
    label: '네트워크 양호',
    detail: detailText,
    latencyMs,
    tone: 'good',
  }
}

function getNetworkBadgeClass(tone: NetworkTone) {
  switch (tone) {
    case 'checking':
      return 'border-gray-100 bg-gray-50 text-gray-500'
    case 'fair':
      return 'border-yellow-100 bg-yellow-50 text-yellow-700'
    case 'poor':
      return 'border-orange-100 bg-orange-50 text-orange-700'
    case 'offline':
      return 'border-red-100 bg-red-50 text-red-600'
    case 'good':
    default:
      return 'border-blue-100 bg-blue-50 text-blue-700'
  }
}

function getNetworkIconClass(tone: NetworkTone) {
  switch (tone) {
    case 'checking':
      return 'fas fa-spinner fa-spin'
    case 'poor':
    case 'offline':
      return 'fas fa-exclamation-triangle'
    case 'fair':
      return 'fas fa-signal'
    case 'good':
    default:
      return 'fas fa-signal'
  }
}

function isLocalDevelopmentHost() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
}

function buildSecurityStatus(isAuthenticated: boolean, memberVerified: boolean): SecurityStatus {
  if (!isAuthenticated) {
    return {
      label: '보안 확인 필요',
      detail: '로그인 상태를 확인하지 못했습니다. 다시 로그인한 뒤 음성 회의에 입장해 주세요.',
      tone: 'warning',
    }
  }

  if (!memberVerified) {
    return {
      label: '보안 확인 중',
      detail: '스쿼드 멤버인지 확인하고 있습니다. 확인이 끝나면 음성 회의에 들어갈 수 있습니다.',
      tone: 'checking',
    }
  }

  if (!window.isSecureContext && window.location.protocol !== 'https:' && !isLocalDevelopmentHost()) {
    return {
      label: '보안 확인 필요',
      detail: '로그인과 스쿼드 권한은 확인됐지만, 현재 주소가 안전한 연결이 아닙니다. 배포 환경에서는 HTTPS로 접속해 주세요.',
      tone: 'warning',
    }
  }

  return {
    label: '보안 연결됨',
    detail: '로그인한 스쿼드 멤버만 입장할 수 있고, 회의 연결 정보는 안전하게 주고받고 있습니다.',
    tone: 'secure',
  }
}

function getSecurityBadgeClass(tone: SecurityTone) {
  switch (tone) {
    case 'checking':
      return 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'
    case 'warning':
      return 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100'
    case 'secure':
    default:
      return 'border-green-100 bg-green-50 text-green-700 hover:bg-green-100'
  }
}

function getSecurityIconClass(tone: SecurityTone) {
  switch (tone) {
    case 'checking':
      return 'fas fa-spinner fa-spin'
    case 'warning':
      return 'fas fa-exclamation-triangle'
    case 'secure':
    default:
      return 'fas fa-shield-alt'
  }
}

function normalizeVoiceMeetingSummaryResponse(response: VoiceMeetingSummaryResponse): VoiceMeetingAnalysis {
  if ('minutes' in response && response.minutes) {
    return {
      minutes: response.minutes,
      actionItems: response.actionItems ?? [],
    }
  }

  return {
    minutes: response as VoiceMeetingMinutes,
    actionItems: [],
  }
}

export default function SquadMeetingApp() {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [channels, setChannels] = useState<VoiceChannel[]>([])
  const [activeChannel, setActiveChannel] = useState<VoiceChannel | null>(null)
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
  const [remoteScreenShare, setRemoteScreenShare] = useState<ScreenShareView | null>(null)
  const [screenSharePlayerOpen, setScreenSharePlayerOpen] = useState(false)
  const [screenShareZoom, setScreenShareZoom] = useState(SCREEN_SHARE_MIN_ZOOM)
  const [screenSharePan, setScreenSharePan] = useState<ScreenSharePan>({ x: 0, y: 0 })
  const [screenShareDragging, setScreenShareDragging] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const micStreamRef = useRef<MediaStream | null>(null)
  const localVoiceStreamRef = useRef<MediaStream | null>(null)
  const localVoiceRawStreamRef = useRef<MediaStream | null>(null)
  const localCameraStreamRef = useRef<MediaStream | null>(null)
  const localScreenShareStreamRef = useRef<MediaStream | null>(null)
  const remoteCameraStreamIdsRef = useRef<Map<number, string>>(new Map())
  const remoteScreenShareStreamIdsRef = useRef<Map<number, string>>(new Map())
  const remoteScreenSharePendingRef = useRef<Set<number>>(new Set())
  const screenShareDragRef = useRef<ScreenShareDragState | null>(null)
  const signalingSocketRef = useRef<WebSocket | null>(null)
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map())
  const remoteAudioElementsRef = useRef<Map<number, SinkAudioElement>>(new Map())
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

  useEffect(() => {
    document.title = 'DevPath - 음성 회의'
    const html = document.documentElement
    const body = document.body

    html.classList.add('squad-dashboard-document')
    body.classList.add('squad-dashboard-body')

    return () => {
      html.classList.remove('squad-dashboard-document')
      body.classList.remove('squad-dashboard-body')
    }
  }, [])

  useEffect(() => () => disconnectVoiceSession(), [])

  useEffect(() => () => {
    reactionTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId))
    reactionTimerIdsRef.current = []
  }, [])

  useEffect(() => {
    if (!localScreenShareStream && !remoteScreenShare) {
      resetScreenSharePlayer()
      setScreenSharePlayerOpen(false)
    }
  }, [localScreenShareStream, remoteScreenShare])

  useEffect(() => {
    if (!screenSharePlayerOpen) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeScreenSharePlayer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [screenSharePlayerOpen])

  useEffect(() => {
    if (!screenSharePlayerOpen) {
      return undefined
    }

    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        resetScreenSharePlayer()
        setScreenSharePlayerOpen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [screenSharePlayerOpen])

  useEffect(() => {
    void applySelectedOutputToRemoteAudio()
    void applySelectedOutputToTestAudio()
  }, [selectedOutputId])

  useEffect(() => {
    void loadAudioDevices(false)

    function handleDeviceChange() {
      void loadAudioDevices(false)
    }

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
      stopMicMonitor()
      stopSoundTest()
    }
  }, [])

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
      const probePath = activeChannel
        ? `/api/voice-channels/${activeChannel.channelId}/participants`
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
  }, [activeChannel?.channelId, session?.accessToken, session?.tokenType])

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
    void reconnectExistingVoiceSession()
  }, [activeChannel?.channelId, isJoined, session?.accessToken])

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
    if (!isJoined || !voiceMinutes?.recording) {
      stopMinutesSpeechRecognition()
      return
    }

    if (!speechRecognitionRef.current) {
      startMinutesSpeechRecognition()
    }
  }, [activeChannel?.channelId, isJoined, voiceMinutes?.recording])

  useEffect(() => {
    if (!session?.accessToken || !activeChannel?.channelId) {
      stopMicMonitor()
      return
    }

    const shouldMonitorMic = audioSettingsOpen || (!isJoined && !waitingMicMuted)

    if (!shouldMonitorMic) {
      stopMicMonitor()
      return
    }

    let stopped = false

    void loadAudioDevices(true).then(() => {
      if (!stopped) {
        void startMicMonitor(selectedInputId)
      }
    })

    return () => {
      stopped = true
      stopMicMonitor()
    }
  }, [activeChannel?.channelId, audioSettingsOpen, isJoined, selectedInputId, session?.accessToken, waitingMicMuted])

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
        if (shouldSyncMinutesDraftFromServer()) {
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

        if (shouldSyncMinutesDraftFromServer()) {
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
  }, [activeChannel?.channelId, isJoined, session?.accessToken])

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
      if (requestPermission && navigator.mediaDevices.getUserMedia) {
        permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true })
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

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
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
      peerConnection.close()
    })
    peerConnectionsRef.current.clear()
    pendingIceCandidatesRef.current.clear()
    stopRemoteAudioElements()
    remoteCameraStreamIdsRef.current.clear()
    remoteScreenShareStreamIdsRef.current.clear()
    remoteScreenSharePendingRef.current.clear()
    setRemoteCameraStreams(new Map())
    setRemoteScreenShare(null)
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

    const rawStream = await navigator.mediaDevices.getUserMedia(getAudioConstraints(selectedInputId))
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

    const nextRawStream = await navigator.mediaDevices.getUserMedia(getAudioConstraints(selectedInputId))
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
      Array.from(peerConnectionsRef.current.values()).map(async (peerConnection) => {
        const sender = peerConnection.getSenders().find((item) => item.track?.kind === 'audio')

        if (sender) {
          await sender.replaceTrack(nextTrack)
        } else {
          peerConnection.addTrack(nextTrack, nextStream)
        }
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
      return existingAudio
    }

    const audio = document.createElement('audio') as SinkAudioElement

    audio.autoplay = true
    audio.dataset.voicePeerId = String(userId)
    remoteAudioElementsRef.current.set(userId, audio)
    remoteAudioContainerRef.current?.appendChild(audio)
    void applySelectedOutputToAudio(audio)

    return audio
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

  function clearRemoteScreenShare(userId: number, stream?: MediaStream) {
    const streamId = stream?.id

    if (!streamId || remoteScreenShareStreamIdsRef.current.get(userId) === streamId) {
      remoteScreenShareStreamIdsRef.current.delete(userId)
    }

    remoteScreenSharePendingRef.current.delete(userId)
    setRemoteScreenShare((current) =>
      current?.userId === userId && (!stream || current.stream === stream) ? null : current,
    )
  }

  function clearRemoteCameraStream(userId: number, stream?: MediaStream) {
    const streamId = stream?.id

    if (!streamId || remoteCameraStreamIdsRef.current.get(userId) === streamId) {
      remoteCameraStreamIdsRef.current.delete(userId)
    }

    setRemoteCameraStreams((current) => {
      const currentView = current.get(userId)

      if (!currentView || (stream && currentView.stream !== stream)) {
        return current
      }

      const next = new Map(current)

      next.delete(userId)
      return next
    })
  }

  function attachRemoteScreenStream(userId: number, userName: string, stream: MediaStream, track: MediaStreamTrack) {
    const screenStream = stream.getVideoTracks().includes(track) ? stream : new MediaStream([track])

    setRemoteScreenShare({
      userId,
      userName: getVoiceDisplayName(userId, userName),
      stream: screenStream,
      local: false,
    })

    track.onended = () => {
      clearRemoteScreenShare(userId, screenStream)
    }
    track.onmute = () => {
      clearRemoteScreenShare(userId, screenStream)
    }
  }

  function attachRemoteCameraStream(userId: number, userName: string, stream: MediaStream, track: MediaStreamTrack) {
    const cameraStream = stream.getVideoTracks().includes(track) ? stream : new MediaStream([track])

    setRemoteCameraStreams((current) => {
      const next = new Map(current)

      next.set(userId, {
        userId,
        userName: getVoiceDisplayName(userId, userName),
        stream: cameraStream,
        local: false,
      })
      return next
    })

    track.onended = () => {
      clearRemoteCameraStream(userId, cameraStream)
    }
    track.onmute = () => {
      clearRemoteCameraStream(userId, cameraStream)
    }
  }

  function attachRemoteStream(userId: number, userName: string, stream: MediaStream, track: MediaStreamTrack) {
    if (track.kind === 'video') {
      const streamId = stream.id
      const screenShareStreamId = remoteScreenShareStreamIdsRef.current.get(userId)
      const cameraStreamId = remoteCameraStreamIdsRef.current.get(userId)

      if (screenShareStreamId && screenShareStreamId === streamId) {
        attachRemoteScreenStream(userId, userName, stream, track)
        return
      }

      if (cameraStreamId && cameraStreamId === streamId) {
        attachRemoteCameraStream(userId, userName, stream, track)
        return
      }

      if (remoteScreenSharePendingRef.current.has(userId)) {
        remoteScreenSharePendingRef.current.delete(userId)
        remoteScreenShareStreamIdsRef.current.set(userId, streamId)
        attachRemoteScreenStream(userId, userName, stream, track)
        return
      }

      attachRemoteCameraStream(userId, userName, stream, track)
      return
    }

    const audio = createRemoteAudioElement(userId)

    audio.srcObject = stream
    void audio.play().catch(() => undefined)
  }

  function removeRemotePeer(userId: number) {
    const peerConnection = peerConnectionsRef.current.get(userId)

    if (peerConnection) {
      peerConnection.close()
      peerConnectionsRef.current.delete(userId)
    }

    pendingIceCandidatesRef.current.delete(userId)

    const audio = remoteAudioElementsRef.current.get(userId)

    if (audio) {
      audio.pause()
      audio.srcObject = null
      audio.remove()
      remoteAudioElementsRef.current.delete(userId)
    }

    clearRemoteCameraStream(userId)
    clearRemoteScreenShare(userId)
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

  async function renegotiatePeerConnection(userId: number, peerConnection: RTCPeerConnection) {
    if (peerConnection.signalingState !== 'stable') {
      return
    }

    const offer = await peerConnection.createOffer()

    await peerConnection.setLocalDescription(offer)

    if (peerConnection.localDescription) {
      sendSignalingMessage('offer', userId, peerConnection.localDescription.toJSON())
    }
  }

  async function renegotiateAllPeerConnections() {
    await Promise.all(
      Array.from(peerConnectionsRef.current.entries()).map(([userId, peerConnection]) =>
        renegotiatePeerConnection(userId, peerConnection),
      ),
    )
  }

  async function addCameraTrackToPeers(stream: MediaStream) {
    const [videoTrack] = stream.getVideoTracks()

    if (!videoTrack) {
      return
    }

    await Promise.all(
      Array.from(peerConnectionsRef.current.values()).map(async (peerConnection) => {
        const existingSender = peerConnection.getSenders().find((sender) => sender.track === videoTrack)

        if (!existingSender) {
          peerConnection.addTrack(videoTrack, stream)
        }
      }),
    )
    await renegotiateAllPeerConnections()
  }

  async function removeCameraTracksFromPeers() {
    const cameraTracks = new Set(localCameraStreamRef.current?.getVideoTracks() ?? [])
    let removed = false

    if (cameraTracks.size === 0) {
      return
    }

    peerConnectionsRef.current.forEach((peerConnection) => {
      peerConnection.getSenders()
        .filter((sender) => sender.track && cameraTracks.has(sender.track))
        .forEach((sender) => {
          peerConnection.removeTrack(sender)
          removed = true
        })
    })

    if (removed) {
      await renegotiateAllPeerConnections()
    }
  }

  async function addScreenShareTrackToPeers(stream: MediaStream) {
    const [videoTrack] = stream.getVideoTracks()

    if (!videoTrack) {
      return
    }

    await Promise.all(
      Array.from(peerConnectionsRef.current.values()).map(async (peerConnection) => {
        const existingSender = peerConnection.getSenders().find((sender) => sender.track === videoTrack)

        if (!existingSender) {
          peerConnection.addTrack(videoTrack, stream)
        }
      }),
    )
    await renegotiateAllPeerConnections()
  }

  async function removeScreenShareTracksFromPeers() {
    const screenShareTracks = new Set(localScreenShareStreamRef.current?.getVideoTracks() ?? [])
    let removed = false

    if (screenShareTracks.size === 0) {
      return
    }

    peerConnectionsRef.current.forEach((peerConnection) => {
      peerConnection.getSenders()
        .filter((sender) => sender.track && screenShareTracks.has(sender.track))
        .forEach((sender) => {
          peerConnection.removeTrack(sender)
          removed = true
        })
    })

    if (removed) {
      await renegotiateAllPeerConnections()
    }
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
      const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints())
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
      setRemoteScreenShare(null)
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
    const localStream = localVoiceStreamRef.current
    const localTracks = localStream?.getTracks() ?? []

    if (localStream) {
      localTracks.forEach((track) => {
        peerConnection.addTrack(track, localStream)
      })
    }

    if (!localTracks.some((track) => track.kind === 'audio')) {
      peerConnection.addTransceiver('audio', { direction: 'recvonly' })
    }

    localCameraStreamRef.current?.getVideoTracks().forEach((track) => {
      peerConnection.addTrack(track, localCameraStreamRef.current as MediaStream)
    })

    localScreenShareStreamRef.current?.getVideoTracks().forEach((track) => {
      peerConnection.addTrack(track, localScreenShareStreamRef.current as MediaStream)
    })

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage('ice-candidate', peer.userId, event.candidate.toJSON())
      }
    }

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0] ?? new MediaStream([event.track])
      attachRemoteStream(peer.userId, peer.userName, remoteStream, event.track)
    }

    peerConnection.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(peerConnection.connectionState)) {
        removeRemotePeer(peer.userId)
      }
    }

    peerConnectionsRef.current.set(peer.userId, peerConnection)

    return peerConnection
  }

  async function startVoiceOffer(peer: VoiceSignalingPeer) {
    const peerConnection = getOrCreatePeerConnection(peer)

    if (peerConnection.signalingState !== 'stable') {
      return
    }

    const offer = await peerConnection.createOffer()

    await peerConnection.setLocalDescription(offer)

    if (peerConnection.localDescription) {
      sendSignalingMessage('offer', peer.userId, peerConnection.localDescription.toJSON())
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

    const peer = { userId: message.fromUserId, userName: message.fromUserName }
    const peerConnection = getOrCreatePeerConnection(peer)

    if (peerConnection.signalingState !== 'stable') {
      await peerConnection.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit).catch(() => undefined)
    }

    await peerConnection.setRemoteDescription(message.payload as RTCSessionDescriptionInit)
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
        await Promise.all((message.peers ?? []).map((peer) => handlePeerAvailable(peer)))
        break
      case 'peer-joined':
        if (message.fromUserId && message.fromUserName) {
          await handlePeerAvailable({ userId: message.fromUserId, userName: message.fromUserName })
          if (activeChannel) {
            void refreshVoiceRoomState(activeChannel.channelId).catch(() => undefined)
          }
        }
        break
      case 'peer-left':
        if (message.fromUserId) {
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
      case 'camera-start': {
        const payload = message.payload as CameraSignalPayload | null | undefined

        if (message.fromUserId && payload?.streamId) {
          remoteCameraStreamIdsRef.current.set(message.fromUserId, payload.streamId)
        }
        break
      }
      case 'camera-stop':
        if (message.fromUserId) {
          clearRemoteCameraStream(message.fromUserId)
        }
        break
      case 'screen-share-start': {
        const payload = message.payload as ScreenShareSignalPayload | null | undefined

        if (message.fromUserId) {
          if (payload?.streamId) {
            remoteScreenShareStreamIdsRef.current.set(message.fromUserId, payload.streamId)
          } else {
            remoteScreenSharePendingRef.current.add(message.fromUserId)
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
      const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints(deviceId))
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

      connectVoiceSignaling(activeChannel.channelId)
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

      connectVoiceSignaling(activeChannel.channelId)
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
        setWaitingMicMuted(true)
        setAudioDeviceError('사용 가능한 마이크를 감지하지 못했습니다.')
        showAuthToast({ message: '사용 가능한 마이크를 감지하지 못해 음소거 상태를 유지합니다.', durationMs: 2200 })
        return
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

  function renderAudioProcessingBadge(label: string, enabled: boolean | null) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
          enabled === true
            ? 'border-green-100 bg-green-50 text-green-700'
            : enabled === false
              ? 'border-gray-200 bg-gray-50 text-gray-500'
              : 'border-yellow-100 bg-yellow-50 text-yellow-700'
        }`}
      >
        <i className={`fas ${enabled === true ? 'fa-check' : enabled === false ? 'fa-minus' : 'fa-spinner fa-spin'} text-[9px]`}></i>
        {label} {enabled === true ? '켜짐' : enabled === false ? '꺼짐' : '확인 중'}
      </span>
    )
  }

  function renderMemberAvatar(member: WorkspaceMember, className = 'w-8 h-8') {
    return (
      <UserAvatar
        key={member.memberId}
        name={member.learnerName ?? '팀원'}
        imageUrl={member.profileImage}
        className={`${className} rounded-full border-2 border-white bg-gray-100 shadow-sm hover:z-10 transition-transform hover:scale-110`}
        iconClassName="text-xs"
      />
    )
  }

  function renderParticipant(participant: VoiceParticipant) {
    const member = members.find((item) => item.learnerId === participant.userId)

    return (
      <div key={participant.participantId} className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {member ? (
            renderMemberAvatar(member, 'w-10 h-10')
          ) : (
            <UserAvatar
              name={participant.userName}
              className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 shadow-sm"
              iconClassName="text-xs"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-gray-900 truncate">{participant.userName}</p>
            <p className="text-[10px] font-bold text-gray-400">{formatMeetingTime(participant.joinedAt)} 입장</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center ${participant.muted ? 'bg-red-50 text-red-500' : 'bg-green-50 text-brand'}`}>
            <i className={`fas ${participant.muted ? 'fa-microphone-slash' : 'fa-microphone'} text-xs`}></i>
          </span>
        </div>
      </div>
    )
  }

  function renderChatPanel() {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-900">
        <div className="border-b border-gray-800 bg-gray-900 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <p
              className="min-w-0 flex-1 truncate whitespace-nowrap text-[10px] font-semibold leading-relaxed text-gray-400"
              title="회의 채팅은 30일 또는 최신 500개까지만 보관됩니다. 기록 지우기는 내 화면에서만 이전 대화를 숨깁니다."
            >
              채팅은 30일·최신 500개 보관, 지우기는 내 화면에만 적용됩니다.
            </p>
            <button
              type="button"
              onClick={() => void clearVoiceChatMessages()}
              disabled={chatClearing || voiceChatMessages.length === 0}
              className="squad-meeting-room-chat-clear-button flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 transition hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              title="내 화면의 이전 채팅 지우기"
              aria-label="내 화면의 이전 채팅 지우기"
            >
              <i className="fas fa-trash-alt text-xs"></i>
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 dark-scrollbar">
          {voiceChatMessages.length > 0 ? voiceChatMessages.map((message) => {
            const mine = message.senderId === session?.userId

            return (
              <div key={message.messageId} className={`flex flex-col gap-1.5 ${mine ? 'items-end' : ''}`}>
                <span className={`text-[11px] text-gray-400 font-bold ${mine ? 'mr-1' : 'ml-1'}`}>
                  {mine ? '나' : message.senderName}
                </span>
                <div
                  className={`w-fit max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    mine
                      ? 'rounded-tr-none bg-blue-600 text-white shadow-md'
                      : 'rounded-tl-none border border-gray-700 bg-gray-800 text-gray-200'
                  }`}
                  title={formatMeetingTime(message.createdAt)}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            )
          }) : (
            <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-800/50 p-8 text-center">
              <i className="fas fa-comments text-3xl text-gray-600"></i>
              <p className="mt-3 text-sm font-extrabold text-white">아직 회의 채팅이 없습니다.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-800 shrink-0">
          <div className="flex gap-2 bg-gray-900 rounded-xl px-3 py-2 border border-gray-700 focus-within:border-blue-500 transition shadow-inner">
            <input
              value={voiceChatInput}
              onChange={(event) => setVoiceChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendVoiceChatMessage()
                }
              }}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none text-white placeholder-gray-500"
              placeholder="메시지 입력..."
            />
            <button
              type="button"
              onClick={() => void sendVoiceChatMessage()}
              disabled={chatSending || !voiceChatInput.trim()}
              className="squad-meeting-room-chat-send-button text-blue-500 hover:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition font-bold disabled:opacity-50"
              title="보내기"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    )
  }

  function getParticipantGridClass(participantCount: number) {
    if (participantCount <= 1) {
      return 'squad-meeting-participant-grid-1'
    }

    if (participantCount === 2) {
      return 'squad-meeting-participant-grid-2'
    }

    if (participantCount === 3) {
      return 'squad-meeting-participant-grid-3'
    }

    if (participantCount === 4) {
      return 'squad-meeting-participant-grid-4'
    }

    if (participantCount <= 6) {
      return 'squad-meeting-participant-grid-6'
    }

    return 'squad-meeting-participant-grid-many'
  }

  function getParticipantCameraView(participant: VoiceParticipant) {
    if (participant.userId === session?.userId && localCameraStream) {
      return {
        userId: participant.userId,
        userName: participant.userName,
        stream: localCameraStream,
        local: true,
      } satisfies CameraView
    }

    return remoteCameraStreams.get(participant.userId) ?? null
  }

  function renderMeetingGridTile(participant: VoiceParticipant) {
    const member = members.find((item) => item.learnerId === participant.userId)
    const speaking = Boolean(participant.speaking && !participant.muted)
    const cameraView = getParticipantCameraView(participant)

    return (
      <div
        key={participant.participantId}
        className={`squad-meeting-participant-tile ${speaking ? 'is-speaking' : ''} ${cameraView ? 'has-video' : ''}`}
      >
        {speaking ? (
          <div className="squad-meeting-participant-pulse" aria-hidden="true"></div>
        ) : null}
        {cameraView ? (
          <MediaStreamVideo
            stream={cameraView.stream}
            muted={cameraView.local}
            className={`squad-meeting-participant-video ${cameraView.local ? 'is-local' : ''}`}
          />
        ) : (
          <UserAvatar
            name={member?.learnerName ?? participant.userName}
            imageUrl={member?.profileImage}
            className="squad-meeting-participant-avatar rounded-full border-4 border-gray-600 bg-gray-700 shadow-2xl"
            iconClassName="squad-meeting-participant-avatar-icon text-gray-300"
          />
        )}
        <div className="squad-meeting-participant-label">
          <p className="truncate text-xs font-bold text-white">
            {participant.userName}
          </p>
        </div>
      </div>
    )
  }

  function resetScreenSharePlayer() {
    screenShareDragRef.current = null
    setScreenShareDragging(false)
    setScreenShareZoom(SCREEN_SHARE_MIN_ZOOM)
    setScreenSharePan({ x: 0, y: 0 })
  }

  function openScreenSharePlayer() {
    resetScreenSharePlayer()
    setScreenSharePlayerOpen(true)

    if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
      return
    }

    void document.documentElement.requestFullscreen().catch(() => undefined)
  }

  function closeScreenSharePlayer() {
    resetScreenSharePlayer()
    setScreenSharePlayerOpen(false)

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

  function renderScreenShareView(screenShare: ScreenShareView) {
    const videoStyle: CSSProperties = {
      transform: `translate3d(${screenSharePan.x}px, ${screenSharePan.y}px, 0) scale(${screenShareZoom})`,
    }
    const viewClassName = [
      'squad-meeting-screen-share-view',
      screenShareZoom > SCREEN_SHARE_MIN_ZOOM ? 'is-zoomed' : '',
      screenShareDragging ? 'is-dragging' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        className={viewClassName}
        onWheel={handleScreenShareWheel}
        onPointerDown={handleScreenSharePointerDown}
        onPointerMove={handleScreenSharePointerMove}
        onPointerUp={endScreenShareDrag}
        onPointerCancel={endScreenShareDrag}
      >
        <MediaStreamVideo
          stream={screenShare.stream}
          muted={screenShare.local}
          className="squad-meeting-screen-share-video"
          style={videoStyle}
        />
        <button
          type="button"
          onClick={openScreenSharePlayer}
          className="squad-meeting-screen-share-fullscreen-button"
          title="전체화면으로 보기"
          aria-label="화면 공유 전체화면으로 보기"
        >
          <i className="fas fa-expand"></i>
        </button>
        <div className="squad-meeting-screen-share-label">
          <i className="fas fa-desktop"></i>
          <span>{screenShare.local ? '내 화면 공유 중' : `${screenShare.userName} 화면 공유 중`}</span>
        </div>
      </div>
    )
  }

  function renderScreenSharePlayer(screenShare: ScreenShareView) {
    const zoomLabel = `${Math.round(screenShareZoom * 100)}%`
    const videoStyle: CSSProperties = {
      transform: `translate3d(${screenSharePan.x}px, ${screenSharePan.y}px, 0) scale(${screenShareZoom})`,
    }
    const canvasClassName = [
      'squad-meeting-screen-share-player-canvas',
      screenShareZoom > SCREEN_SHARE_MIN_ZOOM ? 'is-zoomed' : '',
      screenShareDragging ? 'is-dragging' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className="squad-meeting-screen-share-player" role="dialog" aria-modal="true">
        <div className="squad-meeting-screen-share-player-toolbar">
          <div className="squad-meeting-screen-share-player-title">
            <i className="fas fa-desktop"></i>
            <span>{screenShare.local ? '내 화면 공유' : `${screenShare.userName} 화면 공유`}</span>
          </div>

          <div className="squad-meeting-screen-share-player-controls">
            <button
              type="button"
              onClick={() => updateScreenShareZoom(screenShareZoom - SCREEN_SHARE_BUTTON_ZOOM_STEP)}
              className="squad-meeting-screen-share-player-button"
              title="축소"
              aria-label="화면 공유 축소"
            >
              <i className="fas fa-minus"></i>
            </button>
            <button
              type="button"
              onClick={resetScreenSharePlayer}
              className="squad-meeting-screen-share-player-zoom-button"
              title="확대 초기화"
            >
              {zoomLabel}
            </button>
            <button
              type="button"
              onClick={() => updateScreenShareZoom(screenShareZoom + SCREEN_SHARE_BUTTON_ZOOM_STEP)}
              className="squad-meeting-screen-share-player-button"
              title="확대"
              aria-label="화면 공유 확대"
            >
              <i className="fas fa-plus"></i>
            </button>
            <button
              type="button"
              onClick={closeScreenSharePlayer}
              className="squad-meeting-screen-share-player-button"
              title="닫기"
              aria-label="화면 공유 전체화면 닫기"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div
          className={canvasClassName}
          onWheel={handleScreenShareWheel}
          onPointerDown={handleScreenSharePointerDown}
          onPointerMove={handleScreenSharePointerMove}
          onPointerUp={endScreenShareDrag}
          onPointerCancel={endScreenShareDrag}
        >
          <MediaStreamVideo
            stream={screenShare.stream}
            muted={screenShare.local}
            className="squad-meeting-screen-share-player-video"
            style={videoStyle}
          />
        </div>
      </div>
    )
  }

  function renderRoomPanel() {
    const summary = voiceMinutes?.summary?.trim() ?? ''
    const summarySourceAvailable = Boolean(minutesDraft.trim() || voiceChatMessages.length > 0)
    const selectedActionItemCount = minutesActionItems.filter((_, index) =>
      selectedMinutesActionItems.includes(index),
    ).length

    return (
      <aside className={`${roomSidePanelOpen ? 'flex' : 'hidden'} w-96 bg-gray-800 border-l border-gray-700 flex-col shrink-0 transition-all duration-300 z-20`}>
        <div className="flex border-b border-gray-700 bg-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setRoomPanelTab('minutes')}
            className={`squad-meeting-room-tab-button flex-1 py-3.5 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${roomPanelTab === 'minutes' ? 'text-brand border-brand bg-gray-800' : 'text-gray-400 hover:text-gray-200 border-transparent'}`}
          >
            <i className="fas fa-robot text-sm"></i> AI 회의록
          </button>
          <button
            type="button"
            onClick={() => setRoomPanelTab('chat')}
            className={`squad-meeting-room-tab-button flex-1 py-3.5 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${roomPanelTab === 'chat' ? 'text-brand border-brand bg-gray-800' : 'text-gray-400 hover:text-gray-200 border-transparent'}`}
          >
            <i className="fas fa-comments text-sm"></i> 팀 채팅방
          </button>
        </div>

        {roomPanelTab === 'minutes' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900 relative">
            <div className="p-3 border-b border-gray-800 bg-gray-800 flex justify-between items-center shrink-0 shadow-sm">
              <div className="flex items-center gap-2">
                {voiceMinutes?.recording ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500 pulse-record"></span>
                    <span className="text-xs font-bold text-red-400 tracking-wide">
                      {speechRecognitionActive ? '내 마이크 기록 중...' : '직접 입력 중...'}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-gray-400 tracking-wide">기록 대기 중...</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void toggleMinutesRecording()}
                disabled={minutesSaving}
                className={`squad-meeting-room-record-button px-3 py-1.5 text-white rounded-md text-[10px] font-bold flex items-center gap-1.5 transition disabled:opacity-60 ${voiceMinutes?.recording ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'}`}
              >
                <div className={`${voiceMinutes?.recording ? 'w-2 h-2 rounded-sm' : 'w-1.5 h-1.5 rounded-full'} bg-white`}></div>
                {voiceMinutes?.recording ? '기록 중지' : '기록 시작'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto dark-scrollbar p-5 space-y-5">
              {minutesDraft.trim() ? (
                <textarea
                  ref={minutesTextareaRef}
                  value={minutesDraft}
                  onChange={(event) => setMinutesDraft(event.target.value)}
                  onBlur={() => {
                    if (!voiceMinutes?.recording) {
                      void saveMinutesDraft(false)
                    }
                  }}
                  readOnly={voiceMinutes?.recording}
                  className={`w-full min-h-[260px] resize-none rounded-xl border border-gray-700 bg-gray-800 p-4 text-sm leading-relaxed text-gray-300 outline-none focus:border-brand ${voiceMinutes?.recording ? 'cursor-default' : ''}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-70">
                  <i className="fas fa-microphone-alt text-4xl mb-3"></i>
                  <p className="text-xs font-bold">[기록 시작] 버튼을 누르면 내 마이크 음성을 회의록에 적습니다.</p>
                </div>
              )}
            </div>

            {summary ? (
              <div className="mx-4 mb-4 rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-brand">
                  <i className="fas fa-magic"></i> AI 회의 요약
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">{summary}</p>
                <button
                  type="button"
                  onClick={() => setMinutesSummaryReportOpen(true)}
                  className="squad-meeting-room-report-button mt-3 w-full rounded-lg bg-gray-700 text-xs font-bold text-white transition hover:bg-gray-600"
                >
                  요약 리포트 열기
                </button>
              </div>
            ) : null}

            <div className="p-4 border-t border-gray-800 bg-gray-800 shrink-0">
              <button
                type="button"
                onClick={() => void generateMinutesSummary()}
                disabled={minutesSaving || !summarySourceAvailable}
                className={`squad-meeting-room-summary-button w-full py-3.5 text-sm font-extrabold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-70 ${
                  summarySourceAvailable
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {minutesSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> AI 분석 및 요약 중...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic"></i> AI 회의 핵심 요약 생성
                  </>
                )}
              </button>
            </div>

            {minutesSummaryReportOpen ? (
              <div className="absolute inset-0 z-10 flex flex-col border-t border-gray-700 bg-gray-800/95 p-6 backdrop-blur-md">
                <div className="mb-5 flex items-center justify-between border-b border-gray-700 pb-3">
                  <h3 className="flex items-center gap-2 text-base font-extrabold text-white">
                    <i className="fas fa-robot text-lg text-brand"></i> AI 자동 요약 리포트
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMinutesSummaryReportOpen(false)}
                    className="squad-meeting-room-report-close-button flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-gray-400 transition hover:text-white"
                    aria-label="요약 리포트 닫기"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div className="dark-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">
                  <div>
                    <h4 className="mb-2 border-l-4 border-blue-500 pl-2 text-sm font-bold text-gray-400">
                      <i className="fas fa-thumbtack mr-2 text-blue-400"></i>핵심 요약
                    </h4>
                    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm leading-relaxed text-gray-200">
                      {summary ? (
                        <p className="whitespace-pre-line">{summary}</p>
                      ) : (
                        <p className="text-gray-500">아직 생성된 요약이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 border-l-4 border-brand pl-2 text-sm font-bold text-gray-400">
                      <i className="fas fa-tasks mr-2 text-brand"></i>자동 추출 To-Do List
                    </h4>
                    <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4">
                      {minutesActionItems.length > 0 ? (
                        minutesActionItems.map((item, index) => {
                          const checked = selectedMinutesActionItems.includes(index)
                          const meta = [item.assigneeName ? `담당 ${item.assigneeName}` : null, item.dueDate ? `마감 ${item.dueDate}` : null]
                            .filter(Boolean)
                            .join(' · ')

                          return (
                            <label
                              key={`${item.title}-${index}`}
                              className="flex cursor-pointer items-start gap-3 text-sm text-gray-300 transition hover:text-white"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMinutesActionItem(index)}
                                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 accent-brand"
                              />
                              <span className="min-w-0">
                                <span className="block leading-relaxed">{item.title}</span>
                                {meta ? (
                                  <span className="mt-1 block text-xs text-gray-500">{meta}</span>
                                ) : null}
                              </span>
                            </label>
                          )
                        })
                      ) : (
                        <p className="text-sm text-gray-500">칸반에 등록할 만한 할 일이 아직 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void createKanbanTasksFromMinutes()}
                  disabled={kanbanTaskCreating || selectedActionItemCount === 0}
                  className="squad-meeting-room-kanban-create-button mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-700 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {kanbanTaskCreating ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> 칸반 보드에 등록 중...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-tasks"></i> 칸반 보드에 일괄 등록
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </div>
        ) : renderChatPanel()}
      </aside>
    )
  }

  function renderVoiceRoom() {
    const gridParticipants = roomParticipants.length > 0 ? roomParticipants : currentParticipant ? [currentParticipant] : []
    const participantGridClass = getParticipantGridClass(gridParticipants.length)
    const activeScreenShare = localScreenShareStream && session?.userId
      ? {
          userId: session.userId,
          userName: session.name,
          stream: localScreenShareStream,
          local: true,
        }
      : remoteScreenShare
    const recordDotClass = voiceMinutes?.recording ? 'bg-red-500 pulse-record' : 'bg-gray-500'

    return (
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-gray-900 text-white relative">
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6 shrink-0 relative z-30 shadow-md justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${recordDotClass}`} title="AI 회의록 상태"></div>
            <h1 className="min-w-0 truncate text-base font-extrabold text-white flex items-center gap-2">
              {activeChannel?.name ?? `${projectName} 음성 회의`}
              <span className="font-mono text-gray-400 font-normal ml-2">{meetingElapsedLabel}</span>
            </h1>
            <button
              type="button"
              onClick={() => showAuthToast({ message: securityStatus.detail, durationMs: 2600 })}
              className="squad-meeting-room-security-button bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs font-bold border border-gray-600 flex items-center gap-1 cursor-pointer hover:bg-gray-600 transition"
              title={securityStatus.detail}
            >
              <i className={`${securityIconClass} text-green-400`}></i> 보안 연결됨
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => showAuthToast({ message: networkStatus.detail, durationMs: 2400 })}
              className="squad-meeting-room-network-button flex items-center gap-2 mr-4 pr-4 border-r border-gray-600 cursor-pointer"
              title={networkStatus.detail}
            >
              <i className={`${networkIconClass} text-sm ${networkStatus.tone === 'good' ? 'text-green-400' : networkStatus.tone === 'fair' ? 'text-yellow-400' : networkStatus.tone === 'poor' ? 'text-orange-400' : networkStatus.tone === 'offline' ? 'text-red-400' : 'text-gray-400'}`}></i>
              <span className="text-xs text-gray-400 font-bold hidden md:inline">{networkStatus.label}</span>
            </button>
            <button
              type="button"
              onClick={() => setRoomSidePanelOpen((current) => !current)}
              className="squad-meeting-room-panel-toggle w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 flex items-center justify-center transition"
              title="패널 열기/닫기"
            >
              <i className="fas fa-list-ul"></i>
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative">
          <section className="squad-meeting-room-stage-shell flex-1 flex flex-col relative p-4 min-w-0">
            <div className="squad-meeting-participant-stage flex-1 min-h-0 rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-inner">
              {activeScreenShare ? (
                renderScreenShareView(activeScreenShare)
              ) : gridParticipants.length > 0 ? (
                <div className={`squad-meeting-participant-grid ${participantGridClass}`}>
                  {gridParticipants.map((participant) => renderMeetingGridTile(participant))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                  <i className="fas fa-headset text-5xl text-gray-600"></i>
                  <p className="mt-4 text-sm font-extrabold text-gray-300">아직 입장한 팀원이 없습니다.</p>
                  <p className="mt-1 text-xs font-bold text-gray-500">음성 회의에 입장하면 참가자 타일이 여기에 표시됩니다.</p>
                </div>
              )}
            </div>

            <div className="squad-meeting-room-bottom-bar h-20 bg-gray-800 rounded-2xl border border-gray-700 flex items-center justify-between px-6 shadow-xl z-40">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => showAuthToast({ message: `현재 ${gridParticipants.length}명이 참여 중입니다.`, durationMs: 1600 })}
                  className="squad-meeting-room-count-button text-xs font-bold text-gray-400 bg-gray-700 px-3 py-2 rounded-lg border border-gray-600 flex items-center gap-2 cursor-pointer hover:bg-gray-600 transition"
                >
                  <i className="fas fa-users text-brand"></i> 참가자 {gridParticipants.length}
                </button>
              </div>

              <div ref={controlBoxRef} className="flex items-center gap-4 relative">
                <button
                  type="button"
                  onClick={() => void sendVoiceEvent(isMuted ? 'UNMUTE' : 'MUTE', isMuted ? '마이크 음소거 해제' : '마이크 음소거')}
                  className={`squad-meeting-room-control-button w-14 h-14 rounded-full border flex items-center justify-center text-white transition shadow-sm ${isMuted ? 'bg-red-600 hover:bg-red-700 border-red-500' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}
                  title={isMuted ? '마이크 켜기' : '마이크 끄기'}
                >
                  <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-xl`}></i>
                </button>

                <button
                  type="button"
                  onClick={() => void toggleCamera()}
                  className={`squad-meeting-room-control-button w-14 h-14 rounded-full border flex items-center justify-center text-white transition shadow-sm ${
                    localCameraStream
                      ? 'bg-green-600 hover:bg-green-700 border-green-500'
                      : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                  }`}
                  title={localCameraStream ? 'Turn camera off' : 'Turn camera on'}
                >
                  <i className={`fas ${localCameraStream ? 'fa-video' : 'fa-video-slash'} text-xl`}></i>
                </button>

                <div className="w-px h-8 bg-gray-600 mx-2"></div>

                <button
                  type="button"
                  onClick={() => void toggleScreenShare()}
                  className={`squad-meeting-room-control-button w-14 h-14 rounded-full border flex items-center justify-center text-white transition shadow-sm ${
                    localScreenShareStream
                      ? 'bg-blue-600 hover:bg-blue-700 border-blue-500'
                      : 'bg-gray-700 hover:bg-blue-600 hover:border-blue-500 border-gray-600'
                  }`}
                  title={localScreenShareStream ? '화면 공유 중지' : '화면 공유'}
                >
                  <i className="fas fa-desktop text-xl"></i>
                </button>

                <div className="relative group">
                  <button
                    type="button"
                    className="squad-meeting-room-control-button w-14 h-14 rounded-full bg-gray-700 hover:bg-yellow-600 hover:border-yellow-500 border border-gray-600 flex items-center justify-center text-white transition shadow-sm"
                    title="리액션 보내기"
                  >
                    <i className="fas fa-smile text-xl"></i>
                  </button>
                  <div className="squad-meeting-reaction-menu absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-700 p-2.5 rounded-2xl shadow-2xl flex gap-2 opacity-0 group-hover:opacity-100 transition-all invisible group-hover:visible z-50">
                    {VOICE_REACTIONS.map((reaction) => (
                      <button
                        key={reaction}
                        type="button"
                        onClick={() => sendRoomReaction(reaction)}
                        className="squad-meeting-room-reaction-button w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-xl text-2xl transition hover:scale-110 shadow-inner"
                      >
                        {reaction}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-px h-8 bg-gray-600 mx-2"></div>

                <button
                  type="button"
                  onClick={() => void leaveChannel()}
                  disabled={joining}
                  className="squad-meeting-room-end-button w-auto px-5 h-12 rounded-2xl bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition shadow-[0_4px_15px_rgba(239,68,68,0.4)] gap-2 font-bold hover:-translate-y-0.5 disabled:opacity-60"
                >
                  <i className="fas fa-phone-slash"></i>
                  종료
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAudioSettingsOpen(true)}
                  className="squad-meeting-room-settings-button w-12 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 border border-gray-600 flex items-center justify-center text-gray-300 transition"
                  title="상세 설정"
                >
                  <i className="fas fa-cog"></i>
                </button>
              </div>
            </div>
          </section>

          {renderRoomPanel()}
        </main>
        {activeScreenShare && screenSharePlayerOpen ? renderScreenSharePlayer(activeScreenShare) : null}
        <div className="squad-meeting-reaction-container fixed inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
          {floatingReactions.map((reaction) => (
            <div
              key={reaction.id}
              className="squad-meeting-floating-reaction"
              style={{
                left: `${reaction.left}px`,
                '--dx': `${reaction.dx}px`,
              } as CSSProperties}
              title={reaction.fromUserName ? `${reaction.fromUserName} ${reaction.reaction}` : reaction.reaction}
            >
              {reaction.reaction}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderAuthModal() {
    return authView ? (
      <AuthModal
        view={authView}
        onClose={() => setAuthView(null)}
        onViewChange={setAuthView}
        onAuthenticated={handleAuthenticated}
      />
    ) : null
  }

  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
        {renderAuthModal()}
      </div>
    )
  }

  if (error) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <i className="fas fa-circle-exclamation text-3xl text-red-400 mb-3"></i>
          <p className="font-extrabold text-gray-900">{error}</p>
          <a href="/workspace-hub" className="inline-flex mt-5 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
            워크스페이스로 돌아가기
          </a>
        </div>
        {renderAuthModal()}
      </div>
    )
  }

  return (
    <div className="squad-dashboard-page squad-meeting-page flex h-screen overflow-hidden text-gray-800">
      <SquadWorkspaceAside
        activePage="meeting"
        workspaceId={workspaceId}
        projectName={projectName}
        onNavigate={(event, href) => {
          if (href === navHref('/squad-meeting', workspaceId) && isJoined) {
            event.preventDefault()
            return
          }

          handleJoinedNavigation(event, href)
        }}
      />

      {isJoined ? renderVoiceRoom() : (
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          workspaceId={workspaceId}
          projectName={projectName}
          members={members}
          statusLabel="진행 중"
          currentUserName={session?.name}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F3F4F6]">
          <div className="px-8 py-4 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-headset text-brand"></i> 음성 회의
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">카메라 없이 마이크와 헤드셋만 사용하는 스쿼드 회의 공간입니다.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => showAuthToast({ message: securityStatus.detail, durationMs: 2600 })}
                className={`squad-meeting-status-badge inline-flex items-center gap-2 rounded-full border px-4 py-0 text-xs font-extrabold transition ${securityBadgeClass}`}
                title={securityStatus.detail}
              >
                <i className={securityIconClass}></i> {securityStatus.label}
              </button>
              <span
                className={`squad-meeting-status-badge inline-flex items-center gap-2 rounded-full border px-4 py-0 text-xs font-extrabold ${networkBadgeClass}`}
                title={networkStatus.detail}
              >
                <i className={networkIconClass}></i> {networkStatus.label}
              </span>
            </div>
          </div>

          <div className="px-8 pt-5 pb-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-6xl mx-auto">
              <section className="xl:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 text-center border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
                  <div className="relative mx-auto mb-6 w-36 h-36">
                    <div className={`absolute inset-0 rounded-full ${micMuted ? 'bg-gray-100' : 'bg-brand/15 animate-ping'}`}></div>
                    <div className="absolute inset-3 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${micMuted ? 'bg-red-50 text-red-500' : 'bg-green-50 text-brand'}`}>
                        <i className={`fas ${micMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-4xl`}></i>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                    {isJoined ? '음성 회의에 연결되어 있습니다.' : '음성 회의 대기실입니다.'}
                  </h2>
                  <p className="text-sm font-medium text-gray-500">
                    {isJoined
                      ? `${selectedInputLabel} 사용 중`
                      : micMuted
                        ? '마이크를 끈 상태로 입장할 수 있습니다.'
                        : '입장 전에 마이크와 스피커 설정을 확인해 주세요.'}
                  </p>
                  <p className={`text-xs font-extrabold mt-2 ${voiceConnectionStatus === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                    {voiceConnectionError ?? voiceConnectionLabel}
                  </p>
                </div>

                <div className="p-6">
                  <div className="mb-6 rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-gray-500">마이크 입력</span>
                      <span className="text-xs font-bold text-gray-400">{micMuted ? '음소거' : '감지 중'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${micMuted ? 'bg-gray-300' : 'bg-brand'}`}
                        style={{ width: `${micMuted ? 8 : micLevel}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => (
                        isJoined
                          ? void sendVoiceEvent(isMuted ? 'UNMUTE' : 'MUTE', isMuted ? '마이크 음소거 해제' : '마이크 음소거')
                          : toggleWaitingMic()
                      )}
                      className={`squad-meeting-lobby-action-button h-12 rounded-xl border text-sm font-extrabold transition flex items-center justify-center gap-2 ${micMuted ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <i className={`fas ${micMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                      {micMuted ? '마이크 켜기' : '마이크 끄기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioSettingsOpen(true)}
                      className="squad-meeting-lobby-action-button h-12 rounded-xl border border-gray-200 bg-white text-sm font-extrabold text-gray-700 hover:border-brand hover:text-brand transition flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-sliders-h"></i> 오디오
                    </button>
                    {isJoined ? (
                      <button
                        type="button"
                        onClick={() => void leaveChannel()}
                        disabled={joining}
                        className="squad-meeting-lobby-action-button h-12 rounded-xl bg-red-50 text-red-500 text-sm font-extrabold hover:bg-red-100 transition flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <i className="fas fa-phone-slash"></i> 나가기
                      </button>
                    ) : (
                      <button
                        type="button"
                        onPointerDown={handleJoinPointerDown}
                        onClick={() => void joinChannel()}
                        disabled={joining || !activeChannel}
                        className="squad-meeting-lobby-action-button h-12 rounded-xl bg-brand text-white text-sm font-extrabold hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-green-100"
                      >
                        <i className="fas fa-phone-alt"></i> 입장
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <aside className="xl:col-span-5 space-y-6">
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900">음성 회의 방</h3>
                      <p className="text-[11px] font-bold text-gray-400 mt-0.5">입장할 회의 방을 선택하고 팀원과 대화하세요.</p>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-green-50 text-brand flex items-center justify-center">
                      <i className="fas fa-headset"></i>
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    {channels.map((channel) => (
                      <button
                        type="button"
                        key={channel.channelId}
                        onClick={() => void selectChannel(channel)}
                        className={`squad-meeting-channel-button w-full text-left rounded-xl border p-4 transition ${activeChannel?.channelId === channel.channelId ? 'border-brand bg-green-50/70' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-gray-900 truncate">{channel.name}</p>
                            <p className="text-[11px] font-bold text-gray-500 truncate mt-1">{channel.description ?? '스쿼드 음성 회의 채널'}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white border border-gray-100 px-2.5 py-1 text-[10px] font-extrabold text-gray-500">
                            {activeChannel?.channelId === channel.channelId ? participants.length : channel.activeParticipantCount ?? 0}명
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900">참가자</h3>
                      <p className="text-[11px] font-bold text-gray-400 mt-0.5">현재 접속 {participants.length}명</p>
                    </div>
                    <div className="flex -space-x-2">
                      {members.slice(0, 4).map((member) => renderMemberAvatar(member, 'w-8 h-8'))}
                    </div>
                  </div>

                  <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
                    {participants.length > 0 ? participants.map(renderParticipant) : (
                      <div className="py-8 text-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50">
                        <i className="fas fa-headphones-alt text-3xl text-gray-300 mb-3"></i>
                        <p className="text-sm font-extrabold text-gray-700">아직 입장한 팀원이 없습니다.</p>
                        <p className="text-xs font-medium text-gray-400 mt-1">첫 번째로 음성 회의에 입장해 보세요.</p>
                      </div>
                    )}

                    {waitingMembers.length > 0 ? (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase mb-2">대기 중인 팀원</p>
                        <div className="space-y-2">
                          {waitingMembers.map((member) => (
                            <div key={member.memberId} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                              {renderMemberAvatar(member, 'w-8 h-8')}
                              <span className="text-xs font-bold text-gray-500">{member.learnerName ?? '팀원'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
      )}

      {audioSettingsOpen ? (
        <div className="modal active fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity">
          <div className="squad-meeting-audio-panel bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden modal-enter">
            <div className="squad-meeting-audio-header p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-sliders-h text-brand"></i> 오디오 설정
              </h3>
              <button
                type="button"
                onClick={() => setAudioSettingsOpen(false)}
                className="squad-meeting-audio-close text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="squad-meeting-audio-body p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">마이크 (입력)</label>
                <select
                  value={selectedInputId}
                  onChange={(event) => setSelectedInputId(event.target.value)}
                  className="squad-meeting-audio-select w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand font-medium shadow-sm bg-white cursor-pointer mb-3 transition"
                >
                  {audioInputs.map((option) => (
                    <option key={option.deviceId} value={option.deviceId}>{option.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void toggleMicTest()}
                    className={`squad-meeting-audio-test-button px-4 py-2 border text-xs font-bold rounded-lg transition shrink-0 ${
                      micTesting
                        ? 'bg-green-50 border-green-200 text-brand hover:bg-green-100'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {micTesting ? '테스트 중지' : '마이크 테스트'}
                  </button>
                  <div className={`flex-1 bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner relative ${micLevel > 0 || micTesting ? 'audio-testing' : ''}`}>
                    <div className="bg-brand h-full audio-meter-bar" style={{ width: `${micLevel}%` }}></div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {renderAudioProcessingBadge('에코 제거', audioProcessingStatus.echoCancellation)}
                  {renderAudioProcessingBadge('잡음 억제', audioProcessingStatus.noiseSuppression)}
                  {renderAudioProcessingBadge('자동 게인', audioProcessingStatus.autoGainControl)}
                  {renderAudioProcessingBadge('노이즈 게이트', audioProcessingStatus.noiseGate)}
                </div>
                <p className="mt-2 text-[11px] font-bold text-gray-400">
                  브라우저가 지원하는 항목만 실제로 켜집니다.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">스피커 (출력)</label>
                <select
                  value={selectedOutputId}
                  onChange={(event) => setSelectedOutputId(event.target.value)}
                  className="squad-meeting-audio-select w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand font-medium shadow-sm bg-white cursor-pointer mb-3 transition"
                >
                  {audioOutputs.map((option) => (
                    <option key={option.deviceId} value={option.deviceId}>{option.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void playSoundTest()}
                    className="squad-meeting-audio-sound-button px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-lg transition shrink-0 flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <i className={`fas ${soundTesting ? 'fa-stop' : 'fa-play'} text-[10px]`}></i>
                    {soundTesting ? '테스트 중지' : '사운드 테스트'}
                  </button>
                  <div className={`flex-1 bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner relative ${soundTesting ? 'audio-testing' : ''}`}>
                    <div className="bg-blue-500 h-full audio-meter-bar" style={{ width: `${speakerLevel}%` }}></div>
                  </div>
                </div>
              </div>
              {audioDeviceError ? (
                <p className="sr-only" role="status">{audioDeviceError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void loadAudioDevices(true).then(() => startMicMonitor(selectedInputId))}
                className="squad-meeting-device-refresh-button w-full border border-gray-200 bg-white text-gray-700 hover:border-brand hover:text-brand transition rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <i className="fas fa-sync-alt"></i> 장치 다시 검색
              </button>
            </div>
            <div className="squad-meeting-audio-footer p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAudioSettingsOpen(false)}
                className="squad-meeting-audio-cancel px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setAudioSettingsOpen(false)
                  if (localVoiceStreamRef.current) {
                    void replaceLocalVoiceInput().catch(() => {
                      setAudioDeviceError('음성 회의 마이크 입력 장치를 변경하지 못했습니다.')
                    })
                  }
                  showAuthToast({ message: '오디오 설정을 적용했습니다.', durationMs: 1600 })
                }}
                className="squad-meeting-audio-apply px-6 py-2 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition shadow-md"
              >
                설정 적용
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={remoteAudioContainerRef} className="hidden" aria-hidden="true"></div>
      {renderAuthModal()}
    </div>
  )
}
