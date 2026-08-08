export type AuthLocationView = 'login' | 'signup'

export function readNumberSearchParam(name: string): number | null {
  const value = Number(new URLSearchParams(window.location.search).get(name))
  return Number.isFinite(value) && value > 0 ? value : null
}

export function readWorkspaceIdFromLocation(): number | null {
  return readNumberSearchParam('workspaceId') ?? readNumberSearchParam('squadId')
}

export function readAuthViewFromLocation(): AuthLocationView | null {
  const value = new URLSearchParams(window.location.search).get('auth')
  return value === 'login' || value === 'signup' ? value : null
}

export function syncAuthViewInLocation(view: AuthLocationView | null) {
  const url = new URL(window.location.href)

  if (view) {
    url.searchParams.set('auth', view)
  } else {
    url.searchParams.delete('auth')
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

export function buildWorkspaceHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}
