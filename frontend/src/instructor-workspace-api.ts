import { projectApiRequest } from './project-api'

import type {
  QuestionDetail,
  TaskStatus,
  WorkspaceDocResponse,
  WorkspaceFile,
} from './instructor-workspace-types'

export type InstructorWorkspaceTaskPayload = {
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate: string | null
}

export type InstructorWorkspaceCalendarEventPayload = {
  title: string
  description: string
  startAt: string
  endAt: string
}

export function updateInstructorWorkspaceTask(workspaceId: number, taskId: number, payload: InstructorWorkspaceTaskPayload) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(payload) }, 'required')
}

export function createInstructorWorkspaceTask(workspaceId: number, payload: InstructorWorkspaceTaskPayload) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }, 'required')
}

export function updateInstructorWorkspaceTaskStatus(workspaceId: number, taskId: number, status: TaskStatus) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'required')
}

export function fetchInstructorWorkspaceQuestionDetail(questionId: number) {
  return projectApiRequest<QuestionDetail>(`/api/workspace-questions/${questionId}`, {}, 'required')
}

export function createInstructorWorkspaceQuestionAnswer(questionId: number, content: string) {
  return projectApiRequest(`/api/workspace-questions/${questionId}/answers`, { method: 'POST', body: JSON.stringify({ content }) }, 'required')
}

export function createInstructorWorkspaceCalendarEvent(workspaceId: number, payload: InstructorWorkspaceCalendarEventPayload) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/calendar-events`, { method: 'POST', body: JSON.stringify(payload) }, 'required')
}

export function deleteInstructorWorkspaceCalendarEvent(eventId: number) {
  return projectApiRequest(`/api/calendar-events/${eventId}`, { method: 'DELETE' }, 'required')
}

export function deleteInstructorWorkspaceFile(fileId: number) {
  return projectApiRequest(`/api/workspace-files/${fileId}`, { method: 'DELETE' }, 'required')
}

export function createInstructorWorkspaceFileLink(workspaceId: number, payload: { title: string; url: string }) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/files/links`, { method: 'POST', body: JSON.stringify(payload) }, 'required')
}

export function uploadInstructorWorkspaceFile(workspaceId: number, body: FormData) {
  return projectApiRequest<WorkspaceFile>(`/api/workspaces/${workspaceId}/files`, { method: 'POST', body }, 'required')
}

export function updateInstructorWorkspaceFile(fileId: number, payload: { name: string }) {
  return projectApiRequest(`/api/workspace-files/${fileId}`, { method: 'PATCH', body: JSON.stringify(payload) }, 'required')
}

export function saveInstructorWorkspaceMeetingSettings(workspaceId: number, settings: unknown) {
  return projectApiRequest<WorkspaceDocResponse>(`/api/workspaces/${workspaceId}/meeting-settings`, {
    method: 'PUT',
    body: JSON.stringify({ content: JSON.stringify(settings) }),
  }, 'required')
}

export function deleteInstructorWorkspaceMeetingNote(noteId: number) {
  return projectApiRequest(`/api/meeting-notes/${noteId}`, { method: 'DELETE' }, 'required')
}

export function saveInstructorWorkspaceMeetingNote(workspaceId: number, noteId: number | null, payload: { title: string; content: string }) {
  return projectApiRequest(noteId ? `/api/meeting-notes/${noteId}` : `/api/workspaces/${workspaceId}/meeting-notes`, {
    method: noteId ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  }, 'required')
}

export function createInstructorWorkspaceNotice(workspaceId: number, payload: { title: string; content: string }) {
  return projectApiRequest(`/api/workspaces/${workspaceId}/notices`, { method: 'POST', body: JSON.stringify(payload) }, 'required')
}
