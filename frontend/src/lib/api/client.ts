import type { ApiResponse } from '../../types/home'
import { expireStoredAuthSession, refreshStoredAuthSession } from '../auth-session'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

type RequestOptions = {
  auth?: boolean
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

  if (options.auth) {
    const session = await refreshStoredAuthSession()

    if (session?.accessToken) {
      headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
    }
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

  if (options.auth && response.status === 401) {
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
    const err = new Error(payload?.message ?? `Request failed with status ${response.status}`) as Error & { status: number }
    err.status = response.status
    throw err
  }

  return payload.data
}
