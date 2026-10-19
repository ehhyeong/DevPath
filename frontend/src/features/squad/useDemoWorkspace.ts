import { useEffect, useState } from 'react'
import { getWorkspaceAiDesign } from '../project/api'

export function useDemoWorkspace(workspaceId: number | null, active: boolean) {
  const [verifiedId, setVerifiedId] = useState<number | null>(null)
  useEffect(() => {
    if (!workspaceId || !active) return
    const controller = new AbortController()
    getWorkspaceAiDesign(workspaceId, controller.signal).then((response) => {
      if (!controller.signal.aborted) setVerifiedId(response.demoWorkspace ? workspaceId : null)
    }).catch(() => {
      // 저장된 시연 표시를 확인할 수 없으면 프로젝트명만으로 시연 입력을 허용하지 않는다.
      if (!controller.signal.aborted) setVerifiedId(null)
    })
    return () => controller.abort()
  }, [workspaceId, active])
  return Boolean(active && workspaceId && verifiedId === workspaceId)
}
