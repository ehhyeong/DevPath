import type { RoadmapHubCatalog } from '../../types/roadmap-hub'
import type { ProofCardSummary } from '../../types/learner'
import type { OfficialRoadmapDetail, RoadmapDetail, MyRoadmapSummary, RecommendationChange, RecommendationChangeHistory, RecommendStatus } from '../../types/roadmap'
import { request, buildQueryString } from './client'

export const roadmapApi = {
  // 로드맵 허브 공개 화면에서 관리자 저장 결과를 그대로 불러온다.
  getHubCatalog(signal?: AbortSignal) {
    return request<RoadmapHubCatalog>('/api/roadmaps/hub-catalog', { method: 'GET', signal })
  },
  getOfficialRoadmapDetail(roadmapId: number, signal?: AbortSignal) {
    return request<OfficialRoadmapDetail>(`/api/roadmaps/${roadmapId}`, { method: 'GET', signal })
  },
  getMyRoadmaps(signal?: AbortSignal) {
    return request<{ roadmaps: MyRoadmapSummary[] }>('/api/my-roadmaps', { method: 'GET', signal }, { auth: true })
  },
  getMyRoadmapDetail(customRoadmapId: number, signal?: AbortSignal) {
    return request<RoadmapDetail>(`/api/my-roadmaps/${customRoadmapId}`, { method: 'GET', signal }, { auth: true })
  },
  copyRoadmap(originalRoadmapId: number) {
    return request<{ customRoadmapId: number }>(`/api/my-roadmaps/${originalRoadmapId}`, { method: 'POST' }, { auth: true })
  },
  getPendingChanges(roadmapId?: number | null, signal?: AbortSignal, customRoadmapId?: number | null) {
    return request<RecommendationChange[]>(
      `/api/me/recommendation-changes${buildQueryString({ roadmapId, customRoadmapId })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  getChangeHistories(roadmapId?: number | null, signal?: AbortSignal, customRoadmapId?: number | null) {
    return request<RecommendationChangeHistory[]>(
      `/api/me/recommendation-changes/histories${buildQueryString({ roadmapId, customRoadmapId })}`,
      { method: 'GET', signal },
      { auth: true },
    )
  },
  applyChange(changeId: number) {
    return request<RecommendationChange>(`/api/me/recommendation-changes/${changeId}/apply`, { method: 'POST' }, { auth: true })
  },
  ignoreChange(changeId: number) {
    return request<RecommendationChange>(`/api/me/recommendation-changes/${changeId}/ignore`, { method: 'POST' }, { auth: true })
  },
  getProofCards(signal?: AbortSignal) {
    return request<ProofCardSummary[]>('/api/me/proof-cards', { method: 'GET', signal }, { auth: true })
  },
  clearNode(customRoadmapId: number, customNodeId: number) {
    return request<{ customNodeId: number; title: string }>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/clear`,
      { method: 'POST' },
      { auth: true },
    )
  },
  deferNode(customRoadmapId: number, customNodeId: number) {
    return request<void>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/defer`,
      { method: 'POST' },
      { auth: true },
    )
  },
  undeferNode(customRoadmapId: number, customNodeId: number) {
    return request<void>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/defer`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
  deleteNode(customRoadmapId: number, customNodeId: number) {
    return request<void>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}`,
      { method: 'DELETE' },
      { auth: true },
    )
  },
  moveNodeUp(customRoadmapId: number, customNodeId: number) {
    return request<void>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/move-up`,
      { method: 'POST' },
      { auth: true },
    )
  },
  moveNodeDown(customRoadmapId: number, customNodeId: number) {
    return request<void>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/move-down`,
      { method: 'POST' },
      { auth: true },
    )
  },
  setNodeBranch(customRoadmapId: number, customNodeId: number, branchGroup: number | null) {
    return request<void>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/branch`,
      { method: 'POST', body: JSON.stringify({ branchGroup }) },
      { auth: true },
    )
  },

  // [TEMP] 추천 무료 강좌 courseId 조회 — 임시 하드코딩, 추후 삭제 예정
  getRecommendedFreeCourse(customRoadmapId: number, customNodeId: number) {
    return request<number | null>(
      `/api/my-roadmaps/${customRoadmapId}/nodes/${customNodeId}/recommended-course`,
      { method: 'GET' },
      { auth: true },
    )
  },
  // [/TEMP]

  renameMyRoadmap(customRoadmapId: number, title: string) {
    return request<MyRoadmapSummary>(
      `/api/my-roadmaps/${customRoadmapId}`,
      { method: 'PATCH', body: JSON.stringify({ title }) },
      { auth: true },
    )
  },
  deleteMyRoadmap(customRoadmapId: number) {
    return request<void>(`/api/my-roadmaps/${customRoadmapId}`, { method: 'DELETE' }, { auth: true })
  },

  // 노드 완료 시 동적 추천 생성을 백그라운드로 트리거한다.
  testRunDiagnosis(originalRoadmapId: number, originalNodeId: number, customRoadmapId?: number | null) {
    return request<void>(
      `/api/me/roadmaps/${originalRoadmapId}/diagnosis/test-run${buildQueryString({
        originalNodeId,
        customRoadmapId,
      })}`,
      { method: 'POST' },
      { auth: true },
    )
  },

  // 비동기 추천 생성의 진행 상태 조회 (RUNNING/DONE/FAILED/IDLE)
  getRecommendStatus(originalRoadmapId: number) {
    return request<RecommendStatus>(
      `/api/me/roadmaps/${originalRoadmapId}/diagnosis/recommend-status`,
      { method: 'GET' },
      { auth: true },
    )
  },
}
