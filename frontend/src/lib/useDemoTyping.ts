import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { userApi } from './api/auth'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from './auth-session'
import { useAuthSession } from './useAuthSession'
import { startDemoTyping } from './demo-typing'

export function useDemoAccount(email: string, active = true) {
  const [session, setSession] = useAuthSession()
  const userId = session?.userId
  const [identity, setIdentity] = useState<{ userId: number; email: string } | null>(null)
  useEffect(() => {
    const sync = () => setSession(readStoredAuthSession())
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [setSession])
  useEffect(() => {
    if (!userId || !active) return
    const controller = new AbortController()
    userApi.getMyProfile(controller.signal).then((profile) => {
      if (!controller.signal.aborted && profile.userId === userId) setIdentity({ userId, email: profile.email })
    }).catch(() => {
      // 프로필 확인 실패 시 계정 이름이나 임의 사용자 번호로 시연 계정을 추정하지 않는다.
      if (!controller.signal.aborted) setIdentity(null)
    })
    return () => controller.abort()
  }, [userId, active])
  return Boolean(active && userId && identity?.userId === userId && identity.email === email)
}

type Options = {
  text: string
  value: string
  onValue: (value: string) => void
  enabled: boolean
  active: boolean
  scopeKey?: string | number | null
  instant?: boolean
}

export function useDemoTyping({ text, value, onValue, enabled, active, scopeKey, instant = false }: Options) {
  const [typing, setTyping] = useState(false)
  const cancelRef = useRef<(() => void) | null>(null)
  const usedRef = useRef(false)
  const producedRef = useRef('')
  const stop = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    setTyping(false)
  }, [])
  useEffect(() => {
    usedRef.current = false
    return stop
  }, [enabled, active, scopeKey, stop])
  useEffect(() => {
    // 템플릿 적용 등 다른 버튼이 값을 바꿨을 때도 진행 중인 타이핑이 새 값을 덮어쓰지 않는다.
    if (cancelRef.current && value !== producedRef.current) stop()
  }, [value, stop])
  function interrupt() {
    usedRef.current = true
    stop()
  }
  function change(next: string) {
    interrupt()
    onValue(next)
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (cancelRef.current && event.key === 'Enter') event.preventDefault()
    else interrupt()
  }
  function start() {
    if (!enabled || !active || value || usedRef.current) return
    usedRef.current = true
    if (instant) {
      onValue(text)
      return
    }
    setTyping(true)
    cancelRef.current = startDemoTyping(text, (next) => {
      producedRef.current = next
      onValue(next)
    }, () => {
      cancelRef.current = null
      setTyping(false)
    })
  }
  return {
    typing, stop, change, keyDown,
    bindings: {
      onClick: start,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(event.target.value),
      onCompositionStart: interrupt,
      onKeyDown: keyDown,
    },
  }
}
