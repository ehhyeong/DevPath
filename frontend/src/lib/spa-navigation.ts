export const SPA_NAVIGATION_EVENT = 'devpath:spa-navigation'

type NavigateOptions = {
  replace?: boolean
}

type InstallSpaNavigationOptions = {
  preloadRoute: (href: string) => Promise<unknown> | void
}

const DOCUMENT_NAVIGATION_PREFIXES = [
  '/api/',
  '/login/oauth2/',
  '/oauth2/authorization/',
  '/swagger-ui/',
  '/uploads/',
  '/v3/api-docs/',
]

function resolveUrl(href: string) {
  try {
    return new URL(href, window.location.href)
  } catch {
    return null
  }
}

function requiresDocumentNavigation(url: URL) {
  return (
    url.origin !== window.location.origin ||
    url.pathname === '/admin-dashboard' ||
    window.location.pathname === '/admin-dashboard' ||
    DOCUMENT_NAVIGATION_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  )
}

export function isSpaNavigationTarget(href: string) {
  const url = resolveUrl(href)
  return Boolean(url && !requiresDocumentNavigation(url))
}

export function getCurrentLocationKey() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function navigateTo(href: string, options: NavigateOptions = {}) {
  const url = resolveUrl(href)

  if (!url || requiresDocumentNavigation(url)) {
    if (options.replace) {
      window.location.replace(href)
    } else {
      window.location.assign(href)
    }
    return
  }

  const nextLocation = `${url.pathname}${url.search}${url.hash}`

  if (nextLocation === getCurrentLocationKey()) {
    return
  }

  if (options.replace) {
    window.history.replaceState({}, '', nextLocation)
  } else {
    window.history.pushState({}, '', nextLocation)
  }

  window.dispatchEvent(new Event(SPA_NAVIGATION_EVENT))
}

function findAnchor(event: Event) {
  return event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
}

function canInterceptClick(event: MouseEvent, anchor: HTMLAnchorElement) {
  const url = resolveUrl(anchor.href)
  const isSamePageHash = Boolean(
    url?.hash &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search,
  )

  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !anchor.hasAttribute('download') &&
    !anchor.hasAttribute('data-document-navigation') &&
    (!anchor.target || anchor.target === '_self') &&
    !isSamePageHash &&
    isSpaNavigationTarget(anchor.href)
  )
}

export function installSpaNavigation({ preloadRoute }: InstallSpaNavigationOptions) {
  const handleClick = (event: MouseEvent) => {
    const anchor = findAnchor(event)

    if (!anchor || !canInterceptClick(event, anchor)) {
      return
    }

    event.preventDefault()
    navigateTo(anchor.href)
  }

  const handlePreload = (event: Event) => {
    const anchor = findAnchor(event)

    if (anchor && isSpaNavigationTarget(anchor.href)) {
      void preloadRoute(anchor.href)
    }
  }

  document.addEventListener('click', handleClick)
  document.addEventListener('pointerover', handlePreload, true)
  document.addEventListener('focusin', handlePreload, true)

  const idleCallback = () => {
    const hrefs = new Set<string>()

    document.querySelectorAll<HTMLAnchorElement>('header a[href], nav a[href], aside a[href]').forEach((anchor) => {
      if (hrefs.size < 6 && isSpaNavigationTarget(anchor.href)) {
        hrefs.add(anchor.href)
      }
    })

    hrefs.forEach((href) => void preloadRoute(href))
  }

  const idleId = 'requestIdleCallback' in window
    ? window.requestIdleCallback(idleCallback, { timeout: 1500 })
    : globalThis.setTimeout(idleCallback, 500)

  return () => {
    document.removeEventListener('click', handleClick)
    document.removeEventListener('pointerover', handlePreload, true)
    document.removeEventListener('focusin', handlePreload, true)

    if ('cancelIdleCallback' in window) {
      window.cancelIdleCallback(idleId)
    } else {
      globalThis.clearTimeout(idleId)
    }
  }
}
