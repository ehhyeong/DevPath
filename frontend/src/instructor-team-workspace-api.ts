import { projectApiRequest } from './project-api'

import type {
  ActivityLogItem,
  CalendarEvent,
  MeetingNote,
  MilestoneItem,
  QuestionDetail,
  QuestionSummary,
  TaskStatus,
  TeamData,
  VoiceChannelSummary,
  WorkspaceDashboard,
  WorkspaceDoc,
  WorkspaceFile,
  WorkspaceTask,
} from './instructor-team-workspace-types'

export type InstructorTeamTaskPayload = {
  title: string
  description: string
  priority: string
  dueDate: string | null
  assigneeId: number | null
}

export type InstructorTeamMilestonePayload = {
  title: string
  description: string
  startDate: string
  dueDate: string
  status?: string
}

export type InstructorTeamCalendarEventPayload = {
  title: string
  description: string
  startAt: string
  endAt: string
}

export function loadInstructorTeamWorkspaceData(workspaceId: number, signal?: AbortSignal): Promise<TeamData> {
  return Promise.all([
    projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, { signal }, 'required'),
    projectApiRequest<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`, { signal }, 'required').catch(() => []),
    projectApiRequest<CalendarEvent[]>(`/api/workspaces/${workspaceId}/calendar-events`, { signal }, 'required').catch(() => []),
    projectApiRequest<QuestionSummary[]>(`/api/workspaces/${workspaceId}/questions`, { signal }, 'required').catch(() => []),
    projectApiRequest<MilestoneItem[]>(`/api/workspaces/${workspaceId}/milestones`, { signal }, 'required').catch(() => []),
    projectApiRequest<WorkspaceFile[]>(`/api/workspaces/${workspaceId}/files`, { signal }, 'required').catch(() => []),
    projectApiRequest<WorkspaceDoc>(`/api/workspaces/${workspaceId}/api-spec`, { signal }, 'required').catch(() => null),
    projectApiRequest<WorkspaceDoc>(`/api/workspaces/${workspaceId}/docs/erd`, { signal }, 'required').catch(() => null),
    projectApiRequest<WorkspaceDoc>(`/api/workspaces/${workspaceId}/docs/infra`, { signal }, 'required').catch(() => null),
    projectApiRequest<MeetingNote[]>(`/api/workspaces/${workspaceId}/meeting-notes`, { signal }, 'required').catch(() => []),
    projectApiRequest<ActivityLogItem[]>(`/api/workspaces/${workspaceId}/activities/recent`, { signal }, 'required').catch(() => []),
    projectApiRequest<VoiceChannelSummary[]>(`/api/workspaces/${workspaceId}/voice-channels`, { signal }, 'required').catch(() => []),
  ]).then(([dashboard, tasks, events, questions, milestones, files, apiSpec, erdDoc, infraDoc, notes, activityLogs, voiceChannels]) => ({
    dashboard,
    tasks,
    events,
    questions,
    milestones,
    files,
    apiSpec,
    erdDoc,
    infraDoc,
    notes,
    activityLogs,
    voiceChannels,
  }))
}

export function updateInstructorTeamMilestone(milestoneId: number, payload: InstructorTeamMilestonePayload) {
  return projectApiRequest(`/api/milestones/${milestoneId}`, { method: 'PATCH', body: JSON.stringify(payload) }, 'required')
}

export function createInstructorTeamMilestone(workspaceId: number, payload: InstructorTeamMilestonePayload) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/milestones`, { method: 'POST', body: JSON.stringify(payload) }, 'required')
}

export function updateInstructorTeamTask(workspaceId: number, taskId: number, payload: InstructorTeamTaskPayload) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(payload) }, 'required')
}

export function updateInstructorTeamTaskAssignee(workspaceId: number, taskId: number, assigneeId: number | null) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/tasks/${taskId}/assignee`, { method: 'PATCH', body: JSON.stringify({ assigneeId }) }, 'required')
}

export function createInstructorTeamTask(workspaceId: number, payload: InstructorTeamTaskPayload) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }, 'required')
}

export function deleteInstructorTeamTask(workspaceId: number, taskId: number) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'DELETE' }, 'required')
}

export function updateInstructorTeamTaskStatus(workspaceId: number, taskId: number, status: TaskStatus) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'required')
}

export function saveInstructorTeamWorkspaceDoc(endpoint: string, content: string) {
  return projectApiRequest(endpoint, { method: 'PUT', body: JSON.stringify({ content }) }, 'required')
}

export function fetchInstructorTeamQuestionDetail(questionId: number) {
  return projectApiRequest<QuestionDetail>(`/api/workspace-questions/${questionId}`, undefined, 'required')
}

export function updateInstructorTeamQuestionAnswer(questionId: number, answerId: number, content: string) {
  return projectApiRequest(`/api/workspace-questions/${questionId}/answers/${answerId}`, { method: 'PATCH', body: JSON.stringify({ content }) }, 'required')
}

export function createInstructorTeamQuestionAnswer(questionId: number, content: string) {
  return projectApiRequest(`/api/workspace-questions/${questionId}/answers`, { method: 'POST', body: JSON.stringify({ content }) }, 'required')
}

export function createInstructorTeamCalendarEvent(workspaceId: number, payload: InstructorTeamCalendarEventPayload) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/calendar-events`, { method: 'POST', body: JSON.stringify(payload) }, 'required')
}

export function deleteInstructorTeamCalendarEvent(eventId: number) {
  return projectApiRequest(`/api/calendar-events/${eventId}`, { method: 'DELETE' }, 'required')
}

export function createInstructorTeamFileLink(workspaceId: number, payload: { title: string; url: string }) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/files/links`, { method: 'POST', body: JSON.stringify(payload) }, 'required')
}

export function uploadInstructorTeamWorkspaceFile(workspaceId: number, body: FormData) {
  return projectApiRequest<WorkspaceFile>(`/api/workspaces/${workspaceId}/files`, { method: 'POST', body }, 'required')
}

export function updateInstructorTeamWorkspaceFile(fileId: number, payload: { name: string }) {
  return projectApiRequest<WorkspaceFile>(`/api/workspace-files/${fileId}`, { method: 'PATCH', body: JSON.stringify(payload) }, 'required')
}

export function deleteInstructorTeamWorkspaceFile(fileId: number) {
  return projectApiRequest(`/api/workspace-files/${fileId}`, { method: 'DELETE' }, 'required')
}

export function createInstructorTeamMeetingNote(workspaceId: number, payload: { title: string; content: string }) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/meeting-notes`, { method: 'POST', body: JSON.stringify(payload) }, 'required')
}

export function deleteInstructorTeamMeetingNote(noteId: number) {
  return projectApiRequest(`/api/meeting-notes/${noteId}`, { method: 'DELETE' }, 'required')
}
