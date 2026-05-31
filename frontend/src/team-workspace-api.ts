import { readStoredAuthSession } from './lib/auth-session'
import { projectApiRequest } from './project-api'
import type {
  ActivityLog,
  CalendarEvent,
  MeetingNote,
  QuestionDetail,
  QuestionSummary,
  SuiteData,
  TaskPriority,
  TaskStatus,
  VoiceChannelSummary,
  WorkspaceDashboard,
  WorkspaceDoc,
  WorkspaceFile,
  WorkspaceFileStorage,
  WorkspaceTask,
} from './team-workspace-types'

type TaskPayload = {
  title: string
  description: string
  priority: TaskPriority
  assigneeId: number | null
  dueDate: string | null
}

type QuestionPayload = {
  templateType: string
  difficulty: string
  title: string
  content: string
}

type CalendarEventPayload = {
  title: string
  description: string
  startAt: string
  endAt: string
}

type MeetingNotePayload = {
  title: string
  content: string
}

export async function loadTeamWorkspaceSuiteData(workspaceId: number, signal: AbortSignal): Promise<SuiteData> {
  const [dashboard, tasks, files, storage, questions, events, apiSpec, erdDoc, infraDoc, notes, activities, voiceChannels] = await Promise.all([
    projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, { signal }, 'required'),
    projectApiRequest<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`, { signal }, 'required').catch(() => []),
    projectApiRequest<WorkspaceFile[]>(`/api/workspaces/${workspaceId}/files`, { signal }, 'required').catch(() => []),
    projectApiRequest<WorkspaceFileStorage>(`/api/workspaces/${workspaceId}/files/storage`, { signal }, 'required').catch(() => null),
    projectApiRequest<QuestionSummary[]>(`/api/workspaces/${workspaceId}/questions`, { signal }, 'required').catch(() => []),
    projectApiRequest<CalendarEvent[]>(`/api/workspaces/${workspaceId}/calendar-events`, { signal }, 'required').catch(() => []),
    projectApiRequest<WorkspaceDoc>(`/api/workspaces/${workspaceId}/api-spec`, { signal }, 'required').catch(() => null),
    projectApiRequest<WorkspaceDoc>(`/api/workspaces/${workspaceId}/docs/erd`, { signal }, 'required').catch(() => null),
    projectApiRequest<WorkspaceDoc>(`/api/workspaces/${workspaceId}/docs/infra`, { signal }, 'required').catch(() => null),
    projectApiRequest<MeetingNote[]>(`/api/workspaces/${workspaceId}/meeting-notes`, { signal }, 'required').catch(() => []),
    projectApiRequest<ActivityLog[]>(`/api/workspaces/${workspaceId}/activities/recent`, { signal }, 'required').catch(() => []),
    projectApiRequest<VoiceChannelSummary[]>(`/api/workspaces/${workspaceId}/voice-channels`, { signal }, 'required').catch(() => []),
  ])

  return {
    dashboard,
    tasks: tasks ?? [],
    files: files ?? [],
    storage,
    questions: questions ?? [],
    events: events ?? [],
    apiSpec,
    erdDoc,
    infraDoc,
    notes: notes ?? [],
    activities: activities ?? [],
    voiceChannels: voiceChannels ?? [],
  }
}

export function createTeamWorkspaceTask(workspaceId: number, payload: TaskPayload) {
  return projectApiRequest<WorkspaceTask>(
    `/api/workspaces/${workspaceId}/tasks`,
    { method: 'POST', body: JSON.stringify(payload) },
    'required',
  )
}

export function updateTeamWorkspaceTask(workspaceId: number, taskId: number, payload: TaskPayload) {
  return projectApiRequest<WorkspaceTask>(
    `/api/workspaces/${workspaceId}/tasks/${taskId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    'required',
  )
}

export function updateTeamWorkspaceTaskAssignee(workspaceId: number, taskId: number, assigneeId: number) {
  return projectApiRequest<WorkspaceTask>(
    `/api/workspaces/${workspaceId}/tasks/${taskId}/assignee`,
    { method: 'PATCH', body: JSON.stringify({ assigneeId }) },
    'required',
  )
}

export function updateTeamWorkspaceTaskStatus(workspaceId: number, taskId: number, status: TaskStatus) {
  return projectApiRequest<WorkspaceTask>(
    `/api/workspaces/${workspaceId}/tasks/${taskId}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    'required',
  )
}

export function deleteTeamWorkspaceTask(workspaceId: number, taskId: number) {
  return projectApiRequest<void>(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'DELETE' }, 'required')
}

export function createTeamWorkspaceFileLink(workspaceId: number, title: string, url: string) {
  return projectApiRequest<WorkspaceFile>(
    `/api/workspaces/${workspaceId}/files/links`,
    { method: 'POST', body: JSON.stringify({ title, url }) },
    'required',
  )
}

export function uploadTeamWorkspaceFile(workspaceId: number, body: FormData) {
  return projectApiRequest<WorkspaceFile>(`/api/workspaces/${workspaceId}/files`, { method: 'POST', body }, 'required')
}

export function deleteTeamWorkspaceFile(fileId: number) {
  return projectApiRequest<void>(`/api/workspace-files/${fileId}`, { method: 'DELETE' }, 'required')
}

export function fetchTeamWorkspaceQuestionDetail(questionId: number) {
  return projectApiRequest<QuestionDetail>(`/api/workspace-questions/${questionId}`, {}, 'required')
}

export function createTeamWorkspaceQuestion(workspaceId: number, payload: QuestionPayload) {
  return projectApiRequest<QuestionDetail>(
    `/api/workspaces/${workspaceId}/questions`,
    { method: 'POST', body: JSON.stringify(payload) },
    'required',
  )
}

export function adoptTeamWorkspaceAnswer(questionId: number, answerId: number) {
  return projectApiRequest<QuestionDetail>(
    `/api/qna/questions/${questionId}/answers/${answerId}/adopt`,
    { method: 'PATCH' },
    'required',
  )
}

export function createTeamWorkspaceEvent(workspaceId: number, payload: CalendarEventPayload) {
  return projectApiRequest<CalendarEvent>(
    `/api/workspaces/${workspaceId}/calendar-events`,
    { method: 'POST', body: JSON.stringify(payload) },
    'required',
  )
}

export function deleteTeamWorkspaceEvent(eventId: number) {
  return projectApiRequest<void>(`/api/calendar-events/${eventId}`, { method: 'DELETE' }, 'required')
}

export function saveTeamWorkspaceDoc(endpoint: string, content: string) {
  return projectApiRequest<WorkspaceDoc>(
    endpoint,
    { method: 'PUT', body: JSON.stringify({ content }) },
    'required',
  )
}

export function createTeamWorkspaceMeetingNote(workspaceId: number, payload: MeetingNotePayload) {
  return projectApiRequest<MeetingNote>(
    `/api/workspaces/${workspaceId}/meeting-notes`,
    { method: 'POST', body: JSON.stringify(payload) },
    'required',
  )
}

export function updateTeamWorkspaceMeetingNote(noteId: number, payload: MeetingNotePayload) {
  return projectApiRequest<MeetingNote>(
    `/api/meeting-notes/${noteId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    'required',
  )
}

export function deleteTeamWorkspaceMeetingNote(noteId: number) {
  return projectApiRequest<void>(`/api/meeting-notes/${noteId}`, { method: 'DELETE' }, 'required')
}

function apiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
}

function downloadUrl(fileId: number) {
  return `${apiBaseUrl()}/api/workspace-files/${fileId}/download`
}

export async function downloadTeamWorkspaceFile(file: WorkspaceFile) {
  const headers = new Headers()
  const session = readStoredAuthSession()

  if (session?.accessToken) {
    headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
  }

  const response = await fetch(downloadUrl(file.fileId), { headers })
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = file.originalFileName || file.displayName || `workspace-file-${file.fileId}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
