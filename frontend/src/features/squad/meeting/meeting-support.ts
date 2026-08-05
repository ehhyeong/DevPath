import { useEffect,useRef } from 'react'
import type { AudioDeviceOption,AudioProcessingStatus,NavigatorWithNetworkInformation,NetworkStatus,NetworkTone,SecurityStatus,SecurityTone,VoiceMeetingAnalysis,VoiceMeetingMinutes,VoiceMeetingSummaryResponse,VoiceParticipant } from './meeting-types'


export function useLatest<T>(value: T) {
  const ref = useRef(value)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref
}

export const FALLBACK_AUDIO_INPUTS: AudioDeviceOption[] = [{ deviceId: 'default', label: '기본 마이크' }]
export const FALLBACK_AUDIO_OUTPUTS: AudioDeviceOption[] = [{ deviceId: 'default', label: '기본 스피커' }]
export const INITIAL_AUDIO_PROCESSING_STATUS: AudioProcessingStatus = {
  echoCancellation: null,
  noiseSuppression: null,
  autoGainControl: null,
  noiseGate: false,
}

export const INITIAL_NETWORK_STATUS: NetworkStatus = {
  label: '네트워크 확인 중',
  detail: '실시간 API 왕복 시간을 확인하고 있습니다.',
  latencyMs: null,
  tone: 'checking',
}

export const VOICE_REACTIONS = ['👍', '👏', '❤️', '🎉', '💡'] as const
export const FLOATING_REACTION_VISIBLE_MS = 2500
export const MEDIA_DEVICE_REQUEST_TIMEOUT_MS = 15000
export const SCREEN_SHARE_MIN_ZOOM = 1
export const SCREEN_SHARE_MAX_ZOOM = 4
export const SCREEN_SHARE_WHEEL_ZOOM_STEP = 0.16
export const SCREEN_SHARE_BUTTON_ZOOM_STEP = 0.25

export type VoicePeerTransceivers = {
  microphone: RTCRtpTransceiver
  camera: RTCRtpTransceiver
  screen: RTCRtpTransceiver
}

export function getUserMediaWithTimeout(constraints: MediaStreamConstraints) {
  const mediaRequest = navigator.mediaDevices.getUserMedia(constraints)

  return new Promise<MediaStream>((resolve, reject) => {
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      reject(new Error('미디어 장치 권한 응답 시간이 초과되었습니다. 장치 버튼을 눌러 다시 시도해 주세요.'))
    }, MEDIA_DEVICE_REQUEST_TIMEOUT_MS)

    void mediaRequest.then(
      (stream) => {
        if (timedOut) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        window.clearTimeout(timeoutId)
        resolve(stream)
      },
      (error: unknown) => {
        if (!timedOut) {
          window.clearTimeout(timeoutId)
          reject(error)
        }
      },
    )
  })
}

export function buildVoiceSignalingUrl(channelId: number, accessToken: string) {
  const configuredUrl = (import.meta.env.VITE_VOICE_SIGNALING_URL as string | undefined)?.trim()
  const fallbackUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/voice-signaling`
  const url = new URL(configuredUrl || fallbackUrl, window.location.href)

  url.searchParams.set('channelId', String(channelId))
  url.searchParams.set('token', accessToken)

  return url.toString()
}

export function isVoiceReaction(value: string): value is (typeof VOICE_REACTIONS)[number] {
  return VOICE_REACTIONS.some((reaction) => reaction === value)
}

export function normalizeVoiceReaction(value: unknown) {
  return typeof value === 'string' && isVoiceReaction(value) ? value : null
}

export function createFloatingReactionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function clampScreenShareZoom(value: number) {
  return Math.min(SCREEN_SHARE_MAX_ZOOM, Math.max(SCREEN_SHARE_MIN_ZOOM, Number(value.toFixed(2))))
}

export function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

export function formatMeetingTime(value?: string | null) {
  if (!value) {
    return '방금 전'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

export function formatElapsedTime(value: string | null | undefined, now: number) {
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

export function getVoiceMeetingSessionStartedAt(activeParticipants: VoiceParticipant[]) {
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

export function getBrowserNetworkInformation() {
  const navigatorWithConnection = navigator as NavigatorWithNetworkInformation

  return (
    navigatorWithConnection.connection
    ?? navigatorWithConnection.mozConnection
    ?? navigatorWithConnection.webkitConnection
    ?? null
  )
}

export function buildNetworkStatus(latencyMs: number | null, failed = false): NetworkStatus {
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

export function getNetworkBadgeClass(tone: NetworkTone) {
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

export function getNetworkIconClass(tone: NetworkTone) {
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

export function isLocalDevelopmentHost() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
}

export function buildSecurityStatus(isAuthenticated: boolean, memberVerified: boolean): SecurityStatus {
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

export function getSecurityBadgeClass(tone: SecurityTone) {
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

export function getSecurityIconClass(tone: SecurityTone) {
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

export function normalizeVoiceMeetingSummaryResponse(response: VoiceMeetingSummaryResponse): VoiceMeetingAnalysis {
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
