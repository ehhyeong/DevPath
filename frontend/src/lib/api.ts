import { readStoredAuthSession } from './auth-session'
import type { AuthLoginRequest, AuthSignUpRequest, AuthTokenResponse } from '../types/auth'
import type { ApiResponse, HomeOverview } from '../types/home'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.auth) {
    const session = readStoredAuthSession()

    if (session?.accessToken) {
      headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`)
  }

  return payload.data
}

export const homeApi = {
  getOverview(signal?: AbortSignal) {
    return request<HomeOverview>('/api/home/overview', {
      method: 'GET',
      signal,
    })
  },
}

export const authApi = {
  signUp(payload: AuthSignUpRequest) {
    return request<void>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  login(payload: AuthLoginRequest) {
    return request<AuthTokenResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
  },
  logout(refreshToken: string) {
    return request<void>(
      '/api/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      { auth: true },
    )
  },
}
