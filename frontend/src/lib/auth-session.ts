import type { AuthSession, AuthTokenClaims, AuthTokenResponse } from '../types/auth'
import {
  EXPIRED_AUTH_TOAST_MESSAGE,
  LOGIN_SUCCESS_AUTH_TOAST_MESSAGE,
  LOGOUT_AUTH_TOAST_MESSAGE,
  queueAuthToast,
  showAuthToast,
} from './auth-toast'

const AUTH_STORAGE_KEY = 'devpath.auth.session'
const AUTH_RETURN_PATH_KEY = 'devpath.auth.return-path'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const IDLE_TIMEOUT_MS = 60 * 60 * 1000
const ACTIVITY_WRITE_INTERVAL_MS = 30 * 1000
const ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000
const REFRESH_STORAGE_RECOVERY_TIMEOUT_MS = 1500
const REFRESH_STORAGE_RECOVERY_POLL_MS = 50
const IDLE_ACTIVITY_EVENTS = [
  'click',
  'keydown',
  'pointerdown',
  'scroll',
  'touchstart',
] as const

let expiryTimeoutId: number | null = null
let idleActivityListenersAttached = false
let authStorageSyncListenerAttached = false
let lastActivityWriteAt = 0
let refreshSessionPromise: Promise<AuthSession | null> | null = null

export const AUTH_SESSION_SYNC_EVENT = 'devpath:auth-session-sync'

type AuthToastOptions = {
  persistToast?: boolean
  toastMessage?: string | null
}

type ClearAuthSessionOptions = AuthToastOptions

type ApiEnvelope<T> = {
  success: boolean
  code?: string
  message?: string
  data: T
}

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
    lastActivityAt: storage === 'session' ? Date.now() : undefined,
  }
}

function writeToStorage(storage: Storage, session: AuthSession) {
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

function notifyAuthSessionChanged() {
  window.dispatchEvent(new Event(AUTH_SESSION_SYNC_EVENT))
}

function ensureAuthStorageSyncListener() {
  if (authStorageSyncListenerAttached || typeof window === 'undefined') {
    return
  }

  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_STORAGE_KEY) {
      notifyAuthSessionChanged()
    }
  })

  authStorageSyncListenerAttached = true
}

function emitAuthToast(message: string | null | undefined, options?: AuthToastOptions) {
  if (!message) {
    return
  }

  if (options?.persistToast) {
    queueAuthToast(message)
    return
  }

  showAuthToast(message)
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

function clearExpiryTimer() {
  if (expiryTimeoutId !== null) {
    window.clearTimeout(expiryTimeoutId)
    expiryTimeoutId = null
  }
}

function getStoredSessionRaw() {
  return readFromStorage(localStorage) ?? readFromStorage(sessionStorage)
}

function getSessionStorage(session: AuthSession) {
  return session.storage === 'local' ? localStorage : sessionStorage
}

function getCurrentReturnPath() {
  const url = new URL(window.location.href)
  url.searchParams.delete('auth')

  return `${url.pathname}${url.search}${url.hash}`
}

function normalizeReturnPath(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value, window.location.origin)

    if (url.origin !== window.location.origin) {
      return null
    }

    url.searchParams.delete('auth')

    const path = `${url.pathname}${url.search}${url.hash}`

    if (path === '/login' || path === '/signup' || path.startsWith('/oauth2/redirect')) {
      return null
    }

    return path
  } catch {
    return null
  }
}

export function storePostLoginReturnPath(path = getCurrentReturnPath()) {
  const normalizedPath = normalizeReturnPath(path)

  if (!normalizedPath) {
    return
  }

  sessionStorage.setItem(AUTH_RETURN_PATH_KEY, normalizedPath)
}

export function consumePostLoginReturnPath() {
  const path = normalizeReturnPath(sessionStorage.getItem(AUTH_RETURN_PATH_KEY))
  sessionStorage.removeItem(AUTH_RETURN_PATH_KEY)

  return path
}

function isIdleSessionExpired(session: AuthSession, nowMs = Date.now()) {
  if (session.storage === 'local') {
    return false
  }

  const lastActivityAt = session.lastActivityAt ?? nowMs

  return lastActivityAt + IDLE_TIMEOUT_MS <= nowMs
}

function updateSessionActivity(session: AuthSession, timestamp = Date.now()) {
  if (session.storage === 'local') {
    return session
  }

  const nextSession: AuthSession = {
    ...session,
    lastActivityAt: timestamp,
  }

  writeToStorage(getSessionStorage(nextSession), nextSession)

  return nextSession
}

function isAccessTokenExpiring(session: AuthSession, nowMs = Date.now()) {
  if (!session.exp) {
    return false
  }

  return session.exp * 1000 <= nowMs + ACCESS_TOKEN_REFRESH_SKEW_MS
}

function replaceStoredAuthTokens(
  previousSession: AuthSession,
  response: AuthTokenResponse,
) {
  const claims = parseTokenClaims(response.accessToken)
  const nextSession: AuthSession = {
    ...previousSession,
    ...response,
    ...claims,
    storage: previousSession.storage,
    lastActivityAt: previousSession.lastActivityAt,
  }

  writeToStorage(getSessionStorage(nextSession), nextSession)
  scheduleSessionExpiry(nextSession)
  notifyAuthSessionChanged()

  return nextSession
}

function isRotatedStoredSession(
  session: AuthSession | null,
  previousRefreshToken: string,
) {
  return Boolean(session?.refreshToken && session.refreshToken !== previousRefreshToken)
}

function waitForRotatedStoredSession(previousRefreshToken: string) {
  const existingSession = getStoredSessionRaw()

  if (isRotatedStoredSession(existingSession, previousRefreshToken)) {
    return Promise.resolve(existingSession)
  }

  return new Promise<AuthSession | null>((resolve) => {
    const startedAt = Date.now()
    let timerId: number | null = null
    let completed = false

    const finish = (session: AuthSession | null) => {
      if (completed) {
        return
      }

      completed = true
      window.removeEventListener('storage', handleStorage)

      if (timerId !== null) {
        window.clearTimeout(timerId)
      }

      resolve(session)
    }

    const checkStoredSession = () => {
      const session = getStoredSessionRaw()

      if (isRotatedStoredSession(session, previousRefreshToken)) {
        finish(session)
        return
      }

      if (Date.now() - startedAt >= REFRESH_STORAGE_RECOVERY_TIMEOUT_MS) {
        finish(null)
        return
      }

      timerId = window.setTimeout(checkStoredSession, REFRESH_STORAGE_RECOVERY_POLL_MS)
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === AUTH_STORAGE_KEY) {
        checkStoredSession()
      }
    }

    window.addEventListener('storage', handleStorage)
    timerId = window.setTimeout(checkStoredSession, REFRESH_STORAGE_RECOVERY_POLL_MS)
  })
}

async function executeRefreshStoredAuthSession(
  session: AuthSession,
) {
  const response = await fetch(`${API_BASE_URL}/api/auth/reissue`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  })

  const payload = await response.json().catch(() => null) as ApiEnvelope<AuthTokenResponse> | null

  if (!response.ok || !payload?.success) {
    const recoveredSession = await waitForRotatedStoredSession(session.refreshToken)

    if (recoveredSession) {
      scheduleSessionExpiry(recoveredSession)
      notifyAuthSessionChanged()
      return recoveredSession
    }

    expireStoredAuthSession({ reload: false, force: true })
    throw new Error(payload?.message ?? '토큰 재발급에 실패했습니다.')
  }

  return replaceStoredAuthTokens(session, payload.data)
}

export async function refreshStoredAuthSession(options?: { force?: boolean }) {
  const session = readStoredAuthSession()

  if (!session?.refreshToken) {
    return session
  }

  if (!options?.force && !isAccessTokenExpiring(session)) {
    return session
  }

  if (!refreshSessionPromise) {
    refreshSessionPromise = executeRefreshStoredAuthSession(session).finally(() => {
      refreshSessionPromise = null
    })
  }

  return refreshSessionPromise
}

function touchSessionActivity(force = false) {
  const session = getStoredSessionRaw()

  if (!session || session.storage === 'local') {
    return
  }

  const now = Date.now()

  if (!force && now - lastActivityWriteAt < ACTIVITY_WRITE_INTERVAL_MS) {
    return
  }

  lastActivityWriteAt = now
  scheduleSessionExpiry(updateSessionActivity(session, now))
}

function ensureIdleActivityListeners() {
  if (idleActivityListenersAttached) {
    return
  }

  IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, () => touchSessionActivity(), { passive: true })
  })

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      touchSessionActivity()
    }
  })

  idleActivityListenersAttached = true
}

function scheduleSessionExpiry(session: AuthSession) {
  clearExpiryTimer()

  if (session.storage === 'local') {
    return
  }

  ensureIdleActivityListeners()

  const lastActivityAt = session.lastActivityAt ?? Date.now()
  const delayMs = lastActivityAt + IDLE_TIMEOUT_MS - Date.now()

  if (delayMs <= 0) {
    expireStoredAuthSession({ reload: false })
    return
  }

  expiryTimeoutId = window.setTimeout(() => {
    expireStoredAuthSession({ reload: true })
  }, delayMs)
}

export function persistAuthSession(
  response: AuthTokenResponse,
  remember: boolean,
  options?: AuthToastOptions,
): AuthSession {
  const targetStorage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage
  const storage = remember ? 'local' : 'session'
  const session = buildSession(response, storage)

  otherStorage.removeItem(AUTH_STORAGE_KEY)
  writeToStorage(targetStorage, session)

  if (!remember) {
    ensureIdleActivityListeners()
  }

  scheduleSessionExpiry(session)
  notifyAuthSessionChanged()
  emitAuthToast(options?.toastMessage ?? LOGIN_SUCCESS_AUTH_TOAST_MESSAGE, options)

  return session
}

export function readStoredAuthSession(): AuthSession | null {
  ensureAuthStorageSyncListener()

  const session = getStoredSessionRaw()

  if (!session) {
    clearExpiryTimer()
    return null
  }

  if (isIdleSessionExpired(session)) {
    expireStoredAuthSession({ reload: false })
    return null
  }

  const nextSession = session.storage === 'session' && !session.lastActivityAt
    ? updateSessionActivity(session)
    : session

  scheduleSessionExpiry(nextSession)

  return nextSession
}

export function clearStoredAuthSession(options?: ClearAuthSessionOptions) {
  clearExpiryTimer()
  storePostLoginReturnPath()
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  notifyAuthSessionChanged()
  emitAuthToast(options?.toastMessage ?? LOGOUT_AUTH_TOAST_MESSAGE, {
    ...options,
    persistToast: options?.persistToast ?? false,
  })
}

export function expireStoredAuthSession(options?: { reload?: boolean; force?: boolean }) {
  const session = getStoredSessionRaw()

  clearExpiryTimer()

  if (!session) {
    return
  }

  if (session.storage === 'local' && !options?.force) {
    return
  }

  storePostLoginReturnPath()
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  notifyAuthSessionChanged()

  showAuthToast(EXPIRED_AUTH_TOAST_MESSAGE)
}

export function updateStoredAuthSession(patch: Partial<Pick<AuthSession, 'name'>>) {
  const session = readStoredAuthSession()

  if (!session) {
    return null
  }

  const nextSession: AuthSession = {
    ...session,
    ...patch,
  }

  writeToStorage(getSessionStorage(nextSession), nextSession)
  scheduleSessionExpiry(nextSession)
  notifyAuthSessionChanged()

  return nextSession
}

export function getRoleLabel(role: string | null) {
  switch (role) {
    case 'ROLE_ADMIN':
      return '\uAD00\uB9AC\uC790'
    case 'ROLE_INSTRUCTOR':
      return '\uAC15\uC0AC'
    case 'ROLE_LEARNER':
      return '\uD559\uC2B5\uC790'
    default:
      return '\uC0AC\uC6A9\uC790'
  }
}

export function getPostLoginRedirect(role: string | null) {
  const returnPath = consumePostLoginReturnPath()

  if (returnPath) {
    return returnPath
  }

  switch (role) {
    case 'ROLE_ADMIN':
      return '/admin-dashboard'
    case 'ROLE_INSTRUCTOR':
    case 'ROLE_LEARNER':
    default:
      return '/'
  }
}
