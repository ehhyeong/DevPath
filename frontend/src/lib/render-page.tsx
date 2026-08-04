import { Fragment, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import AuthToastViewport from '../components/AuthToastViewport'
import '../index.css'

type RenderPageOptions = {
  rootId?: string
  missingRootMessage?: string
}

export function renderPage(page: ReactElement, options?: RenderPageOptions) {
  const rootId = options?.rootId ?? 'root'
  const rootElement = document.getElementById(rootId)

  if (!rootElement) {
    throw new Error(options?.missingRootMessage ?? `${rootId} element was not found`)
  }

  createRoot(rootElement).render(
    <Fragment>
      <AuthToastViewport />
      <div className="app-viewport">{page}</div>
    </Fragment>,
  )
}
