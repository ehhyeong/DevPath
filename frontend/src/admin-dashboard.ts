import { Chart, registerables } from 'chart.js'
import { adminApi } from './lib/admin-api'
import { authApi } from './lib/api'
import { clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'
import { prepareAdminDashboardDocument } from './admin-dashboard-markup'
import type {
  AdminAccount,
  AdminDashboardCategoryDistribution,
  AdminDashboardOverview,
  AdminDashboardSummaryMetric,
  AdminModerationReport,
  AdminOfficialRoadmap,
  AdminOfficialRoadmapOption,
  AdminPendingCourse,
  AdminRoadmapNode,
  AdminRoadmapNodeResource,
  AdminTag,
} from './types/admin'
import type {
  CourseCatalogCategory,
  CourseCatalogGroup,
  CourseCatalogGroupItem,
  CourseCatalogMegaMenuItem,
  CourseCatalogMenu,
} from './types/course-catalog'
import type {
  AdminRoadmapHubCatalog,
  RoadmapHubItem,
  RoadmapHubSection,
} from './types/roadmap-hub'
import './index.css'

Chart.register(...registerables)

// 관리자 화면에서 사용하는 탭 키를 고정한다.
type AdminTabKey =
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

type DashboardFilterState = {
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

type RoadmapHubFilterState = {
  query: string
  sectionKey: string
  layoutType: string
  status: string
  featured: string
  linked: string
  linkedRoadmapId: string
}

type RoadmapHubVisibleSection = {
  section: RoadmapHubSection
  sectionIndex: number
  visibleItems: Array<{
    item: RoadmapHubItem
    itemIndex: number
  }>
}

type NodeHubEntry = {
  itemKey: string
  sectionKey: string
  sectionTitle: string
  layoutType: string
  itemTitle: string
  linkedRoadmapId: number
}

type RoadmapNodePayload = {
  roadmapId: number
  title: string
  content: string | null
  nodeType: string
  sortOrder: number
  subTopics: string | null
  branchGroup: number | null
}

type RoadmapNodeResourcePayload = {
  nodeId: number
  title: string
  url: string
  description: string | null
  sourceType: string
  sortOrder: number
  active: boolean
}

const NODE_HUB_UNLINKED_FILTER = '__UNLINKED__'

const NODE_RESOURCE_SOURCE_TYPES = [
  { value: 'BLOG', label: '블로그' },
  { value: 'DOCS', label: '문서' },
  { value: 'VIDEO', label: '영상' },
  { value: 'OFFICIAL', label: '공식문서' },
  { value: 'COURSE', label: '강의' },
  { value: 'OTHER', label: '기타' },
]

declare global {
  interface Window {
    refreshCurrentTab: () => void
    logout: () => Promise<void>
    createTag: () => Promise<void>
    mergeTag: (tagId: number) => Promise<void>
    editOfficialRoadmap: (roadmapId: number) => void
    deleteOfficialRoadmap: (roadmapId: number) => Promise<void>
    createRoadmapNode: () => Promise<void>
    editRoadmapNode: (nodeId: number) => Promise<void>
    editRoadmapInfo: (roadmapId: number) => void
    clearRoadmapInfo: (roadmapId: number) => Promise<void>
    updateNodeTags: (nodeId: number) => Promise<void>
    updateNodePrerequisites: (nodeId: number) => Promise<void>
    updateNodeRules: (nodeId: number) => Promise<void>
    editRoadmapNodeResource: (resourceId: number) => void
    deleteRoadmapNodeResource: (resourceId: number) => Promise<void>
    toggleAccountStatus: (userId: number, accountStatus: string) => Promise<void>
    approveCourse: (courseId: number) => Promise<void>
    rejectCourse: (courseId: number) => Promise<void>
    blindContent: (reportId: number) => Promise<void>
    resolveReport: (reportId: number) => Promise<void>
    createCatalogCategory: () => void
    saveCourseCatalogMenu: () => Promise<void>
    setAllCatalogCategoriesCollapsed: (collapsed: boolean) => void
    toggleCatalogCategoryCollapsed: (categoryIndex: number) => void
    moveCatalogCategory: (categoryIndex: number, direction: number) => void
    deleteCatalogCategory: (categoryIndex: number) => void
    updateCatalogCategoryField: (categoryIndex: number, field: string, value: string) => void
    updateCatalogCategoryActive: (categoryIndex: number, checked: boolean) => void
    addCatalogMegaMenuItem: (categoryIndex: number) => void
    updateCatalogMegaMenuItemLabel: (categoryIndex: number, itemIndex: number, value: string) => void
    moveCatalogMegaMenuItem: (categoryIndex: number, itemIndex: number, direction: number) => void
    removeCatalogMegaMenuItem: (categoryIndex: number, itemIndex: number) => void
    addCatalogGroup: (categoryIndex: number) => void
    updateCatalogGroupField: (categoryIndex: number, groupIndex: number, field: string, value: string) => void
    moveCatalogGroup: (categoryIndex: number, groupIndex: number, direction: number) => void
    removeCatalogGroup: (categoryIndex: number, groupIndex: number) => void
    addCatalogGroupItem: (categoryIndex: number, groupIndex: number) => void
    updateCatalogGroupItemField: (categoryIndex: number, groupIndex: number, itemIndex: number, field: string, value: string) => void
    moveCatalogGroupItem: (categoryIndex: number, groupIndex: number, itemIndex: number, direction: number) => void
    removeCatalogGroupItem: (categoryIndex: number, groupIndex: number, itemIndex: number) => void
    createRoadmapHubSection: () => void
    saveRoadmapHubCatalog: () => Promise<void>
    setAllRoadmapHubSectionsCollapsed: (collapsed: boolean) => void
    toggleRoadmapHubSectionCollapsed: (sectionIndex: number) => void
    moveRoadmapHubSection: (sectionIndex: number, direction: number) => void
    deleteRoadmapHubSection: (sectionIndex: number) => void
    updateRoadmapHubSectionField: (sectionIndex: number, field: string, value: string) => void
    updateRoadmapHubSectionActive: (sectionIndex: number, checked: boolean) => void
    addRoadmapHubItem: (sectionIndex: number) => void
    moveRoadmapHubItem: (sectionIndex: number, itemIndex: number, direction: number) => void
    removeRoadmapHubItem: (sectionIndex: number, itemIndex: number) => void
    updateRoadmapHubItemField: (sectionIndex: number, itemIndex: number, field: string, value: string) => void
    updateRoadmapHubItemToggle: (sectionIndex: number, itemIndex: number, field: string, checked: boolean) => void
  }
}

const TAB_META: Record<AdminTabKey, { title: string; description: string }> = {
  dashboard: { title: '플랫폼 실시간 현황', description: 'DevPath 관리자 운영 지표 요약' },
  tags: { title: '기술 태그 데이터베이스', description: '공식 태그를 조회하고 병합합니다.' },
  'official-roadmaps': { title: '로드맵 기본 정보', description: '공식 로드맵 생성과 상세 소개 콘텐츠를 한 화면에서 관리합니다.' },
  'roadmap-info': { title: '로드맵 소개 관리', description: '로드맵 상세 상단 소개 아코디언 콘텐츠를 수정합니다.' },
  roadmaps: { title: '마스터 로드맵 노드', description: '공식 로드맵 노드 생성, 수정, 선수 조건과 완료 기준을 관리합니다.' },
  'node-resources': { title: '노드 추천 자료', description: '로드맵 노드 상세 패널에 노출할 무료 자료 링크를 관리합니다.' },
  'catalog-menu': { title: '강의 목록 메뉴 관리', description: 'lecture-list 상단 카테고리와 필터 구성을 수정합니다.' },
  'roadmap-hub': { title: '로드맵 허브 관리', description: 'roadmap-hub 섹션과 연결 로드맵 구성을 수정합니다.' },
  users: { title: '회원 통합 관리', description: '회원 상태와 권한을 운영 관점에서 관리합니다.' },
  reports: { title: '검수 및 신고', description: '강의 검수와 사용자 신고를 처리합니다.' },
}

const CATEGORY_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B']

let currentActiveTab: AdminTabKey = 'dashboard'
let trafficChart: Chart | null = null
let categoryChart: Chart | null = null
let roadmapNodeMap = new Map<number, AdminRoadmapNode>()
let reportMap = new Map<number, AdminModerationReport>()
let tagItems: AdminTag[] = []
let officialRoadmapItems: AdminOfficialRoadmap[] = []
let officialRoadmapEditingId: number | null = null
let officialRoadmapSaving = false
let roadmapInfoItems: AdminOfficialRoadmap[] = []
let roadmapInfoEditingId: number | null = null
let roadmapInfoLoading = false
let roadmapInfoSaving = false
let roadmapInfoError: string | null = null
let nodeItems: AdminRoadmapNode[] = []
let nodeResourceItems: AdminRoadmapNodeResource[] = []
let nodeResourceEditingId: number | null = null
let nodeResourceSaving = false
let officialRoadmapOptions: AdminOfficialRoadmapOption[] = []
let nodeHubCatalog: AdminRoadmapHubCatalog = { sections: [], officialRoadmaps: [] }
let nodeHubEntriesByRoadmapId = new Map<number, NodeHubEntry[]>()
let accountItems: AdminAccount[] = []
let courseCatalogMenu: CourseCatalogMenu = { categories: [] }
let courseCatalogMenuLoading = false
let courseCatalogMenuSaving = false
let courseCatalogMenuError: string | null = null
let collapsedCatalogCategoryKeys = new Set<string>()
let roadmapHubCatalog: AdminRoadmapHubCatalog = { sections: [], officialRoadmaps: [] }
let roadmapHubLoading = false
let roadmapHubSaving = false
let roadmapHubError: string | null = null
let collapsedRoadmapHubSectionKeys = new Set<string>()
let roadmapNodeModalResolver: ((payload: RoadmapNodePayload | null) => void) | null = null
let roadmapNodeModalEditingNode: AdminRoadmapNode | null = null
let roadmapNodeModalInitialized = false
let roadmapNodeModalReturnFocus: HTMLElement | null = null

const filterState: DashboardFilterState = {
  tagQuery: '',
  officialRoadmapQuery: '',
  roadmapInfoQuery: '',
  nodeQuery: '',
  nodeResourceQuery: '',
  nodeResourceRoadmapId: '',
  nodeResourceNodeId: '',
  nodeResourceSourceType: '',
  nodeResourceStatus: '',
  nodeHubSectionKey: '',
  nodeHubItemKey: '',
  nodeRoadmapId: '',
  nodeType: '',
  accountQuery: '',
  accountRole: '',
  accountStatus: '',
}

const roadmapHubFilterState: RoadmapHubFilterState = {
  query: '',
  sectionKey: '',
  layoutType: '',
  status: '',
  featured: '',
  linked: '',
  linkedRoadmapId: '',
}

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id)

  if (!element) {
    throw new Error(`${id} element was not found`)
  }

  return element as T
}

function escapeHtml(value: string | number | null | undefined) {
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

function sanitizePreviewHtml(content: string) {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

function roadmapInfoHtmlToEditableText(content: string | null | undefined) {
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

function buildRoadmapInfoContentHtml(content: string | null | undefined) {
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

// 필터 비교는 공백 제거와 소문자 변환 기준으로 통일한다.
function normalizeText(value: string | number | null | undefined) {
  return String(value ?? '').trim().toLowerCase()
}

function matchesKeyword(keyword: string, values: Array<string | number | null | undefined>) {
  if (!keyword) {
    return true
  }

  return values.some((value) => normalizeText(value).includes(keyword))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function formatDateTime(value: string | null | undefined) {
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

function toneClassName(tone: string) {
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

function roleLabel(role: string) {
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

function roleBadgeClassName(role: string) {
  switch (role) {
    case 'ROLE_ADMIN':
      return 'border border-purple-100 bg-purple-50 text-purple-700'
    case 'ROLE_INSTRUCTOR':
      return 'border border-blue-100 bg-blue-50 text-blue-700'
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-500'
  }
}

function nodeTypeLabel(nodeType: string | null | undefined) {
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

function nodeResourceSourceLabel(sourceType: string | null | undefined) {
  const normalized = (sourceType ?? '').toUpperCase()
  return NODE_RESOURCE_SOURCE_TYPES.find((item) => item.value === normalized)?.label ?? '기타'
}

function formatNodePrerequisites(node: AdminRoadmapNode) {
  return node.prerequisiteNodeIds.length
    ? node.prerequisiteNodeIds.map((nodeId) => `#${nodeId}`).join(', ')
    : '선행 노드 없음'
}

function formatNodeStructure(node: AdminRoadmapNode) {
  const branchText = node.branchGroup === null || node.branchGroup === undefined
    ? '기본 흐름'
    : `분기 ${node.branchGroup}`

  return `순서 ${node.sortOrder ?? '-'} · ${branchText}`
}

function normalizeOptionalString(value: string | null) {
  return value?.trim() ? value.trim() : null
}

function parseRequiredNumber(value: string | null, message: string) {
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

function parseOptionalNumber(value: string | null, message: string) {
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

function parseNodeIdList(value: string | null) {
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

function getDefaultNodeSortOrder(roadmapId: number, node?: AdminRoadmapNode) {
  if (node?.sortOrder !== null && node?.sortOrder !== undefined) {
    return node.sortOrder
  }

  return Math.max(
    0,
    ...nodeItems
      .filter((item) => item.roadmapId === roadmapId)
      .map((item) => item.sortOrder ?? 0),
  ) + 1
}

function getRoadmapNodeModalElements() {
  return {
    modal: getElement<HTMLDivElement>('addNodeModal'),
    form: getElement<HTMLFormElement>('addNodeForm'),
    title: getElement<HTMLHeadingElement>('addNodeModalTitle'),
    description: getElement<HTMLParagraphElement>('addNodeModalDescription'),
    roadmapIdInput: getElement<HTMLSelectElement>('roadmapIdInput'),
    nodeTypeInput: getElement<HTMLSelectElement>('nodeTypeInput'),
    nodeTitleInput: getElement<HTMLInputElement>('nodeTitleInput'),
    nodeContentInput: getElement<HTMLTextAreaElement>('nodeContentInput'),
    sortOrderInput: getElement<HTMLInputElement>('sortOrderInput'),
    branchGroupInput: getElement<HTMLInputElement>('branchGroupInput'),
    subTopicsInput: getElement<HTMLInputElement>('subTopicsInput'),
    cancelButton: getElement<HTMLButtonElement>('cancelAddNodeBtn'),
    confirmButton: getElement<HTMLButtonElement>('confirmAddNodeBtn'),
  }
}

function populateRoadmapSelectOptions(node?: AdminRoadmapNode) {
  const { roadmapIdInput } = getRoadmapNodeModalElements()
  const options = [...officialRoadmapOptions]

  if (node && !options.some((roadmap) => roadmap.roadmapId === node.roadmapId)) {
    options.push({
      roadmapId: node.roadmapId,
      title: node.roadmapTitle,
    })
  }

  roadmapIdInput.innerHTML = [
    '<option value="">로드맵을 선택해주세요</option>',
    ...options.map(
      (roadmap) => (
        `<option value="${roadmap.roadmapId}">[ID: ${roadmap.roadmapId}] ${escapeHtml(roadmap.title)}</option>`
      ),
    ),
  ].join('')
}

function getInitialRoadmapId(node?: AdminRoadmapNode) {
  if (node) {
    return node.roadmapId
  }

  const selectedRoadmapId = Number(filterState.nodeRoadmapId)
  if (
    Number.isInteger(selectedRoadmapId)
    && officialRoadmapOptions.some((roadmap) => roadmap.roadmapId === selectedRoadmapId)
  ) {
    return selectedRoadmapId
  }

  return null
}

function setRoadmapNodeModalOpen(open: boolean) {
  const { modal } = getRoadmapNodeModalElements()
  modal.classList.toggle('active', open)
  modal.setAttribute('aria-hidden', open ? 'false' : 'true')
  document.body.classList.toggle('devpath-modal-open', open)
}

function closeRoadmapNodeModal() {
  setRoadmapNodeModalOpen(false)
  roadmapNodeModalEditingNode = null

  const returnFocus = roadmapNodeModalReturnFocus
  roadmapNodeModalReturnFocus = null
  returnFocus?.focus()
}

function resolveRoadmapNodeModal(payload: RoadmapNodePayload | null) {
  if (!roadmapNodeModalResolver) {
    closeRoadmapNodeModal()
    return
  }

  const resolve = roadmapNodeModalResolver
  roadmapNodeModalResolver = null
  closeRoadmapNodeModal()
  resolve(payload)
}

function readRoadmapNodeModalPayload() {
  const {
    roadmapIdInput,
    nodeTypeInput,
    nodeTitleInput,
    nodeContentInput,
    sortOrderInput,
    branchGroupInput,
    subTopicsInput,
  } = getRoadmapNodeModalElements()

  if (!roadmapIdInput.value.trim()) {
    window.alert('로드맵을 선택하세요.')
    roadmapIdInput.focus()
    return null
  }

  const roadmapId = parseRequiredNumber(roadmapIdInput.value, '로드맵 ID는 0 이상의 숫자로 입력하세요.')
  if (roadmapId === null) {
    roadmapIdInput.focus()
    return null
  }

  const knownRoadmap = officialRoadmapOptions.some((roadmap) => roadmap.roadmapId === roadmapId)
  if (!roadmapNodeModalEditingNode && officialRoadmapOptions.length > 0 && !knownRoadmap) {
    window.alert('선택 가능한 공식 로드맵 ID를 입력하세요.')
    roadmapIdInput.focus()
    return null
  }

  const title = nodeTitleInput.value.trim()
  if (!title) {
    window.alert('노드 제목을 입력하세요.')
    nodeTitleInput.focus()
    return null
  }

  const nodeType = nodeTypeInput.value.trim().toUpperCase()
  if (!nodeType) {
    window.alert('노드 유형을 선택하세요.')
    nodeTypeInput.focus()
    return null
  }

  if (!sortOrderInput.value.trim()) {
    window.alert('정렬 순서를 입력하세요.')
    sortOrderInput.focus()
    return null
  }

  const sortOrder = parseRequiredNumber(sortOrderInput.value, '정렬 순서는 0 이상의 숫자로 입력하세요.')
  if (sortOrder === null) {
    sortOrderInput.focus()
    return null
  }

  const branchGroup = parseOptionalNumber(branchGroupInput.value, '분기 그룹은 0 이상의 숫자로 입력하세요.')
  if (branchGroup === null) {
    branchGroupInput.focus()
    return null
  }

  return {
    roadmapId,
    title,
    content: normalizeOptionalString(nodeContentInput.value),
    nodeType,
    sortOrder,
    subTopics: normalizeOptionalString(subTopicsInput.value),
    branchGroup: branchGroup ?? null,
  }
}

function initRoadmapNodeModal() {
  if (roadmapNodeModalInitialized) {
    return
  }

  const {
    modal,
    form,
    roadmapIdInput,
    sortOrderInput,
    cancelButton,
  } = getRoadmapNodeModalElements()

  const refreshSortOrder = () => {
    if (roadmapNodeModalEditingNode) {
      return
    }

    if (!roadmapIdInput.value) {
      sortOrderInput.value = ''
      return
    }

    const roadmapId = Number(roadmapIdInput.value)
    if (Number.isInteger(roadmapId) && roadmapId >= 0) {
      sortOrderInput.value = String(getDefaultNodeSortOrder(roadmapId))
    }
  }

  roadmapIdInput.addEventListener('change', refreshSortOrder)

  cancelButton.addEventListener('click', () => {
    resolveRoadmapNodeModal(null)
  })

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      resolveRoadmapNodeModal(null)
    }
  })

  document.addEventListener('keydown', (event) => {
    const currentModal = document.getElementById('addNodeModal')
    if (event.key === 'Escape' && currentModal?.classList.contains('active')) {
      resolveRoadmapNodeModal(null)
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const payload = readRoadmapNodeModalPayload()
    if (payload) {
      resolveRoadmapNodeModal(payload)
    }
  })

  roadmapNodeModalInitialized = true
}

function openRoadmapNodeModal(node?: AdminRoadmapNode) {
  if (!node && officialRoadmapOptions.length === 0) {
    window.alert('선택 가능한 공식 로드맵이 없습니다.')
    return Promise.resolve(null)
  }

  if (roadmapNodeModalResolver) {
    resolveRoadmapNodeModal(null)
  }

  initRoadmapNodeModal()
  populateRoadmapSelectOptions(node)

  const {
    modal,
    form,
    title,
    description,
    roadmapIdInput,
    nodeTypeInput,
    nodeTitleInput,
    nodeContentInput,
    sortOrderInput,
    branchGroupInput,
    subTopicsInput,
    confirmButton,
  } = getRoadmapNodeModalElements()

  const roadmapId = getInitialRoadmapId(node)
  roadmapNodeModalEditingNode = node ?? null

  form.reset()
  title.textContent = node ? '마스터 로드맵 노드 수정' : '마스터 로드맵 노드 추가'
  description.textContent = node
    ? '노드 정보를 수정한 뒤 저장하세요.'
    : '공식 로드맵에 연결할 노드 정보를 입력하세요.'
  confirmButton.textContent = node ? '수정하기' : '추가하기'

  roadmapIdInput.value = roadmapId === null ? '' : String(roadmapId)
  roadmapIdInput.disabled = Boolean(node)
  roadmapIdInput.classList.toggle('devpath-modal-input-disabled', Boolean(node))
  nodeTypeInput.value = node?.nodeType?.toUpperCase() || 'CONCEPT'
  nodeTitleInput.value = node?.title ?? ''
  nodeContentInput.value = node?.content ?? ''
  sortOrderInput.value = roadmapId === null ? '' : String(getDefaultNodeSortOrder(roadmapId, node))
  branchGroupInput.value = node?.branchGroup?.toString() ?? ''
  subTopicsInput.value = node?.subTopics ?? ''

  return new Promise<RoadmapNodePayload | null>((resolve) => {
    roadmapNodeModalResolver = resolve
    roadmapNodeModalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setRoadmapNodeModalOpen(true)

    window.setTimeout(() => {
      if (!modal.classList.contains('active')) {
        return
      }

      if (node) {
        nodeTitleInput.focus()
        return
      }

      roadmapIdInput.focus()
    }, 80)
  })
}

function buildNodeHubItemKey(sectionKey: string, item: RoadmapHubItem) {
  return `${sectionKey}::${item.sortOrder}::${item.linkedRoadmapId ?? 'none'}::${item.title}`
}

function rebuildNodeHubIndex() {
  const nextEntriesByRoadmapId = new Map<number, NodeHubEntry[]>()

  nodeHubCatalog.sections.forEach((section) => {
    section.items.forEach((item) => {
      if (item.linkedRoadmapId === null || item.linkedRoadmapId === undefined) {
        return
      }

      const entry: NodeHubEntry = {
        itemKey: buildNodeHubItemKey(section.sectionKey, item),
        sectionKey: section.sectionKey,
        sectionTitle: section.title,
        layoutType: section.layoutType,
        itemTitle: item.title,
        linkedRoadmapId: item.linkedRoadmapId,
      }
      const entries = nextEntriesByRoadmapId.get(item.linkedRoadmapId) ?? []
      entries.push(entry)
      nextEntriesByRoadmapId.set(item.linkedRoadmapId, entries)
    })
  })

  nodeHubEntriesByRoadmapId = nextEntriesByRoadmapId
}

function getNodeHubEntries(roadmapId: number) {
  return nodeHubEntriesByRoadmapId.get(roadmapId) ?? []
}

function findNodeHubEntry(itemKey: string) {
  for (const entries of nodeHubEntriesByRoadmapId.values()) {
    const entry = entries.find((candidate) => candidate.itemKey === itemKey)
    if (entry) {
      return entry
    }
  }

  return null
}

function getNodeHubSectionRoadmapIds(sectionKey: string) {
  const roadmapIds = new Set<number>()

  nodeHubCatalog.sections
    .filter((section) => section.sectionKey === sectionKey)
    .forEach((section) => {
      section.items.forEach((item) => {
        if (item.linkedRoadmapId !== null && item.linkedRoadmapId !== undefined) {
          roadmapIds.add(item.linkedRoadmapId)
        }
      })
    })

  return roadmapIds
}

function getNodeHubFilteredRoadmapIds() {
  const itemEntry = filterState.nodeHubItemKey ? findNodeHubEntry(filterState.nodeHubItemKey) : null
  if (itemEntry) {
    return new Set([itemEntry.linkedRoadmapId])
  }

  if (filterState.nodeHubSectionKey === NODE_HUB_UNLINKED_FILTER) {
    return new Set(
      officialRoadmapOptions
        .filter((roadmap) => getNodeHubEntries(roadmap.roadmapId).length === 0)
        .map((roadmap) => roadmap.roadmapId),
    )
  }

  if (filterState.nodeHubSectionKey) {
    return getNodeHubSectionRoadmapIds(filterState.nodeHubSectionKey)
  }

  return null
}

function matchesNodeHubFilters(node: AdminRoadmapNode) {
  const entries = getNodeHubEntries(node.roadmapId)

  if (filterState.nodeHubSectionKey === NODE_HUB_UNLINKED_FILTER) {
    return entries.length === 0
  }

  if (filterState.nodeHubItemKey) {
    return entries.some((entry) => entry.itemKey === filterState.nodeHubItemKey)
  }

  if (filterState.nodeHubSectionKey) {
    return entries.some((entry) => entry.sectionKey === filterState.nodeHubSectionKey)
  }

  return true
}

function nodeHubBadgeClassName(layoutType: string) {
  switch (layoutType) {
    case 'CARD_GRID':
      return 'border border-emerald-100 bg-emerald-50 text-emerald-700'
    case 'CHIP_GRID':
      return 'border border-amber-100 bg-amber-50 text-amber-700'
    case 'LINK_LIST':
      return 'border border-sky-100 bg-sky-50 text-sky-700'
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-600'
  }
}

function renderNodeHubBadges(node: AdminRoadmapNode) {
  const entries = getNodeHubEntries(node.roadmapId)

  if (entries.length === 0) {
    return '<div class="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">허브 미연결</div>'
  }

  const visibleEntries = entries.slice(0, 3)
  const extraCount = entries.length - visibleEntries.length

  return `
    <div class="mt-2 flex max-w-full flex-wrap gap-1">
      ${visibleEntries
        .map(
          (entry) => `
            <span class="max-w-full truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${nodeHubBadgeClassName(entry.layoutType)}">
              ${escapeHtml(entry.sectionTitle)} · ${escapeHtml(entry.itemTitle)}
            </span>`,
        )
        .join('')}
      ${extraCount > 0 ? `<span class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">+${extraCount}</span>` : ''}
    </div>
  `
}

function accountStatusLabel(status: string | null | undefined) {
  switch ((status ?? '').toUpperCase()) {
    case 'ACTIVE':
      return '활성'
    case 'RESTRICTED':
      return '제한'
    case 'INACTIVE':
      return '비활성'
    default:
      return status || '미확인'
  }
}

function reportTargetLabel(report: AdminModerationReport) {
  if (report.targetLabel?.trim()) {
    return report.targetLabel
  }

  switch (report.targetType) {
    case 'USER':
      return '회원 신고'
    case 'CONTENT':
      return '콘텐츠 신고'
    default:
      return '대상 미확인'
  }
}

function reportTargetSummary(report: AdminModerationReport) {
  if (report.targetSummary?.trim()) {
    return report.targetSummary
  }

  if (report.targetType === 'USER') {
    return `회원 ID #${report.targetId ?? '-'}`
  }

  if (report.targetType === 'CONTENT') {
    return `콘텐츠 ID #${report.targetId ?? report.contentId ?? '-'}`
  }

  return '신고 대상 정보를 찾을 수 없습니다.'
}

function reportReporterSummary(report: AdminModerationReport) {
  if (report.reporterName && report.reporterEmail) {
    return `${report.reporterName} (${report.reporterEmail})`
  }

  if (report.reporterEmail) {
    return report.reporterEmail
  }

  return '신고자 정보 없음'
}

function reportContentContext(report: AdminModerationReport) {
  const contexts = [report.contentTitle, report.contentPreview].filter(
    (value): value is string => Boolean(value?.trim()),
  )

  if (contexts.length === 0) {
    return null
  }

  return contexts.join(' / ')
}

function buildLoadingRow(colspan: number, message = '데이터를 불러오는 중입니다...') {
  return `<tr><td colspan="${colspan}" class="py-10 text-center text-xs text-slate-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>${escapeHtml(message)}</td></tr>`
}

function buildEmptyRow(colspan: number, message = '표시할 데이터가 없습니다.') {
  return `<tr><td colspan="${colspan}" class="py-10 text-center text-xs text-slate-400">${escapeHtml(message)}</td></tr>`
}

function buildErrorRow(colspan: number, message = '데이터를 불러오지 못했습니다.') {
  return `<tr><td colspan="${colspan}" class="py-10 text-center text-xs text-rose-500">${escapeHtml(message)}</td></tr>`
}

// 필터 결과 개수를 각 섹션 요약 문구로 보여준다.
function updateFilterSummary(elementId: string, totalCount: number, filteredCount: number) {
  const message =
    totalCount === filteredCount
      ? `전체 ${formatNumber(totalCount)}개`
      : `전체 ${formatNumber(totalCount)}개 중 ${formatNumber(filteredCount)}개`

  getElement(elementId).textContent = message
}

function updateMetric(prefix: string, metric: AdminDashboardSummaryMetric, fallbackSuffix = '') {
  getElement(prefix + '-value').textContent = formatNumber(metric.value)

  const suffixElement = document.getElementById(prefix + '-suffix')
  if (suffixElement) {
    suffixElement.textContent = metric.suffix || fallbackSuffix
  }

  const changeElement = getElement(prefix + '-change')
  changeElement.textContent = metric.changeLabel
  changeElement.className = `rounded px-1.5 py-0.5 text-xs font-bold ${toneClassName(metric.changeTone)}`
  getElement(prefix + '-progress').setAttribute('style', `width: ${metric.progressPercent}%`)
}

// 차트는 매번 새 데이터를 받을 때 기존 인스턴스를 정리하고 다시 만든다.
function renderTrafficChart(points: AdminDashboardOverview['trafficTrend']) {
  const canvas = document.getElementById('trafficChart') as HTMLCanvasElement | null
  const ctx = canvas?.getContext('2d')

  if (!ctx) {
    return
  }

  trafficChart?.destroy()

  const gradientBlue = ctx.createLinearGradient(0, 0, 0, 300)
  gradientBlue.addColorStop(0, 'rgba(79, 70, 229, 0.2)')
  gradientBlue.addColorStop(1, 'rgba(79, 70, 229, 0)')

  const gradientTeal = ctx.createLinearGradient(0, 0, 0, 300)
  gradientTeal.addColorStop(0, 'rgba(6, 182, 212, 0.2)')
  gradientTeal.addColorStop(1, 'rgba(6, 182, 212, 0)')

  trafficChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.map((point) => point.label),
      datasets: [
        {
          label: '학습자',
          data: points.map((point) => point.learners),
          borderColor: '#4F46E5',
          backgroundColor: gradientBlue,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: '강사',
          data: points.map((point) => point.instructors),
          borderColor: '#06B6D4',
          backgroundColor: gradientTeal,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
        },
      },
    },
  })
}

function renderCategoryChart(categories: AdminDashboardCategoryDistribution[]) {
  const chartData = categories.length > 0 ? categories : [{ label: '기타', count: 1, percentage: 100 }]
  const canvas = document.getElementById('categoryChart') as HTMLCanvasElement | null
  const ctx = canvas?.getContext('2d')

  if (!ctx) {
    return
  }

  categoryChart?.destroy()
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.map((category) => category.label),
      datasets: [
        {
          data: chartData.map((category) => category.count),
          backgroundColor: chartData.map((_, index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length]),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: { legend: { display: false } },
    },
  })

  getElement('categoryLegend').innerHTML = chartData
    .map(
      (category, index) =>
        `<div class="flex items-center gap-1.5"><div class="h-2 w-2 rounded-full" style="background:${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}"></div>${escapeHtml(category.label)} (${category.percentage}%)</div>`,
    )
    .join('')
}

function renderOverview(overview: AdminDashboardOverview) {
  updateMetric('weekly-active-users', overview.weeklyActiveUsers)
  updateMetric('pending-course-reviews', overview.pendingCourseReviews, '건')
  updateMetric('issued-certificates', overview.issuedCertificates)
  updateMetric('pending-reports', overview.pendingReports, '건')
  renderTrafficChart(overview.trafficTrend)
  renderCategoryChart(overview.courseCategoryDistribution)
  getElement('nav-report-badge').textContent = String(overview.pendingReports.value)
}

async function fetchOverview() {
  renderOverview(await adminApi.getOverview())
}

function renderTagRows(tags: AdminTag[]) {
  const tbody = getElement('tagTableBody')
  tbody.innerHTML = tags.length
    ? tags
        .map(
          (tag) => `
            <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-6 py-3 font-mono text-xs text-slate-400">#${tag.id}</td>
              <td class="px-6 py-3 font-bold text-slate-800">${escapeHtml(tag.name)}</td>
              <td class="px-6 py-3 text-slate-500">${escapeHtml(tag.description || '설명 없음')}</td>
              <td class="px-6 py-3"><span class="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-600">ACTIVE</span></td>
              <td class="px-6 py-3 text-right"><button onclick="mergeTag(${tag.id})" class="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800" type="button">병합</button></td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(5, '조건에 맞는 태그가 없습니다.')
}

function applyTagFilters() {
  const keyword = normalizeText(filterState.tagQuery)
  const filteredTags = tagItems.filter((tag) => matchesKeyword(keyword, [tag.id, tag.name, tag.description]))

  renderTagRows(filteredTags)
  updateFilterSummary('tagFilterSummary', tagItems.length, filteredTags.length)
}

async function fetchTags() {
  const tbody = getElement('tagTableBody')
  tbody.innerHTML = buildLoadingRow(5)

  try {
    tagItems = await adminApi.getTags()
    applyTagFilters()
  } catch (error) {
    tbody.innerHTML = buildErrorRow(5, error instanceof Error ? error.message : '태그를 불러오지 못했습니다.')
    updateFilterSummary('tagFilterSummary', 0, 0)
  }
}

function syncOfficialRoadmapFormState() {
  const saveButton = getElement<HTMLButtonElement>('officialRoadmapSaveButton')
  const cancelButton = getElement<HTMLButtonElement>('officialRoadmapCancelEdit')
  const isEditing = officialRoadmapEditingId !== null

  saveButton.disabled = officialRoadmapSaving
  saveButton.classList.toggle('opacity-70', officialRoadmapSaving)
  saveButton.classList.toggle('cursor-not-allowed', officialRoadmapSaving)
  saveButton.innerHTML = officialRoadmapSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : isEditing
      ? '<i class="fas fa-save mr-1"></i> 변경 저장'
      : '<i class="fas fa-plus mr-1"></i> 로드맵 생성'
  cancelButton.classList.toggle('hidden', !isEditing)
}

function resetOfficialRoadmapForm() {
  officialRoadmapEditingId = null
  getElement<HTMLInputElement>('officialRoadmapTitleInput').value = ''
  getElement<HTMLTextAreaElement>('officialRoadmapDescriptionInput').value = ''
  syncOfficialRoadmapFormState()
}

function setOfficialRoadmapForm(roadmap: AdminOfficialRoadmap) {
  officialRoadmapEditingId = roadmap.roadmapId
  const titleInput = getElement<HTMLInputElement>('officialRoadmapTitleInput')
  titleInput.value = roadmap.title
  getElement<HTMLTextAreaElement>('officialRoadmapDescriptionInput').value = roadmap.description ?? ''
  syncOfficialRoadmapFormState()
  titleInput.focus()
}

function getOfficialRoadmapFormPayload() {
  const titleInput = getElement<HTMLInputElement>('officialRoadmapTitleInput')
  const descriptionInput = getElement<HTMLTextAreaElement>('officialRoadmapDescriptionInput')
  const title = titleInput.value.trim()

  if (!title) {
    window.alert('로드맵 제목을 입력하세요.')
    titleInput.focus()
    return null
  }

  return {
    title,
    description: normalizeOptionalString(descriptionInput.value),
  }
}

function renderOfficialRoadmapRows(roadmaps: AdminOfficialRoadmap[]) {
  const tbody = getElement('officialRoadmapTableBody')
  tbody.innerHTML = roadmaps.length
    ? roadmaps
        .map(
          (roadmap) => `
            <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-6 py-3 font-mono text-xs text-slate-400">#${roadmap.roadmapId}</td>
              <td class="px-6 py-3">
                <div class="truncate font-bold text-slate-800">${escapeHtml(roadmap.title)}</div>
                <div class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">${escapeHtml(roadmap.description || '설명 없음')}</div>
              </td>
              <td class="px-6 py-3 text-xs whitespace-nowrap text-slate-500">${escapeHtml(formatDateTime(roadmap.createdAt))}</td>
              <td class="px-6 py-3"><span class="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-600">공식</span></td>
              <td class="px-6 py-3 text-right">
                <div class="flex flex-nowrap justify-end gap-1">
                  <button onclick="editOfficialRoadmap(${roadmap.roadmapId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">수정</button>
                  <button onclick="deleteOfficialRoadmap(${roadmap.roadmapId})" class="whitespace-nowrap rounded bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 hover:text-rose-800" type="button">삭제</button>
                </div>
              </td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(5, '조건에 맞는 공식 로드맵이 없습니다.')
}

function applyOfficialRoadmapFilters() {
  const keyword = normalizeText(filterState.officialRoadmapQuery)
  const filteredRoadmaps = officialRoadmapItems.filter((roadmap) => (
    matchesKeyword(keyword, [roadmap.roadmapId, roadmap.title, roadmap.description])
  ))

  renderOfficialRoadmapRows(filteredRoadmaps)
  updateFilterSummary('officialRoadmapSummary', officialRoadmapItems.length, filteredRoadmaps.length)
}

async function fetchOfficialRoadmaps() {
  const tbody = getElement('officialRoadmapTableBody')
  tbody.innerHTML = buildLoadingRow(5)

  try {
    officialRoadmapItems = await adminApi.getOfficialRoadmaps()
    officialRoadmapOptions = officialRoadmapItems.map((roadmap) => ({
      roadmapId: roadmap.roadmapId,
      title: roadmap.title,
    }))
    applyOfficialRoadmapFilters()
  } catch (error) {
    tbody.innerHTML = buildErrorRow(5, error instanceof Error ? error.message : '공식 로드맵을 불러오지 못했습니다.')
    updateFilterSummary('officialRoadmapSummary', 0, 0)
  }
}

async function fetchRoadmapBaseInfo() {
  await Promise.all([fetchOfficialRoadmaps(), fetchRoadmapInfoItems()])
}

async function submitOfficialRoadmapForm() {
  const payload = getOfficialRoadmapFormPayload()
  if (!payload) {
    return
  }

  officialRoadmapSaving = true
  syncOfficialRoadmapFormState()

  try {
    if (officialRoadmapEditingId === null) {
      await adminApi.createOfficialRoadmap(payload)
      window.alert('공식 로드맵을 생성했습니다.')
    } else {
      await adminApi.updateOfficialRoadmap(officialRoadmapEditingId, payload)
      window.alert('공식 로드맵을 수정했습니다.')
    }

    resetOfficialRoadmapForm()
    await fetchRoadmapBaseInfo()
  } finally {
    officialRoadmapSaving = false
    syncOfficialRoadmapFormState()
  }
}

function roadmapHasInfo(roadmap: AdminOfficialRoadmap) {
  return Boolean(roadmap.infoTitle?.trim() || roadmap.infoContent?.trim())
}

function getFilteredRoadmapInfoItems() {
  const keyword = normalizeText(filterState.roadmapInfoQuery)
  return roadmapInfoItems.filter((roadmap) =>
    matchesKeyword(keyword, [
      roadmap.roadmapId,
      roadmap.title,
      roadmap.description,
      roadmap.infoTitle,
      roadmap.infoContent,
    ]),
  )
}

function renderRoadmapInfoOptions() {
  const select = getElement<HTMLSelectElement>('roadmapInfoRoadmapSelect')
  select.innerHTML = [
    '<option value="">로드맵을 선택하세요</option>',
    ...roadmapInfoItems.map(
      (roadmap) => `
        <option value="${roadmap.roadmapId}" ${roadmapInfoEditingId === roadmap.roadmapId ? 'selected' : ''}>
          ${escapeHtml(roadmap.title)}
        </option>`,
    ),
  ].join('')
  select.value = roadmapInfoEditingId === null ? '' : String(roadmapInfoEditingId)
}

function renderRoadmapInfoRows(roadmaps: AdminOfficialRoadmap[]) {
  const tbody = getElement('roadmapInfoTableBody')
  tbody.innerHTML = roadmaps.length
    ? roadmaps
        .map((roadmap) => {
          const selected = roadmapInfoEditingId === roadmap.roadmapId
          const hasInfo = roadmapHasInfo(roadmap)
          return `
            <tr class="border-b border-slate-100 transition-colors ${selected ? 'bg-teal-50/60' : 'hover:bg-slate-50/70'}">
              <td class="px-5 py-3 font-mono text-xs text-slate-400">#${roadmap.roadmapId}</td>
              <td class="px-5 py-3">
                <div class="truncate font-bold text-slate-800">${escapeHtml(roadmap.title)}</div>
                <div class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">${escapeHtml(roadmap.description || '설명 없음')}</div>
              </td>
              <td class="px-5 py-3">
                <div class="truncate text-sm font-semibold text-slate-700">${escapeHtml(roadmap.infoTitle || '소개 제목 없음')}</div>
                <div class="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">${escapeHtml(roadmapInfoHtmlToEditableText(roadmap.infoContent) || '소개 본문 없음')}</div>
              </td>
              <td class="px-5 py-3">
                <span class="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${hasInfo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">
                  ${hasInfo ? '등록됨' : '미등록'}
                </span>
              </td>
              <td class="px-5 py-3 text-right">
                <div class="flex flex-nowrap justify-end gap-1">
                  <button onclick="editRoadmapInfo(${roadmap.roadmapId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">편집</button>
                  <button onclick="clearRoadmapInfo(${roadmap.roadmapId})" class="whitespace-nowrap rounded bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 hover:text-rose-800 ${hasInfo ? '' : 'opacity-50'}" type="button" ${hasInfo ? '' : 'disabled'}>삭제</button>
                </div>
              </td>
            </tr>`
        })
        .join('')
    : buildEmptyRow(5, '조건에 맞는 로드맵 소개가 없습니다.')
}

function syncRoadmapInfoFormState() {
  const selectedRoadmap = roadmapInfoItems.find((roadmap) => roadmap.roadmapId === roadmapInfoEditingId) ?? null
  const form = getElement<HTMLFormElement>('roadmapInfoForm')
  const titleInput = getElement<HTMLInputElement>('roadmapInfoTitleInput')
  const contentInput = getElement<HTMLTextAreaElement>('roadmapInfoContentInput')
  const saveButton = getElement<HTMLButtonElement>('roadmapInfoSaveButton')
  const deleteButton = getElement<HTMLButtonElement>('roadmapInfoDeleteButton')
  const resetButton = getElement<HTMLButtonElement>('roadmapInfoResetButton')
  const selectedTitle = getElement('roadmapInfoSelectedTitle')
  const selectedDescription = getElement('roadmapInfoSelectedDescription')
  const hasSelection = selectedRoadmap !== null
  const hasInfo = selectedRoadmap ? roadmapHasInfo(selectedRoadmap) : false

  form.classList.toggle('opacity-70', roadmapInfoSaving)
  titleInput.disabled = !hasSelection || roadmapInfoSaving
  contentInput.disabled = !hasSelection || roadmapInfoSaving
  saveButton.disabled = !hasSelection || roadmapInfoSaving
  deleteButton.disabled = !hasSelection || !hasInfo || roadmapInfoSaving
  resetButton.disabled = roadmapInfoSaving
  deleteButton.classList.toggle('opacity-50', !hasInfo)
  deleteButton.classList.toggle('cursor-not-allowed', !hasSelection || !hasInfo || roadmapInfoSaving)
  saveButton.classList.toggle('opacity-70', roadmapInfoSaving)
  saveButton.classList.toggle('cursor-not-allowed', !hasSelection || roadmapInfoSaving)
  saveButton.innerHTML = roadmapInfoSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : '<i class="fas fa-save mr-1"></i> 소개 저장'

  selectedTitle.textContent = selectedRoadmap?.title ?? '로드맵을 선택하세요'
  selectedDescription.textContent = selectedRoadmap?.description ?? '목록에서 로드맵을 선택하면 소개 제목과 본문을 수정할 수 있습니다.'
  renderRoadmapInfoPreview()
}

function populateRoadmapInfoForm() {
  const selectedRoadmap = roadmapInfoItems.find((roadmap) => roadmap.roadmapId === roadmapInfoEditingId) ?? null
  getElement<HTMLInputElement>('roadmapInfoTitleInput').value = selectedRoadmap?.infoTitle ?? ''
  getElement<HTMLTextAreaElement>('roadmapInfoContentInput').value = roadmapInfoHtmlToEditableText(selectedRoadmap?.infoContent)
  renderRoadmapInfoOptions()
  syncRoadmapInfoFormState()
}

function renderRoadmapInfoPreview() {
  const preview = document.getElementById('roadmapInfoPreview')
  const contentInput = document.getElementById('roadmapInfoContentInput') as HTMLTextAreaElement | null
  if (!preview || !contentInput) {
    return
  }

  const html = buildRoadmapInfoContentHtml(contentInput.value)
  preview.innerHTML = html.trim()
    ? sanitizePreviewHtml(html)
    : '<p class="text-slate-400">소개 본문을 입력하면 미리보기가 표시됩니다.</p>'
}

function renderRoadmapInfoManager() {
  const summaryElement = getElement('roadmapInfoSummary')
  const filteredRoadmaps = getFilteredRoadmapInfoItems()
  const registeredCount = roadmapInfoItems.filter(roadmapHasInfo).length

  summaryElement.textContent = `전체 ${formatNumber(roadmapInfoItems.length)}개 · 소개 등록 ${formatNumber(registeredCount)}개`
  renderRoadmapInfoOptions()

  if (roadmapInfoLoading) {
    getElement('roadmapInfoTableBody').innerHTML = buildLoadingRow(5)
    syncRoadmapInfoFormState()
    return
  }

  if (roadmapInfoError) {
    getElement('roadmapInfoTableBody').innerHTML = buildErrorRow(5, roadmapInfoError)
    syncRoadmapInfoFormState()
    return
  }

  renderRoadmapInfoRows(filteredRoadmaps)
  updateFilterSummary('roadmapInfoFilterSummary', roadmapInfoItems.length, filteredRoadmaps.length)
  syncRoadmapInfoFormState()
}

function setRoadmapInfoForm(roadmapId: number | null) {
  roadmapInfoEditingId = roadmapId
  populateRoadmapInfoForm()
  renderRoadmapInfoRows(getFilteredRoadmapInfoItems())
}

async function fetchRoadmapInfoItems() {
  roadmapInfoLoading = true
  roadmapInfoError = null
  renderRoadmapInfoManager()

  try {
    roadmapInfoItems = await adminApi.getOfficialRoadmaps()
    if (roadmapInfoEditingId && !roadmapInfoItems.some((roadmap) => roadmap.roadmapId === roadmapInfoEditingId)) {
      roadmapInfoEditingId = null
    }
  } catch (error) {
    roadmapInfoError = error instanceof Error ? error.message : '로드맵 소개 목록을 불러오지 못했습니다.'
  } finally {
    roadmapInfoLoading = false
    renderRoadmapInfoManager()
    populateRoadmapInfoForm()
  }
}

async function saveRoadmapInfoForm() {
  const roadmapId = roadmapInfoEditingId
  if (roadmapId === null) {
    window.alert('소개를 수정할 로드맵을 선택하세요.')
    return
  }

  const infoTitle = normalizeOptionalString(getElement<HTMLInputElement>('roadmapInfoTitleInput').value)
  const editableContent = normalizeOptionalString(getElement<HTMLTextAreaElement>('roadmapInfoContentInput').value)
  const infoContent = editableContent ? buildRoadmapInfoContentHtml(editableContent) : null

  if (!infoTitle && !infoContent) {
    window.alert('소개 제목 또는 소개 본문을 입력하세요. 비우려면 소개 삭제를 사용하세요.')
    return
  }

  roadmapInfoSaving = true
  syncRoadmapInfoFormState()

  try {
    await adminApi.updateOfficialRoadmapInfo(roadmapId, { infoTitle, infoContent })
    window.alert('로드맵 소개를 저장했습니다.')
    await fetchRoadmapInfoItems()
    setRoadmapInfoForm(roadmapId)
  } finally {
    roadmapInfoSaving = false
    syncRoadmapInfoFormState()
  }
}

async function clearRoadmapInfoById(roadmapId: number) {
  const roadmap = roadmapInfoItems.find((item) => item.roadmapId === roadmapId)
  if (!roadmap) {
    window.alert('소개를 삭제할 로드맵을 찾지 못했습니다.')
    return
  }

  if (!roadmapHasInfo(roadmap)) {
    window.alert('삭제할 소개 콘텐츠가 없습니다.')
    return
  }

  if (!window.confirm(`'${roadmap.title}' 로드맵 소개를 삭제하시겠습니까?`)) {
    return
  }

  roadmapInfoSaving = true
  syncRoadmapInfoFormState()

  try {
    await adminApi.deleteOfficialRoadmapInfo(roadmapId)
    window.alert('로드맵 소개를 삭제했습니다.')
    await fetchRoadmapInfoItems()
    setRoadmapInfoForm(roadmapId)
  } finally {
    roadmapInfoSaving = false
    syncRoadmapInfoFormState()
  }
}

function getDefaultNodeResourceSortOrder(nodeId: number) {
  return Math.max(
    -1,
    ...nodeResourceItems
      .filter((resource) => resource.nodeId === nodeId && resource.resourceId !== nodeResourceEditingId)
      .map((resource) => resource.sortOrder ?? 0),
  ) + 1
}

function getNodeResourceRoadmapOptions() {
  const nodeCounts = new Map<number, number>()

  nodeItems.forEach((node) => {
    nodeCounts.set(node.roadmapId, (nodeCounts.get(node.roadmapId) ?? 0) + 1)
  })

  const roadmapOptions = officialRoadmapOptions.length > 0
    ? officialRoadmapOptions.map((roadmap) => ({
        roadmapId: roadmap.roadmapId,
        title: roadmap.title,
        nodeCount: nodeCounts.get(roadmap.roadmapId) ?? 0,
      }))
    : [...new Map(nodeItems.map((node) => [
        node.roadmapId,
        {
          roadmapId: node.roadmapId,
          title: node.roadmapTitle,
          nodeCount: nodeCounts.get(node.roadmapId) ?? 0,
        },
      ])).values()]

  return roadmapOptions.sort((left, right) => (
    left.title.localeCompare(right.title, 'ko-KR') || left.roadmapId - right.roadmapId
  ))
}

function getNodeResourceRoadmapTitle(roadmapId: number) {
  return officialRoadmapOptions.find((roadmap) => roadmap.roadmapId === roadmapId)?.title
    ?? nodeItems.find((node) => node.roadmapId === roadmapId)?.roadmapTitle
    ?? `로드맵 #${roadmapId}`
}

function getSortedNodeResourceNodeOptions(roadmapId?: number | null) {
  return nodeItems
    .filter((node) => !roadmapId || node.roadmapId === roadmapId)
    .sort((left, right) => {
      const roadmapCompare = left.roadmapTitle.localeCompare(right.roadmapTitle, 'ko-KR')
      if (roadmapCompare !== 0) {
        return roadmapCompare
      }

      return (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.nodeId - right.nodeId
    })
}

function ensureSelectedRoadmapOption(roadmapOptions: Array<{ roadmapId: number; title: string; nodeCount: number }>, selectedRoadmapId?: number | null) {
  if (!selectedRoadmapId || roadmapOptions.some((roadmap) => roadmap.roadmapId === selectedRoadmapId)) {
    return roadmapOptions
  }

  return [
    ...roadmapOptions,
    {
      roadmapId: selectedRoadmapId,
      title: getNodeResourceRoadmapTitle(selectedRoadmapId),
      nodeCount: getSortedNodeResourceNodeOptions(selectedRoadmapId).length,
    },
  ].sort((left, right) => (
    left.title.localeCompare(right.title, 'ko-KR') || left.roadmapId - right.roadmapId
  ))
}

function ensureSelectedNodeOption(nodeOptions: AdminRoadmapNode[], selectedNodeId?: number | null) {
  if (!selectedNodeId || nodeOptions.some((node) => node.nodeId === selectedNodeId)) {
    return nodeOptions
  }

  const selectedNode = nodeItems.find((node) => node.nodeId === selectedNodeId)
  return selectedNode ? [...nodeOptions, selectedNode] : nodeOptions
}

function renderNodeResourceRoadmapOptions(selectedRoadmapId?: number | null) {
  const select = getElement<HTMLSelectElement>('nodeResourceRoadmapSelect')
  const roadmapOptions = ensureSelectedRoadmapOption(getNodeResourceRoadmapOptions(), selectedRoadmapId)
  const currentValue = selectedRoadmapId ?? (select.value ? Number(select.value) : null)
  const validCurrentValue = roadmapOptions.some((roadmap) => roadmap.roadmapId === currentValue)
    ? currentValue
    : null

  select.innerHTML = [
    '<option value="">로드맵을 선택하세요</option>',
    ...roadmapOptions.map(
      (roadmap) => `
        <option value="${roadmap.roadmapId}" title="${escapeHtml(roadmap.title)}" ${validCurrentValue === roadmap.roadmapId ? 'selected' : ''}>
          ${escapeHtml(roadmap.title)} (${formatNumber(roadmap.nodeCount)}개 노드)
        </option>`,
    ),
  ].join('')
  select.value = validCurrentValue ? String(validCurrentValue) : ''
  updateNodeResourceFormReadouts()
}

function renderNodeResourceNodeOptions(selectedNodeId?: number | null, selectedRoadmapId?: number | null) {
  const select = getElement<HTMLSelectElement>('nodeResourceNodeSelect')
  const roadmapSelect = getElement<HTMLSelectElement>('nodeResourceRoadmapSelect')
  const roadmapId = selectedRoadmapId ?? (roadmapSelect.value ? Number(roadmapSelect.value) : null)
  const nodeOptions = roadmapId
    ? ensureSelectedNodeOption(getSortedNodeResourceNodeOptions(roadmapId), selectedNodeId)
    : []
  const currentValue = selectedNodeId ?? (select.value ? Number(select.value) : null)
  const validCurrentValue = nodeOptions.some((node) => node.nodeId === currentValue) ? currentValue : null

  select.innerHTML = [
    `<option value="">${roadmapId ? nodeOptions.length > 0 ? '노드를 선택하세요' : '선택한 로드맵에 노드가 없습니다' : '로드맵을 먼저 선택하세요'}</option>`,
    ...nodeOptions.map(
      (node) => `
        <option value="${node.nodeId}" title="${escapeHtml(node.roadmapTitle)} · ${escapeHtml(node.title)}" ${validCurrentValue === node.nodeId ? 'selected' : ''}>
          ${escapeHtml(formatNodeStructure(node))} · ${escapeHtml(node.title)}
        </option>`,
    ),
  ].join('')

  select.disabled = !roadmapId || nodeOptions.length === 0
  select.value = validCurrentValue ? String(validCurrentValue) : ''
  updateNodeResourceFormReadouts()
}

function renderNodeResourceFormOptions(selectedRoadmapId?: number | null, selectedNodeId?: number | null) {
  renderNodeResourceRoadmapOptions(selectedRoadmapId)
  const roadmapSelect = getElement<HTMLSelectElement>('nodeResourceRoadmapSelect')
  const roadmapId = selectedRoadmapId ?? (roadmapSelect.value ? Number(roadmapSelect.value) : null)
  renderNodeResourceNodeOptions(selectedNodeId, roadmapId)
}

function renderNodeResourceFilterOptions() {
  const roadmapSelect = getElement<HTMLSelectElement>('nodeResourceRoadmapFilter')
  const nodeSelect = getElement<HTMLSelectElement>('nodeResourceNodeFilter')
  const sourceSelect = getElement<HTMLSelectElement>('nodeResourceSourceFilter')
  const statusSelect = getElement<HTMLSelectElement>('nodeResourceStatusFilter')
  const roadmapOptions = getNodeResourceRoadmapOptions()
  const roadmapIds = new Set(roadmapOptions.map((roadmap) => String(roadmap.roadmapId)))

  if (filterState.nodeResourceRoadmapId && !roadmapIds.has(filterState.nodeResourceRoadmapId)) {
    filterState.nodeResourceRoadmapId = ''
    filterState.nodeResourceNodeId = ''
  }

  roadmapSelect.innerHTML = [
    '<option value="">전체 로드맵</option>',
    ...roadmapOptions.map(
      (roadmap) => `<option value="${roadmap.roadmapId}" title="${escapeHtml(roadmap.title)}" ${filterState.nodeResourceRoadmapId === String(roadmap.roadmapId) ? 'selected' : ''}>${escapeHtml(roadmap.title)}</option>`,
    ),
  ].join('')
  roadmapSelect.value = filterState.nodeResourceRoadmapId

  const roadmapId = filterState.nodeResourceRoadmapId ? Number(filterState.nodeResourceRoadmapId) : null
  const nodeOptions = getSortedNodeResourceNodeOptions(roadmapId)
  const nodeIds = new Set(nodeOptions.map((node) => String(node.nodeId)))

  if (filterState.nodeResourceNodeId && !nodeIds.has(filterState.nodeResourceNodeId)) {
    filterState.nodeResourceNodeId = ''
  }

  nodeSelect.innerHTML = [
    '<option value="">전체 노드</option>',
    ...nodeOptions.map(
      (node) => `
        <option value="${node.nodeId}" title="${escapeHtml(node.roadmapTitle)} · ${escapeHtml(node.title)}" ${filterState.nodeResourceNodeId === String(node.nodeId) ? 'selected' : ''}>
          ${escapeHtml(node.roadmapTitle)} · ${escapeHtml(node.title)}
        </option>`,
    ),
  ].join('')
  nodeSelect.value = filterState.nodeResourceNodeId
  sourceSelect.value = filterState.nodeResourceSourceType
  statusSelect.value = filterState.nodeResourceStatus
  updateNodeResourceFilterReadout()
}

function getSelectLabel(select: HTMLSelectElement) {
  return select.selectedOptions[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

function updateNodeResourceFormReadouts() {
  const roadmapSelect = document.getElementById('nodeResourceRoadmapSelect') as HTMLSelectElement | null
  const nodeSelect = document.getElementById('nodeResourceNodeSelect') as HTMLSelectElement | null
  const roadmapReadout = document.getElementById('nodeResourceRoadmapReadout')
  const nodeReadout = document.getElementById('nodeResourceNodeReadout')

  if (!roadmapSelect || !nodeSelect || !roadmapReadout || !nodeReadout) {
    return
  }

  const roadmapLabel = roadmapSelect.value ? getSelectLabel(roadmapSelect) : ''
  const nodeLabel = nodeSelect.value ? getSelectLabel(nodeSelect) : ''

  roadmapSelect.title = roadmapLabel
  nodeSelect.title = nodeLabel
  roadmapReadout.textContent = roadmapLabel || '로드맵을 선택하면 전체 이름이 표시됩니다.'

  if (nodeLabel) {
    nodeReadout.textContent = nodeLabel
    return
  }

  nodeReadout.textContent = roadmapSelect.value
    ? nodeSelect.disabled
      ? '선택한 로드맵에 등록된 노드가 없습니다.'
      : '노드를 선택하면 전체 이름이 표시됩니다.'
    : '로드맵을 먼저 선택하세요.'
}

function updateNodeResourceFilterReadout() {
  const filterReadout = document.getElementById('nodeResourceFilterReadout')
  if (!filterReadout) {
    return
  }

  const roadmapSelect = getElement<HTMLSelectElement>('nodeResourceRoadmapFilter')
  const nodeSelect = getElement<HTMLSelectElement>('nodeResourceNodeFilter')
  const sourceSelect = getElement<HTMLSelectElement>('nodeResourceSourceFilter')
  const statusSelect = getElement<HTMLSelectElement>('nodeResourceStatusFilter')
  const parts = [
    filterState.nodeResourceQuery.trim() ? `검색어: ${filterState.nodeResourceQuery.trim()}` : '',
    filterState.nodeResourceRoadmapId ? `로드맵: ${getSelectLabel(roadmapSelect)}` : '',
    filterState.nodeResourceNodeId ? `노드: ${getSelectLabel(nodeSelect)}` : '',
    filterState.nodeResourceSourceType ? `유형: ${getSelectLabel(sourceSelect)}` : '',
    filterState.nodeResourceStatus ? `상태: ${getSelectLabel(statusSelect)}` : '',
  ].filter(Boolean)

  roadmapSelect.title = getSelectLabel(roadmapSelect)
  nodeSelect.title = getSelectLabel(nodeSelect)
  filterReadout.textContent = parts.length > 0
    ? `적용 중인 필터 · ${parts.join(' · ')}`
    : '전체 추천 자료를 보고 있습니다.'
}

function syncNodeResourceFormState() {
  const form = getElement<HTMLFormElement>('nodeResourceForm')
  const saveButton = getElement<HTMLButtonElement>('nodeResourceSaveButton')
  const cancelButton = getElement<HTMLButtonElement>('nodeResourceCancelEdit')
  const isEditing = nodeResourceEditingId !== null

  form.classList.toggle('opacity-70', nodeResourceSaving)
  saveButton.disabled = nodeResourceSaving
  saveButton.classList.toggle('opacity-70', nodeResourceSaving)
  saveButton.classList.toggle('cursor-not-allowed', nodeResourceSaving)
  saveButton.innerHTML = nodeResourceSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : isEditing
      ? '<i class="fas fa-save mr-1"></i> 변경 저장'
      : '<i class="fas fa-plus mr-1"></i> 자료 등록'
  cancelButton.classList.toggle('hidden', !isEditing)
}

function resetNodeResourceForm() {
  nodeResourceEditingId = null
  getElement<HTMLFormElement>('nodeResourceForm').reset()
  getElement<HTMLSelectElement>('nodeResourceSourceTypeInput').value = 'BLOG'
  getElement<HTMLInputElement>('nodeResourceActiveInput').checked = true
  renderNodeResourceFormOptions(null, null)
  syncNodeResourceFormState()
  applyNodeResourceFilters()
}

function setNodeResourceForm(resource: AdminRoadmapNodeResource) {
  nodeResourceEditingId = resource.resourceId
  renderNodeResourceFormOptions(resource.roadmapId, resource.nodeId)
  getElement<HTMLSelectElement>('nodeResourceRoadmapSelect').value = String(resource.roadmapId)
  getElement<HTMLSelectElement>('nodeResourceNodeSelect').value = String(resource.nodeId)
  getElement<HTMLInputElement>('nodeResourceTitleInput').value = resource.title
  getElement<HTMLInputElement>('nodeResourceUrlInput').value = resource.url
  getElement<HTMLSelectElement>('nodeResourceSourceTypeInput').value = (resource.sourceType ?? 'OTHER').toUpperCase()
  getElement<HTMLInputElement>('nodeResourceSortOrderInput').value = String(resource.sortOrder ?? 0)
  getElement<HTMLTextAreaElement>('nodeResourceDescriptionInput').value = resource.description ?? ''
  getElement<HTMLInputElement>('nodeResourceActiveInput').checked = resource.active
  syncNodeResourceFormState()
  applyNodeResourceFilters()
}

function getNodeResourceFormPayload(): RoadmapNodeResourcePayload | null {
  const roadmapSelect = getElement<HTMLSelectElement>('nodeResourceRoadmapSelect')
  const nodeSelect = getElement<HTMLSelectElement>('nodeResourceNodeSelect')
  const titleInput = getElement<HTMLInputElement>('nodeResourceTitleInput')
  const urlInput = getElement<HTMLInputElement>('nodeResourceUrlInput')
  const sourceTypeInput = getElement<HTMLSelectElement>('nodeResourceSourceTypeInput')
  const sortOrderInput = getElement<HTMLInputElement>('nodeResourceSortOrderInput')
  const descriptionInput = getElement<HTMLTextAreaElement>('nodeResourceDescriptionInput')
  const activeInput = getElement<HTMLInputElement>('nodeResourceActiveInput')

  if (!roadmapSelect.value.trim()) {
    window.alert('자료를 연결할 로드맵을 선택하세요.')
    roadmapSelect.focus()
    return null
  }

  const roadmapId = parseRequiredNumber(roadmapSelect.value, '로드맵 ID는 0 이상의 숫자로 입력하세요.')
  if (roadmapId === null) {
    roadmapSelect.focus()
    return null
  }

  if (!nodeSelect.value.trim()) {
    window.alert('자료를 연결할 노드를 선택하세요.')
    nodeSelect.focus()
    return null
  }

  const nodeId = parseRequiredNumber(nodeSelect.value, '노드 ID는 0 이상의 숫자로 입력하세요.')
  if (nodeId === null) {
    nodeSelect.focus()
    return null
  }

  const selectedNode = nodeItems.find((node) => node.nodeId === nodeId)
  if (!selectedNode || selectedNode.roadmapId !== roadmapId) {
    window.alert('선택한 로드맵에 속한 노드를 선택하세요.')
    nodeSelect.focus()
    return null
  }

  const title = titleInput.value.trim()
  if (!title) {
    window.alert('자료 제목을 입력하세요.')
    titleInput.focus()
    return null
  }

  const url = urlInput.value.trim()
  if (!url) {
    window.alert('자료 링크를 입력하세요.')
    urlInput.focus()
    return null
  }

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('invalid protocol')
    }
  } catch {
    window.alert('자료 링크는 http 또는 https URL로 입력하세요.')
    urlInput.focus()
    return null
  }

  const sortOrder = parseRequiredNumber(sortOrderInput.value || '0', '정렬 순서는 0 이상의 숫자로 입력하세요.')
  if (sortOrder === null) {
    sortOrderInput.focus()
    return null
  }

  return {
    nodeId,
    title,
    url,
    description: normalizeOptionalString(descriptionInput.value),
    sourceType: sourceTypeInput.value || 'OTHER',
    sortOrder,
    active: activeInput.checked,
  }
}

function renderNodeResourceRows(resources: AdminRoadmapNodeResource[]) {
  const tbody = getElement('nodeResourceTableBody')
  tbody.innerHTML = resources.length
    ? resources
        .map((resource) => {
          const selected = nodeResourceEditingId === resource.resourceId
          const statusClass = resource.active
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-slate-100 text-slate-500'

          return `
            <tr class="border-b border-slate-100 transition-colors ${selected ? 'bg-teal-50/60' : 'hover:bg-slate-50/70'}">
              <td class="px-5 py-3 align-middle font-mono text-xs whitespace-nowrap text-slate-400">#${resource.resourceId}</td>
              <td class="px-5 py-3 align-middle">
                <div class="truncate font-bold text-slate-800">${escapeHtml(resource.nodeTitle)}</div>
                <div class="mt-1 truncate text-xs text-slate-400">${escapeHtml(resource.roadmapTitle)}</div>
              </td>
              <td class="px-5 py-3 align-middle">
                <div class="truncate font-bold text-slate-800">${escapeHtml(resource.title)}</div>
                <a href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer" class="mt-1 block truncate text-xs font-medium text-teal-600 hover:text-teal-700">${escapeHtml(resource.url)}</a>
                <div class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">${escapeHtml(resource.description || '설명 없음')}</div>
              </td>
              <td class="px-5 py-3 align-middle text-xs text-slate-500">
                <span class="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${statusClass}">${resource.active ? '노출' : '비노출'}</span>
                <div class="mt-2">순서 ${resource.sortOrder ?? 0}</div>
                <div class="mt-1">${escapeHtml(nodeResourceSourceLabel(resource.sourceType))}</div>
              </td>
              <td class="px-5 py-3 align-middle text-right">
                <div class="flex flex-wrap justify-end gap-1">
                  <button onclick="editRoadmapNodeResource(${resource.resourceId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">수정</button>
                  <button onclick="deleteRoadmapNodeResource(${resource.resourceId})" class="whitespace-nowrap rounded bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 hover:text-rose-800" type="button">삭제</button>
                </div>
              </td>
            </tr>`
        })
        .join('')
    : buildEmptyRow(5, '조건에 맞는 추천 자료가 없습니다.')
}

function applyNodeResourceFilters() {
  const keyword = normalizeText(filterState.nodeResourceQuery)
  const roadmapId = filterState.nodeResourceRoadmapId.trim()
  const nodeId = filterState.nodeResourceNodeId.trim()
  const sourceType = filterState.nodeResourceSourceType.trim().toUpperCase()
  const status = filterState.nodeResourceStatus.trim().toUpperCase()
  const filteredResources = nodeResourceItems.filter((resource) => {
    const matchesText = matchesKeyword(keyword, [
      resource.resourceId,
      resource.nodeId,
      resource.nodeTitle,
      resource.roadmapId,
      resource.roadmapTitle,
      resource.title,
      resource.url,
      resource.description,
      resource.sourceType,
    ])
    const matchesRoadmap = !roadmapId || String(resource.roadmapId) === roadmapId
    const matchesNode = !nodeId || String(resource.nodeId) === nodeId
    const matchesSource = !sourceType || (resource.sourceType ?? 'OTHER').toUpperCase() === sourceType
    const matchesStatus =
      !status
      || (status === 'ACTIVE' && resource.active)
      || (status === 'INACTIVE' && !resource.active)

    return matchesText && matchesRoadmap && matchesNode && matchesSource && matchesStatus
  })

  renderNodeResourceRows(filteredResources)
  updateFilterSummary('nodeResourceSummary', nodeResourceItems.length, filteredResources.length)
  updateNodeResourceFilterReadout()
}

async function fetchNodeResources() {
  const tbody = getElement('nodeResourceTableBody')
  tbody.innerHTML = buildLoadingRow(5)

  try {
    const [resources, nodes, roadmaps] = await Promise.all([
      adminApi.getRoadmapNodeResources(),
      adminApi.getRoadmapNodes(),
      adminApi.getOfficialRoadmapOptions(),
    ])
    nodeResourceItems = resources
    nodeItems = nodes
    officialRoadmapOptions = roadmaps
    roadmapNodeMap = new Map(nodeItems.map((node) => [node.nodeId, node]))

    const editingResource = nodeResourceEditingId
      ? nodeResourceItems.find((resource) => resource.resourceId === nodeResourceEditingId) ?? null
      : null

    if (nodeResourceEditingId && !editingResource) {
      nodeResourceEditingId = null
    }

    renderNodeResourceFilterOptions()

    if (editingResource) {
      setNodeResourceForm(editingResource)
    } else {
      renderNodeResourceFormOptions(null, null)
      syncNodeResourceFormState()
      applyNodeResourceFilters()
    }
  } catch (error) {
    tbody.innerHTML = buildErrorRow(5, error instanceof Error ? error.message : '추천 자료를 불러오지 못했습니다.')
    updateFilterSummary('nodeResourceSummary', 0, 0)
  }
}

async function submitNodeResourceForm() {
  const payload = getNodeResourceFormPayload()
  if (!payload) {
    return
  }

  nodeResourceSaving = true
  syncNodeResourceFormState()

  try {
    if (nodeResourceEditingId === null) {
      await adminApi.createRoadmapNodeResource(payload)
      window.alert('추천 자료를 등록했습니다.')
    } else {
      await adminApi.updateRoadmapNodeResource(nodeResourceEditingId, payload)
      window.alert('추천 자료를 수정했습니다.')
    }

    resetNodeResourceForm()
    await fetchNodeResources()
  } finally {
    nodeResourceSaving = false
    syncNodeResourceFormState()
  }
}

async function deleteNodeResourceById(resourceId: number) {
  const resource = nodeResourceItems.find((item) => item.resourceId === resourceId)
  if (!resource) {
    window.alert('삭제할 추천 자료를 찾지 못했습니다.')
    return
  }

  if (!window.confirm(`'${resource.title}' 추천 자료를 삭제하시겠습니까?`)) {
    return
  }

  await adminApi.deleteRoadmapNodeResource(resourceId)
  if (nodeResourceEditingId === resourceId) {
    resetNodeResourceForm()
  }

  await fetchNodeResources()
  window.alert('추천 자료를 삭제했습니다.')
}

function renderNodeRows(nodes: AdminRoadmapNode[]) {
  const tbody = getElement('nodeTableBody')
  tbody.innerHTML = nodes.length
    ? nodes
        .map(
          (node) => `
            <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-5 py-3 align-middle font-mono text-xs whitespace-nowrap text-slate-400">#${node.nodeId}</td>
              <td class="px-5 py-3 align-middle"><div class="truncate font-bold text-slate-800">${escapeHtml(node.title)}</div><div class="mt-1 truncate text-xs text-slate-400">${escapeHtml(node.content || '설명 없음')}</div></td>
              <td class="px-5 py-3 align-middle"><div class="truncate font-medium text-slate-700">${escapeHtml(node.roadmapTitle)}</div><div class="mt-0.5 inline-flex rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-blue-600">${escapeHtml(nodeTypeLabel(node.nodeType))}</div>${renderNodeHubBadges(node)}</td>
              <td class="px-5 py-3 align-middle text-xs text-slate-500"><div class="truncate whitespace-nowrap">${escapeHtml(formatNodeStructure(node))}</div><div class="mt-1 truncate whitespace-nowrap">${escapeHtml(formatNodePrerequisites(node))}</div>${node.subTopics ? `<div class="mt-1 truncate text-[11px] text-slate-400">${escapeHtml(node.subTopics)}</div>` : ''}</td>
              <td class="px-4 py-3 align-middle text-xs whitespace-nowrap text-slate-500"><div>${node.requiredTagCount > 0 ? `필수 태그 ${node.requiredTagCount}개` : '필수 태그 없음'}</div><div class="mt-1">${escapeHtml(node.completionRuleDescription || '완료 기준 없음')}${node.requiredProgressRate !== null ? ` / ${node.requiredProgressRate}%` : ''}</div></td>
              <td class="px-4 py-3 align-middle text-right"><div class="flex flex-nowrap justify-end gap-1"><button onclick="editRoadmapNode(${node.nodeId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">노드 수정</button><button onclick="updateNodePrerequisites(${node.nodeId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">선수 조건</button><button onclick="updateNodeTags(${node.nodeId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">태그 매핑</button><button onclick="updateNodeRules(${node.nodeId})" class="whitespace-nowrap rounded bg-indigo-50 px-2 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800" type="button">완료 기준</button></div></td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(6, '조건에 맞는 노드가 없습니다.')
}

function applyNodeFilters() {
  const keyword = normalizeText(filterState.nodeQuery)
  const roadmapId = filterState.nodeRoadmapId.trim()
  const nodeType = filterState.nodeType.trim().toUpperCase()
  const filteredNodes = nodeItems.filter((node) => {
    const matchesText = matchesKeyword(keyword, [
      node.nodeId,
      node.title,
      node.content,
      node.subTopics,
      node.roadmapTitle,
      node.roadmapId,
    ])
    const matchesHub = matchesNodeHubFilters(node)
    const matchesRoadmap = !roadmapId || String(node.roadmapId) === roadmapId
    const matchesType = !nodeType || (node.nodeType ?? '').toUpperCase() === nodeType

    return matchesText && matchesHub && matchesRoadmap && matchesType
  })

  renderNodeRows(filteredNodes)
  updateFilterSummary('nodeFilterSummary', nodeItems.length, filteredNodes.length)
}

function updateNodeHubFilterOptions() {
  const sectionSelect = document.getElementById('nodeHubSectionFilter') as HTMLSelectElement | null
  const itemSelect = document.getElementById('nodeHubItemFilter') as HTMLSelectElement | null

  if (!sectionSelect || !itemSelect) {
    return
  }

  const sectionKeys = new Set(nodeHubCatalog.sections.map((section) => section.sectionKey))
  if (
    filterState.nodeHubSectionKey
    && filterState.nodeHubSectionKey !== NODE_HUB_UNLINKED_FILTER
    && !sectionKeys.has(filterState.nodeHubSectionKey)
  ) {
    filterState.nodeHubSectionKey = ''
    filterState.nodeHubItemKey = ''
  }

  sectionSelect.innerHTML = [
    '<option value="">전체 허브 분류</option>',
    ...nodeHubCatalog.sections.map((section) => {
      const roadmapIds = getNodeHubSectionRoadmapIds(section.sectionKey)
      return `<option value="${escapeHtml(section.sectionKey)}" ${filterState.nodeHubSectionKey === section.sectionKey ? 'selected' : ''}>${escapeHtml(section.title)} (${formatNumber(roadmapIds.size)})</option>`
    }),
    `<option value="${NODE_HUB_UNLINKED_FILTER}" ${filterState.nodeHubSectionKey === NODE_HUB_UNLINKED_FILTER ? 'selected' : ''}>허브 미연결</option>`,
  ].join('')
  sectionSelect.value = filterState.nodeHubSectionKey

  const linkedItems = nodeHubCatalog.sections
    .filter((section) => !filterState.nodeHubSectionKey || section.sectionKey === filterState.nodeHubSectionKey)
    .flatMap((section) =>
      section.items
        .filter((item) => item.linkedRoadmapId !== null && item.linkedRoadmapId !== undefined)
        .map((item) => ({ section, item, itemKey: buildNodeHubItemKey(section.sectionKey, item) })),
    )
  const itemKeys = new Set(linkedItems.map((item) => item.itemKey))

  if (filterState.nodeHubItemKey && !itemKeys.has(filterState.nodeHubItemKey)) {
    filterState.nodeHubItemKey = ''
  }

  itemSelect.disabled = filterState.nodeHubSectionKey === NODE_HUB_UNLINKED_FILTER
  itemSelect.innerHTML = [
    '<option value="">전체 허브 항목</option>',
    ...linkedItems.map(
      ({ section, item, itemKey }) => `
        <option value="${escapeHtml(itemKey)}" ${filterState.nodeHubItemKey === itemKey ? 'selected' : ''}>
          ${escapeHtml(section.title)} > ${escapeHtml(item.title)}
        </option>`,
    ),
  ].join('')
  itemSelect.value = filterState.nodeHubItemKey
}

function updateNodeRoadmapFilterOptions() {
  const select = document.getElementById('nodeRoadmapFilter') as HTMLSelectElement | null
  if (!select) {
    return
  }

  const filteredRoadmapIds = getNodeHubFilteredRoadmapIds()
  const availableRoadmaps = filteredRoadmapIds
    ? officialRoadmapOptions.filter((roadmap) => filteredRoadmapIds.has(roadmap.roadmapId))
    : officialRoadmapOptions
  const roadmapIds = new Set(availableRoadmaps.map((roadmap) => String(roadmap.roadmapId)))
  if (filterState.nodeRoadmapId && !roadmapIds.has(filterState.nodeRoadmapId)) {
    filterState.nodeRoadmapId = ''
  }

  select.innerHTML = [
    '<option value="">전체 로드맵</option>',
    ...availableRoadmaps.map(
      (roadmap) => `<option value="${roadmap.roadmapId}" ${filterState.nodeRoadmapId === String(roadmap.roadmapId) ? 'selected' : ''}>${escapeHtml(roadmap.title)}</option>`,
    ),
  ].join('')
  select.value = filterState.nodeRoadmapId
}

function updateNodeHubQuickFilters() {
  const container = document.getElementById('nodeHubQuickFilters')
  if (!container) {
    return
  }

  const makeButtonClass = (active: boolean) =>
    active
      ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm'
      : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-800'
  const countNodesByRoadmapIds = (roadmapIds: Set<number>) =>
    nodeItems.filter((node) => roadmapIds.has(node.roadmapId)).length
  const unlinkedCount = nodeItems.filter((node) => getNodeHubEntries(node.roadmapId).length === 0).length

  container.innerHTML = [
    `<button data-node-hub-section="" class="${makeButtonClass(!filterState.nodeHubSectionKey)}" type="button">전체 ${formatNumber(nodeItems.length)}</button>`,
    ...nodeHubCatalog.sections.map((section) => {
      const count = countNodesByRoadmapIds(getNodeHubSectionRoadmapIds(section.sectionKey))
      return `<button data-node-hub-section="${escapeHtml(section.sectionKey)}" class="${makeButtonClass(filterState.nodeHubSectionKey === section.sectionKey)}" type="button">${escapeHtml(section.title)} ${formatNumber(count)}</button>`
    }),
    `<button data-node-hub-section="${NODE_HUB_UNLINKED_FILTER}" class="${makeButtonClass(filterState.nodeHubSectionKey === NODE_HUB_UNLINKED_FILTER)}" type="button">허브 미연결 ${formatNumber(unlinkedCount)}</button>`,
  ].join('')

  container.querySelectorAll<HTMLButtonElement>('button[data-node-hub-section]').forEach((button) => {
    button.addEventListener('click', () => {
      filterState.nodeHubSectionKey = button.dataset.nodeHubSection ?? ''
      filterState.nodeHubItemKey = ''
      filterState.nodeRoadmapId = ''
      updateNodeFilterControls()
      applyNodeFilters()
    })
  })
}

function updateNodeFilterControls() {
  updateNodeHubFilterOptions()
  updateNodeRoadmapFilterOptions()
  updateNodeHubQuickFilters()
}

async function fetchNodes() {
  const tbody = getElement('nodeTableBody')
  tbody.innerHTML = buildLoadingRow(6)

  try {
    const [nodes, roadmaps, hubCatalog] = await Promise.all([
      adminApi.getRoadmapNodes(),
      adminApi.getOfficialRoadmapOptions(),
      adminApi.getRoadmapHubCatalog(),
    ])
    nodeItems = nodes
    officialRoadmapOptions = roadmaps
    nodeHubCatalog = hubCatalog
    rebuildNodeHubIndex()
    roadmapNodeMap = new Map(nodeItems.map((node) => [node.nodeId, node]))
    updateNodeFilterControls()
    applyNodeFilters()
  } catch (error) {
    tbody.innerHTML = buildErrorRow(6, error instanceof Error ? error.message : '노드를 불러오지 못했습니다.')
    updateFilterSummary('nodeFilterSummary', 0, 0)
  }
}

function renderAccountRows(accounts: AdminAccount[]) {
  const tbody = getElement('accountTableBody')
  tbody.innerHTML = accounts.length
    ? accounts
        .map(
          (account) => `
            <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-6 py-3 font-mono text-xs text-slate-400">#${account.userId}</td>
              <td class="px-6 py-3 font-medium text-slate-600">${escapeHtml(account.email)}</td>
              <td class="px-6 py-3 font-bold text-slate-800">${escapeHtml(account.nickname)}</td>
              <td class="px-6 py-3"><span class="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${roleBadgeClassName(account.role)}">${escapeHtml(roleLabel(account.role))}</span></td>
              <td class="px-6 py-3"><span class="${account.accountStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'} text-xs font-bold"><i class="fas fa-circle mr-1 text-[8px]"></i>${escapeHtml(accountStatusLabel(account.accountStatus))}</span></td>
              <td class="px-6 py-3 text-right"><button onclick="toggleAccountStatus(${account.userId}, '${escapeHtml(account.accountStatus || 'INACTIVE')}')" class="rounded ${account.accountStatus === 'ACTIVE' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800'} px-3 py-1.5 text-xs font-medium transition" type="button">${account.accountStatus === 'ACTIVE' ? '제한' : '복구'}</button></td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(6, '조건에 맞는 계정이 없습니다.')
}

function applyAccountFilters() {
  const keyword = normalizeText(filterState.accountQuery)
  const role = filterState.accountRole.trim().toUpperCase()
  const status = filterState.accountStatus.trim().toUpperCase()
  const filteredAccounts = accountItems.filter((account) => {
    const matchesText = matchesKeyword(keyword, [account.userId, account.email, account.nickname])
    const matchesRole = !role || account.role.toUpperCase() === role
    const matchesStatus = !status || (account.accountStatus ?? 'UNKNOWN').toUpperCase() === status

    return matchesText && matchesRole && matchesStatus
  })

  renderAccountRows(filteredAccounts)
  updateFilterSummary('accountFilterSummary', accountItems.length, filteredAccounts.length)
}

async function fetchAccounts() {
  const tbody = getElement('accountTableBody')
  tbody.innerHTML = buildLoadingRow(6)

  try {
    accountItems = await adminApi.getAccounts()
    applyAccountFilters()
  } catch (error) {
    tbody.innerHTML = buildErrorRow(6, error instanceof Error ? error.message : '계정을 불러오지 못했습니다.')
    updateFilterSummary('accountFilterSummary', 0, 0)
  }
}

async function fetchPendingCourses() {
  const tbody = getElement('courseTableBody')
  tbody.innerHTML = buildLoadingRow(3, '강의 검수 목록을 불러오는 중입니다...')

  try {
    const courses = await adminApi.getPendingCourses()
    tbody.innerHTML = courses.length
      ? courses
          .map(
            (course: AdminPendingCourse) => `
              <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                <td class="px-6 py-3"><div class="font-bold text-slate-800">${escapeHtml(course.title)}</div><div class="mt-0.5 font-mono text-[10px] text-slate-400">ID: #${course.courseId}</div></td>
                <td class="px-6 py-3 text-xs font-medium text-slate-600">${escapeHtml(course.instructorName || `강사 #${course.instructorId}`)}<div class="mt-1 text-[10px] text-slate-400">${escapeHtml(formatDateTime(course.submittedAt))}</div></td>
                <td class="space-x-1 px-6 py-3 text-right"><button onclick="approveCourse(${course.courseId})" class="rounded bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700" type="button">승인</button><button onclick="rejectCourse(${course.courseId})" class="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">반려</button></td>
              </tr>`,
          )
          .join('')
      : buildEmptyRow(3, '검수 대기 중인 강의가 없습니다.')
  } catch (error) {
    tbody.innerHTML = buildErrorRow(3, error instanceof Error ? error.message : '강의 검수 목록을 불러오지 못했습니다.')
  }
}

async function fetchReports() {
  const tbody = getElement('reportTableBody')
  tbody.innerHTML = buildLoadingRow(3, '신고 목록을 불러오는 중입니다...')

  try {
    const reports = await adminApi.getReports()
    reportMap = new Map(reports.map((report) => [report.reportId, report]))
    tbody.innerHTML = reports.length
      ? reports
          .map((report: AdminModerationReport) => {
            const blindAction = report.contentId
              ? `<button onclick="blindContent(${report.reportId})" class="rounded bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 hover:text-rose-800" type="button">블라인드</button>`
              : '<span class="px-3 py-1.5 text-xs text-slate-300">콘텐츠 없음</span>'

            const contentContext = reportContentContext(report)
            const contentContextRow = contentContext
              ? `<div class="mt-1 text-[11px] leading-5 text-slate-400">${escapeHtml(contentContext)}</div>`
              : ''

            return `
              <tr class="border-b border-slate-100 transition-colors hover:bg-rose-50/40">
                <td class="px-6 py-3">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">${escapeHtml(reportTargetLabel(report))}</span>
                    <span class="font-mono text-[10px] text-slate-400">신고 #${report.reportId}</span>
                  </div>
                  <div class="mt-1 text-xs font-semibold text-slate-700">${escapeHtml(reportTargetSummary(report))}</div>
                  <div class="mt-1 text-[11px] text-slate-500">신고자 ${escapeHtml(reportReporterSummary(report))}</div>
                  ${contentContextRow}
                  <div class="mt-1 text-[10px] text-slate-400">${escapeHtml(formatDateTime(report.createdAt))}</div>
                </td>
                <td class="px-6 py-3 text-xs font-medium leading-5 text-slate-800">${escapeHtml(report.reason)}</td>
                <td class="space-x-1 px-6 py-3 text-right">
                  ${blindAction}
                  <button onclick="resolveReport(${report.reportId})" class="rounded px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" type="button">무시</button>
                </td>
              </tr>`
          })
          .join('')
      : buildEmptyRow(3, '접수된 신고가 없습니다.')
  } catch (error) {
    tbody.innerHTML = buildErrorRow(3, error instanceof Error ? error.message : '신고 목록을 불러오지 못했습니다.')
  }
}

function cloneCourseCatalogMenu(menu: CourseCatalogMenu): CourseCatalogMenu {
  return {
    categories: menu.categories.map((category) => ({
      ...category,
      megaMenuItems: category.megaMenuItems.map((item) => ({ ...item })),
      groups: category.groups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({ ...item })),
      })),
    })),
  }
}

// 배열 순서를 화면 표시 순서와 저장 순서로 그대로 맞춘다.
function reindexCourseCatalogMenu(menu: CourseCatalogMenu): CourseCatalogMenu {
  const categories = [...(menu.categories ?? [])]
    .map((category, categoryIndex) => ({
      ...category,
      sortOrder: categoryIndex,
      megaMenuItems: [...(category.megaMenuItems ?? [])]
        .map((item, itemIndex) => ({
          ...item,
          label: item.label ?? '',
          sortOrder: itemIndex,
        })),
      groups: [...(category.groups ?? [])]
        .map((group, groupIndex) => ({
          ...group,
          name: group.name ?? '',
          sortOrder: groupIndex,
          items: [...(group.items ?? [])]
            .map((item, itemIndex) => ({
              ...item,
              name: item.name ?? '',
              linkedCategoryKey: item.linkedCategoryKey ?? null,
              sortOrder: itemIndex,
            })),
        })),
    }))

  return { categories }
}

function createEmptyCatalogMegaMenuItem(): CourseCatalogMegaMenuItem {
  return { label: '', sortOrder: 0 }
}

function createEmptyCatalogGroupItem(): CourseCatalogGroupItem {
  return { name: '', linkedCategoryKey: null, sortOrder: 0 }
}

function createEmptyCatalogGroup(): CourseCatalogGroup {
  return { name: '', sortOrder: 0, items: [createEmptyCatalogGroupItem()] }
}

function createEmptyCatalogCategory(nextIndex: number): CourseCatalogCategory {
  return {
    categoryKey: `category-${nextIndex + 1}`,
    label: '새 카테고리',
    title: '새 강의 목록',
    iconClass: 'fas fa-folder',
    sortOrder: nextIndex,
    active: true,
    megaMenuItems: [createEmptyCatalogMegaMenuItem()],
    groups: [createEmptyCatalogGroup()],
  }
}

function moveArrayItem<T>(items: T[], index: number, direction: number) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= items.length) {
    return
  }

  const [movedItem] = items.splice(index, 1)
  items.splice(nextIndex, 0, movedItem)
}

function getCatalogCategoryCollapseKey(category: CourseCatalogCategory, categoryIndex: number) {
  return String(category.categoryKey ?? '').trim() || `category-index-${categoryIndex}`
}

function getRoadmapHubSectionCollapseKey(section: RoadmapHubSection, sectionIndex: number) {
  return String(section.sectionKey ?? '').trim() || `roadmap-hub-section-index-${sectionIndex}`
}

function buildCollapsedKeySet<T>(items: T[], getKey: (item: T, index: number) => string) {
  return new Set(items.map((item, index) => getKey(item, index)))
}

function setAllCatalogCategoriesCollapsed(collapsed: boolean) {
  collapsedCatalogCategoryKeys = collapsed
    ? buildCollapsedKeySet(courseCatalogMenu.categories, getCatalogCategoryCollapseKey)
    : new Set<string>()
  renderCourseCatalogMenuEditor()
}

function toggleCatalogCategoryCollapsed(categoryIndex: number) {
  const category = courseCatalogMenu.categories[categoryIndex]
  if (!category) {
    return
  }

  const categoryKey = getCatalogCategoryCollapseKey(category, categoryIndex)
  if (collapsedCatalogCategoryKeys.has(categoryKey)) {
    collapsedCatalogCategoryKeys.delete(categoryKey)
  } else {
    collapsedCatalogCategoryKeys.add(categoryKey)
  }
  renderCourseCatalogMenuEditor()
}

function setAllRoadmapHubSectionsCollapsed(collapsed: boolean) {
  collapsedRoadmapHubSectionKeys = collapsed
    ? buildCollapsedKeySet(roadmapHubCatalog.sections, getRoadmapHubSectionCollapseKey)
    : new Set<string>()
  renderRoadmapHubEditor()
}

function toggleRoadmapHubSectionCollapsed(sectionIndex: number) {
  const section = roadmapHubCatalog.sections[sectionIndex]
  if (!section) {
    return
  }

  const sectionKey = getRoadmapHubSectionCollapseKey(section, sectionIndex)
  if (collapsedRoadmapHubSectionKeys.has(sectionKey)) {
    collapsedRoadmapHubSectionKeys.delete(sectionKey)
  } else {
    collapsedRoadmapHubSectionKeys.add(sectionKey)
  }
  renderRoadmapHubEditor()
}

function updateCatalogMenu(mutator: (menu: CourseCatalogMenu) => void) {
  const nextMenu = cloneCourseCatalogMenu(courseCatalogMenu)
  mutator(nextMenu)
  courseCatalogMenu = reindexCourseCatalogMenu(nextMenu)
  courseCatalogMenuError = null
  renderCourseCatalogMenuEditor()
}

function updateCatalogMenuSaveButton() {
  const button = document.getElementById('catalogMenuSaveButton') as HTMLButtonElement | null
  if (!button) {
    return
  }

  button.disabled = courseCatalogMenuSaving
  button.classList.toggle('opacity-70', courseCatalogMenuSaving)
  button.classList.toggle('cursor-not-allowed', courseCatalogMenuSaving)
  button.innerHTML = courseCatalogMenuSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : '<i class="fas fa-save mr-1"></i> 전체 저장'
}

function updateCatalogMenuSummary() {
  const summaryElement = document.getElementById('catalogMenuSummary')
  if (!summaryElement) {
    return
  }

  const categoryCount = courseCatalogMenu.categories.length
  const groupCount = courseCatalogMenu.categories.reduce((sum, category) => sum + category.groups.length, 0)
  const itemCount = courseCatalogMenu.categories.reduce(
    (sum, category) => sum + category.groups.reduce((groupSum, group) => groupSum + group.items.length, 0),
    0,
  )
  summaryElement.textContent = `카테고리 ${formatNumber(categoryCount)}개 · 그룹 ${formatNumber(groupCount)}개 · 항목 ${formatNumber(itemCount)}개`
}

function renderCourseCatalogMenuEditor() {
  const container = getElement('catalogMenuEditor')
  updateCatalogMenuSaveButton()
  updateCatalogMenuSummary()

  if (courseCatalogMenuLoading) {
    container.innerHTML = `
      <div class="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
        <i class="fas fa-circle-notch fa-spin mr-2"></i> 강의 메뉴를 불러오는 중입니다.
      </div>
    `
    return
  }

  if (courseCatalogMenuError) {
    container.innerHTML = `
      <div class="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-600">
        <div class="font-semibold">${escapeHtml(courseCatalogMenuError)}</div>
        <button onclick="refreshCurrentTab()" class="mt-4 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50" type="button">
          다시 불러오기
        </button>
      </div>
    `
    return
  }

  if (courseCatalogMenu.categories.length === 0) {
    container.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        등록된 강의 메뉴가 없습니다.
      </div>
    `
    return
  }

  container.innerHTML = courseCatalogMenu.categories
    .map((category, categoryIndex) => renderCatalogCategoryCard(category, categoryIndex))
    .join('')
}

function renderCatalogCategoryCard(category: CourseCatalogCategory, categoryIndex: number) {
  const categoryKey = getCatalogCategoryCollapseKey(category, categoryIndex)
  const collapsed = collapsedCatalogCategoryKeys.has(categoryKey)
  const filterItemCount = category.groups.reduce((sum, group) => sum + group.items.length, 0)
  const summaryBadgesHtml = `
    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">메가메뉴 ${formatNumber(category.megaMenuItems.length)}개</span>
    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">그룹 ${formatNumber(category.groups.length)}개</span>
    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">필터 ${formatNumber(filterItemCount)}개</span>
  `

  let categoryBodyHtml = ''
  if (!collapsed) {
    const groupsHtml = category.groups.length
      ? category.groups.map((group, groupIndex) => renderCatalogGroupCard(categoryIndex, group, groupIndex)).join('')
      : `
        <div class="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400">
          등록된 그룹이 없습니다.
        </div>
      `

    const megaMenuHtml = category.megaMenuItems.length
      ? category.megaMenuItems
          .map(
            (item, itemIndex) => `
              <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <input
                  value="${escapeHtml(item.label)}"
                  oninput="updateCatalogMegaMenuItemLabel(${categoryIndex}, ${itemIndex}, this.value)"
                  type="text"
                  class="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                  placeholder="메가메뉴 라벨"
                />
                <div class="flex items-center gap-1 text-slate-400">
                  <button onclick="moveCatalogMegaMenuItem(${categoryIndex}, ${itemIndex}, -1)" class="rounded p-1 transition hover:bg-slate-100 hover:text-slate-700" type="button">
                    <i class="fas fa-arrow-up text-xs"></i>
                  </button>
                  <button onclick="moveCatalogMegaMenuItem(${categoryIndex}, ${itemIndex}, 1)" class="rounded p-1 transition hover:bg-slate-100 hover:text-slate-700" type="button">
                    <i class="fas fa-arrow-down text-xs"></i>
                  </button>
                  <button onclick="removeCatalogMegaMenuItem(${categoryIndex}, ${itemIndex})" class="rounded p-1 transition hover:bg-rose-50 hover:text-rose-600" type="button">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>`,
          )
          .join('')
      : `
        <div class="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400">
          등록된 메가메뉴 항목이 없습니다.
        </div>
      `

    categoryBodyHtml = `
      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">key</span>
          <input
            value="${escapeHtml(category.categoryKey)}"
            oninput="updateCatalogCategoryField(${categoryIndex}, 'categoryKey', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: dev"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">라벨</span>
          <input
            value="${escapeHtml(category.label)}"
            oninput="updateCatalogCategoryField(${categoryIndex}, 'label', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 개발"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">타이틀</span>
          <input
            value="${escapeHtml(category.title)}"
            oninput="updateCatalogCategoryField(${categoryIndex}, 'title', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 개발 강의"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">아이콘 클래스</span>
          <input
            value="${escapeHtml(category.iconClass)}"
            oninput="updateCatalogCategoryField(${categoryIndex}, 'iconClass', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: fas fa-laptop-code"
          />
        </label>
        <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            ${category.active ? 'checked' : ''}
            onchange="updateCatalogCategoryActive(${categoryIndex}, this.checked)"
            type="checkbox"
            class="h-4 w-4 accent-indigo-600"
          />
          <span class="text-sm font-medium text-slate-700">공개 메뉴에서 사용</span>
        </label>
      </div>

      <div class="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-bold text-slate-800">메가메뉴 항목</h4>
            <button onclick="addCatalogMegaMenuItem(${categoryIndex})" class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50" type="button">
              <i class="fas fa-plus mr-1"></i> 항목 추가
            </button>
          </div>
          <div class="space-y-2">${megaMenuHtml}</div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-bold text-slate-800">필터 그룹</h4>
            <button onclick="addCatalogGroup(${categoryIndex})" class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50" type="button">
              <i class="fas fa-plus mr-1"></i> 그룹 추가
            </button>
          </div>
          <div class="space-y-4">${groupsHtml}</div>
        </div>
      </div>
    `
  }

  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 ${collapsed ? '' : 'border-b border-slate-100 pb-5'} xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">카테고리 ${categoryIndex + 1}</span>
            <span class="rounded-full px-2.5 py-1 text-[11px] font-bold ${category.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${category.active ? '활성' : '비활성'}</span>
            ${summaryBadgesHtml}
          </div>
          <h3 class="mt-3 text-lg font-bold text-slate-900">${escapeHtml(category.label || '새 카테고리')}</h3>
          <p class="mt-1 text-xs text-slate-500">key: ${escapeHtml(category.categoryKey || '-')}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="toggleCatalogCategoryCollapsed(${categoryIndex})" aria-expanded="${!collapsed}" class="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100" type="button">
            <i class="fas ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'} mr-1"></i> ${collapsed ? '펼치기' : '접기'}
          </button>
          <button onclick="moveCatalogCategory(${categoryIndex}, -1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up mr-1"></i> 위로
          </button>
          <button onclick="moveCatalogCategory(${categoryIndex}, 1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down mr-1"></i> 아래로
          </button>
          <button onclick="deleteCatalogCategory(${categoryIndex})" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100" type="button">
            <i class="fas fa-trash mr-1"></i> 삭제
          </button>
        </div>
      </div>
      ${categoryBodyHtml}
    </section>
  `
}

function buildCatalogCategoryOptions(selectedValue: string | null) {
  const normalizedValue = selectedValue ?? ''

  return [
    `<option value="">직접 텍스트 필터</option>`,
    ...courseCatalogMenu.categories.map(
      (category) => `
        <option value="${escapeHtml(category.categoryKey)}" ${normalizedValue === category.categoryKey ? 'selected' : ''}>
          ${escapeHtml(category.label)} (${escapeHtml(category.categoryKey)})
        </option>`,
    ),
  ].join('')
}

function renderCatalogGroupCard(categoryIndex: number, group: CourseCatalogGroup, groupIndex: number) {
  const itemsHtml = group.items.length
    ? group.items.map((item, itemIndex) => renderCatalogGroupItemRow(categoryIndex, groupIndex, item, itemIndex)).join('')
    : `
      <div class="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400">
        등록된 필터 항목이 없습니다.
      </div>
    `

  return `
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">그룹 ${groupIndex + 1}</span>
          <input
            value="${escapeHtml(group.name)}"
            oninput="updateCatalogGroupField(${categoryIndex}, ${groupIndex}, 'name', this.value)"
            type="text"
            class="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 언어 (Language)"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="moveCatalogGroup(${categoryIndex}, ${groupIndex}, -1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up mr-1"></i> 위로
          </button>
          <button onclick="moveCatalogGroup(${categoryIndex}, ${groupIndex}, 1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down mr-1"></i> 아래로
          </button>
          <button onclick="addCatalogGroupItem(${categoryIndex}, ${groupIndex})" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50" type="button">
            <i class="fas fa-plus mr-1"></i> 항목 추가
          </button>
          <button onclick="removeCatalogGroup(${categoryIndex}, ${groupIndex})" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100" type="button">
            <i class="fas fa-trash mr-1"></i> 그룹 삭제
          </button>
        </div>
      </div>

      <div class="mt-4 space-y-3">${itemsHtml}</div>
    </div>
  `
}

function renderCatalogGroupItemRow(
  categoryIndex: number,
  groupIndex: number,
  item: CourseCatalogGroupItem,
  itemIndex: number,
) {
  return `
    <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px_auto]">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">항목명</span>
          <input
            value="${escapeHtml(item.name)}"
            oninput="updateCatalogGroupItemField(${categoryIndex}, ${groupIndex}, ${itemIndex}, 'name', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: Java"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">연결 카테고리</span>
          <select
            onchange="updateCatalogGroupItemField(${categoryIndex}, ${groupIndex}, ${itemIndex}, 'linkedCategoryKey', this.value)"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            ${buildCatalogCategoryOptions(item.linkedCategoryKey)}
          </select>
        </label>
        <div class="flex items-end justify-end gap-1 text-slate-400">
          <button onclick="moveCatalogGroupItem(${categoryIndex}, ${groupIndex}, ${itemIndex}, -1)" class="rounded p-2 transition hover:bg-white hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up text-xs"></i>
          </button>
          <button onclick="moveCatalogGroupItem(${categoryIndex}, ${groupIndex}, ${itemIndex}, 1)" class="rounded p-2 transition hover:bg-white hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down text-xs"></i>
          </button>
          <button onclick="removeCatalogGroupItem(${categoryIndex}, ${groupIndex}, ${itemIndex})" class="rounded p-2 transition hover:bg-rose-50 hover:text-rose-600" type="button">
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      </div>
      <p class="mt-2 text-[11px] text-slate-400">
        연결 카테고리를 지정하면 상위 메뉴에서 해당 카테고리 필터로 바로 연결됩니다.
      </p>
    </div>
  `
}

async function fetchCourseCatalogMenu() {
  courseCatalogMenuLoading = true
  courseCatalogMenuError = null
  renderCourseCatalogMenuEditor()

  try {
    const response = await adminApi.getCourseCatalogMenu()
    courseCatalogMenu = reindexCourseCatalogMenu(response)
    collapsedCatalogCategoryKeys = buildCollapsedKeySet(courseCatalogMenu.categories, getCatalogCategoryCollapseKey)
  } catch (error) {
    courseCatalogMenuError = error instanceof Error ? error.message : '강의 메뉴를 불러오지 못했습니다.'
  } finally {
    courseCatalogMenuLoading = false
    renderCourseCatalogMenuEditor()
  }
}

async function saveCourseCatalogMenu() {
  if (courseCatalogMenu.categories.length === 0) {
    window.alert('최소 한 개 이상의 카테고리가 필요합니다.')
    return
  }

  courseCatalogMenuSaving = true
  renderCourseCatalogMenuEditor()

  try {
    const savedMenu = await adminApi.updateCourseCatalogMenu(reindexCourseCatalogMenu(courseCatalogMenu))
    courseCatalogMenu = reindexCourseCatalogMenu(savedMenu)
    courseCatalogMenuError = null
    renderCourseCatalogMenuEditor()
    window.alert('강의 메뉴를 저장했습니다.')
  } catch (error) {
    courseCatalogMenuError = error instanceof Error ? error.message : '강의 메뉴를 저장하지 못했습니다.'
    renderCourseCatalogMenuEditor()
    window.alert(courseCatalogMenuError)
  } finally {
    courseCatalogMenuSaving = false
    renderCourseCatalogMenuEditor()
  }
}

function cloneRoadmapHubCatalog(catalog: AdminRoadmapHubCatalog): AdminRoadmapHubCatalog {
  return {
    sections: catalog.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({ ...item })),
    })),
    officialRoadmaps: catalog.officialRoadmaps.map((roadmap) => ({ ...roadmap })),
  }
}

// 로드맵 허브 섹션과 항목 순서를 화면 표시 순서와 저장 순서로 맞춘다.
function reindexRoadmapHubSections(sections: RoadmapHubSection[]): RoadmapHubSection[] {
  return [...(sections ?? [])].map((section, sectionIndex) => ({
    ...section,
    sectionKey: section.sectionKey ?? `section-${sectionIndex + 1}`,
    title: section.title ?? '',
    description: section.description ?? null,
    layoutType: section.layoutType ?? 'CARD_GRID',
    sortOrder: sectionIndex,
    active: section.active ?? true,
    items: [...(section.items ?? [])].map((item, itemIndex) => ({
      ...item,
      title: item.title ?? '',
      subtitle: item.subtitle ?? null,
      category: item.category ?? null,
      iconClass: item.iconClass ?? null,
      iconColor: item.iconColor ?? null,
      sortOrder: itemIndex,
      active: item.active ?? true,
      featured: item.featured ?? false,
      linkedRoadmapId: item.linkedRoadmapId ?? null,
      linkedRoadmapTitle: item.linkedRoadmapTitle ?? null,
    })),
  }))
}

function createEmptyRoadmapHubItem(layoutType: string): RoadmapHubItem {
  return {
    title: '',
    subtitle: layoutType === 'CARD_GRID' ? '공식 로드맵' : null,
    category: null,
    iconClass: layoutType === 'CARD_GRID' ? 'fas fa-map' : null,
    iconColor: layoutType === 'CARD_GRID' ? '#64748B' : null,
    sortOrder: 0,
    active: true,
    featured: false,
    linkedRoadmapId: null,
    linkedRoadmapTitle: null,
  }
}

function createEmptyRoadmapHubSection(nextIndex: number): RoadmapHubSection {
  return {
    sectionKey: `section-${nextIndex + 1}`,
    title: '새 로드맵 섹션',
    description: null,
    layoutType: 'CARD_GRID',
    sortOrder: nextIndex,
    active: true,
    items: [createEmptyRoadmapHubItem('CARD_GRID')],
  }
}

function updateRoadmapHubCatalog(mutator: (catalog: AdminRoadmapHubCatalog) => void) {
  const nextCatalog = cloneRoadmapHubCatalog(roadmapHubCatalog)
  mutator(nextCatalog)
  roadmapHubCatalog = {
    ...nextCatalog,
    sections: reindexRoadmapHubSections(nextCatalog.sections),
  }
  roadmapHubError = null
  renderRoadmapHubEditor()
}

function updateRoadmapHubSaveButton() {
  const button = document.getElementById('roadmapHubSaveButton') as HTMLButtonElement | null
  if (!button) {
    return
  }

  button.disabled = roadmapHubSaving
  button.classList.toggle('opacity-70', roadmapHubSaving)
  button.classList.toggle('cursor-not-allowed', roadmapHubSaving)
  button.innerHTML = roadmapHubSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : '<i class="fas fa-save mr-1"></i> 전체 저장'
}

function updateRoadmapHubSummary() {
  const summaryElement = document.getElementById('roadmapHubSummary')
  if (!summaryElement) {
    return
  }

  const sectionCount = roadmapHubCatalog.sections.length
  const itemCount = roadmapHubCatalog.sections.reduce((sum, section) => sum + section.items.length, 0)
  summaryElement.textContent = `섹션 ${formatNumber(sectionCount)}개 · 항목 ${formatNumber(itemCount)}개`
}

function hasRoadmapHubFilter() {
  return Boolean(
    roadmapHubFilterState.query.trim()
      || roadmapHubFilterState.sectionKey
      || roadmapHubFilterState.layoutType
      || roadmapHubFilterState.status
      || roadmapHubFilterState.featured
      || roadmapHubFilterState.linked
      || roadmapHubFilterState.linkedRoadmapId,
  )
}

function matchesRoadmapHubItem(section: RoadmapHubSection, item: RoadmapHubItem) {
  const keyword = normalizeText(roadmapHubFilterState.query)
  const matchesText = matchesKeyword(keyword, [
    section.sectionKey,
    section.title,
    section.description,
    item.title,
    item.subtitle,
    item.category,
    item.iconClass,
    item.iconColor,
    item.linkedRoadmapId,
    item.linkedRoadmapTitle,
  ])
  const matchesStatus =
    !roadmapHubFilterState.status
    || (roadmapHubFilterState.status === 'ACTIVE' && item.active)
    || (roadmapHubFilterState.status === 'INACTIVE' && !item.active)
  const matchesFeatured =
    !roadmapHubFilterState.featured
    || (roadmapHubFilterState.featured === 'FEATURED' && item.featured)
    || (roadmapHubFilterState.featured === 'NORMAL' && !item.featured)
  const hasLinkedRoadmap = item.linkedRoadmapId !== null && item.linkedRoadmapId !== undefined
  const matchesLinked =
    !roadmapHubFilterState.linked
    || (roadmapHubFilterState.linked === 'LINKED' && hasLinkedRoadmap)
    || (roadmapHubFilterState.linked === 'UNLINKED' && !hasLinkedRoadmap)
  const matchesLinkedRoadmap =
    !roadmapHubFilterState.linkedRoadmapId
    || String(item.linkedRoadmapId ?? '') === roadmapHubFilterState.linkedRoadmapId

  return matchesText && matchesStatus && matchesFeatured && matchesLinked && matchesLinkedRoadmap
}

function getRoadmapHubFilterResult() {
  const visibleSections: RoadmapHubVisibleSection[] = []
  let totalItemCount = 0
  let visibleItemCount = 0
  const filtered = hasRoadmapHubFilter()
  const sectionOnlySelected = Boolean(
    (roadmapHubFilterState.sectionKey || roadmapHubFilterState.layoutType)
      && !roadmapHubFilterState.query.trim()
      && !roadmapHubFilterState.status
      && !roadmapHubFilterState.featured
      && !roadmapHubFilterState.linked
      && !roadmapHubFilterState.linkedRoadmapId,
  )

  roadmapHubCatalog.sections.forEach((section, sectionIndex) => {
    if (roadmapHubFilterState.sectionKey && section.sectionKey !== roadmapHubFilterState.sectionKey) {
      return
    }

    if (roadmapHubFilterState.layoutType && section.layoutType !== roadmapHubFilterState.layoutType) {
      return
    }

    const visibleItems = section.items
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item }) => matchesRoadmapHubItem(section, item))

    totalItemCount += section.items.length
    visibleItemCount += visibleItems.length

    if (!filtered || visibleItems.length > 0 || sectionOnlySelected) {
      visibleSections.push({ section, sectionIndex, visibleItems })
    }
  })

  return {
    filtered,
    totalItemCount,
    visibleItemCount,
    visibleSections,
  }
}

function updateRoadmapHubFilterSummary(totalItemCount: number, visibleItemCount: number, filtered: boolean) {
  const summaryElement = document.getElementById('roadmapHubFilterSummary')
  if (!summaryElement) {
    return
  }

  summaryElement.textContent = filtered
    ? `조건에 맞는 항목 ${formatNumber(visibleItemCount)}개 / 대상 ${formatNumber(totalItemCount)}개`
    : `전체 항목 ${formatNumber(totalItemCount)}개`
}

function updateRoadmapHubSectionFilterOptions() {
  const select = document.getElementById('roadmapHubSectionFilter') as HTMLSelectElement | null
  if (!select) {
    return
  }

  const sectionKeys = new Set(roadmapHubCatalog.sections.map((section) => section.sectionKey))
  if (roadmapHubFilterState.sectionKey && !sectionKeys.has(roadmapHubFilterState.sectionKey)) {
    roadmapHubFilterState.sectionKey = ''
  }

  select.innerHTML = [
    '<option value="">전체 섹션</option>',
    ...roadmapHubCatalog.sections.map(
      (section) => `
        <option value="${escapeHtml(section.sectionKey)}" ${roadmapHubFilterState.sectionKey === section.sectionKey ? 'selected' : ''}>
          ${escapeHtml(section.title)} (${escapeHtml(section.sectionKey)})
        </option>`,
    ),
  ].join('')
  select.value = roadmapHubFilterState.sectionKey
}

function updateRoadmapHubRoadmapFilterOptions() {
  const select = document.getElementById('roadmapHubRoadmapFilter') as HTMLSelectElement | null
  if (!select) {
    return
  }

  const linkedRoadmapById = new Map<number, string>()
  roadmapHubCatalog.sections.forEach((section) => {
    section.items.forEach((item) => {
      if (item.linkedRoadmapId !== null && item.linkedRoadmapId !== undefined) {
        linkedRoadmapById.set(item.linkedRoadmapId, item.linkedRoadmapTitle ?? `로드맵 #${item.linkedRoadmapId}`)
      }
    })
  })

  if (roadmapHubFilterState.linkedRoadmapId && !linkedRoadmapById.has(Number(roadmapHubFilterState.linkedRoadmapId))) {
    roadmapHubFilterState.linkedRoadmapId = ''
  }

  select.innerHTML = [
    '<option value="">전체 연결 로드맵</option>',
    ...Array.from(linkedRoadmapById.entries())
      .sort(([, leftTitle], [, rightTitle]) => leftTitle.localeCompare(rightTitle, 'ko'))
      .map(
        ([roadmapId, title]) =>
          `<option value="${roadmapId}" ${roadmapHubFilterState.linkedRoadmapId === String(roadmapId) ? 'selected' : ''}>${escapeHtml(title)}</option>`,
      ),
  ].join('')
  select.value = roadmapHubFilterState.linkedRoadmapId
}

function buildRoadmapHubLayoutOptions(selectedValue: string) {
  return [
    ['CARD_GRID', '카드 그리드'],
    ['CHIP_GRID', '칩 그리드'],
    ['LINK_LIST', '링크 리스트'],
  ]
    .map(
      ([value, label]) =>
        `<option value="${value}" ${selectedValue === value ? 'selected' : ''}>${label}</option>`,
    )
    .join('')
}

function buildRoadmapHubOfficialRoadmapOptions(selectedRoadmapId: number | null) {
  const selectedValue = selectedRoadmapId === null ? '' : String(selectedRoadmapId)

  return [
    '<option value="">연결 안 함</option>',
    ...roadmapHubCatalog.officialRoadmaps.map(
      (roadmap) => `
        <option value="${roadmap.roadmapId}" ${selectedValue === String(roadmap.roadmapId) ? 'selected' : ''}>
          ${escapeHtml(roadmap.title)}
        </option>`,
    ),
  ].join('')
}

function renderRoadmapHubEditor() {
  const container = getElement('roadmapHubEditor')
  updateRoadmapHubSaveButton()
  updateRoadmapHubSummary()
  updateRoadmapHubSectionFilterOptions()
  updateRoadmapHubRoadmapFilterOptions()

  if (roadmapHubLoading) {
    updateRoadmapHubFilterSummary(0, 0, hasRoadmapHubFilter())
    container.innerHTML = `
      <div class="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
        <i class="fas fa-circle-notch fa-spin mr-2"></i> 로드맵 허브 구성을 불러오는 중입니다.
      </div>
    `
    return
  }

  if (roadmapHubError) {
    updateRoadmapHubFilterSummary(0, 0, hasRoadmapHubFilter())
    container.innerHTML = `
      <div class="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-600">
        <div class="font-semibold">${escapeHtml(roadmapHubError)}</div>
        <button onclick="refreshCurrentTab()" class="mt-4 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50" type="button">
          다시 불러오기
        </button>
      </div>
    `
    return
  }

  if (roadmapHubCatalog.sections.length === 0) {
    updateRoadmapHubFilterSummary(0, 0, hasRoadmapHubFilter())
    container.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        등록된 로드맵 허브 섹션이 없습니다.
      </div>
    `
    return
  }

  const filterResult = getRoadmapHubFilterResult()
  updateRoadmapHubFilterSummary(filterResult.totalItemCount, filterResult.visibleItemCount, filterResult.filtered)

  if (filterResult.visibleSections.length === 0) {
    container.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        조건에 맞는 섹션이 없습니다.
      </div>
    `
    return
  }

  container.innerHTML = filterResult.visibleSections
    .map(({ section, sectionIndex, visibleItems }) =>
      renderRoadmapHubSectionCard(section, sectionIndex, visibleItems, filterResult.filtered),
    )
    .join('')
}

function renderRoadmapHubSectionCard(
  section: RoadmapHubSection,
  sectionIndex: number,
  visibleItems = section.items.map((item, itemIndex) => ({ item, itemIndex })),
  filtered = false,
) {
  const sectionKey = getRoadmapHubSectionCollapseKey(section, sectionIndex)
  const collapsed = collapsedRoadmapHubSectionKeys.has(sectionKey)
  const emptyItemsMessage = filtered ? '필터 조건에 맞는 항목이 없습니다.' : '등록된 항목이 없습니다.'
  const itemCountText = filtered
    ? `표시 ${formatNumber(visibleItems.length)}개 / 전체 ${formatNumber(section.items.length)}개`
    : `항목 ${formatNumber(section.items.length)}개`
  let sectionBodyHtml = ''
  if (!collapsed) {
    const itemsHtml = visibleItems.length
      ? visibleItems.map(({ item, itemIndex }) => renderRoadmapHubItemRow(sectionIndex, item, itemIndex)).join('')
      : `
        <div class="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400">
          ${escapeHtml(emptyItemsMessage)}
        </div>
      `

    sectionBodyHtml = `
      <div class="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-medium leading-5 text-emerald-700">
        공개 로드맵 허브의 상단 탭은 섹션 제목으로 표시됩니다. CARD_GRID는 카드형 탭, CHIP_GRID는 기술 버튼형 탭으로 보이고, 항목 카테고리 값이 탭 안의 그룹 제목이 됩니다.
      </div>
      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">섹션 key</span>
          <input
            value="${escapeHtml(section.sectionKey)}"
            oninput="updateRoadmapHubSectionField(${sectionIndex}, 'sectionKey', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: role-based"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">섹션 제목</span>
          <input
            value="${escapeHtml(section.title)}"
            oninput="updateRoadmapHubSectionField(${sectionIndex}, 'title', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 역할 기반 로드맵"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">레이아웃</span>
          <select
            onchange="updateRoadmapHubSectionField(${sectionIndex}, 'layoutType', this.value)"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            ${buildRoadmapHubLayoutOptions(section.layoutType)}
          </select>
        </label>
        <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            ${section.active ? 'checked' : ''}
            onchange="updateRoadmapHubSectionActive(${sectionIndex}, this.checked)"
            type="checkbox"
            class="h-4 w-4 accent-indigo-600"
          />
          <span class="text-sm font-medium text-slate-700">공개 허브에서 사용</span>
        </label>
      </div>

      <label class="mt-4 block">
        <span class="mb-1 block text-[11px] font-bold text-slate-500">설명</span>
        <textarea
          oninput="updateRoadmapHubSectionField(${sectionIndex}, 'description', this.value)"
          class="min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="섹션 설명이 필요하면 입력하세요."
        >${escapeHtml(section.description ?? '')}</textarea>
      </label>

      <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h4 class="text-sm font-bold text-slate-800">섹션 항목</h4>
            <p class="mt-1 text-xs text-slate-500">항목 제목, 아이콘, 연결 로드맵, 강조 여부를 수정합니다.</p>
          </div>
          <button onclick="addRoadmapHubItem(${sectionIndex})" class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50" type="button">
            <i class="fas fa-plus mr-1"></i> 항목 추가
          </button>
        </div>
        <div class="space-y-3">${itemsHtml}</div>
      </div>
    `
  }

  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 ${collapsed ? '' : 'border-b border-slate-100 pb-5'} xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">섹션 ${sectionIndex + 1}</span>
            <span class="rounded-full px-2.5 py-1 text-[11px] font-bold ${section.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${section.active ? '활성' : '비활성'}</span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">${escapeHtml(section.layoutType)}</span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">${escapeHtml(itemCountText)}</span>
          </div>
          <h3 class="mt-3 text-lg font-bold text-slate-900">${escapeHtml(section.title || '새 로드맵 섹션')}</h3>
          <p class="mt-1 text-xs text-slate-500">key: ${escapeHtml(section.sectionKey || '-')}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="toggleRoadmapHubSectionCollapsed(${sectionIndex})" aria-expanded="${!collapsed}" class="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100" type="button">
            <i class="fas ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'} mr-1"></i> ${collapsed ? '펼치기' : '접기'}
          </button>
          <button onclick="moveRoadmapHubSection(${sectionIndex}, -1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up mr-1"></i> 위로
          </button>
          <button onclick="moveRoadmapHubSection(${sectionIndex}, 1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down mr-1"></i> 아래로
          </button>
          <button onclick="deleteRoadmapHubSection(${sectionIndex})" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100" type="button">
            <i class="fas fa-trash mr-1"></i> 삭제
          </button>
        </div>
      </div>
      ${sectionBodyHtml}
    </section>
  `
}

function renderRoadmapHubItemRow(sectionIndex: number, item: RoadmapHubItem, itemIndex: number) {
  return `
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">항목 ${itemIndex + 1}</span>
          <span class="rounded-full px-2.5 py-1 text-[11px] font-bold ${item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${item.active ? '활성' : '비활성'}</span>
          ${item.featured ? '<span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">강조</span>' : ''}
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="moveRoadmapHubItem(${sectionIndex}, ${itemIndex}, -1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up mr-1"></i> 위로
          </button>
          <button onclick="moveRoadmapHubItem(${sectionIndex}, ${itemIndex}, 1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down mr-1"></i> 아래로
          </button>
          <button onclick="removeRoadmapHubItem(${sectionIndex}, ${itemIndex})" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100" type="button">
            <i class="fas fa-trash mr-1"></i> 삭제
          </button>
        </div>
      </div>

      <div class="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_260px]">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">항목 제목</span>
          <input
            value="${escapeHtml(item.title)}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'title', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: Frontend"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">부제</span>
          <input
            value="${escapeHtml(item.subtitle ?? '')}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'subtitle', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: Frontend Roadmap"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">카테고리</span>
          <input
            value="${escapeHtml(item.category ?? '')}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'category', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 웹 개발"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">연결 공식 로드맵</span>
          <select
            onchange="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'linkedRoadmapId', this.value)"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            ${buildRoadmapHubOfficialRoadmapOptions(item.linkedRoadmapId)}
          </select>
        </label>
      </div>

      <div class="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">아이콘 클래스</span>
          <input
            value="${escapeHtml(item.iconClass ?? '')}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'iconClass', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: fas fa-server"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">아이콘 색상</span>
          <input
            value="${escapeHtml(item.iconColor ?? '')}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'iconColor', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: #00C471"
          />
        </label>
        <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            ${item.active ? 'checked' : ''}
            onchange="updateRoadmapHubItemToggle(${sectionIndex}, ${itemIndex}, 'active', this.checked)"
            type="checkbox"
            class="h-4 w-4 accent-indigo-600"
          />
          <span class="text-sm font-medium text-slate-700">노출</span>
        </label>
        <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            ${item.featured ? 'checked' : ''}
            onchange="updateRoadmapHubItemToggle(${sectionIndex}, ${itemIndex}, 'featured', this.checked)"
            type="checkbox"
            class="h-4 w-4 accent-indigo-600"
          />
          <span class="text-sm font-medium text-slate-700">강조 카드</span>
        </label>
      </div>
    </div>
  `
}

async function fetchRoadmapHubCatalog() {
  roadmapHubLoading = true
  roadmapHubError = null
  renderRoadmapHubEditor()

  try {
    const response = await adminApi.getRoadmapHubCatalog()
    roadmapHubCatalog = {
      ...response,
      sections: reindexRoadmapHubSections(response.sections),
    }
    collapsedRoadmapHubSectionKeys = buildCollapsedKeySet(roadmapHubCatalog.sections, getRoadmapHubSectionCollapseKey)
  } catch (error) {
    roadmapHubError = error instanceof Error ? error.message : '로드맵 허브 구성을 불러오지 못했습니다.'
  } finally {
    roadmapHubLoading = false
    renderRoadmapHubEditor()
  }
}

async function saveRoadmapHubCatalog() {
  if (roadmapHubCatalog.sections.length === 0) {
    window.alert('최소 한 개 이상의 섹션이 필요합니다.')
    return
  }

  roadmapHubSaving = true
  renderRoadmapHubEditor()

  try {
    const savedCatalog = await adminApi.updateRoadmapHubCatalog({
      sections: reindexRoadmapHubSections(roadmapHubCatalog.sections),
    })
    roadmapHubCatalog = {
      ...savedCatalog,
      sections: reindexRoadmapHubSections(savedCatalog.sections),
    }
    roadmapHubError = null
    renderRoadmapHubEditor()
    window.alert('로드맵 허브 구성을 저장했습니다.')
  } catch (error) {
    roadmapHubError = error instanceof Error ? error.message : '로드맵 허브 구성을 저장하지 못했습니다.'
    renderRoadmapHubEditor()
    window.alert(roadmapHubError)
  } finally {
    roadmapHubSaving = false
    renderRoadmapHubEditor()
  }
}

async function refreshActiveTab() {
  switch (currentActiveTab) {
    case 'dashboard':
      await fetchOverview()
      break
    case 'tags':
      await fetchTags()
      break
    case 'official-roadmaps':
      await fetchRoadmapBaseInfo()
      break
    case 'roadmap-info':
      await fetchRoadmapInfoItems()
      break
    case 'roadmaps':
      await fetchNodes()
      break
    case 'node-resources':
      await fetchNodeResources()
      break
    case 'catalog-menu':
      await fetchCourseCatalogMenu()
      break
    case 'roadmap-hub':
      await fetchRoadmapHubCatalog()
      break
    case 'users':
      await fetchAccounts()
      break
    case 'reports':
      await Promise.all([fetchPendingCourses(), fetchReports(), fetchOverview()])
      break
  }
}

function setActiveTab(nextTab: AdminTabKey) {
  currentActiveTab = nextTab

  document.querySelectorAll<HTMLElement>('.nav-btn').forEach((button) => {
    const isActive = button.dataset.target === nextTab
    button.classList.toggle('is-active', isActive)
    if (isActive) {
      button.setAttribute('aria-current', 'page')
    } else {
      button.removeAttribute('aria-current')
    }
  })

  const pageMeta = TAB_META[nextTab]
  getElement('page-title').textContent = pageMeta.title
  getElement('page-desc').textContent = pageMeta.description

  const visibleViewIds = new Set(
    nextTab === 'official-roadmaps'
      ? ['view-official-roadmaps', 'view-roadmap-info']
      : [`view-${nextTab}`],
  )

  document.querySelectorAll<HTMLElement>('.view-section').forEach((section) => {
    const isVisible = visibleViewIds.has(section.id)
    section.classList.toggle('block', isVisible)
    section.classList.toggle('hidden', !isVisible)
  })
}

function initNavigation() {
  document.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.target as AdminTabKey | undefined
      if (!target) {
        return
      }

      setActiveTab(target)
      void runAdminAction(async () => {
        await refreshActiveTab()
      })
    })
  })
}

// 필터 입력은 서버 재호출 없이 현재 내려받은 목록만 다시 그린다.
function initFilters() {
  const tagFilterInput = getElement<HTMLInputElement>('tagFilterInput')
  tagFilterInput.addEventListener('input', () => {
    filterState.tagQuery = tagFilterInput.value
    applyTagFilters()
  })

  const officialRoadmapFilterInput = getElement<HTMLInputElement>('officialRoadmapFilterInput')
  officialRoadmapFilterInput.addEventListener('input', () => {
    filterState.officialRoadmapQuery = officialRoadmapFilterInput.value
    applyOfficialRoadmapFilters()
  })

  const officialRoadmapForm = getElement<HTMLFormElement>('officialRoadmapForm')
  officialRoadmapForm.addEventListener('submit', (event) => {
    event.preventDefault()
    void runAdminAction(async () => {
      await submitOfficialRoadmapForm()
    })
  })

  getElement<HTMLButtonElement>('officialRoadmapCancelEdit').addEventListener('click', () => {
    resetOfficialRoadmapForm()
  })

  const roadmapInfoFilterInput = getElement<HTMLInputElement>('roadmapInfoFilterInput')
  roadmapInfoFilterInput.addEventListener('input', () => {
    filterState.roadmapInfoQuery = roadmapInfoFilterInput.value
    renderRoadmapInfoManager()
  })

  const roadmapInfoRoadmapSelect = getElement<HTMLSelectElement>('roadmapInfoRoadmapSelect')
  roadmapInfoRoadmapSelect.addEventListener('change', () => {
    const selectedValue = roadmapInfoRoadmapSelect.value
    setRoadmapInfoForm(selectedValue ? Number(selectedValue) : null)
  })

  const roadmapInfoContentInput = getElement<HTMLTextAreaElement>('roadmapInfoContentInput')
  roadmapInfoContentInput.addEventListener('input', () => {
    renderRoadmapInfoPreview()
  })

  const roadmapInfoForm = getElement<HTMLFormElement>('roadmapInfoForm')
  roadmapInfoForm.addEventListener('submit', (event) => {
    event.preventDefault()
    void runAdminAction(async () => {
      await saveRoadmapInfoForm()
    })
  })

  getElement<HTMLButtonElement>('roadmapInfoResetButton').addEventListener('click', () => {
    setRoadmapInfoForm(null)
  })

  getElement<HTMLButtonElement>('roadmapInfoDeleteButton').addEventListener('click', () => {
    if (roadmapInfoEditingId === null) {
      return
    }

    void runAdminAction(async () => {
      await clearRoadmapInfoById(roadmapInfoEditingId as number)
    })
  })

  const nodeFilterInput = getElement<HTMLInputElement>('nodeFilterInput')
  nodeFilterInput.addEventListener('input', () => {
    filterState.nodeQuery = nodeFilterInput.value
    applyNodeFilters()
  })

  const nodeHubSectionFilter = getElement<HTMLSelectElement>('nodeHubSectionFilter')
  nodeHubSectionFilter.addEventListener('change', () => {
    filterState.nodeHubSectionKey = nodeHubSectionFilter.value
    filterState.nodeHubItemKey = ''
    filterState.nodeRoadmapId = ''
    updateNodeFilterControls()
    applyNodeFilters()
  })

  const nodeHubItemFilter = getElement<HTMLSelectElement>('nodeHubItemFilter')
  nodeHubItemFilter.addEventListener('change', () => {
    filterState.nodeHubItemKey = nodeHubItemFilter.value
    filterState.nodeRoadmapId = ''
    updateNodeFilterControls()
    applyNodeFilters()
  })

  const nodeRoadmapFilter = getElement<HTMLSelectElement>('nodeRoadmapFilter')
  nodeRoadmapFilter.addEventListener('change', () => {
    filterState.nodeRoadmapId = nodeRoadmapFilter.value
    applyNodeFilters()
  })

  const nodeTypeFilter = getElement<HTMLSelectElement>('nodeTypeFilter')
  nodeTypeFilter.addEventListener('change', () => {
    filterState.nodeType = nodeTypeFilter.value
    applyNodeFilters()
  })

  const nodeResourceFilterInput = getElement<HTMLInputElement>('nodeResourceFilterInput')
  nodeResourceFilterInput.addEventListener('input', () => {
    filterState.nodeResourceQuery = nodeResourceFilterInput.value
    applyNodeResourceFilters()
  })

  const nodeResourceRoadmapFilter = getElement<HTMLSelectElement>('nodeResourceRoadmapFilter')
  nodeResourceRoadmapFilter.addEventListener('change', () => {
    filterState.nodeResourceRoadmapId = nodeResourceRoadmapFilter.value
    filterState.nodeResourceNodeId = ''
    renderNodeResourceFilterOptions()
    applyNodeResourceFilters()
  })

  const nodeResourceNodeFilter = getElement<HTMLSelectElement>('nodeResourceNodeFilter')
  nodeResourceNodeFilter.addEventListener('change', () => {
    filterState.nodeResourceNodeId = nodeResourceNodeFilter.value
    applyNodeResourceFilters()
  })

  const nodeResourceSourceFilter = getElement<HTMLSelectElement>('nodeResourceSourceFilter')
  nodeResourceSourceFilter.addEventListener('change', () => {
    filterState.nodeResourceSourceType = nodeResourceSourceFilter.value
    applyNodeResourceFilters()
  })

  const nodeResourceStatusFilter = getElement<HTMLSelectElement>('nodeResourceStatusFilter')
  nodeResourceStatusFilter.addEventListener('change', () => {
    filterState.nodeResourceStatus = nodeResourceStatusFilter.value
    applyNodeResourceFilters()
  })

  getElement<HTMLButtonElement>('nodeResourceFilterReset').addEventListener('click', () => {
    filterState.nodeResourceQuery = ''
    filterState.nodeResourceRoadmapId = ''
    filterState.nodeResourceNodeId = ''
    filterState.nodeResourceSourceType = ''
    filterState.nodeResourceStatus = ''
    nodeResourceFilterInput.value = ''
    renderNodeResourceFilterOptions()
    applyNodeResourceFilters()
  })

  const nodeResourceRoadmapSelect = getElement<HTMLSelectElement>('nodeResourceRoadmapSelect')
  nodeResourceRoadmapSelect.addEventListener('change', () => {
    const selectedRoadmapId = nodeResourceRoadmapSelect.value ? Number(nodeResourceRoadmapSelect.value) : null
    renderNodeResourceNodeOptions(null, selectedRoadmapId)
    getElement<HTMLInputElement>('nodeResourceSortOrderInput').value = ''
  })

  const nodeResourceNodeSelect = getElement<HTMLSelectElement>('nodeResourceNodeSelect')
  nodeResourceNodeSelect.addEventListener('change', () => {
    const selectedNodeId = nodeResourceNodeSelect.value ? Number(nodeResourceNodeSelect.value) : null
    const sortOrderInput = getElement<HTMLInputElement>('nodeResourceSortOrderInput')
    sortOrderInput.value =
      selectedNodeId === null
        ? ''
        : sortOrderInput.value.trim() && nodeResourceEditingId !== null
          ? sortOrderInput.value
          : String(getDefaultNodeResourceSortOrder(selectedNodeId))
  })

  const nodeResourceForm = getElement<HTMLFormElement>('nodeResourceForm')
  nodeResourceForm.addEventListener('submit', (event) => {
    event.preventDefault()
    void runAdminAction(async () => {
      await submitNodeResourceForm()
    })
  })

  getElement<HTMLButtonElement>('nodeResourceCancelEdit').addEventListener('click', () => {
    resetNodeResourceForm()
  })

  const accountFilterInput = getElement<HTMLInputElement>('accountFilterInput')
  accountFilterInput.addEventListener('input', () => {
    filterState.accountQuery = accountFilterInput.value
    applyAccountFilters()
  })

  const accountRoleFilter = getElement<HTMLSelectElement>('accountRoleFilter')
  accountRoleFilter.addEventListener('change', () => {
    filterState.accountRole = accountRoleFilter.value
    applyAccountFilters()
  })

  const accountStatusFilter = getElement<HTMLSelectElement>('accountStatusFilter')
  accountStatusFilter.addEventListener('change', () => {
    filterState.accountStatus = accountStatusFilter.value
    applyAccountFilters()
  })

  const roadmapHubFilterInput = getElement<HTMLInputElement>('roadmapHubFilterInput')
  roadmapHubFilterInput.addEventListener('input', () => {
    roadmapHubFilterState.query = roadmapHubFilterInput.value
    renderRoadmapHubEditor()
  })

  const roadmapHubSectionFilter = getElement<HTMLSelectElement>('roadmapHubSectionFilter')
  roadmapHubSectionFilter.addEventListener('change', () => {
    roadmapHubFilterState.sectionKey = roadmapHubSectionFilter.value
    renderRoadmapHubEditor()
  })

  const roadmapHubLayoutFilter = getElement<HTMLSelectElement>('roadmapHubLayoutFilter')
  roadmapHubLayoutFilter.addEventListener('change', () => {
    roadmapHubFilterState.layoutType = roadmapHubLayoutFilter.value
    renderRoadmapHubEditor()
  })

  const roadmapHubStatusFilter = getElement<HTMLSelectElement>('roadmapHubStatusFilter')
  roadmapHubStatusFilter.addEventListener('change', () => {
    roadmapHubFilterState.status = roadmapHubStatusFilter.value
    renderRoadmapHubEditor()
  })

  const roadmapHubFeaturedFilter = getElement<HTMLSelectElement>('roadmapHubFeaturedFilter')
  roadmapHubFeaturedFilter.addEventListener('change', () => {
    roadmapHubFilterState.featured = roadmapHubFeaturedFilter.value
    renderRoadmapHubEditor()
  })

  const roadmapHubLinkedFilter = getElement<HTMLSelectElement>('roadmapHubLinkedFilter')
  roadmapHubLinkedFilter.addEventListener('change', () => {
    roadmapHubFilterState.linked = roadmapHubLinkedFilter.value
    renderRoadmapHubEditor()
  })

  const roadmapHubRoadmapFilter = getElement<HTMLSelectElement>('roadmapHubRoadmapFilter')
  roadmapHubRoadmapFilter.addEventListener('change', () => {
    roadmapHubFilterState.linkedRoadmapId = roadmapHubRoadmapFilter.value
    renderRoadmapHubEditor()
  })

  const roadmapHubFilterReset = getElement<HTMLButtonElement>('roadmapHubFilterReset')
  roadmapHubFilterReset.addEventListener('click', () => {
    roadmapHubFilterState.query = ''
    roadmapHubFilterState.sectionKey = ''
    roadmapHubFilterState.layoutType = ''
    roadmapHubFilterState.status = ''
    roadmapHubFilterState.featured = ''
    roadmapHubFilterState.linked = ''
    roadmapHubFilterState.linkedRoadmapId = ''
    roadmapHubFilterInput.value = ''
    roadmapHubSectionFilter.value = ''
    roadmapHubLayoutFilter.value = ''
    roadmapHubStatusFilter.value = ''
    roadmapHubFeaturedFilter.value = ''
    roadmapHubLinkedFilter.value = ''
    roadmapHubRoadmapFilter.value = ''
    renderRoadmapHubEditor()
  })
}

async function runAdminAction(task: () => Promise<void>) {
  try {
    await task()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.')
  }
}

// HTML 인라인 버튼에서 호출하는 액션을 전역 함수로 연결한다.
function installGlobalActions() {
  window.refreshCurrentTab = () => {
    void runAdminAction(async () => {
      await refreshActiveTab()
    })
  }

  window.logout = async () => {
    await runAdminAction(async () => {
      const currentSession = readStoredAuthSession()
      try {
        if (currentSession?.refreshToken) {
          await authApi.logout(currentSession.refreshToken)
        }
      } finally {
        clearStoredAuthSession()
        window.location.replace('/home?auth=login')
      }
    })
  }

  window.createTag = async () => {
    await runAdminAction(async () => {
      const name = window.prompt('등록할 태그명을 입력하세요.')
      if (!name?.trim()) {
        return
      }

      const description = window.prompt('태그 설명을 입력하세요. 선택 사항입니다.')?.trim() ?? ''
      await adminApi.createTag({ name: name.trim(), description: description || null })
      await fetchTags()
    })
  }

  window.mergeTag = async (tagId: number) => {
    await runAdminAction(async () => {
      const targetId = window.prompt('병합할 대상 태그 ID를 입력하세요.')
      if (!targetId?.trim()) {
        return
      }

      const parsedTargetId = Number(targetId)
      if (!Number.isFinite(parsedTargetId)) {
        window.alert('숫자 ID를 입력하세요.')
        return
      }

      await adminApi.mergeTags([tagId], parsedTargetId)
      await fetchTags()
    })
  }

  window.editOfficialRoadmap = (roadmapId: number) => {
    const roadmap = officialRoadmapItems.find((item) => item.roadmapId === roadmapId)
    if (!roadmap) {
      window.alert('수정할 공식 로드맵을 찾지 못했습니다.')
      return
    }

    setOfficialRoadmapForm(roadmap)
  }

  window.deleteOfficialRoadmap = async (roadmapId: number) => {
    await runAdminAction(async () => {
      const roadmap = officialRoadmapItems.find((item) => item.roadmapId === roadmapId)
      if (!roadmap) {
        window.alert('삭제할 공식 로드맵을 찾지 못했습니다.')
        return
      }

      if (!window.confirm(`'${roadmap.title}' 공식 로드맵을 삭제하시겠습니까?\n연결된 노드는 관리자 목록에서 함께 제외됩니다.`)) {
        return
      }

      await adminApi.deleteOfficialRoadmap(roadmapId)

      if (officialRoadmapEditingId === roadmapId) {
        resetOfficialRoadmapForm()
      }

      await fetchRoadmapBaseInfo()
      window.alert('공식 로드맵을 삭제했습니다.')
    })
  }

  window.createRoadmapNode = async () => {
    await runAdminAction(async () => {
      const payload = await openRoadmapNodeModal()
      if (!payload) {
        return
      }

      await adminApi.createRoadmapNode(payload)
      await fetchNodes()
    })
  }

  window.editRoadmapNode = async (nodeId: number) => {
    await runAdminAction(async () => {
      const node = roadmapNodeMap.get(nodeId)
      if (!node) {
        window.alert('수정할 노드를 찾지 못했습니다.')
        return
      }

      const payload = await openRoadmapNodeModal(node)
      if (!payload) {
        return
      }

      await adminApi.updateRoadmapNode(nodeId, payload)
      await fetchNodes()
    })
  }

  window.editRoadmapNodeResource = (resourceId: number) => {
    const resource = nodeResourceItems.find((item) => item.resourceId === resourceId)
    if (!resource) {
      window.alert('수정할 추천 자료를 찾지 못했습니다.')
      return
    }

    setNodeResourceForm(resource)
  }

  window.deleteRoadmapNodeResource = async (resourceId: number) => {
    await runAdminAction(async () => {
      await deleteNodeResourceById(resourceId)
    })
  }

  window.editRoadmapInfo = (roadmapId: number) => {
    setRoadmapInfoForm(roadmapId)
  }

  window.clearRoadmapInfo = async (roadmapId: number) => {
    await runAdminAction(async () => {
      await clearRoadmapInfoById(roadmapId)
    })
  }

  window.updateNodeTags = async (nodeId: number) => {
    await runAdminAction(async () => {
      const node = roadmapNodeMap.get(nodeId)
      const input = window.prompt('필수 태그명을 쉼표로 구분해서 입력하세요.', node?.requiredTags.join(', ') ?? '')
      if (input === null) {
        return
      }

      const requiredTags = input
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

      if (requiredTags.length === 0) {
        window.alert('하나 이상의 태그를 입력하세요.')
        return
      }

      await adminApi.updateNodeRequiredTags(nodeId, requiredTags)
      await fetchNodes()
    })
  }

  window.updateNodePrerequisites = async (nodeId: number) => {
    await runAdminAction(async () => {
      const node = roadmapNodeMap.get(nodeId)
      if (!node) {
        window.alert('수정할 노드를 찾지 못했습니다.')
        return
      }

      const input = window.prompt(
        '선행 노드 ID를 쉼표로 구분해서 입력하세요. 같은 로드맵의 노드만 지정할 수 있습니다.',
        node.prerequisiteNodeIds.join(', '),
      )
      const prerequisiteNodeIds = parseNodeIdList(input)
      if (prerequisiteNodeIds === null) {
        return
      }

      await adminApi.updateNodePrerequisites(nodeId, prerequisiteNodeIds)
      await fetchNodes()
    })
  }

  window.updateNodeRules = async (nodeId: number) => {
    await runAdminAction(async () => {
      const node = roadmapNodeMap.get(nodeId)
      const description = window.prompt(
        '완료 기준 코드를 입력하세요. 예: QUIZ_PASS',
        node?.completionRuleDescription ?? 'QUIZ_PASS',
      )
      if (!description?.trim()) {
        return
      }

      const progressInput = window.prompt(
        '필수 진행률을 0부터 100 사이 숫자로 입력하세요.',
        String(node?.requiredProgressRate ?? 100),
      )
      if (progressInput === null || progressInput.trim() === '') {
        return
      }

      const requiredProgressRate = Number(progressInput)
      if (!Number.isFinite(requiredProgressRate)) {
        window.alert('숫자 진행률을 입력하세요.')
        return
      }

      await adminApi.updateNodeCompletionRule(nodeId, description.trim(), requiredProgressRate)
      await fetchNodes()
    })
  }

  window.toggleAccountStatus = async (userId: number, accountStatus: string) => {
    await runAdminAction(async () => {
      const reason = window.prompt(`${accountStatus === 'ACTIVE' ? '제한' : '복구'} 사유를 입력하세요.`)
      if (!reason?.trim()) {
        return
      }

      if (accountStatus === 'ACTIVE') {
        await adminApi.restrictAccount(userId, reason.trim())
      } else {
        await adminApi.restoreAccount(userId, reason.trim())
      }

      await Promise.all([fetchAccounts(), fetchOverview()])
    })
  }

  window.approveCourse = async (courseId: number) => {
    await runAdminAction(async () => {
      if (!window.confirm('이 강의를 승인하시겠습니까?')) {
        return
      }

      await adminApi.approveCourse(courseId, '관리자 승인')
      await Promise.all([fetchPendingCourses(), fetchOverview()])
    })
  }

  window.rejectCourse = async (courseId: number) => {
    await runAdminAction(async () => {
      const reason = window.prompt('반려 사유를 입력하세요.')
      if (!reason?.trim()) {
        return
      }

      await adminApi.rejectCourse(courseId, reason.trim())
      await Promise.all([fetchPendingCourses(), fetchOverview()])
    })
  }

  window.blindContent = async (reportId: number) => {
    await runAdminAction(async () => {
      const report = reportMap.get(reportId)
      if (!report?.contentId) {
        window.alert('블라인드 처리할 콘텐츠가 없습니다.')
        return
      }

      const reason = window.prompt('블라인드 사유를 입력하세요.', report.reason)
      if (!reason?.trim()) {
        return
      }

      await adminApi.blindContent(report.contentId, reason.trim())
      await Promise.all([fetchReports(), fetchOverview()])
    })
  }

  window.resolveReport = async (reportId: number) => {
    await runAdminAction(async () => {
      const reason = window.prompt('처리 메모를 입력하세요.', '문제 없음')
      if (!reason?.trim()) {
        return
      }

      await adminApi.resolveReport(reportId, reason.trim(), 'DISMISS')
      await Promise.all([fetchReports(), fetchOverview()])
    })
  }

  window.createCatalogCategory = () => {
    updateCatalogMenu((menu) => {
      menu.categories.push(createEmptyCatalogCategory(menu.categories.length))
    })
  }

  window.saveCourseCatalogMenu = async () => {
    await saveCourseCatalogMenu()
  }

  window.setAllCatalogCategoriesCollapsed = (collapsed: boolean) => {
    setAllCatalogCategoriesCollapsed(collapsed)
  }

  window.toggleCatalogCategoryCollapsed = (categoryIndex: number) => {
    toggleCatalogCategoryCollapsed(categoryIndex)
  }

  window.moveCatalogCategory = (categoryIndex: number, direction: number) => {
    updateCatalogMenu((menu) => {
      moveArrayItem(menu.categories, categoryIndex, direction)
    })
  }

  window.deleteCatalogCategory = (categoryIndex: number) => {
    if (!window.confirm('이 카테고리를 삭제하시겠습니까?')) {
      return
    }

    updateCatalogMenu((menu) => {
      menu.categories.splice(categoryIndex, 1)
    })
  }

  window.updateCatalogCategoryField = (categoryIndex: number, field: string, value: string) => {
    updateCatalogMenu((menu) => {
      const category = menu.categories[categoryIndex]
      if (!category) {
        return
      }

      switch (field) {
        case 'categoryKey':
          category.categoryKey = value.trim()
          break
        case 'label':
          category.label = value
          break
        case 'title':
          category.title = value
          break
        case 'iconClass':
          category.iconClass = value
          break
      }
    })
  }

  window.updateCatalogCategoryActive = (categoryIndex: number, checked: boolean) => {
    updateCatalogMenu((menu) => {
      const category = menu.categories[categoryIndex]
      if (category) {
        category.active = checked
      }
    })
  }

  window.addCatalogMegaMenuItem = (categoryIndex: number) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.megaMenuItems.push(createEmptyCatalogMegaMenuItem())
    })
  }

  window.updateCatalogMegaMenuItemLabel = (categoryIndex: number, itemIndex: number, value: string) => {
    updateCatalogMenu((menu) => {
      const item = menu.categories[categoryIndex]?.megaMenuItems[itemIndex]
      if (item) {
        item.label = value
      }
    })
  }

  window.moveCatalogMegaMenuItem = (categoryIndex: number, itemIndex: number, direction: number) => {
    updateCatalogMenu((menu) => {
      const items = menu.categories[categoryIndex]?.megaMenuItems
      if (items) {
        moveArrayItem(items, itemIndex, direction)
      }
    })
  }

  window.removeCatalogMegaMenuItem = (categoryIndex: number, itemIndex: number) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.megaMenuItems.splice(itemIndex, 1)
    })
  }

  window.addCatalogGroup = (categoryIndex: number) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.groups.push(createEmptyCatalogGroup())
    })
  }

  window.updateCatalogGroupField = (categoryIndex: number, groupIndex: number, field: string, value: string) => {
    updateCatalogMenu((menu) => {
      const group = menu.categories[categoryIndex]?.groups[groupIndex]
      if (!group) {
        return
      }

      if (field === 'name') {
        group.name = value
      }
    })
  }

  window.moveCatalogGroup = (categoryIndex: number, groupIndex: number, direction: number) => {
    updateCatalogMenu((menu) => {
      const groups = menu.categories[categoryIndex]?.groups
      if (groups) {
        moveArrayItem(groups, groupIndex, direction)
      }
    })
  }

  window.removeCatalogGroup = (categoryIndex: number, groupIndex: number) => {
    if (!window.confirm('이 그룹을 삭제하시겠습니까?')) {
      return
    }

    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.groups.splice(groupIndex, 1)
    })
  }

  window.addCatalogGroupItem = (categoryIndex: number, groupIndex: number) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.groups[groupIndex]?.items.push(createEmptyCatalogGroupItem())
    })
  }

  window.updateCatalogGroupItemField = (
    categoryIndex: number,
    groupIndex: number,
    itemIndex: number,
    field: string,
    value: string,
  ) => {
    updateCatalogMenu((menu) => {
      const item = menu.categories[categoryIndex]?.groups[groupIndex]?.items[itemIndex]
      if (!item) {
        return
      }

      if (field === 'name') {
        item.name = value
      }

      if (field === 'linkedCategoryKey') {
        item.linkedCategoryKey = value.trim() ? value.trim() : null
      }
    })
  }

  window.moveCatalogGroupItem = (categoryIndex: number, groupIndex: number, itemIndex: number, direction: number) => {
    updateCatalogMenu((menu) => {
      const items = menu.categories[categoryIndex]?.groups[groupIndex]?.items
      if (items) {
        moveArrayItem(items, itemIndex, direction)
      }
    })
  }

  window.removeCatalogGroupItem = (categoryIndex: number, groupIndex: number, itemIndex: number) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.groups[groupIndex]?.items.splice(itemIndex, 1)
    })
  }

  window.createRoadmapHubSection = () => {
    updateRoadmapHubCatalog((catalog) => {
      catalog.sections.push(createEmptyRoadmapHubSection(catalog.sections.length))
    })
  }

  window.saveRoadmapHubCatalog = async () => {
    await saveRoadmapHubCatalog()
  }

  window.setAllRoadmapHubSectionsCollapsed = (collapsed: boolean) => {
    setAllRoadmapHubSectionsCollapsed(collapsed)
  }

  window.toggleRoadmapHubSectionCollapsed = (sectionIndex: number) => {
    toggleRoadmapHubSectionCollapsed(sectionIndex)
  }

  window.moveRoadmapHubSection = (sectionIndex: number, direction: number) => {
    updateRoadmapHubCatalog((catalog) => {
      moveArrayItem(catalog.sections, sectionIndex, direction)
    })
  }

  window.deleteRoadmapHubSection = (sectionIndex: number) => {
    if (!window.confirm('이 로드맵 허브 섹션을 삭제하시겠습니까?')) {
      return
    }

    updateRoadmapHubCatalog((catalog) => {
      catalog.sections.splice(sectionIndex, 1)
    })
  }

  window.updateRoadmapHubSectionField = (sectionIndex: number, field: string, value: string) => {
    updateRoadmapHubCatalog((catalog) => {
      const section = catalog.sections[sectionIndex]
      if (!section) {
        return
      }

      switch (field) {
        case 'sectionKey':
          section.sectionKey = value.trim()
          break
        case 'title':
          section.title = value
          break
        case 'description':
          section.description = value.trim() ? value : null
          break
        case 'layoutType':
          section.layoutType = value
          break
      }
    })
  }

  window.updateRoadmapHubSectionActive = (sectionIndex: number, checked: boolean) => {
    updateRoadmapHubCatalog((catalog) => {
      const section = catalog.sections[sectionIndex]
      if (section) {
        section.active = checked
      }
    })
  }

  window.addRoadmapHubItem = (sectionIndex: number) => {
    updateRoadmapHubCatalog((catalog) => {
      const section = catalog.sections[sectionIndex]
      if (!section) {
        return
      }

      section.items.push(createEmptyRoadmapHubItem(section.layoutType))
    })
  }

  window.moveRoadmapHubItem = (sectionIndex: number, itemIndex: number, direction: number) => {
    updateRoadmapHubCatalog((catalog) => {
      const items = catalog.sections[sectionIndex]?.items
      if (items) {
        moveArrayItem(items, itemIndex, direction)
      }
    })
  }

  window.removeRoadmapHubItem = (sectionIndex: number, itemIndex: number) => {
    updateRoadmapHubCatalog((catalog) => {
      catalog.sections[sectionIndex]?.items.splice(itemIndex, 1)
    })
  }

  window.updateRoadmapHubItemField = (sectionIndex: number, itemIndex: number, field: string, value: string) => {
    updateRoadmapHubCatalog((catalog) => {
      const item = catalog.sections[sectionIndex]?.items[itemIndex]
      if (!item) {
        return
      }

      switch (field) {
        case 'title':
          item.title = value
          break
        case 'subtitle':
          item.subtitle = value.trim() ? value : null
          break
        case 'category':
          item.category = value.trim() ? value : null
          break
        case 'iconClass':
          item.iconClass = value.trim() ? value : null
          break
        case 'iconColor':
          item.iconColor = value.trim() ? value : null
          break
        case 'linkedRoadmapId':
          item.linkedRoadmapId = value.trim() && Number.isFinite(Number(value)) ? Number(value) : null
          item.linkedRoadmapTitle =
            catalog.officialRoadmaps.find((roadmap) => String(roadmap.roadmapId) === value)?.title ?? null
          break
      }
    })
  }

  window.updateRoadmapHubItemToggle = (sectionIndex: number, itemIndex: number, field: string, checked: boolean) => {
    updateRoadmapHubCatalog((catalog) => {
      const item = catalog.sections[sectionIndex]?.items[itemIndex]
      if (!item) {
        return
      }

      if (field === 'active') {
        item.active = checked
      }

      if (field === 'featured') {
        item.featured = checked
      }
    })
  }
}

async function bootstrap() {
  const session = readStoredAuthSession()
  if (!session) {
    window.location.replace('/home?auth=login')
    return
  }

  if (session.role !== 'ROLE_ADMIN') {
    window.location.replace('/home')
    return
  }

  installGlobalActions()
  initNavigation()
  initFilters()
  setActiveTab('dashboard')
  await refreshActiveTab()
}

export function mountAdminDashboardPage() {
  prepareAdminDashboardDocument()

  void runAdminAction(async () => {
    await bootstrap()
  })
}
