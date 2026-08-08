import { createElement, Fragment, type CSSProperties, type ReactNode } from 'react'

const ATTRIBUTE_NAMES: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  maxlength: 'maxLength',
  readonly: 'readOnly',
  autocomplete: 'autoComplete',
}

function parseStyle(value: string) {
  return value.split(';').reduce<CSSProperties>((style, declaration) => {
    const separator = declaration.indexOf(':')
    if (separator < 0) return style
    const property = declaration.slice(0, separator).trim()
    const propertyValue = declaration.slice(separator + 1).trim()
    if (!property || !propertyValue) return style
    const reactProperty = property.startsWith('--')
      ? property
      : property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
    ;(style as Record<string, string>)[reactProperty] = propertyValue
    return style
  }, {})
}

function elementProps(element: Element, key: string) {
  const props: Record<string, unknown> = { key }
  for (const attribute of element.attributes) {
    let name = ATTRIBUTE_NAMES[attribute.name] ?? attribute.name
    let value: string | boolean | CSSProperties = attribute.value
    if (name === 'onclick') name = 'data-admin-click'
    if (name === 'onchange') name = 'data-admin-change'
    if (name === 'style') value = parseStyle(attribute.value)
    if (['checked', 'disabled', 'multiple', 'required', 'selected', 'readOnly'].includes(name)) value = true
    if (name === 'value' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
      name = 'defaultValue'
    }
    if (name === 'checked') name = 'defaultChecked'
    props[name] = value
  }
  return props
}

function toReactNode(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (!(node instanceof Element)) return null
  const children = Array.from(node.childNodes).map((child, index) => toReactNode(child, `${key}-${index}`))
  return createElement(node.tagName.toLowerCase(), elementProps(node, key), ...children)
}

export function AdminMarkup({ html }: { html: string }) {
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  return createElement(Fragment, null, ...Array.from(parsed.body.childNodes).map((node, index) => toReactNode(node, String(index))))
}
