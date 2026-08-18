import type { ApiResponse } from '../../types/home'
import { expireStoredAuthSession, refreshStoredAuthSession } from '../auth-session'
import { getCachedQuery,invalidateCachedQueries } from '../memory-query-cache'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const DEVICE_STORAGE_KEY = 'devpath.playback.device-id'

function getPlaybackDeviceId() {
  try {
    const stored = window.localStorage.getItem(DEVICE_STORAGE_KEY)
    if (stored) return stored
    const generated = window.crypto?.randomUUID?.() ?? `device-${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(DEVICE_STORAGE_KEY, generated)
    return generated
  } catch {
    return 'browser-default'
  }
}

type RequestOptions = {
  auth?: boolean
  cache?: {
    key: string
    ttlMs?: number
  }
}

export function invalidateRequestCache(...keys: string[]) {
  invalidateCachedQueries((cacheKey) => keys.some((key) => cacheKey.endsWith(`|${key}`)))
}

export function buildQueryString(params: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return
    }

    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()

  return query ? `?${query}` : ''
}

export async function requestRaw(
  path: string,
  init: RequestInit = {},
  options: Pick<RequestOptions, 'auth'> = {},
): Promise<Response> {
  const headers = new Headers(init.headers)

  if (options.auth) {
    headers.set('X-DevPath-Device-Id', getPlaybackDeviceId())
    const session = await refreshStoredAuthSession()
    if (session?.accessToken) {
      headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
    }
  }

  let response = await fetch(`${API_BASE_URL}${path}`, { ...init,headers })

  if (options.auth && response.status === 401) {
    const refreshedSession = await refreshStoredAuthSession({ force: true }).catch(() => null)
    if (refreshedSession?.accessToken) {
      headers.set('Authorization', `${refreshedSession.tokenType} ${refreshedSession.accessToken}`)
      response = await fetch(`${API_BASE_URL}${path}`, { ...init,headers })
    }

    if (response.status === 401) {
      expireStoredAuthSession({ reload: true,force: true })
      throw new Error('세션이 만료되었습니다. 다시 로그인해 주세요.')
    }
  }

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as Error & { status: number }
    error.status = response.status
    throw error
  }

  return response
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let cacheIdentity = 'public'

  if (options.auth) {
    headers.set('X-DevPath-Device-Id', getPlaybackDeviceId())
    const session = await refreshStoredAuthSession()
    cacheIdentity = session?.userId ? `user-${session.userId}` : 'anonymous'

    if (session?.accessToken) {
      headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
    }
  }

  const execute = async (requestInit: RequestInit) => {
    let response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestInit,
      headers,
    })

    let payload: ApiResponse<T> | null

    try {
      payload = (await response.json()) as ApiResponse<T>
    } catch {
      payload = null
    }

    if (options.auth && response.status === 401) {
      const refreshedSession = await refreshStoredAuthSession({ force: true }).catch(() => null)

      if (refreshedSession?.accessToken) {
        headers.set('Authorization', `${refreshedSession.tokenType} ${refreshedSession.accessToken}`)
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...requestInit,
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
      const err = new Error(payload?.message ?? `Request failed with status ${response.status}`) as Error & { status: number }
      err.status = response.status
      throw err
    }

    return payload.data
  }

  if (options.cache && (init.method ?? 'GET').toUpperCase() === 'GET') {
    const { signal, ...sharedInit } = init

    return getCachedQuery(
      `${cacheIdentity}|${options.cache.key}`,
      () => execute(sharedInit),
      { signal: signal ?? undefined, ttlMs: options.cache.ttlMs },
    )
  }

  return execute(init)
}
