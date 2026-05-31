export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
export type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type ChatTab = 'team' | 'dm'

export type DocumentPictureInPictureOptions = {
  width?: number
  height?: number
  disallowReturnToOpener?: boolean
  preferInitialWindowPlacement?: boolean
}

export type DocumentPictureInPictureController = {
  window: Window | null
  requestWindow: (options?: DocumentPictureInPictureOptions) => Promise<Window>
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureController
  }
}

export type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  joinedAt?: string | null
}

export type WorkspaceDashboard = {
  workspaceId: number
  name: string
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  members: WorkspaceMember[]
  unresolvedTaskCount: number
  activeMilestoneCount: number
  createdAt?: string | null
}

export type WorkspaceTask = {
  taskId: number
  workspaceId: number
  title: string
  description?: string | null
  status: TaskStatus
  priority?: TaskPriority | null
  assigneeId?: number | null
  dueDate?: string | null
  createdById?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type CalendarEvent = {
  eventId: number
  workspaceId: number
  title: string
  description?: string | null
  startAt: string
  endAt?: string | null
  createdById?: number | null
}

export type Notice = {
  id: number
  workspaceId: number
  title: string
  content: string
  createdAt?: string | null
  updatedAt?: string | null
}

export type ActivityLog = {
  logId: number
  workspaceId: number
  actorId?: number | null
  activityType?: string | null
  description?: string | null
  createdAt?: string | null
}

export type WorkspaceErdChange = {
  versionId: number
  workspaceId: number
  version: number
  summary?: string | null
  updatedById?: number | null
  updatedByName?: string | null
  createdAt?: string | null
}

export type VoiceChannel = {
  channelId: number
  workspaceId: number
  name: string
  description?: string | null
  activeParticipantCount?: number | null
  currentSessionStartedAt?: string | null
  createdAt?: string | null
}

export type TeamMessage = {
  messageId: number
  loungeId: number
  senderId: number
  senderName: string
  isMine: boolean
  content: string
  createdAt: string
}

export type DirectMessage = {
  messageId: number
  senderId: number
  senderName: string
  receiverId: number
  receiverName: string
  isMine: boolean
  content: string
  createdAt: string
}
