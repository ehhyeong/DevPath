export type MentoringCommonPage =
  | 'dashboard'
  | 'workspace'
  | 'curriculum'
  | 'qna'
  | 'schedule'
  | 'files'
  | 'meeting'
  | 'live-meeting'
  | 'erd'

export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
export type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type QnaStatus = 'OPEN' | 'ANSWERED' | 'CLOSED'

export type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  joinedAt?: string | null
  lastActiveAt?: string | null
  online?: boolean
}

export type WorkspaceDashboard = {
  workspaceId: number
  name: string
  description?: string | null
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  ownerName?: string | null
  ownerProfileImage?: string | null
  ownerBio?: string | null
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
  createdAt?: string | null
  updatedAt?: string | null
}

export type QuestionSummary = {
  id: number
  authorId: number
  authorName?: string | null
  title: string
  qnaStatus?: QnaStatus | null
  answerCount: number
  viewCount: number
  createdAt?: string | null
  templateType?: string | null
  difficulty?: string | null
}

export type Answer = {
  id: number
  authorId: number
  authorName?: string | null
  content: string
  createdAt?: string | null
}

export type QuestionDetail = QuestionSummary & {
  content: string
  answers: Answer[]
}

export type WorkspaceFile = {
  fileId: number
  workspaceId: number
  parentId?: number | null
  itemType: 'FILE' | 'FOLDER' | 'LINK'
  originalFileName?: string | null
  displayName?: string | null
  fileSize: number
  contentType?: string | null
  objectKey?: string | null
  uploadedById?: number | null
  uploadedByName?: string | null
  uploaderProfileImage?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type WorkspaceErdDocument = {
  workspaceId: number
  projectName?: string | null
  mermaidCode?: string | null
  schemaJson?: string | null
  version?: number | null
  updatedById?: number | null
  updatedByName?: string | null
  updatedAt?: string | null
  members?: WorkspaceMember[] | null
}

export type WorkspaceErdVersion = {
  versionId: number
  workspaceId: number
  version: number
  mermaidCode?: string | null
  schemaJson?: string | null
  summary?: string | null
  updatedById?: number | null
  updatedByName?: string | null
  createdAt?: string | null
}

export type MeetingNote = {
  noteId: number
  workspaceId: number
  title: string
  content?: string | null
  createdById?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type VoiceChannel = {
  channelId: number
  workspaceId: number
  creatorId?: number | null
  creatorName?: string | null
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
  userName?: string | null
  active?: boolean | null
  muted?: boolean | null
  handRaised?: boolean | null
  speaking?: boolean | null
  joinedAt?: string | null
}

export type VoiceChatMessage = {
  messageId: number
  channelId: number
  senderId: number
  senderName?: string | null
  content: string
  createdAt?: string | null
}

export type DirectMessageResponse = {
  messageId: number
  senderId: number
  senderName?: string | null
  receiverId: number
  receiverName?: string | null
  isMine?: boolean | null
  content: string
  createdAt?: string | null
}

export type MentoringHeaderNotification = {
  id: number
  workspaceId: number
  pageKey: string
  message: string
  highlightText?: string | null
  actionLabel?: string | null
  timeLabel: string
  targetPath?: string | null
  modalTitle?: string | null
  modalBody?: string | null
  createdAt?: string | null
}

export type VoiceMinutes = {
  channelId: number
  recording?: boolean | null
  transcript?: string | null
  summary?: string | null
  updatedByUserId?: number | null
  updatedByUserName?: string | null
  updatedAt?: string | null
}

export type WorkspaceNotice = {
  id: number
  workspaceId: number
  title: string
  content: string
  createdAt?: string | null
  updatedAt?: string | null
}

export type MentoringWorkspaceData = {
  dashboard: WorkspaceDashboard | null
  tasks: WorkspaceTask[]
  events: CalendarEvent[]
  questions: QuestionSummary[]
  files: WorkspaceFile[]
  erd: WorkspaceErdDocument | null
  erdVersions: WorkspaceErdVersion[]
  meetingNotes: MeetingNote[]
  voiceChannels: VoiceChannel[]
  notices: WorkspaceNotice[]
}

export type PageConfig = {
  path: string
  label: string
  title: string
  icon: string
}
