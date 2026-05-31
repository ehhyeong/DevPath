import type { TeamWorkspaceNavKey } from './team-workspace-nav'

export type TeamWorkspacePage = TeamWorkspaceNavKey

export type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type WorkspaceFileType = 'FILE' | 'FOLDER' | 'LINK'

export type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  role?: string | null
  roleType?: string | null
  roleLabel?: string | null
  position?: string | null
  positionLabel?: string | null
  online?: boolean
  lastActiveAt?: string | null
}

export type WorkspaceDashboard = {
  workspaceId: number
  name: string
  description?: string | null
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
  createdAt?: string | null
  updatedAt?: string | null
}

export type WorkspaceFile = {
  fileId: number
  workspaceId: number
  parentId?: number | null
  itemType: WorkspaceFileType
  originalFileName?: string | null
  displayName?: string | null
  fileSize?: number | null
  contentType?: string | null
  storageProvider?: string | null
  objectKey?: string | null
  uploadedById?: number | null
  uploadedByName?: string | null
  uploaderProfileImage?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type WorkspaceFileStorage = {
  usedBytes: number
  quotaBytes: number
  storageProvider?: string | null
}

export type QuestionSummary = {
  id: number
  authorId: number
  authorName?: string | null
  templateType?: string | null
  difficulty?: string | null
  title: string
  adoptedAnswerId?: number | null
  qnaStatus: string
  answerCount: number
  viewCount?: number
  createdAt?: string | null
}

export type QuestionDetail = QuestionSummary & {
  content?: string | null
  updatedAt?: string | null
  answers?: Array<{
    id: number
    authorId?: number | null
    authorName?: string | null
    content: string
    adopted?: boolean
    createdAt?: string | null
  }>
}

export type WorkspaceDoc = {
  docId?: number | null
  workspaceId: number
  docType: string
  content?: string | null
  updatedById?: number | null
  createdAt?: string | null
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

export type ActivityLog = {
  logId: number
  workspaceId: number
  actorId?: number | null
  activityType: string
  description: string
  createdAt?: string | null
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

export type SuiteData = {
  dashboard: WorkspaceDashboard | null
  tasks: WorkspaceTask[]
  files: WorkspaceFile[]
  storage: WorkspaceFileStorage | null
  questions: QuestionSummary[]
  events: CalendarEvent[]
  apiSpec: WorkspaceDoc | null
  erdDoc: WorkspaceDoc | null
  infraDoc: WorkspaceDoc | null
  notes: MeetingNote[]
  activities: ActivityLog[]
  voiceChannels: VoiceChannelSummary[]
}

export type TaskForm = {
  title: string
  description: string
  role: string
  priority: TaskPriority
  assigneeId: string
  dueDate: string
}

export type QuestionForm = {
  title: string
  content: string
  templateType: string
  difficulty: string
}

export type QuestionContextPicker = 'task' | 'file' | 'api'

export type QuestionContextSelection = {
  type: QuestionContextPicker
  id: string
  label: string
  description: string
  iconClassName: string
  toneClassName: string
}

export type EventForm = {
  title: string
  description: string
  type: string
  date: string
  time: string
  duration: string
}

export type DocForm = {
  mode: 'api' | 'erd' | 'infra'
  title: string
  content: string
  method: string
  endpoint: string
  status: string
  owner: string
  request: string
  response: string
  editingApiId?: string
}

export type ArchitectureApiEndpoint = {
  id: string
  sourceIndex: number
  method: string
  endpoint: string
  description: string
  status: string
  owner: string
  request?: string
  response?: string
}

export type NoteForm = {
  noteId?: number | null
  title: string
  content: string
}
