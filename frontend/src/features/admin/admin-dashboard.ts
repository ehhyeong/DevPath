import { renderAdminMarkup } from './admin-react-renderer'
import { installAdminDashboardActions,runAdminAction } from './admin-dashboard-actions'
import { openRoadmapNodeModal,syncRoadmapNodeModalData } from './admin-node-modal'
import { renderOverview } from './admin-overview'
import { accountStatusLabel,reportContentContext,reportReporterSummary,reportTargetLabel,reportTargetSummary } from './admin-moderation-support'
import { fetchRoadmapInfoItems,installRoadmapInfoBindings } from './admin-roadmap-info'
import { fetchNodeResources,installNodeResourceBindings } from './admin-node-resources'
import { fetchCourseCatalogMenu } from './admin-course-catalog'
import { fetchRoadmapHubCatalog,renderRoadmapHubEditor,roadmapHubFilterState } from './admin-roadmap-hub'
import { adminApi } from '../../lib/admin-api'
import { readStoredAuthSession } from '../../lib/auth-session'
import { prepareAdminDashboardDocument } from './admin-dashboard-markup'
import type { AdminAccount, AdminModerationReport, AdminOfficialRoadmap, AdminOfficialRoadmapOption, AdminPendingCourse, AdminRoadmapNode, AdminTag } from '../../types/admin'
import type { AdminRoadmapHubCatalog, RoadmapHubItem } from '../../types/roadmap-hub'
import '../../index.css'
import type { AdminTabKey, DashboardFilterState, NodeHubEntry } from './admin-dashboard-support'
import { NODE_HUB_UNLINKED_FILTER, buildEmptyRow, buildErrorRow, buildLoadingRow, escapeHtml, normalizeText, matchesKeyword, formatNumber, formatDateTime, roleLabel, roleBadgeClassName, nodeTypeLabel, formatNodePrerequisites, formatNodeStructure, normalizeOptionalString, updateFilterSummary } from './admin-dashboard-support'

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

let currentActiveTab: AdminTabKey = 'dashboard'

let roadmapNodeMap = new Map<number, AdminRoadmapNode>()

let reportMap = new Map<number, AdminModerationReport>()

let tagItems: AdminTag[] = []

let officialRoadmapItems: AdminOfficialRoadmap[] = []

let officialRoadmapEditingId: number | null = null

let officialRoadmapSaving = false

let nodeItems: AdminRoadmapNode[] = []

let officialRoadmapOptions: AdminOfficialRoadmapOption[] = []

let nodeHubCatalog: AdminRoadmapHubCatalog = { sections: [], officialRoadmaps: [] }

let nodeHubEntriesByRoadmapId = new Map<number, NodeHubEntry[]>()

let accountItems: AdminAccount[] = []

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

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id)

  if (!element) {
    throw new Error(`${id} element was not found`)
  }

  return element as T
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

async function fetchOverview() {
  renderOverview(await adminApi.getOverview())
}

function renderTagRows(tags: AdminTag[]) {
  const tbody = getElement('tagTableBody')
  renderAdminMarkup(tbody, tags.length
    ? tags
        .map(
          (tag) => `
            <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-6 py-3 font-mono text-xs text-slate-400">#${tag.id}</td>
              <td class="px-6 py-3 font-bold text-slate-800">${escapeHtml(tag.name)}</td>
              <td class="px-6 py-3 text-slate-500">${escapeHtml(tag.description || '설명 없음')}</td>
              <td class="px-6 py-3"><span class="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-600">ACTIVE</span></td>
              <td class="px-6 py-3 text-right"><button data-admin-click="mergeTag(${tag.id})" class="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800" type="button">병합</button></td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(5, '조건에 맞는 태그가 없습니다.'))
}

function applyTagFilters() {
  const keyword = normalizeText(filterState.tagQuery)
  const filteredTags = tagItems.filter((tag) => matchesKeyword(keyword, [tag.id, tag.name, tag.description]))

  renderTagRows(filteredTags)
  updateFilterSummary('tagFilterSummary', tagItems.length, filteredTags.length)
}

async function fetchTags() {
  const tbody = getElement('tagTableBody')
  renderAdminMarkup(tbody, buildLoadingRow(5))

  try {
    tagItems = await adminApi.getTags()
    applyTagFilters()
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(5, error instanceof Error ? error.message : '태그를 불러오지 못했습니다.'))
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
  renderAdminMarkup(saveButton, officialRoadmapSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : isEditing
      ? '<i class="fas fa-save mr-1"></i> 변경 저장'
      : '<i class="fas fa-plus mr-1"></i> 로드맵 생성')
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
  renderAdminMarkup(tbody, roadmaps.length
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
                  <button data-admin-click="editOfficialRoadmap(${roadmap.roadmapId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">수정</button>
                  <button data-admin-click="deleteOfficialRoadmap(${roadmap.roadmapId})" class="whitespace-nowrap rounded bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 hover:text-rose-800" type="button">삭제</button>
                </div>
              </td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(5, '조건에 맞는 공식 로드맵이 없습니다.'))
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
  renderAdminMarkup(tbody, buildLoadingRow(5))

  try {
    officialRoadmapItems = await adminApi.getOfficialRoadmaps()
    officialRoadmapOptions = officialRoadmapItems.map((roadmap) => ({
      roadmapId: roadmap.roadmapId,
      title: roadmap.title,
    }))
    syncRoadmapNodeModalData(nodeItems, officialRoadmapOptions)
    applyOfficialRoadmapFilters()
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(5, error instanceof Error ? error.message : '공식 로드맵을 불러오지 못했습니다.'))
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

function renderNodeRows(nodes: AdminRoadmapNode[]) {
  const tbody = getElement('nodeTableBody')
  renderAdminMarkup(tbody, nodes.length
    ? nodes
        .map(
          (node) => `
            <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-5 py-3 align-middle font-mono text-xs whitespace-nowrap text-slate-400">#${node.nodeId}</td>
              <td class="px-5 py-3 align-middle"><div class="truncate font-bold text-slate-800">${escapeHtml(node.title)}</div><div class="mt-1 truncate text-xs text-slate-400">${escapeHtml(node.content || '설명 없음')}</div></td>
              <td class="px-5 py-3 align-middle"><div class="truncate font-medium text-slate-700">${escapeHtml(node.roadmapTitle)}</div><div class="mt-0.5 inline-flex rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-blue-600">${escapeHtml(nodeTypeLabel(node.nodeType))}</div>${renderNodeHubBadges(node)}</td>
              <td class="px-5 py-3 align-middle text-xs text-slate-500"><div class="truncate whitespace-nowrap">${escapeHtml(formatNodeStructure(node))}</div><div class="mt-1 truncate whitespace-nowrap">${escapeHtml(formatNodePrerequisites(node))}</div>${node.subTopics ? `<div class="mt-1 truncate text-[11px] text-slate-400">${escapeHtml(node.subTopics)}</div>` : ''}</td>
              <td class="px-4 py-3 align-middle text-xs whitespace-nowrap text-slate-500"><div>${node.requiredTagCount > 0 ? `필수 태그 ${node.requiredTagCount}개` : '필수 태그 없음'}</div><div class="mt-1">${escapeHtml(node.completionRuleDescription || '완료 기준 없음')}${node.requiredProgressRate !== null ? ` / ${node.requiredProgressRate}%` : ''}</div></td>
              <td class="px-4 py-3 align-middle text-right"><div class="flex flex-nowrap justify-end gap-1"><button data-admin-click="editRoadmapNode(${node.nodeId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">노드 수정</button><button data-admin-click="updateNodePrerequisites(${node.nodeId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">선수 조건</button><button data-admin-click="updateNodeTags(${node.nodeId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">태그 매핑</button><button data-admin-click="updateNodeRules(${node.nodeId})" class="whitespace-nowrap rounded bg-indigo-50 px-2 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800" type="button">완료 기준</button></div></td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(6, '조건에 맞는 노드가 없습니다.'))
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

  renderAdminMarkup(sectionSelect, [
    '<option value="">전체 허브 분류</option>',
    ...nodeHubCatalog.sections.map((section) => {
      const roadmapIds = getNodeHubSectionRoadmapIds(section.sectionKey)
      return `<option value="${escapeHtml(section.sectionKey)}" ${filterState.nodeHubSectionKey === section.sectionKey ? 'selected' : ''}>${escapeHtml(section.title)} (${formatNumber(roadmapIds.size)})</option>`
    }),
    `<option value="${NODE_HUB_UNLINKED_FILTER}" ${filterState.nodeHubSectionKey === NODE_HUB_UNLINKED_FILTER ? 'selected' : ''}>허브 미연결</option>`,
  ].join(''))
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
  renderAdminMarkup(itemSelect, [
    '<option value="">전체 허브 항목</option>',
    ...linkedItems.map(
      ({ section, item, itemKey }) => `
        <option value="${escapeHtml(itemKey)}" ${filterState.nodeHubItemKey === itemKey ? 'selected' : ''}>
          ${escapeHtml(section.title)} > ${escapeHtml(item.title)}
        </option>`,
    ),
  ].join(''))
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

  renderAdminMarkup(select, [
    '<option value="">전체 로드맵</option>',
    ...availableRoadmaps.map(
      (roadmap) => `<option value="${roadmap.roadmapId}" ${filterState.nodeRoadmapId === String(roadmap.roadmapId) ? 'selected' : ''}>${escapeHtml(roadmap.title)}</option>`,
    ),
  ].join(''))
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

  renderAdminMarkup(container, [
    `<button data-node-hub-section="" class="${makeButtonClass(!filterState.nodeHubSectionKey)}" type="button">전체 ${formatNumber(nodeItems.length)}</button>`,
    ...nodeHubCatalog.sections.map((section) => {
      const count = countNodesByRoadmapIds(getNodeHubSectionRoadmapIds(section.sectionKey))
      return `<button data-node-hub-section="${escapeHtml(section.sectionKey)}" class="${makeButtonClass(filterState.nodeHubSectionKey === section.sectionKey)}" type="button">${escapeHtml(section.title)} ${formatNumber(count)}</button>`
    }),
    `<button data-node-hub-section="${NODE_HUB_UNLINKED_FILTER}" class="${makeButtonClass(filterState.nodeHubSectionKey === NODE_HUB_UNLINKED_FILTER)}" type="button">허브 미연결 ${formatNumber(unlinkedCount)}</button>`,
  ].join(''))

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
  renderAdminMarkup(tbody, buildLoadingRow(6))

  try {
    const [nodes, roadmaps, hubCatalog] = await Promise.all([
      adminApi.getRoadmapNodes(),
      adminApi.getOfficialRoadmapOptions(),
      adminApi.getRoadmapHubCatalog(),
    ])
    nodeItems = nodes
    officialRoadmapOptions = roadmaps
    syncRoadmapNodeModalData(nodeItems, officialRoadmapOptions)
    nodeHubCatalog = hubCatalog
    rebuildNodeHubIndex()
    roadmapNodeMap = new Map(nodeItems.map((node) => [node.nodeId, node]))
    updateNodeFilterControls()
    applyNodeFilters()
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(6, error instanceof Error ? error.message : '노드를 불러오지 못했습니다.'))
    updateFilterSummary('nodeFilterSummary', 0, 0)
  }
}

function renderAccountRows(accounts: AdminAccount[]) {
  const tbody = getElement('accountTableBody')
  renderAdminMarkup(tbody, accounts.length
    ? accounts
        .map(
          (account) => `
            <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
              <td class="px-6 py-3 font-mono text-xs text-slate-400">#${account.userId}</td>
              <td class="px-6 py-3 font-medium text-slate-600">${escapeHtml(account.email)}</td>
              <td class="px-6 py-3 font-bold text-slate-800">${escapeHtml(account.nickname)}</td>
              <td class="px-6 py-3"><span class="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${roleBadgeClassName(account.role)}">${escapeHtml(roleLabel(account.role))}</span></td>
              <td class="px-6 py-3"><span class="${account.accountStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'} text-xs font-bold"><i class="fas fa-circle mr-1 text-[8px]"></i>${escapeHtml(accountStatusLabel(account.accountStatus))}</span></td>
              <td class="px-6 py-3 text-right"><button data-admin-click="toggleAccountStatus(${account.userId}, '${escapeHtml(account.accountStatus || 'INACTIVE')}')" class="rounded ${account.accountStatus === 'ACTIVE' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800'} px-3 py-1.5 text-xs font-medium transition" type="button">${account.accountStatus === 'ACTIVE' ? '제한' : '복구'}</button></td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(6, '조건에 맞는 계정이 없습니다.'))
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
  renderAdminMarkup(tbody, buildLoadingRow(6))

  try {
    accountItems = await adminApi.getAccounts()
    applyAccountFilters()
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(6, error instanceof Error ? error.message : '계정을 불러오지 못했습니다.'))
    updateFilterSummary('accountFilterSummary', 0, 0)
  }
}

async function fetchPendingCourses() {
  const tbody = getElement('courseTableBody')
  renderAdminMarkup(tbody, buildLoadingRow(3, '강의 검수 목록을 불러오는 중입니다...'))

  try {
    const courses = await adminApi.getPendingCourses()
    renderAdminMarkup(tbody, courses.length
      ? courses
          .map(
            (course: AdminPendingCourse) => `
              <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                <td class="px-6 py-3"><div class="font-bold text-slate-800">${escapeHtml(course.title)}</div><div class="mt-0.5 font-mono text-[10px] text-slate-400">ID: #${course.courseId}</div></td>
                <td class="px-6 py-3 text-xs font-medium text-slate-600">${escapeHtml(course.instructorName || `강사 #${course.instructorId}`)}<div class="mt-1 text-[10px] text-slate-400">${escapeHtml(formatDateTime(course.submittedAt))}</div></td>
                <td class="space-x-1 px-6 py-3 text-right"><button data-admin-click="approveCourse(${course.courseId})" class="rounded bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700" type="button">승인</button><button data-admin-click="rejectCourse(${course.courseId})" class="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">반려</button></td>
              </tr>`,
          )
          .join('')
      : buildEmptyRow(3, '검수 대기 중인 강의가 없습니다.'))
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(3, error instanceof Error ? error.message : '강의 검수 목록을 불러오지 못했습니다.'))
  }
}

async function fetchReports() {
  const tbody = getElement('reportTableBody')
  renderAdminMarkup(tbody, buildLoadingRow(3, '신고 목록을 불러오는 중입니다...'))

  try {
    const reports = await adminApi.getReports()
    reportMap = new Map(reports.map((report) => [report.reportId, report]))
    renderAdminMarkup(tbody, reports.length
      ? reports
          .map((report: AdminModerationReport) => {
            const blindAction = report.contentId
              ? `<button data-admin-click="blindContent(${report.reportId})" class="rounded bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 hover:text-rose-800" type="button">블라인드</button>`
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
                  <button data-admin-click="resolveReport(${report.reportId})" class="rounded px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" type="button">무시</button>
                </td>
              </tr>`
          })
          .join('')
      : buildEmptyRow(3, '접수된 신고가 없습니다.'))
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(3, error instanceof Error ? error.message : '신고 목록을 불러오지 못했습니다.'))
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
  installRoadmapInfoBindings(runAdminAction)
  installNodeResourceBindings(runAdminAction)
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

  installAdminDashboardActions({ refreshActiveTab, fetchTags, getOfficialRoadmaps: () => officialRoadmapItems, getOfficialRoadmapEditingId: () => officialRoadmapEditingId, setOfficialRoadmapForm, resetOfficialRoadmapForm, fetchRoadmapBaseInfo, openRoadmapNodeModal: (node) => openRoadmapNodeModal(node, filterState.nodeRoadmapId), getRoadmapNode: (nodeId) => roadmapNodeMap.get(nodeId), fetchNodes, fetchAccounts, fetchOverview, fetchPendingCourses, fetchReports, getReport: (reportId) => reportMap.get(reportId) })
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
