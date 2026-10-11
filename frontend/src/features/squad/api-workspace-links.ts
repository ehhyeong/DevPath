import type { WorkspaceAiDesign } from '../project/api'
import { mapWorkspaceApis, normalizeWorkspaceApiGroups, type AiApi } from './ai-squad-data'
import type { WorkspaceTask } from './dashboard-types'

export function readWorkspaceApiDocument(content: string) {
  const data = JSON.parse(content) as { format: string; groups?: string[]; endpoints: AiApi[] | WorkspaceAiDesign['apis'] }
  let endpoints: AiApi[]
  if (data.format === 'devpath-ai-api-v1') endpoints = mapWorkspaceApis(data.endpoints as WorkspaceAiDesign['apis'])
  else if (data.format === 'devpath-api-v1') endpoints = normalizeWorkspaceApiGroups(data.endpoints as AiApi[])
  else throw new Error('저장된 API 명세의 형식을 확인해 주세요.')
  // 빈 그룹도 작업 연결 저장과 엔드포인트 삭제 이후 유지해야 한다.
  return { format: 'devpath-api-v1', endpoints, groups: [...new Set([...(data.groups ?? []), ...endpoints.map((api) => api.group)])] }
}

export function readWorkspaceApis(content: string): AiApi[] {
  return readWorkspaceApiDocument(content).endpoints
}

export function apiTaskReference(taskId: number) {
  return `DP-${String(taskId).padStart(2, '0')}`
}

export function findApiTask(reference: string, tasks: WorkspaceTask[]) {
  const match = reference.match(/^DP-(\d+)$/)
  return match ? tasks.find((task) => task.taskId === Number(match[1])) : undefined
}

export function linkApisToTask(apis: AiApi[], taskId: number, selectedApiIds: string[]) {
  const reference = apiTaskReference(taskId)
  return apis.map((api) => {
    if (selectedApiIds.includes(api.id)) return { ...api, task: reference }
    const linkedId = api.task.match(/^DP-(\d+)$/)
    if (linkedId && Number(linkedId[1]) === taskId) return { ...api, task: '' }
    return api
  })
}

export function apiAuthLabel(auth: string) {
  const label = auth.trim()
  return !label || /^(none|null|no auth|없음)$/i.test(label) ? '없음' : label
}
