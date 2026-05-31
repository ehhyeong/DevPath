export type InstructorWsPage =
  | 'dashboard'
  | 'assignments'
  | 'students'
  | 'qna'
  | 'schedule'
  | 'files'
  | 'meeting'
  | 'live-meeting'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
export type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
export type QnaStatus = 'UNANSWERED' | 'ANSWERED' | 'CLOSED' | 'OPEN'

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
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null
  assigneeId?: number | null
  dueDate?: string | null
  createdById?: number | null
  createdAt?: string | null
}

export type CalendarEvent = {
  eventId: number
  workspaceId: number
  title: string
  description?: string | null
  startAt: string
  endAt?: string | null
  createdAt?: string | null
}

export type QuestionSummary = {
  id: number
  authorId: number
  authorName?: string | null
  title: string
  content?: string | null
  qnaStatus?: QnaStatus | null
  answerCount: number
  viewCount?: number
  createdAt?: string | null
}

export type Answer = {
  id: number
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
  originalFileName?: string | null
  displayName?: string | null
  itemType: 'FILE' | 'FOLDER' | 'LINK'
  fileSize: number
  contentType?: string | null
  objectKey?: string | null
  uploadedById?: number | null
  uploadedByName?: string | null
  uploaderProfileImage?: string | null
  createdAt?: string | null
}

export type MeetingNote = {
  noteId: number
  title: string
  content?: string | null
  createdByName?: string | null
  createdAt?: string | null
}

export type WorkspaceDocResponse = {
  docId: number
  workspaceId: number
  docType: string
  content?: string | null
  updatedAt?: string | null
}

export type MeetingSettings = {
  week: string
  status: string
  title: string
  date: string
  time: string
  description: string
  link: string
}

export type WorkspaceNotice = {
  id: number
  title: string
  content: string
  createdAt?: string | null
}

export type ActivityLogItem = {
  logId: number
  actorName?: string | null
  actionType: string
  targetTitle?: string | null
  description?: string | null
  createdAt?: string | null
}

export type WorkspaceNotification = {
  id: string
  title: string
  description: string
  createdAt: string
  href: string
  icon: string
  source: 'activity' | 'derived' | 'local'
}

export type WorkspaceNotificationDraft = Omit<WorkspaceNotification, 'id' | 'createdAt' | 'source'> & {
  createdAt?: string
}

export type WorkspaceData = {
  dashboard: WorkspaceDashboard | null
  tasks: WorkspaceTask[]
  events: CalendarEvent[]
  questions: QuestionSummary[]
  notices: WorkspaceNotice[]
  files: WorkspaceFile[]
  meetingNotes: MeetingNote[]
  meetingSettings: MeetingSettings | null
  activityLogs: ActivityLogItem[]
}
