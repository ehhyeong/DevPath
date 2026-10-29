import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react'
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
  replaceExisting?: boolean
}

export function useDemoTyping({ text, value, onValue, enabled, active, scopeKey, instant = false, replaceExisting = false }: Options) {
  const [typing, setTyping] = useState(false)
  const cancelRef = useRef<(() => void) | null>(null)
  const usedRef = useRef(false)
  const pendingValuesRef = useRef<string[]>([])
  const stop = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    pendingValuesRef.current = []
    setTyping(false)
  }, [])
  useEffect(() => {
    usedRef.current = false
    return stop
  }, [enabled, active, scopeKey, stop])
  useEffect(() => {
    if (cancelRef.current) {
      // React 반영이 다음 타이머보다 늦어질 수 있어 아직 반영되지 않은 프레임도 내부 입력으로 인정한다.
      const index = pendingValuesRef.current.indexOf(value)
      if (index >= 0) pendingValuesRef.current.splice(0, index + 1)
      // 템플릿 등 외부 변경은 타이핑이 덮어쓰지 않도록 중단한다.
      else stop()
    }
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
  function start(event?: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (!enabled || !active || (!replaceExisting && value) || usedRef.current || (event && event.button !== 0)) return false
    usedRef.current = true
    if (instant && !(replaceExisting && value && event)) {
      onValue(text)
      return true
    }
    setTyping(true)
    pendingValuesRef.current = [value]
    const emitValue = (next: string) => {
      pendingValuesRef.current.push(next)
      onValue(next)
    }
    const beginTyping = () => {
      if (instant) {
        emitValue(text)
        cancelRef.current = null
        pendingValuesRef.current = []
        setTyping(false)
        return
      }
      cancelRef.current = startDemoTyping(text, emitValue, () => {
        cancelRef.current = null
        pendingValuesRef.current = []
        setTyping(false)
      })
    }
    if (replaceExisting && value && event) {
      event.currentTarget.select()
      // 전체 선택과 빈 칸이 각각 눈에 보인 뒤 입력을 시작해 사용자의 선택·삭제 순서를 재현한다.
      const selectionTimer = window.setTimeout(() => {
        emitValue('')
        const clearedTimer = window.setTimeout(beginTyping, 100)
        cancelRef.current = () => window.clearTimeout(clearedTimer)
      }, 350)
      cancelRef.current = () => window.clearTimeout(selectionTimer)
    } else {
      beginTyping()
    }
    return true
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
