import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { AdminMarkup } from './admin-react-markup'

const roots = new WeakMap<Element, Root>()

export function renderAdminMarkup(container: Element, html: string) {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }
  flushSync(() => root?.render(createElement(AdminMarkup, { html })))
}
