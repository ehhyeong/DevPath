export type InstructorTeamWsPage =
  | 'dashboard'
  | 'milestone'
  | 'kanban'
  | 'architecture'
  | 'qna'
  | 'schedule'
  | 'files'
  | 'meeting'
  | 'live-meeting'
  | 'voice-channel'

export type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type WorkspaceFileType = 'FILE' | 'FOLDER' | 'LINK'

export type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  role?: string | null
  roleLabel?: string | null
  position?: string | null
  online?: boolean
  lastActiveAt?: string | null
  joinedAt?: string | null
}

export type WorkspaceDashboard = {
  workspaceId: number
  name: string
  description?: string | null
  type: WorkspaceType
  status: string
  ownerId: number
  ownerName?: string | null
  ownerProfileImage?: string | null
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
  assigneeName?: string | null
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
  content?: string | null
  qnaStatus?: string | null
  answerCount: number
  viewCount?: number
  createdAt?: string | null
}

export type AnswerSummary = {
  id: number
  authorId: number
  authorName?: string | null
  content: string
  adopted?: boolean
  createdAt?: string | null
}

export type QuestionDetail = QuestionSummary & {
  updatedAt?: string | null
  answers: AnswerSummary[]
}

export type MilestoneItem = {
  milestoneId: number
  workspaceId: number
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  status: 'OPEN' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | string
  createdAt?: string | null
}

export type WorkspaceFile = {
  fileId: number
  workspaceId: number
  itemType: WorkspaceFileType
  originalFileName?: string | null
  displayName?: string | null
  fileSize?: number | null
  contentType?: string | null
  objectKey?: string | null
  uploadedById?: number | null
  uploadedByName?: string | null
  uploaderProfileImage?: string | null
  createdAt?: string | null
}

export type WorkspaceDoc = {
  docId?: number | null
  workspaceId: number
  docType: string
  content?: string | null
  updatedAt?: string | null
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

export type ActivityLogItem = {
  logId: number
  actorName?: string | null
  actionType?: string | null
  activityType?: string | null
  targetTitle?: string | null
  description?: string | null
  createdAt?: string | null
}

export type TeamNotification = {
  id: string
  title: string
  description: string
  createdAt: string
  href: string
  icon: string
  source: 'activity' | 'derived' | 'local'
}

export type TeamNotificationDraft = Omit<TeamNotification, 'id' | 'createdAt' | 'source'> & {
  createdAt?: string
}

export type VoiceChannelSummary = {
  channelId: number
  workspaceId: number
  name: string
  description?: string | null
  activeParticipantCount: number
  currentSessionStartedAt?: string | null
  createdAt?: string | null
}

export type TeamData = {
  dashboard: WorkspaceDashboard | null
  tasks: WorkspaceTask[]
  events: CalendarEvent[]
  questions: QuestionSummary[]
  milestones: MilestoneItem[]
  files: WorkspaceFile[]
  apiSpec: WorkspaceDoc | null
  erdDoc: WorkspaceDoc | null
  infraDoc: WorkspaceDoc | null
  notes: MeetingNote[]
  activityLogs: ActivityLogItem[]
  voiceChannels: VoiceChannelSummary[]
}

export type PageConfig = { path: string; label: string; title: string; icon: string; section: 'admin' | 'team' | 'resources' }
