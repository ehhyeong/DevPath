import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import { installSpaNavigation,isSpaNavigationTarget,navigateTo,SPA_NAVIGATION_EVENT } from './spa-navigation'

describe('SPA navigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/dashboard')
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('같은 origin 링크를 History API로 이동하고 라우팅 이벤트를 보낸다', () => {
    const listener = vi.fn()
    window.addEventListener(SPA_NAVIGATION_EVENT, listener, { once: true })

    navigateTo('/profile?tab=career')

    expect(window.location.pathname).toBe('/profile')
    expect(window.location.search).toBe('?tab=career')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('일반 내부 링크 클릭을 가로채고 hover에서 해당 라우트를 미리 불러온다', () => {
    const preloadRoute = vi.fn()
    const uninstall = installSpaNavigation({ preloadRoute })
    const anchor = document.createElement('a')
    anchor.href = '/my-learning'
    document.body.append(anchor)

    anchor.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    anchor.dispatchEvent(click)

    expect(preloadRoute).toHaveBeenCalledWith(anchor.href)
    expect(click.defaultPrevented).toBe(true)
    expect(window.location.pathname).toBe('/my-learning')

    uninstall()
  })

  it('다운로드와 API 링크는 문서 탐색 대상으로 남긴다', () => {
    expect(isSpaNavigationTarget('/api/files/1')).toBe(false)
    expect(isSpaNavigationTarget('/uploads/archive.zip')).toBe(false)
  })

  it('스쿼드 초기 화면에서는 전체 메뉴를 예열하지 않고 사용자가 가리킨 목적지만 예열한다', () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/squad-dashboard?workspaceId=42')
    document.body.innerHTML = '<aside><a href="/squad-files?workspaceId=42">자료실</a><a href="/squad-erd?workspaceId=42">ERD</a></aside>'
    const preloadRoute = vi.fn()
    const uninstall = installSpaNavigation({ preloadRoute })
    try {
      vi.advanceTimersByTime(1600)
      expect(preloadRoute).not.toHaveBeenCalled()
      const anchor = document.querySelector('a')!
      anchor.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
      expect(preloadRoute).toHaveBeenCalledTimes(1)
      expect(preloadRoute).toHaveBeenCalledWith(anchor.href)
    } finally {
      uninstall()
      vi.useRealTimers()
    }
  })

  it('같은 페이지의 hash 링크는 브라우저 기본 동작을 유지한다', () => {
    const uninstall = installSpaNavigation({ preloadRoute: vi.fn() })
    const anchor = document.createElement('a')
    anchor.href = '#details'
    document.body.append(anchor)
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })

    anchor.dispatchEvent(click)

    expect(click.defaultPrevented).toBe(false)
    uninstall()
  })
})
