export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
export type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
export type VoiceEventType = 'MUTE' | 'UNMUTE' | 'SPEAKING' | 'STOP_SPEAKING'

export type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

export type WorkspaceDashboard = {
  workspaceId: number
  name: string
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  members: WorkspaceMember[]
  unresolvedTaskCount: number
}

export type VoiceChannel = {
  channelId: number
  workspaceId: number
  creatorId: number
  creatorName: string
  name: string
  description?: string | null
  activeParticipantCount?: number | null
  currentSessionStartedAt?: string | null
  createdAt?: string | null
}

export type VoiceParticipant = {
  participantId: number
  channelId: number
  userId: number
  userName: string
  active: boolean
  muted: boolean
  handRaised: boolean
  speaking: boolean
  currentSessionStartedAt?: string | null
  joinedAt?: string | null
  leftAt?: string | null
}

export type VoicePresence = {
  channelId: number
  userId: number
  userName: string
  lastSeenAt?: string | null
}

export type VoiceChatMessage = {
  messageId: number
  channelId: number
  senderId: number
  senderName: string
  content: string
  createdAt?: string | null
}

export type VoiceMeetingMinutes = {
  channelId: number
  recording: boolean
  transcript?: string | null
  summary?: string | null
  updatedByUserId?: number | null
  updatedByUserName?: string | null
  updatedAt?: string | null
}

export type WorkspaceTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export type VoiceMeetingActionItem = {
  title: string
  description?: string | null
  priority?: WorkspaceTaskPriority | null
  assigneeName?: string | null
  dueDate?: string | null
}

export type VoiceMeetingAnalysis = {
  minutes: VoiceMeetingMinutes
  actionItems: VoiceMeetingActionItem[]
}

export type VoiceMeetingSummaryResponse = VoiceMeetingAnalysis | VoiceMeetingMinutes

export type VoiceMinutesKanbanTasks = {
  tasks: { taskId: number }[]
}

export type RoomPanelTab = 'minutes' | 'chat'

export type AudioDeviceOption = {
  deviceId: string
  label: string
}

export type SinkAudioElement = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>
}

export type AudioProcessingStatus = {
  echoCancellation: boolean | null
  noiseSuppression: boolean | null
  autoGainControl: boolean | null
  noiseGate: boolean
}

export type VoiceConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type NetworkTone = 'checking' | 'good' | 'fair' | 'poor' | 'offline'
export type SecurityTone = 'checking' | 'secure' | 'warning'

export type VoiceSignalingPeer = {
  userId: number
  userName: string
}

export type VoiceReactionPayload = {
  reaction?: string
}

export type ScreenShareSignalPayload = {
  sharing?: boolean
}

export type ScreenShareView = {
  userId: number
  userName: string
  stream: MediaStream
  local: boolean
}

export type ScreenSharePan = {
  x: number
  y: number
}

export type ScreenShareDragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

export type VoiceSignalingMessage = {
  type:
    | 'peer-list'
    | 'peer-joined'
    | 'peer-left'
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'reaction'
    | 'speaking'
    | 'stop-speaking'
    | 'screen-share-start'
    | 'screen-share-stop'
    | 'error'
  channelId?: number
  peers?: VoiceSignalingPeer[]
  fromUserId?: number
  fromUserName?: string
  targetUserId?: number
  payload?:
    | RTCSessionDescriptionInit
    | RTCIceCandidateInit
    | VoiceReactionPayload
    | ScreenShareSignalPayload
    | null
  detail?: string
}

export type FloatingReaction = {
  id: string
  reaction: string
  left: number
  dx: number
  fromUserId?: number
  fromUserName?: string
}

export type NetworkStatus = {
  label: string
  detail: string
  latencyMs: number | null
  tone: NetworkTone
}

export type SecurityStatus = {
  label: string
  detail: string
  tone: SecurityTone
}

export type BrowserNetworkInformation = EventTarget & {
  downlink?: number
  effectiveType?: string
  rtt?: number
  saveData?: boolean
}

export type NavigatorWithNetworkInformation = Navigator & {
  connection?: BrowserNetworkInformation
  mozConnection?: BrowserNetworkInformation
  webkitConnection?: BrowserNetworkInformation
}

export type SpeechRecognitionAlternativeLike = {
  transcript: string
}

export type SpeechRecognitionResultLike = {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike
}

export type SpeechRecognitionResultListLike = {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

export type SpeechRecognitionEventLike = Event & {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

export type SpeechRecognitionLike = EventTarget & {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}
