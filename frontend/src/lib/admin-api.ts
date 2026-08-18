import type {
  AdminAccount,
  AdminAccountLog,
  AdminCourseReviewDetail,
  AdminCourseNodeMappingCandidate,
  AdminDashboardOverview,
  AdminModerationReport,
  AdminModerationStats,
  AdminOfficialRoadmap,
  AdminOfficialRoadmapOption,
  AdminPendingCourse,
  AdminCourseReviewHistory,
  AdminRole,
  AdminRoadmapNode,
  AdminRoadmapNodeResource,
  AdminSystemPolicy,
  AdminTag,
  AdminUserPermission,
} from '../types/admin'
import type { CourseCatalogMenu } from '../types/course-catalog'
import type { AdminRoadmapHubCatalog, RoadmapHubCatalog } from '../types/roadmap-hub'
import type { ApiResponse } from '../types/home'
import type {
  AdminCompany,
  AdminJob,
  ExperimentResult,
  JobJdAnalysis,
  JobSkillTag,
  AdminRefund,
  AdminSettlement,
  LearningMetric,
  LearningRule,
  PlatformNotice,
  RecommendationSetting,
  MarketReport,
  SettlementEligibility,
  SystemHealth,
} from '../types/admin-operations'
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

  let payload: ApiResponse<T> | null

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

function updateAccountStatus(
  userId: number,
  action: 'restrict' | 'deactivate' | 'restore' | 'withdraw' | 'approve-instructor',
  reason: string,
) {
  // 계정 상태 변경 API는 동일한 요청 본문과 경로 구조를 공유한다.
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
  updateTag(tagId: number, payload: { name: string; description?: string | null }) {
    return request<AdminTag>(`/api/admin/tags/${tagId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  mergeTags(sourceTagIds: number[], targetTagId: number) {
    return request<void>('/api/admin/tags/merge', {
      method: 'POST',
      body: JSON.stringify({ sourceTagIds, targetTagId }),
    })
  },
  deleteTag(tagId: number) {
    return request<void>(`/api/admin/tags/${tagId}`, { method: 'DELETE' })
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
  deleteRoadmapNode(nodeId: number) {
    return request<void>(`/api/admin/nodes/${nodeId}`, { method: 'DELETE' })
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
  getAccount(userId: number, signal?: AbortSignal) {
    return request<AdminAccount>(`/api/admin/accounts/${userId}`, { method: 'GET', signal })
  },
  getAccountLogs(userId: number, signal?: AbortSignal) {
    return request<AdminAccountLog[]>(`/api/admin/accounts/${userId}/logs`, { method: 'GET', signal })
  },
  getUserPermission(userId: number, signal?: AbortSignal) {
    return request<AdminUserPermission>(`/api/admin/permissions/users/${userId}`, { method: 'GET', signal })
  },
  getRoles(signal?: AbortSignal) {
    return request<AdminRole[]>('/api/admin/permissions/roles', { method: 'GET', signal })
  },
  getAdminPermissionCodes(signal?: AbortSignal) {
    return request<string[]>('/api/admin/permissions/permission-codes', { method: 'GET', signal })
  },
  createRole(payload: { roleName: string; description: string | null; permissionCodes: string[] }) {
    return request<AdminRole>('/api/admin/permissions/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateRole(roleId: number, payload: { roleName: string; description: string | null; permissionCodes: string[] }) {
    return request<AdminRole>(`/api/admin/permissions/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  deleteRole(roleId: number) {
    return request<void>(`/api/admin/permissions/roles/${roleId}`, { method: 'DELETE' })
  },
  assignAdminRole(userId: number, roleId: number) {
    return request<AdminUserPermission>(`/api/admin/permissions/users/${userId}/admin-role`, {
      method: 'PUT',
      body: JSON.stringify({ roleId }),
    })
  },
  clearAdminRole(userId: number) {
    return request<AdminUserPermission>(`/api/admin/permissions/users/${userId}/admin-role`, {
      method: 'DELETE',
    })
  },
  updateInstructorGrade(userId: number, grade: string) {
    return request<void>(`/api/admin/permissions/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ grade }),
    })
  },
  restrictAccount(userId: number, reason: string) {
    return updateAccountStatus(userId, 'restrict', reason)
  },
  deactivateAccount(userId: number, reason: string) {
    return updateAccountStatus(userId, 'deactivate', reason)
  },
  restoreAccount(userId: number, reason: string) {
    return updateAccountStatus(userId, 'restore', reason)
  },
  withdrawAccount(userId: number, reason: string) {
    return updateAccountStatus(userId, 'withdraw', reason)
  },
  approveInstructor(userId: number, reason: string) {
    return updateAccountStatus(userId, 'approve-instructor', reason)
  },
  getPendingCourses(signal?: AbortSignal) {
    return request<AdminPendingCourse[]>('/api/admin/courses/pending', { method: 'GET', signal })
  },
  getCourseReview(courseId: number, signal?: AbortSignal) {
    return request<AdminCourseReviewDetail>(`/api/admin/courses/${courseId}/review`, { method: 'GET', signal })
  },
  getCourseReviewHistory(signal?: AbortSignal) {
    return request<AdminCourseReviewHistory[]>('/api/admin/courses/review-history', { method: 'GET', signal })
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
  getModerationStats(signal?: AbortSignal) {
    return request<AdminModerationStats>('/api/admin/moderations/stats', { method: 'GET', signal })
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
  unblindContent(contentId: number, reason: string) {
    return request<void>(`/api/admin/moderations/contents/${contentId}/unblind`, {
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
  getSystemPolicies(signal?: AbortSignal) {
    return request<AdminSystemPolicy>('/api/admin/system-policies', { method: 'GET', signal })
  },
  updateSystemPolicies(payload: { platformFeeRate: number; refundPolicyDays: number; maxCoursePrice: number }) {
    return request<void>('/api/admin/system-policies', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  updateStreamingPolicy(payload: { hlsEnabled: boolean; maxResolution: string; watermarkEnabled: boolean }) {
    return request<void>('/api/admin/streaming-policy', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  getCourseNodeMappingCandidates(signal?: AbortSignal) {
    return request<AdminCourseNodeMappingCandidate[]>('/api/admin/course-node-mappings/candidates', { method: 'GET', signal })
  },
  getAiCourseNodeMappingCandidate(courseId: number, signal?: AbortSignal) {
    return request<AdminCourseNodeMappingCandidate>(`/api/admin/course-node-mappings/candidates/${courseId}/ai`, { method: 'GET', signal })
  },
  applyCourseNodeMapping(courseId: number, nodeIds: number[]) {
    return request<void>(`/api/admin/courses/${courseId}/node-mapping`, {
      method: 'PUT',
      body: JSON.stringify({ nodeIds }),
    })
  },
  getSystemHealth(signal?: AbortSignal) {
    return request<SystemHealth>('/api/admin/system/health', { method: 'GET', signal })
  },
  getAllJobs(signal?: AbortSignal) {
    return request<AdminJob[]>('/api/admin/jobs?includeArchived=true', { method: 'GET', signal })
  },
  collectJobs(keyword: string, limit: number) {
    return request<{ savedCount: number; skippedCount: number; message: string }>('/api/admin/jobs/collect', {
      method: 'POST',
      body: JSON.stringify({ source: 'JOBKOREA', keyword, limit }),
    })
  },
  createJob(payload: Record<string, unknown>) {
    return request<AdminJob>('/api/admin/jobs', { method: 'POST', body: JSON.stringify(payload) })
  },
  getJob(jobId: number, signal?: AbortSignal) {
    return request<AdminJob>(`/api/admin/jobs/${jobId}`, { method: 'GET', signal })
  },
  updateJob(jobId: number, payload: Record<string, unknown>) {
    return request<AdminJob>(`/api/admin/jobs/${jobId}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  archiveJob(jobId: number) {
    return request<void>(`/api/admin/jobs/${jobId}`, { method: 'DELETE' })
  },
  restoreJob(jobId: number) {
    return request<AdminJob>(`/api/admin/jobs/${jobId}/restore`, { method: 'POST' })
  },
  analyzeJobJd(jobId: number) {
    return request<JobJdAnalysis>(`/api/admin/jobs/${jobId}/analyze-jd`, { method: 'POST' })
  },
  getJobSkillTags(jobId: number, signal?: AbortSignal) {
    return request<JobSkillTag[]>(`/api/admin/jobs/${jobId}/skill-tags`, { method: 'GET', signal })
  },
  getCompanies(signal?: AbortSignal) {
    return request<AdminCompany[]>('/api/admin/companies?includeArchived=true', { method: 'GET', signal })
  },
  createCompany(payload: Record<string, unknown>) {
    return request<AdminCompany>('/api/admin/companies', { method: 'POST', body: JSON.stringify(payload) })
  },
  getCompany(companyId: number, signal?: AbortSignal) {
    return request<AdminCompany>(`/api/admin/companies/${companyId}`, { method: 'GET', signal })
  },
  updateCompany(companyId: number, payload: Record<string, unknown>) {
    return request<AdminCompany>(`/api/admin/companies/${companyId}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  verifyCompany(companyId: number, status: string, memo: string) {
    return request<AdminCompany>(`/api/admin/companies/${companyId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status, memo }),
    })
  },
  archiveCompany(companyId: number) {
    return request<void>(`/api/admin/companies/${companyId}`, { method: 'DELETE' })
  },
  restoreCompany(companyId: number) {
    return request<AdminCompany>(`/api/admin/companies/${companyId}/restore`, { method: 'POST' })
  },
  getLearningMetrics(signal?: AbortSignal) {
    return request<LearningMetric[]>('/api/admin/learning-metrics', { method: 'GET', signal })
  },
  getAnnualLearningReport(year?: number, signal?: AbortSignal) {
    return request<Record<string, unknown>>(`/api/admin/learning-metrics/annual-report${year ? `?year=${year}` : ''}`, { method: 'GET', signal })
  },
  getLearningRules(signal?: AbortSignal) {
    return request<LearningRule[]>('/api/admin/learning-rules', { method: 'GET', signal })
  },
  createLearningRule(payload: Record<string, unknown>) {
    return request<LearningRule>('/api/admin/learning-rules', { method: 'POST', body: JSON.stringify(payload) })
  },
  updateLearningRule(ruleId: number, payload: Record<string, unknown>) {
    return request<LearningRule>(`/api/admin/learning-rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(payload) })
  },
  setLearningRuleEnabled(ruleId: number, enabled: boolean) {
    return request<LearningRule>(`/api/admin/learning-rules/${ruleId}/${enabled ? 'enable' : 'disable'}`, { method: 'PATCH' })
  },
  getRecommendationSettings(signal?: AbortSignal) {
    return request<RecommendationSetting[]>('/api/admin/recommendation-settings', { method: 'GET', signal })
  },
  updateRecommendationSettings(settings: Array<{ key: string; value: string }>) {
    return request<RecommendationSetting[]>('/api/admin/recommendation-settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    })
  },
  getExperimentResults(signal?: AbortSignal) {
    return request<ExperimentResult[]>('/api/admin/experiments/results', { method: 'GET', signal })
  },
  getExperimentResult(experimentId: string, signal?: AbortSignal) {
    return request<ExperimentResult>(`/api/admin/experiments/${encodeURIComponent(experimentId)}/results`, { method: 'GET', signal })
  },
  createExperiment(payload: { experimentId: string; experimentName: string; hypothesis: string }) {
    return request<ExperimentResult>('/api/admin/experiments', { method: 'POST', body: JSON.stringify(payload) })
  },
  changeExperimentStatus(experimentId: string, status: ExperimentResult['status']) {
    return request<ExperimentResult>(`/api/admin/experiments/${encodeURIComponent(experimentId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
  },
  saveExperimentResult(experimentId: string, metricsJson: string) {
    return request<ExperimentResult>(`/api/admin/experiments/${encodeURIComponent(experimentId)}/results`, { method: 'PUT', body: JSON.stringify({ metricsJson }) })
  },
  getAnalyticsDashboard(signal?: AbortSignal) {
    return request<Record<string, unknown>>('/api/admin/analytics/dashboard', { method: 'GET', signal })
  },
  getMarketReport(signal?: AbortSignal) {
    return request<MarketReport>('/api/admin/market/reports', { method: 'GET', signal })
  },
  getNotices(signal?: AbortSignal) {
    return request<PlatformNotice[]>('/api/admin/notices', { method: 'GET', signal })
  },
  createNotice(payload: { title: string; content: string; isPinned: boolean }) {
    return request<PlatformNotice>('/api/admin/notices', { method: 'POST', body: JSON.stringify(payload) })
  },
  updateNotice(noticeId: number, payload: { title: string; content: string; isPinned: boolean }) {
    return request<PlatformNotice>(`/api/admin/notices/${noticeId}`, { method: 'PUT', body: JSON.stringify(payload) })
  },
  deleteNotice(noticeId: number) {
    return request<void>(`/api/admin/notices/${noticeId}`, { method: 'DELETE' })
  },
  getRefunds(signal?: AbortSignal) {
    return request<AdminRefund[]>('/api/admin/refunds', { method: 'GET', signal })
  },
  getRefund(refundId: number, signal?: AbortSignal) {
    return request<AdminRefund>(`/api/admin/refunds/${refundId}`, { method: 'GET', signal })
  },
  getSettlementEligibility(refundId: number, signal?: AbortSignal) {
    return request<SettlementEligibility>(`/api/admin/settlements/eligibility?refundRequestId=${refundId}`, { method: 'GET', signal })
  },
  processRefund(refundId: number, approved: boolean, reason: string) {
    return request<void>(`/api/admin/refunds/${refundId}/${approved ? 'approve' : 'reject'}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },
  getSettlements(signal?: AbortSignal) {
    return request<AdminSettlement[]>('/api/admin/settlements', { method: 'GET', signal })
  },
  getSettlement(settlementId: number, signal?: AbortSignal) {
    return request<AdminSettlement>(`/api/admin/settlements/${settlementId}`, { method: 'GET', signal })
  },
  updateSettlementStatus(settlementId: number, action: 'hold' | 'release' | 'complete', reason = '') {
    return request<void>(`/api/admin/settlements/${settlementId}/${action}`, {
      method: 'POST',
      ...(action === 'complete' ? {} : { body: JSON.stringify({ reason }) }),
    })
  },
}
