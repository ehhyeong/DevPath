import type { AuthSession, AuthTokenClaims, AuthTokenResponse } from '../types/auth'

const AUTH_STORAGE_KEY = 'devpath.auth.session'

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddingLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized.padEnd(normalized.length + paddingLength, '=')

  return window.atob(padded)
}

export function parseTokenClaims(accessToken: string): AuthTokenClaims {
  try {
    const [, payload] = accessToken.split('.')

    if (!payload) {
      return { userId: null, role: null, exp: null }
    }

    const decoded = JSON.parse(decodeBase64Url(payload)) as {
      sub?: string
      role?: string
      exp?: number
    }

    const userId = decoded.sub ? Number(decoded.sub) : null

    return {
      userId: Number.isFinite(userId) ? userId : null,
      role: decoded.role ?? null,
      exp: decoded.exp ?? null,
    }
  } catch {
    return { userId: null, role: null, exp: null }
  }
}

function buildSession(
  response: AuthTokenResponse,
  storage: AuthSession['storage'],
): AuthSession {
  const claims = parseTokenClaims(response.accessToken)

  return {
    ...response,
    ...claims,
    storage,
  }
}

function writeToStorage(storage: Storage, session: AuthSession) {
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

function readFromStorage(storage: Storage): AuthSession | null {
  const raw = storage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function persistAuthSession(
  response: AuthTokenResponse,
  remember: boolean,
): AuthSession {
  const targetStorage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage
  const storage = remember ? 'local' : 'session'
  const session = buildSession(response, storage)

  otherStorage.removeItem(AUTH_STORAGE_KEY)
  writeToStorage(targetStorage, session)

  return session
}

export function readStoredAuthSession(): AuthSession | null {
  return readFromStorage(localStorage) ?? readFromStorage(sessionStorage)
}

export function clearStoredAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getRoleLabel(role: string | null) {
  switch (role) {
    case 'ROLE_ADMIN':
      return '관리자'
    case 'ROLE_INSTRUCTOR':
      return '강사'
    case 'ROLE_LEARNER':
      return '학습자'
    default:
      return '사용자'
  }
}

export function getPostLoginRedirect(role: string | null) {
  switch (role) {
    case 'ROLE_ADMIN':
    case 'ROLE_INSTRUCTOR':
    case 'ROLE_LEARNER':
    default:
      return '/'
  }
}
