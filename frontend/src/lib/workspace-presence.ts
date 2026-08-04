import { projectApiRequest } from '../features/project/api'

const WORKSPACE_PRESENCE_INTERVAL_MS = 30_000

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('workspaceId') ?? params.get('squadId')
  const parsed = raw ? Number(raw) : Number.NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function installWorkspacePresenceHeartbeat(pathname: string) {
  if (!pathname.startsWith('/squad-')) {
    return
  }

  const workspaceId = getWorkspaceIdFromUrl()
  if (!workspaceId) {
    return
  }

  let stopped = false
  const touch = () => {
    if (stopped) {
      return
    }

    void projectApiRequest<void>(
      `/api/workspaces/${workspaceId}/presence`,
      { method: 'POST' },
      'optional',
    ).catch(() => undefined)
  }

  touch()
  const timer = window.setInterval(touch, WORKSPACE_PRESENCE_INTERVAL_MS)

  window.addEventListener(
    'pagehide',
    () => {
      stopped = true
      window.clearInterval(timer)
    },
    { once: true },
  )
}
