import { expireStoredAuthSession, readStoredAuthSession, refreshStoredAuthSession } from './lib/auth-session'

export type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data: T
}

type AuthMode = 'none' | 'optional' | 'required'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export async function projectApiRequest<T>(
  path: string,
  init: RequestInit = {},
  authMode: AuthMode = 'none',
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

  let response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  let payload = await response.json().catch(() => null) as ApiEnvelope<T> | null

  if (authMode !== 'none' && response.status === 401 && session?.refreshToken) {
    const refreshedSession = await refreshStoredAuthSession({ force: true }).catch(() => null)

    if (refreshedSession?.accessToken) {
      headers.set('Authorization', `${refreshedSession.tokenType} ${refreshedSession.accessToken}`)
      response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
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
