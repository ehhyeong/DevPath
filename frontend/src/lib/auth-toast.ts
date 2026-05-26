export const AUTH_TOAST_STORAGE_KEY = 'devpath.auth.toast'
export const AUTH_TOAST_EVENT = 'devpath:auth-toast'

export const LOGIN_SUCCESS_AUTH_TOAST_MESSAGE = '로그인 성공했습니다.'
export const LOGOUT_AUTH_TOAST_MESSAGE = '로그아웃 했습니다.'
export const EXPIRED_AUTH_TOAST_MESSAGE = '세션이 만료되어 로그아웃되었습니다.'

export type AuthToastVariant = 'default' | 'error'

export type AuthToastDetail = {
  message: string
  variant?: AuthToastVariant
  durationMs?: number
}

type AuthToastInput = string | AuthToastDetail

function normalizeAuthToast(toast: AuthToastInput): AuthToastDetail {
  if (typeof toast === 'string') {
    return { message: toast }
  }

  return toast
}

function dispatchAuthToast(toast: AuthToastInput) {
  const detail = normalizeAuthToast(toast)

  window.dispatchEvent(
    new CustomEvent<AuthToastDetail>(AUTH_TOAST_EVENT, {
      detail,
    }),
  )
}

export function showAuthToast(toast: AuthToastInput) {
  dispatchAuthToast(toast)
}

export function queueAuthToast(toast: AuthToastInput) {
  window.sessionStorage.setItem(AUTH_TOAST_STORAGE_KEY, JSON.stringify(normalizeAuthToast(toast)))
}

export function clearQueuedAuthToast() {
  window.sessionStorage.removeItem(AUTH_TOAST_STORAGE_KEY)
}

export function consumeQueuedAuthToast() {
  const rawValue = window.sessionStorage.getItem(AUTH_TOAST_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  clearQueuedAuthToast()

  try {
    const parsedValue = JSON.parse(rawValue) as AuthToastDetail

    if (parsedValue?.message) {
      return parsedValue
    }
  } catch {
    return { message: rawValue }
  }

  return null
}
