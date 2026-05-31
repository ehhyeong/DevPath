import { projectApiRequest } from './project-api'

import type {
  CalendarEvent,
  DirectMessageResponse,
  MeetingNote,
  MentoringCommonPage,
  MentoringHeaderNotification,
  MentoringWorkspaceData,
  QuestionDetail,
  QuestionSummary,
  TaskPriority,
  TaskStatus,
  VoiceChannel,
  VoiceChatMessage,
  VoiceMinutes,
  VoiceParticipant,
  WorkspaceDashboard,
  WorkspaceErdDocument,
  WorkspaceErdVersion,
  WorkspaceFile,
  WorkspaceNotice,
  WorkspaceTask,
} from './mentoring-common-workspace-types'

type Nullable<T> = T | null

function optionalRequest<T>(request: Promise<T>, fallback: T) {
  return request.catch(() => fallback)
}

export function loadMentoringHeaderNotifications(workspaceId: number, page: MentoringCommonPage, signal?: AbortSignal) {
  return projectApiRequest<MentoringHeaderNotification[]>(
    `/api/workspaces/${workspaceId}/mentoring-header-notifications?page=${encodeURIComponent(page)}`,
    { signal },
    'required',
  )
}

export async function loadMentoringWorkspaceData(workspaceId: number, signal?: AbortSignal): Promise<MentoringWorkspaceData> {
  const [
    dashboard,
    tasks,
    events,
    questions,
    files,
    erd,
    erdVersions,
    meetingNotes,
    voiceChannels,
    notices,
  ] = await Promise.all([
    projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, { signal }, 'required'),
    projectApiRequest<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`, { signal }, 'required'),
    projectApiRequest<CalendarEvent[]>(`/api/workspaces/${workspaceId}/calendar-events`, { signal }, 'required'),
    projectApiRequest<QuestionSummary[]>(`/api/workspaces/${workspaceId}/questions`, { signal }, 'required'),
    projectApiRequest<WorkspaceFile[]>(`/api/workspaces/${workspaceId}/files`, { signal }, 'required'),
    optionalRequest(projectApiRequest<WorkspaceErdDocument>(`/api/workspaces/${workspaceId}/erd`, { signal }, 'required'), null as Nullable<WorkspaceErdDocument>),
    optionalRequest(projectApiRequest<WorkspaceErdVersion[]>(`/api/workspaces/${workspaceId}/erd/versions`, { signal }, 'required'), []),
    projectApiRequest<MeetingNote[]>(`/api/workspaces/${workspaceId}/meeting-notes`, { signal }, 'required'),
    projectApiRequest<VoiceChannel[]>(`/api/workspaces/${workspaceId}/voice-channels`, { signal }, 'required'),
    optionalRequest(projectApiRequest<WorkspaceNotice[]>(`/api/workspaces/${workspaceId}/notices`, { signal }, 'required'), []),
  ])

  return { dashboard, tasks, events, questions, files, erd, erdVersions, meetingNotes, voiceChannels, notices }
}

export async function loadMentoringLiveChannelData(channelId: number, signal?: AbortSignal) {
  const [participants, messages, minutes] = await Promise.all([
    projectApiRequest<VoiceParticipant[]>(`/api/voice-channels/${channelId}/participants`, { signal }, 'required'),
    projectApiRequest<VoiceChatMessage[]>(`/api/voice-channels/${channelId}/chat-messages`, { signal }, 'required'),
    optionalRequest(projectApiRequest<VoiceMinutes>(`/api/voice-channels/${channelId}/minutes`, { signal }, 'required'), null as Nullable<VoiceMinutes>),
  ])
  return { participants, messages, minutes }
}

export function createMentoringTask(workspaceId: number, payload: { title: string; description: string | null; priority: TaskPriority; assigneeId: number | null; dueDate: string | null }) {
  return projectApiRequest<WorkspaceTask>(
    `/api/workspaces/${workspaceId}/tasks`,
    { method: 'POST', body: JSON.stringify(payload) },
    'required',
  )
}

export function updateMentoringTaskStatus(workspaceId: number, taskId: number, status: TaskStatus) {
  return projectApiRequest<WorkspaceTask>(
    `/api/workspaces/${workspaceId}/tasks/${taskId}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    'required',
  )
}

export function sendMentoringDirectMessage(workspaceId: number, receiverId: number, content: string) {
  return projectApiRequest<DirectMessageResponse>(
    `/api/workspaces/${workspaceId}/direct-messages`,
    { method: 'POST', body: JSON.stringify({ receiverId, content }) },
    'required',
  )
}

export function createMentoringQuestion(workspaceId: number, payload: { title: string; content: string; difficulty: string; templateType: string }) {
  return projectApiRequest<QuestionDetail>(
    `/api/workspaces/${workspaceId}/questions`,
    { method: 'POST', body: JSON.stringify(payload) },
    'required',
  )
}

export function fetchMentoringQuestionDetail(questionId: number) {
  return projectApiRequest<QuestionDetail>(`/api/workspace-questions/${questionId}`, {}, 'required')
}

export function createMentoringCalendarEvent(workspaceId: number, payload: { title: string; description: string | null; startAt: string; endAt: string }) {
  return projectApiRequest<CalendarEvent>(
    `/api/workspaces/${workspaceId}/calendar-events`,
    { method: 'POST', body: JSON.stringify(payload) },
    'required',
  )
}

export function uploadMentoringWorkspaceFile(workspaceId: number, body: FormData) {
  return projectApiRequest<WorkspaceFile>(`/api/workspaces/${workspaceId}/files`, { method: 'POST', body }, 'required')
}

export function createMentoringFileLink(workspaceId: number, payload: { title: string; url: string; parentId: number | null }) {
  return projectApiRequest<WorkspaceFile>(
    `/api/workspaces/${workspaceId}/files/links`,
    { method: 'POST', body: JSON.stringify(payload) },
    'required',
  )
}

export function saveMentoringErd(workspaceId: number, payload: { mermaidCode: string; schemaJson: string | null; changeSummary: string | null }) {
  return projectApiRequest<WorkspaceErdDocument>(
    `/api/workspaces/${workspaceId}/erd`,
    { method: 'PUT', body: JSON.stringify(payload) },
    'required',
  )
}

export function createMentoringMeetingNote(workspaceId: number, payload: { title: string; content: string | null }) {
  return projectApiRequest<MeetingNote>(
    `/api/workspaces/${workspaceId}/meeting-notes`,
    { method: 'POST', body: JSON.stringify(payload) },
    'required',
  )
}

export function createMentoringVoiceChannel(workspaceId: number, payload: { name: string; description: string | null }) {
  return projectApiRequest<VoiceChannel>(
    '/api/voice-channels',
    { method: 'POST', body: JSON.stringify({ workspaceId, ...payload }) },
    'required',
  )
}

export function joinMentoringVoiceChannel(channelId: number) {
  return projectApiRequest<VoiceParticipant>(`/api/voice-channels/${channelId}/join`, { method: 'POST', body: JSON.stringify({}) }, 'required')
}

export function leaveMentoringVoiceChannel(channelId: number) {
  return projectApiRequest<VoiceParticipant>(`/api/voice-channels/${channelId}/leave`, { method: 'POST', body: JSON.stringify({}) }, 'required')
}

export function sendMentoringVoiceMessage(channelId: number, content: string) {
  return projectApiRequest<VoiceChatMessage>(
    `/api/voice-channels/${channelId}/chat-messages`,
    { method: 'POST', body: JSON.stringify({ content }) },
    'required',
  )
}
