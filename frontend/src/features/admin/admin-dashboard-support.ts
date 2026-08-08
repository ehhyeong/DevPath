import type { AdminRoadmapNode } from '../../types/admin'
import type { RoadmapHubItem, RoadmapHubSection } from '../../types/roadmap-hub'

export type AdminTabKey =
  | 'dashboard'
  | 'tags'
  | 'official-roadmaps'
  | 'roadmap-info'
  | 'roadmaps'
  | 'node-resources'
  | 'catalog-menu'
  | 'roadmap-hub'
  | 'users'
  | 'reports'

export type DashboardFilterState = {
  tagQuery: string
  officialRoadmapQuery: string
  roadmapInfoQuery: string
  nodeQuery: string
  nodeResourceQuery: string
  nodeResourceRoadmapId: string
  nodeResourceNodeId: string
  nodeResourceSourceType: string
  nodeResourceStatus: string
  nodeHubSectionKey: string
  nodeHubItemKey: string
  nodeRoadmapId: string
  nodeType: string
  accountQuery: string
  accountRole: string
  accountStatus: string
}

export type RoadmapHubFilterState = {
  query: string
  sectionKey: string
  layoutType: string
  status: string
  featured: string
  linked: string
  linkedRoadmapId: string
}

export type RoadmapHubVisibleSection = {
  section: RoadmapHubSection
  sectionIndex: number
  visibleItems: Array<{
    item: RoadmapHubItem
    itemIndex: number
  }>
}

export type NodeHubEntry = {
  itemKey: string
  sectionKey: string
  sectionTitle: string
  layoutType: string
  itemTitle: string
  linkedRoadmapId: number
}

export type RoadmapNodePayload = {
  roadmapId: number
  title: string
  content: string | null
  nodeType: string
  sortOrder: number
  subTopics: string | null
  branchGroup: number | null
}

export type RoadmapNodeResourcePayload = {
  nodeId: number
  title: string
  url: string
  description: string | null
  sourceType: string
  sortOrder: number
  active: boolean
}

export const NODE_HUB_UNLINKED_FILTER = '__UNLINKED__'

const NODE_RESOURCE_SOURCE_TYPES = [
  { value: 'BLOG', label: '블로그' },
  { value: 'DOCS', label: '문서' },
  { value: 'VIDEO', label: '영상' },
  { value: 'OFFICIAL', label: '공식문서' },
  { value: 'COURSE', label: '강의' },
  { value: 'OTHER', label: '기타' },
]

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeInlineText(value: string | null | undefined) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

export function sanitizePreviewHtml(content: string) {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

export function roadmapInfoHtmlToEditableText(content: string | null | undefined) {
  const normalized = content?.trim()
  if (!normalized) {
    return ''
  }

  if (!normalized.includes('<')) {
    return normalized
  }

  const document = new DOMParser().parseFromString(normalized, 'text/html')
  const lines: string[] = []
  const blocks = document.body.querySelectorAll('h1, h2, h3, h4, p, li, strong.block, div > strong')

  blocks.forEach((block) => {
    const text = normalizeInlineText(block.textContent)
    if (!text) {
      return
    }

    if (block.tagName === 'LI') {
      lines.push(`- ${text}`)
      return
    }

    if (block.matches('h1, h2, h3, h4, strong.block, div > strong')) {
      lines.push(`## ${text}`)
      return
    }

    lines.push(text)
  })

  return lines.length > 0 ? lines.join('\n\n') : normalizeInlineText(document.body.textContent)
}

export function buildRoadmapInfoContentHtml(content: string | null | undefined) {
  const lines = String(content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())

  const parts: string[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length === 0) {
      return
    }

    parts.push(`<ul class="list-disc pl-5 space-y-1 text-gray-700">${listItems.join('')}</ul>`)
    listItems = []
  }

  lines.forEach((line) => {
    if (!line) {
      flushList()
      return
    }

    if (line.startsWith('- ')) {
      listItems.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`)
      return
    }

    flushList()

    if (line.startsWith('## ')) {
      parts.push(`<strong class="block text-gray-900 text-base mb-2">${escapeHtml(line.slice(3).trim())}</strong>`)
      return
    }

    parts.push(`<p class="mb-2">${escapeHtml(line)}</p>`)
  })

  flushList()

  return parts.join('\n')
}

export function normalizeText(value: string | number | null | undefined) {
  return String(value ?? '').trim().toLowerCase()
}

export function matchesKeyword(keyword: string, values: Array<string | number | null | undefined>) {
  if (!keyword) {
    return true
  }

  return values.some((value) => normalizeText(value).includes(keyword))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function toneClassName(tone: string) {
  switch (tone) {
    case 'positive':
      return 'bg-emerald-50 text-emerald-500'
    case 'warning':
      return 'bg-amber-50 text-amber-600'
    case 'negative':
      return 'bg-rose-50 text-rose-600'
    default:
      return 'bg-slate-100 text-slate-500'
  }
}

export function roleLabel(role: string) {
  switch (role) {
    case 'ROLE_ADMIN':
      return '관리자'
    case 'ROLE_INSTRUCTOR':
      return '강사'
    case 'ROLE_LEARNER':
      return '학습자'
    default:
      return role
  }
}

export function roleBadgeClassName(role: string) {
  switch (role) {
    case 'ROLE_ADMIN':
      return 'border border-purple-100 bg-purple-50 text-purple-700'
    case 'ROLE_INSTRUCTOR':
      return 'border border-blue-100 bg-blue-50 text-blue-700'
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-500'
  }
}

export function nodeTypeLabel(nodeType: string | null | undefined) {
  switch ((nodeType ?? '').toUpperCase()) {
    case 'CONCEPT':
      return '개념'
    case 'PRACTICE':
      return '실습'
    case 'PROJECT':
      return '프로젝트'
    case 'REVIEW':
      return '복습'
    case 'EXAM':
      return '평가'
    case 'QUIZ':
      return '퀴즈'
    case 'ASSIGNMENT':
      return '과제'
    default:
      return nodeType || '미정'
  }
}

export function nodeResourceSourceLabel(sourceType: string | null | undefined) {
  const normalized = (sourceType ?? '').toUpperCase()
  return NODE_RESOURCE_SOURCE_TYPES.find((item) => item.value === normalized)?.label ?? '기타'
}

export function formatNodePrerequisites(node: AdminRoadmapNode) {
  return node.prerequisiteNodeIds.length
    ? node.prerequisiteNodeIds.map((nodeId) => `#${nodeId}`).join(', ')
    : '선행 노드 없음'
}

export function formatNodeStructure(node: AdminRoadmapNode) {
  const branchText = node.branchGroup === null || node.branchGroup === undefined
    ? '기본 흐름'
    : `분기 ${node.branchGroup}`

  return `순서 ${node.sortOrder ?? '-'} · ${branchText}`
}

export function normalizeOptionalString(value: string | null) {
  return value?.trim() ? value.trim() : null
}

export function parseRequiredNumber(value: string | null, message: string) {
  if (value === null) {
    return null
  }

  const parsed = Number(value.trim())
  if (!Number.isInteger(parsed) || parsed < 0) {
    window.alert(message)
    return null
  }

  return parsed
}

export function parseOptionalNumber(value: string | null, message: string) {
  if (value === null) {
    return null
  }

  if (!value.trim()) {
    return undefined
  }

  const parsed = Number(value.trim())
  if (!Number.isInteger(parsed) || parsed < 0) {
    window.alert(message)
    return null
  }

  return parsed
}

export function parseNodeIdList(value: string | null) {
  if (value === null) {
    return null
  }

  if (!value.trim()) {
    return []
  }

  const nodeIds = value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item))

  if (nodeIds.length !== value.split(',').filter((item) => item.trim()).length) {
    window.alert('노드 ID는 쉼표로 구분한 숫자만 입력하세요.')
    return null
  }

  return nodeIds
}

export function buildLoadingRow(colspan: number, message = '데이터를 불러오는 중입니다...') {
  return `<tr><td colspan="${colspan}" class="py-10 text-center text-xs text-slate-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>${escapeHtml(message)}</td></tr>`
}

export function buildEmptyRow(colspan: number, message = '표시할 데이터가 없습니다.') {
  return `<tr><td colspan="${colspan}" class="py-10 text-center text-xs text-slate-400">${escapeHtml(message)}</td></tr>`
}

export function buildErrorRow(colspan: number, message = '데이터를 불러오지 못했습니다.') {
  return `<tr><td colspan="${colspan}" class="py-10 text-center text-xs text-rose-500">${escapeHtml(message)}</td></tr>`
}

export function updateFilterSummary(elementId: string, totalCount: number, filteredCount: number) {
  const message = totalCount === filteredCount
    ? `전체 ${formatNumber(totalCount)}개`
    : `전체 ${formatNumber(totalCount)}개 중 ${formatNumber(filteredCount)}개`
  const element = document.getElementById(elementId)
  if (element) element.textContent = message
}
