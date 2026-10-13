import { refreshStoredAuthSession } from '../../lib/auth-session'
import { getCachedQuery } from '../../lib/memory-query-cache'
import { projectApiRequest } from '../project/api'

export async function initializeWorkspaceAi(workspaceId: number) {
  // 토큰 갱신은 전체 캐시를 비우므로 초기화 공유 키를 등록하기 전에 완료한다.
  const userId = (await refreshStoredAuthSession())?.userId ?? 'anonymous'
  // 초기화는 자산을 한 번 준비하는 작업이다. 조회 캐시가 저장으로 무효화되어도 준비 완료는 공유한다.
  return getCachedQuery(
    `${userId}|workspace-ai-initialized:${workspaceId}`,
    () => projectApiRequest(`/api/workspaces/hub/projects/${workspaceId}/ai-design/initialize`, { method: 'POST' }, 'required'),
    { ttlMs: 5 * 60_000 },
  )
}
