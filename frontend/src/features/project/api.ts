import { expireStoredAuthSession, readStoredAuthSession, refreshStoredAuthSession } from '../../lib/auth-session'
import { getCachedQuery, invalidateCachedQueries } from '../../lib/memory-query-cache'

export type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data: T
}

export type WorkspaceAiDesignDifficulty = 'toy' | 'mvp' | 'enterprise'
export type WorkspaceAiDesignStackMode = 'auto' | 'manual'

export type WorkspaceAiDesignRequest = {
  difficulty: WorkspaceAiDesignDifficulty
  stackMode: WorkspaceAiDesignStackMode
  frontend: string | null
  backend: string | null
  database: string | null
  idea: string | null
}

export type WorkspaceAiDesign = {
  title: string
  summary: string
  difficulty: WorkspaceAiDesignDifficulty
  stack: {
    frontend: string
    backend: string
    database: string
    libraries: string[]
    selectionReason: string
  }
  scenario: {
    userFlows: Array<{ actor: string; action: string }>
    coreFeatures: string[]
    featureIds?: string[]
    nextFeatureNumber?: number
  }
  architecture: {
    style: string
    description: string
    components: Array<{ name: string; responsibility: string }>
    erdMermaid: string
    entities: Array<{
      name: string
      purpose: string
      columns: Array<{
        name: string
        type: string
        constraints: string
        description: string
      }>
    }>
    technicalChallenges: string[]
  }
  apis: Array<{
    group?: string
    method: string
    path: string
    description: string
    auth: string
    requestExample: string
    responseExample: string
  }>
  roadmap: Array<{
    phase: number
    title: string
    goal: string
    estimatedWeeks: number
    tasks: string[]
  }>
  interviewQuestions: Array<{
    category: string
    question: string
    answer: string
    keywords: string[]
    tasks?: string[]
    apis?: string[]
    erd?: string
  }>
}

export function workspaceFeatureId(scenario: WorkspaceAiDesign['scenario'], index: number) {
  return scenario.featureIds?.[index] ?? `F${index + 1}`
}

export type WorkspaceAiDesignEdit = {
  expectedDesign: WorkspaceAiDesign
  planning?: { title: string; summary: string; userFlows: WorkspaceAiDesign['scenario']['userFlows']; features: Array<{ id: string | null; title: string }> }
  architecture?: WorkspaceAiDesign['stack'] & Pick<WorkspaceAiDesign['architecture'], 'style' | 'description' | 'components' | 'technicalChallenges'>
  roadmap?: Array<Pick<WorkspaceAiDesign['roadmap'][number], 'phase' | 'title' | 'goal' | 'tasks'>>
}

export type WorkspaceAiDesignJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type WorkspaceAiDesignJob = {
  jobId: string
  status: WorkspaceAiDesignJobStatus
  result: WorkspaceAiDesign | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

export type WorkspaceAiDesignWorkspace = {
  workspaceId: number
  dashboardUrl: string
  createdAt: string
  design: WorkspaceAiDesign
}

type AuthMode = 'none' | 'optional' | 'required'
type ProjectRequestOptions = {
  cache?: boolean
  invalidateCache?: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const PROJECT_QUERY_TTL_MS = 5 * 60_000
// 협업 데이터는 장시간 고정하지 않고, 짧은 시간의 페이지 왕복에서만 조회 결과를 재사용한다.
const WORKSPACE_QUERY_TTL_MS = 30_000

export function invalidateProjectApiCache() {
  invalidateCachedQueries((key) => key.includes('|project:'))
}

export function generateWorkspaceAiDesign(
  request: WorkspaceAiDesignRequest,
  signal?: AbortSignal,
) {
  return projectApiRequest<WorkspaceAiDesign>(
    '/api/workspaces/hub/ai-design',
    {
      method: 'POST',
      body: JSON.stringify(request),
      signal,
    },
    'required',
    { invalidateCache: false },
  )
}

export function startWorkspaceAiDesignJob(request: WorkspaceAiDesignRequest) {
  return projectApiRequest<WorkspaceAiDesignJob>(
    '/api/workspaces/hub/ai-design-jobs',
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
    'required',
    { invalidateCache: false },
  )
}

export function getWorkspaceAiDesignJob(jobId: string, signal?: AbortSignal) {
  return projectApiRequest<WorkspaceAiDesignJob>(
    `/api/workspaces/hub/ai-design-jobs/${encodeURIComponent(jobId)}`,
    { signal },
    'required',
    { cache: false },
  )
}

export function createWorkspaceFromAiDesign(jobId: string) {
  return projectApiRequest<WorkspaceAiDesignWorkspace>(
    `/api/workspaces/hub/ai-design-jobs/${encodeURIComponent(jobId)}/workspace`,
    { method: 'POST' },
    'required',
  )
}

export function getWorkspaceAiDesign(workspaceId: number, signal?: AbortSignal) {
  return projectApiRequest<WorkspaceAiDesignWorkspace>(
    `/api/workspaces/hub/projects/${workspaceId}/ai-design`,
    { signal },
    'required',
  )
}

export async function projectApiRequest<T>(
  path: string,
  init: RequestInit = {},
  authMode: AuthMode = 'none',
  options: ProjectRequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const session = authMode === 'none'
    ? readStoredAuthSession()
    : await refreshStoredAuthSession()

  if (session?.accessToken) {
    headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
  } else if (authMode === 'required') {
    throw new Error('로그인이 필요합니다.')
  }

  const execute = async (requestInit: RequestInit) => {
    let response = await fetch(`${API_BASE_URL}${path}`, { ...requestInit, headers })
    let payload = await response.json().catch(() => null) as ApiEnvelope<T> | null

    if (authMode !== 'none' && response.status === 401 && session?.refreshToken) {
      const refreshedSession = await refreshStoredAuthSession({ force: true }).catch(() => null)

      if (refreshedSession?.accessToken) {
        headers.set('Authorization', `${refreshedSession.tokenType} ${refreshedSession.accessToken}`)
        response = await fetch(`${API_BASE_URL}${path}`, { ...requestInit, headers })
        payload = await response.json().catch(() => null) as ApiEnvelope<T> | null
      }
    }

    if (authMode !== 'none' && response.status === 401 && readStoredAuthSession()) {
      expireStoredAuthSession({ reload: false, force: true })
    }

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message ?? `Request failed with status ${response.status}`)
    }

    return payload.data
  }

  const method = (init.method ?? 'GET').toUpperCase()

  if (method === 'GET' && options.cache !== false) {
    const { signal, ...sharedInit } = init
    const cacheIdentity = session?.userId ? `user-${session.userId}` : 'anonymous'

    return getCachedQuery(
      `${cacheIdentity}|project:${path}`,
      () => execute(sharedInit),
      { signal: signal ?? undefined, ttlMs: path.startsWith('/api/workspaces/') ? WORKSPACE_QUERY_TTL_MS : PROJECT_QUERY_TTL_MS },
    )
  }

  const result = await execute(init)
  // 채팅·회의 폴링의 GET 캐시 우회는 저장이 아니므로 다른 화면의 조회 결과를 지우지 않는다.
  if (method !== 'GET' && options.invalidateCache !== false) {
    invalidateProjectApiCache()
  }
  return result
}
