import type {
  AdminAccount,
  AdminDashboardOverview,
  AdminModerationReport,
  AdminOfficialRoadmap,
  AdminOfficialRoadmapOption,
  AdminPendingCourse,
  AdminRoadmapNode,
  AdminRoadmapNodeResource,
  AdminTag,
} from '../types/admin'
import type { CourseCatalogMenu } from '../types/course-catalog'
import type { AdminRoadmapHubCatalog, RoadmapHubCatalog } from '../types/roadmap-hub'
import type { ApiResponse } from '../types/home'
import { expireStoredAuthSession, refreshStoredAuthSession } from './auth-session'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  // 관리자 API 공통 요청에서 인증 헤더와 응답 검증을 함께 처리한다.
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const session = await refreshStoredAuthSession()

  if (session?.accessToken) {
    headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (response.status === 401) {
    const refreshedSession = await refreshStoredAuthSession({ force: true }).catch(() => null)

    if (refreshedSession?.accessToken) {
      headers.set('Authorization', `${refreshedSession.tokenType} ${refreshedSession.accessToken}`)
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
      })

      try {
        payload = (await response.json()) as ApiResponse<T>
      } catch {
        payload = null
      }
    }

    if (response.status === 401) {
      expireStoredAuthSession({ reload: true, force: true })
      throw new Error('세션이 만료되었습니다. 다시 로그인해 주세요.')
    }
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`)
  }

  return payload.data
}

function updateAccountStatus(userId: number, action: 'restrict' | 'restore', reason: string) {
  // 계정 제한과 복구는 같은 경로 구조를 공유한다.
  return request<void>(`/api/admin/accounts/${userId}/${action}`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  })
}

export const adminApi = {
  // 관리자 대시보드에서 쓰는 API만 한곳에 모은다.
  getOverview(signal?: AbortSignal) {
    return request<AdminDashboardOverview>('/api/admin/dashboard/overview', { method: 'GET', signal })
  },
  getTags(signal?: AbortSignal) {
    return request<AdminTag[]>('/api/admin/tags', { method: 'GET', signal })
  },
  createTag(payload: { name: string; description?: string | null }) {
    return request<AdminTag>('/api/admin/tags', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  mergeTags(sourceTagIds: number[], targetTagId: number) {
    return request<void>('/api/admin/tags/merge', {
      method: 'POST',
      body: JSON.stringify({ sourceTagIds, targetTagId }),
    })
  },
  getOfficialRoadmaps(signal?: AbortSignal) {
    return request<AdminOfficialRoadmap[]>('/api/admin/roadmaps', { method: 'GET', signal })
  },
  createOfficialRoadmap(payload: { title: string; description?: string | null }) {
    return request<AdminOfficialRoadmap>('/api/admin/roadmaps', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateOfficialRoadmap(roadmapId: number, payload: { title: string; description?: string | null }) {
    return request<AdminOfficialRoadmap>(`/api/admin/roadmaps/${roadmapId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  updateOfficialRoadmapInfo(
    roadmapId: number,
    payload: { infoTitle?: string | null; infoContent?: string | null },
  ) {
    return request<AdminOfficialRoadmap>(`/api/admin/roadmaps/${roadmapId}/info`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteOfficialRoadmapInfo(roadmapId: number) {
    return request<AdminOfficialRoadmap>(`/api/admin/roadmaps/${roadmapId}/info`, { method: 'DELETE' })
  },
  deleteOfficialRoadmap(roadmapId: number) {
    return request<void>(`/api/admin/roadmaps/${roadmapId}`, { method: 'DELETE' })
  },
  getRoadmapNodes(signal?: AbortSignal) {
    return request<AdminRoadmapNode[]>('/api/admin/nodes', { method: 'GET', signal })
  },
  getOfficialRoadmapOptions(signal?: AbortSignal) {
    return request<AdminOfficialRoadmapOption[]>('/api/admin/nodes/roadmaps', { method: 'GET', signal })
  },
  createRoadmapNode(payload: {
    roadmapId: number
    title: string
    content?: string | null
    nodeType: string
    sortOrder: number
    subTopics?: string | null
    branchGroup?: number | null
  }) {
    return request<AdminRoadmapNode>('/api/admin/nodes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateRoadmapNode(
    nodeId: number,
    payload: {
      roadmapId: number
      title: string
      content?: string | null
      nodeType: string
      sortOrder: number
      subTopics?: string | null
      branchGroup?: number | null
    },
  ) {
    return request<AdminRoadmapNode>(`/api/admin/nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  updateNodeRequiredTags(nodeId: number, requiredTags: string[]) {
    return request<void>(`/api/admin/nodes/${nodeId}/required-tags`, {
      method: 'PUT',
      body: JSON.stringify({ requiredTags }),
    })
  },
  updateNodePrerequisites(nodeId: number, prerequisiteNodeIds: number[]) {
    return request<void>(`/api/admin/nodes/${nodeId}/prerequisites`, {
      method: 'PUT',
      body: JSON.stringify({ prerequisiteNodeIds }),
    })
  },
  updateNodeCompletionRule(
    nodeId: number,
    completionRuleDescription: string,
    requiredProgressRate: number,
  ) {
    return request<void>(`/api/admin/nodes/${nodeId}/completion-rule`, {
      method: 'PUT',
      body: JSON.stringify({ completionRuleDescription, requiredProgressRate }),
    })
  },
  getRoadmapNodeResources(signal?: AbortSignal) {
    return request<AdminRoadmapNodeResource[]>('/api/admin/node-resources', { method: 'GET', signal })
  },
  createRoadmapNodeResource(payload: {
    nodeId: number
    title: string
    url: string
    description?: string | null
    sourceType?: string | null
    sortOrder?: number | null
    active?: boolean
  }) {
    return request<AdminRoadmapNodeResource>('/api/admin/node-resources', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateRoadmapNodeResource(
    resourceId: number,
    payload: {
      nodeId: number
      title: string
      url: string
      description?: string | null
      sourceType?: string | null
      sortOrder?: number | null
      active?: boolean
    },
  ) {
    return request<AdminRoadmapNodeResource>(`/api/admin/node-resources/${resourceId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteRoadmapNodeResource(resourceId: number) {
    return request<void>(`/api/admin/node-resources/${resourceId}`, { method: 'DELETE' })
  },
  getAccounts(signal?: AbortSignal) {
    return request<AdminAccount[]>('/api/admin/accounts', { method: 'GET', signal })
  },
  restrictAccount(userId: number, reason: string) {
    return updateAccountStatus(userId, 'restrict', reason)
  },
  restoreAccount(userId: number, reason: string) {
    return updateAccountStatus(userId, 'restore', reason)
  },
  getPendingCourses(signal?: AbortSignal) {
    return request<AdminPendingCourse[]>('/api/admin/courses/pending', { method: 'GET', signal })
  },
  approveCourse(courseId: number, reason: string) {
    return request<void>(`/api/admin/courses/${courseId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
  },
  rejectCourse(courseId: number, reason: string) {
    return request<void>(`/api/admin/courses/${courseId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
  },
  getReports(status = 'PENDING', signal?: AbortSignal) {
    return request<AdminModerationReport[]>(
      `/api/admin/moderations/reports?status=${encodeURIComponent(status)}`,
      { method: 'GET', signal },
    )
  },
  getCourseCatalogMenu(signal?: AbortSignal) {
    return request<CourseCatalogMenu>('/api/admin/course-catalog', { method: 'GET', signal })
  },
  updateCourseCatalogMenu(payload: CourseCatalogMenu) {
    return request<CourseCatalogMenu>('/api/admin/course-catalog', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  // 관리자 로드맵 허브 편집기는 섹션 목록과 공식 로드맵 선택지를 함께 사용한다.
  getRoadmapHubCatalog(signal?: AbortSignal) {
    return request<AdminRoadmapHubCatalog>('/api/admin/roadmap-hub', { method: 'GET', signal })
  },
  updateRoadmapHubCatalog(payload: RoadmapHubCatalog) {
    return request<AdminRoadmapHubCatalog>('/api/admin/roadmap-hub', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  blindContent(contentId: number, reason: string) {
    return request<void>(`/api/admin/moderations/contents/${contentId}/blind`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },
  resolveReport(reportId: number, reason: string, action: 'WARNING' | 'SUSPEND' | 'DISMISS') {
    return request<void>(`/api/admin/moderations/reports/${reportId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ reason, action }),
    })
  },
}
