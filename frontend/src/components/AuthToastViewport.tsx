import { useEffect, useState } from 'react'
import {
  AUTH_TOAST_EVENT,
  clearQueuedAuthToast,
  consumeQueuedAuthToast,
  type AuthToastDetail,
} from '../lib/auth-toast'

const AUTH_TOAST_DURATION_MS = 2200

type AuthToastEvent = CustomEvent<AuthToastDetail>

export default function AuthToastViewport() {
  const [toast, setToast] = useState<AuthToastDetail | null>(null)

  useEffect(() => {
    const queuedMessage = consumeQueuedAuthToast()

    if (queuedMessage) {
      setToast(queuedMessage)
    }

    const handleAuthToast = (event: Event) => {
      const authToastEvent = event as AuthToastEvent
      const nextToast = authToastEvent.detail

      if (!nextToast?.message) {
        return
      }

      clearQueuedAuthToast()
      setToast(nextToast)
    }

    window.addEventListener(AUTH_TOAST_EVENT, handleAuthToast)

    return () => {
      window.removeEventListener(AUTH_TOAST_EVENT, handleAuthToast)
    }
  }, [])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null)
    }, toast.durationMs ?? AUTH_TOAST_DURATION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toast])

  if (!toast) {
    return null
  }

  const isError = toast.variant === 'error'
  const containerClassName = isError
    ? 'rounded-xl border border-red-500/60 bg-gray-900/95 px-5 py-3 text-sm font-bold text-white shadow-xl backdrop-blur-sm'
    : 'rounded-xl border border-gray-700 bg-gray-900/90 px-5 py-3 text-sm font-bold text-white shadow-xl backdrop-blur-sm'
  const iconClassName = isError
    ? 'fas fa-exclamation-circle mr-2 text-red-400'
    : 'fas fa-info-circle mr-2 text-[#00C471]'

  return (
    <div className="pointer-events-none fixed top-20 left-1/2 z-[1000] -translate-x-1/2">
      <div
        role="status"
        aria-live="polite"
        className={containerClassName}
      >
        <i className={iconClassName} />
        {toast.message}
      </div>
    </div>
  )
}
