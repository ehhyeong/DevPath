import { useEffect, useState } from 'react'
import { showAuthToast } from '../../lib/auth-toast'
import { WORKSPACE_DATA_CHANGED_EVENT } from '../../lib/workspace-events'
import { projectApiRequest } from '../project/api'
import { IntegrationsPanel } from './SquadSettingsPanels'
import type { ExternalIntegration, IntegrationProvider, WorkspaceSettings } from './settings-types'

export default function AiSquadIntegrationsPanel({ workspaceId, initialIntegrations }: {
  workspaceId: number | null
  initialIntegrations: ExternalIntegration[]
}) {
  const [integrations, setIntegrations] = useState(initialIntegrations)
  const [canManage, setCanManage] = useState(false)
  const [permissionError, setPermissionError] = useState('')
  const [repositoryUrl, setRepositoryUrl] = useState(initialIntegrations.find((item) => item.provider === 'GITHUB')?.repositoryUrl ?? '')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState<IntegrationProvider | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    let ignore = false
    projectApiRequest<WorkspaceSettings>(`/api/workspaces/${workspaceId}/settings`, {}, 'required')
      .then((settings) => { if (!ignore) setCanManage(settings.canManage) })
      .catch((error: unknown) => { if (!ignore) setPermissionError(error instanceof Error ? error.message : '관리 권한을 확인하지 못했습니다.') })
    return () => { ignore = true }
  }, [workspaceId])

  function applyIntegration(updated: ExternalIntegration) {
    setIntegrations((items) => [...items.filter((item) => item.provider !== updated.provider), updated])
    if (updated.provider === 'GITHUB') setRepositoryUrl(updated.repositoryUrl ?? '')
    window.dispatchEvent(new Event(WORKSPACE_DATA_CHANGED_EVENT))
  }

  async function toggle(provider: IntegrationProvider, forcedActive?: boolean) {
    if (!workspaceId || !canManage || busy || syncing) return
    const current = integrations.find((item) => item.provider === provider)
    const isActive = forcedActive ?? !(current?.active ?? current?.isActive)
    if (provider === 'GITHUB' && isActive && !repositoryUrl.trim()) {
      showAuthToast({ message: 'GitHub 저장소 URL을 입력해 주세요.', variant: 'error' })
      return
    }
    setBusy(provider)
    try {
      const updated = await projectApiRequest<ExternalIntegration>(`/api/workspaces/${workspaceId}/integrations/${provider}`, {
        method: 'PATCH',
        body: JSON.stringify(provider === 'GITHUB'
          ? { isActive, repositoryUrl: repositoryUrl.trim(), ...(token.trim() ? { githubToken: token.trim() } : {}) }
          : { isActive }),
      }, 'required')
      applyIntegration(updated)
      // 저장 성공 후 토큰을 비워 화면에 인증 정보가 남지 않게 한다.
      if (provider === 'GITHUB') setToken('')
      showAuthToast(updated.lastSyncMessage ?? (isActive ? '외부 연동이 연결되었습니다.' : '외부 연동이 해제되었습니다.'))
    } catch (error) {
      showAuthToast({ message: error instanceof Error ? error.message : '외부 연동을 저장하지 못했습니다.', variant: 'error' })
    } finally {
      setBusy(null)
    }
  }

  async function syncGithub() {
    if (!workspaceId || !canManage || busy || syncing) return
    setSyncing(true)
    try {
      const updated = await projectApiRequest<ExternalIntegration>(`/api/workspaces/${workspaceId}/integrations/GITHUB/sync`, { method: 'POST' }, 'required')
      applyIntegration(updated)
      showAuthToast(updated.lastSyncMessage ?? 'GitHub Pull Request를 동기화했습니다.')
    } catch (error) {
      showAuthToast({ message: error instanceof Error ? error.message : 'GitHub 동기화에 실패했습니다.', variant: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  return <>
    {permissionError ? <p role="alert" className="mb-4 text-sm text-red-600">{permissionError}</p> : null}
    <IntegrationsPanel integrations={integrations} canManage={canManage} busyIntegration={busy} syncingGithub={syncing}
      githubRepositoryUrl={repositoryUrl} githubToken={token} onGithubRepositoryUrlChange={setRepositoryUrl}
      onGithubTokenChange={setToken} onToggle={toggle} onSyncGithub={syncGithub} aiWorkspace />
  </>
}
