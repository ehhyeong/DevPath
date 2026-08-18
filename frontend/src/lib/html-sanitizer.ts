import DOMPurify, { type Config } from 'dompurify'

const HTML_CONFIG: Config = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['script', 'style'],
}

const SVG_CONFIG: Config = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['foreignObject', 'script'],
}

export function sanitizeHtml(content: string) {
  return DOMPurify.sanitize(content, HTML_CONFIG)
}

export function sanitizeSvg(content: string) {
  return DOMPurify.sanitize(content, SVG_CONFIG)
}
