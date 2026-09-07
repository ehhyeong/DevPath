import { renderAdminMarkup } from './admin-react-renderer'
import { installAdminDashboardActions,runAdminAction } from './admin-dashboard-actions'
import { openRoadmapNodeModal,syncRoadmapNodeModalData } from './admin-node-modal'
import { installCourseReviewModalBindings } from './admin-course-review'
import { renderOverview } from './admin-overview'
import { accountStatusLabel,reportContentContext,reportReporterSummary,reportTargetLabel,reportTargetSummary } from './admin-moderation-support'
import { fetchRoadmapInfoItems,installRoadmapInfoBindings } from './admin-roadmap-info'
import { fetchNodeResources,installNodeResourceBindings } from './admin-node-resources'
import { fetchCourseCatalogMenu } from './admin-course-catalog'
import { fetchRoadmapHubCatalog,renderRoadmapHubEditor,roadmapHubFilterState } from './admin-roadmap-hub'
import { adminApi } from '../../lib/admin-api'
import { readStoredAuthSession } from '../../lib/auth-session'
import { prepareAdminDashboardDocument } from './admin-dashboard-markup'
import type { AdminAccount, AdminCourseReviewHistory, AdminModerationReport, AdminOfficialRoadmap, AdminOfficialRoadmapOption, AdminPendingCourse, AdminRoadmapNode, AdminRole, AdminTag } from '../../types/admin'
import type { AdminRoadmapHubCatalog, RoadmapHubItem } from '../../types/roadmap-hub'
import '../../index.css'
import type { AdminTabKey, DashboardFilterState, NodeHubEntry } from './admin-dashboard-support'
import { NODE_HUB_UNLINKED_FILTER, buildEmptyRow, buildErrorRow, buildLoadingRow, escapeHtml, normalizeText, matchesKeyword, formatNumber, formatDateTime, roleLabel, roleBadgeClassName, nodeTypeLabel, formatNodeStructure, normalizeOptionalString, shouldLoadAdminTab, updateFilterSummary } from './admin-dashboard-support'
import { installAccountDetailModalBindings } from './admin-account-detail'
import { fetchAdminGovernance, installAdminGovernanceBindings } from './admin-governance'
import { paginateAdminItems, type AdminPagination } from './admin-pagination'

const TAB_META: Record<AdminTabKey, { title: string; description: string }> = {
  dashboard: { title: '플랫폼 실시간 현황', description: 'DevPath 관리자 운영 지표 요약' },
  tags: { title: '기술 태그 데이터베이스', description: '공식 태그를 조회하고 병합합니다.' },
  governance: { title: '정책 및 강의 매핑', description: '플랫폼 정책과 강의·로드맵 노드 연결을 관리합니다.' },
  'official-roadmaps': { title: '로드맵 기본 정보', description: '공식 로드맵 생성과 상세 소개 콘텐츠를 한 화면에서 관리합니다.' },
  'roadmap-info': { title: '로드맵 소개 관리', description: '로드맵 상세 상단 소개 아코디언 콘텐츠를 수정합니다.' },
  roadmaps: { title: '마스터 로드맵 노드', description: '공식 로드맵 노드 생성, 수정, 선수 조건과 완료 기준을 관리합니다.' },
  'node-resources': { title: '노드 추천 자료', description: '로드맵 노드 상세 패널에 노출할 무료 자료 링크를 관리합니다.' },
  'catalog-menu': { title: '강의 목록 메뉴 관리', description: 'lecture-list 상단 카테고리와 필터 구성을 수정합니다.' },
  'roadmap-hub': { title: '로드맵 허브 관리', description: 'roadmap-hub 섹션과 연결 로드맵 구성을 수정합니다.' },
  users: { title: '회원 통합 관리', description: '회원 상태와 권한을 운영 관점에서 관리합니다.' },
  reports: { title: '검수 및 신고', description: '강의 검수와 사용자 신고를 처리합니다.' },
  operations: { title: '통합 운영 센터', description: '채용, 학습 자동화, 추천 분석, 공지, 환불과 정산을 관리합니다.' },
}

let currentActiveTab: AdminTabKey = 'dashboard'

const loadedTabs = new Set<AdminTabKey>()

let tagPage = 1

let nodePage = 1

let roadmapNodeMap = new Map<number, AdminRoadmapNode>()

let reportMap = new Map<number, AdminModerationReport>()

let reportItems: AdminModerationReport[] = []

let tagItems: AdminTag[] = []

let officialRoadmapItems: AdminOfficialRoadmap[] = []

let officialRoadmapEditingId: number | null = null

let officialRoadmapSaving = false

let nodeItems: AdminRoadmapNode[] = []

let officialRoadmapOptions: AdminOfficialRoadmapOption[] = []

let nodeHubCatalog: AdminRoadmapHubCatalog = { sections: [], officialRoadmaps: [] }

let nodeHubEntriesByRoadmapId = new Map<number, NodeHubEntry[]>()

let accountItems: AdminAccount[] = []

let adminRoleItems: AdminRole[] = []

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
  reportQuery: '',
  reportTargetLabel: '',
  reportContentLink: '',
  reportStatus: 'PENDING',
}

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id)

  if (!element) {
    throw new Error(`${id} element was not found`)
  }

  return element as T
}

function updatePaginationControls(prefix: 'tag' | 'node', pagination: AdminPagination<unknown>) {
  const previousButton = getElement<HTMLButtonElement>(`${prefix}PagePrevious`)
  const nextButton = getElement<HTMLButtonElement>(`${prefix}PageNext`)
  const summary = getElement(`${prefix}PageSummary`)

  previousButton.disabled = pagination.currentPage <= 1
  nextButton.disabled = pagination.currentPage >= pagination.totalPages
  summary.textContent = pagination.totalItems
    ? `${formatNumber(pagination.startIndex)}–${formatNumber(pagination.endIndex)} / ${formatNumber(pagination.totalItems)}개 · ${pagination.currentPage}/${pagination.totalPages} 페이지`
    : '0개 표시'
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
    return '<div class="admin-node-hub-badges"><span class="admin-node-hub-empty"><i class="fas fa-link-slash"></i> 허브 미연결</span></div>'
  }

  const visibleEntries = entries.slice(0, 3)
  const extraCount = entries.length - visibleEntries.length

  return `
    <div class="admin-node-hub-badges">
      ${visibleEntries
        .map(
          (entry) => `
            <span class="admin-node-hub-badge ${nodeHubBadgeClassName(entry.layoutType)}">
              ${escapeHtml(entry.sectionTitle)} · ${escapeHtml(entry.itemTitle)}
            </span>`,
        )
        .join('')}
      ${extraCount > 0 ? `<span class="admin-node-hub-badge border border-slate-200 bg-white text-slate-400">+${extraCount}</span>` : ''}
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
              <td class="px-6 py-3 text-right"><div class="flex justify-end gap-1"><button data-admin-click="editTag(${tag.id})" class="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">수정</button><button data-admin-click="mergeTag(${tag.id})" class="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800" type="button">병합</button><button data-admin-click="deleteTag(${tag.id})" class="rounded bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100" type="button">삭제</button></div></td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(5, '조건에 맞는 태그가 없습니다.'))
}

function applyTagFilters() {
  const keyword = normalizeText(filterState.tagQuery)
  const filteredTags = tagItems.filter((tag) => matchesKeyword(keyword, [tag.id, tag.name, tag.description]))
  const pagination = paginateAdminItems(filteredTags, tagPage)

  tagPage = pagination.currentPage
  renderTagRows(pagination.items)
  getElement('tagTableScroll').scrollTop = 0
  updatePaginationControls('tag', pagination)
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
            <tr class="admin-node-row">
              <td><span class="admin-node-id">#${node.nodeId}</span></td>
              <td>
                <div class="admin-node-title">${escapeHtml(node.title)}</div>
                <div class="admin-node-description">${escapeHtml(node.content || '등록된 설명이 없습니다.')}</div>
              </td>
              <td>
                <div class="admin-node-roadmap"><i class="fas fa-route"></i><span>${escapeHtml(node.roadmapTitle)}</span></div>
                <span class="admin-node-type">${escapeHtml(nodeTypeLabel(node.nodeType))}</span>
                ${renderNodeHubBadges(node)}
              </td>
              <td>
                <div class="admin-node-detail"><span>구조</span><strong>${escapeHtml(formatNodeStructure(node))}</strong></div>
                ${node.subTopics ? `<div class="admin-node-subtopics">${escapeHtml(node.subTopics)}</div>` : ''}
              </td>
              <td>
                <div class="admin-node-requirement"><i class="fas fa-tags"></i>${node.requiredTagCount > 0 ? `필수 태그 ${node.requiredTagCount}개` : '필수 태그 없음'}</div>
                <div class="admin-node-requirement"><i class="fas fa-flag-checkered"></i>${escapeHtml(node.completionRuleDescription || '완료 기준 없음')}${node.requiredProgressRate !== null ? ` · ${node.requiredProgressRate}%` : ''}</div>
              </td>
              <td>
                <div class="admin-node-action-grid">
                  <button data-admin-click="editRoadmapNode(${node.nodeId})" type="button"><i class="fas fa-pen"></i>기본 정보</button>
                  <button data-admin-click="updateNodeTags(${node.nodeId})" type="button"><i class="fas fa-tags"></i>태그 매핑</button>
                  <button data-admin-click="updateNodeRules(${node.nodeId})" class="is-primary" type="button"><i class="fas fa-check-double"></i>완료 기준</button>
                  <button data-admin-click="deleteRoadmapNode(${node.nodeId})" class="is-danger" type="button"><i class="fas fa-trash"></i>노드 삭제</button>
                </div>
              </td>
            </tr>`,
        )
        .join('')
    : buildEmptyRow(6, '조건에 맞는 노드가 없습니다.'))
}

function resetNodeFilters() {
  filterState.nodeQuery = ''
  filterState.nodeHubSectionKey = ''
  filterState.nodeHubItemKey = ''
  filterState.nodeRoadmapId = ''
  filterState.nodeType = ''
  nodePage = 1

  getElement<HTMLInputElement>('nodeFilterInput').value = ''
  getElement<HTMLSelectElement>('nodeTypeFilter').value = ''
  updateNodeFilterControls()
  applyNodeFilters()
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
  const pagination = paginateAdminItems(filteredNodes, nodePage)

  nodePage = pagination.currentPage
  renderNodeRows(pagination.items)
  getElement('nodeTableScroll').scrollTop = 0
  updatePaginationControls('node', pagination)
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
      ? 'admin-node-quick-filter is-active'
      : 'admin-node-quick-filter'
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
      nodePage = 1
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

function accountStatusClassName(status: string | null) {
  switch ((status ?? '').toUpperCase()) {
    case 'ACTIVE': return 'border-emerald-100 bg-emerald-50 text-emerald-600'
    case 'RESTRICTED': return 'border-amber-100 bg-amber-50 text-amber-700'
    case 'DEACTIVATED': return 'border-slate-200 bg-slate-100 text-slate-600'
    case 'WITHDRAWN': return 'border-rose-100 bg-rose-50 text-rose-600'
    default: return 'border-slate-200 bg-white text-slate-500'
  }
}

function instructorApprovalLabel(account: AdminAccount) {
  if (account.role !== 'ROLE_INSTRUCTOR') return '일반 회원'
  switch ((account.instructorStatus ?? '').toUpperCase()) {
    case 'APPROVED': return '강사 승인 완료'
    case 'REJECTED': return '강사 승인 거절'
    default: return '강사 승인 대기'
  }
}

function renderAccountActions(account: AdminAccount) {
  const status = (account.accountStatus ?? '').toUpperCase()
  const actions = [
    `<button data-admin-click="viewAccountDetails(${account.userId})" class="admin-account-action" type="button"><i class="fas fa-clock-rotate-left"></i>상세·이력</button>`,
  ]

  if (account.role === 'ROLE_ADMIN') {
    actions.push(`<button data-admin-click="assignAdminRole(${account.userId})" class="admin-account-action" type="button"><i class="fas fa-key"></i>Role 배정</button>`)
    actions.push(`<button data-admin-click="clearAdminRole(${account.userId})" class="admin-account-action is-warning" type="button"><i class="fas fa-key"></i>Role 해제</button>`)
  }

  if (status === 'ACTIVE') {
    if (account.role === 'ROLE_INSTRUCTOR' && account.instructorStatus !== 'APPROVED') {
      actions.push(`<button data-admin-click="approveInstructor(${account.userId})" class="admin-account-action is-approve" type="button"><i class="fas fa-user-check"></i>강사 승인</button>`)
    }
    if (account.role === 'ROLE_INSTRUCTOR') {
      actions.push(`<button data-admin-click="changeInstructorGrade(${account.userId})" class="admin-account-action" type="button"><i class="fas fa-ranking-star"></i>등급 변경</button>`)
    }
    actions.push(`<button data-admin-click="changeAccountStatus(${account.userId}, 'RESTRICT')" class="admin-account-action is-warning" type="button">제한</button>`)
    actions.push(`<button data-admin-click="changeAccountStatus(${account.userId}, 'DEACTIVATE')" class="admin-account-action" type="button">비활성</button>`)
    actions.push(`<button data-admin-click="changeAccountStatus(${account.userId}, 'WITHDRAW')" class="admin-account-action is-danger" type="button">탈퇴</button>`)
  } else if (status === 'RESTRICTED' || status === 'DEACTIVATED' || status === 'INACTIVE') {
    actions.push(`<button data-admin-click="changeAccountStatus(${account.userId}, 'RESTORE')" class="admin-account-action is-approve" type="button">복구</button>`)
    actions.push(`<button data-admin-click="changeAccountStatus(${account.userId}, 'WITHDRAW')" class="admin-account-action is-danger" type="button">탈퇴</button>`)
  }

  return actions.join('')
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
              <td class="px-6 py-3"><span class="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${roleBadgeClassName(account.role)}">${escapeHtml(roleLabel(account.role))}</span><div class="mt-1 text-[10px] font-medium text-slate-400">${escapeHtml(instructorApprovalLabel(account))}</div></td>
              <td class="px-6 py-3"><span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${accountStatusClassName(account.accountStatus)}">${escapeHtml(accountStatusLabel(account.accountStatus))}</span></td>
              <td class="px-6 py-3"><div class="admin-account-actions">${renderAccountActions(account)}</div></td>
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

function renderAdminRoleRows(roles: AdminRole[]) {
  const tbody = getElement('adminRoleTableBody')
  renderAdminMarkup(tbody, roles.length
    ? roles.map((role) => `
      <tr class="border-b border-slate-100 transition-colors hover:bg-violet-50/30">
        <td class="px-6 py-3 font-mono text-xs font-bold text-violet-700">${escapeHtml(role.roleName)}</td>
        <td class="px-6 py-3 text-xs text-slate-600">${escapeHtml(role.description || '설명 없음')}</td>
        <td class="px-6 py-3"><div class="flex max-w-xl flex-wrap gap-1">${role.permissionCodes.length ? role.permissionCodes.map((code) => `<span class="rounded bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-600">${escapeHtml(code)}</span>`).join('') : '<span class="text-xs text-slate-400">권한 코드 없음</span>'}</div></td>
        <td class="px-6 py-3"><div class="flex gap-2"><button data-admin-click="editAdminRole(${role.id})" class="admin-account-action" type="button">수정</button><button data-admin-click="deleteAdminRole(${role.id})" class="admin-account-action is-danger" type="button">삭제</button></div></td>
      </tr>`).join('')
    : buildEmptyRow(4, '등록된 관리자 Role이 없습니다.'))
}

async function fetchAdminRoles() {
  const tbody = getElement('adminRoleTableBody')
  renderAdminMarkup(tbody, buildLoadingRow(4, '관리자 Role을 불러오는 중입니다...'))
  try {
    adminRoleItems = await adminApi.getRoles()
    renderAdminRoleRows(adminRoleItems)
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(4, error instanceof Error ? error.message : '관리자 Role을 불러오지 못했습니다.'))
  }
}

async function fetchPendingCourses() {
  const tbody = getElement('courseTableBody')
  renderAdminMarkup(tbody, buildLoadingRow(3, '강의 검수 목록을 불러오는 중입니다...'))

  try {
    const [courses, history] = await Promise.all([
      adminApi.getPendingCourses(),
      adminApi.getCourseReviewHistory(),
    ])
    renderAdminMarkup(tbody, courses.length
      ? courses
          .map(
            (course: AdminPendingCourse) => `
              <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                <td class="px-6 py-3"><div class="font-bold text-slate-800">${escapeHtml(course.title)}</div><div class="mt-0.5 font-mono text-[10px] text-slate-400">ID: #${course.courseId}</div></td>
                <td class="px-6 py-3 text-xs font-medium text-slate-600">${escapeHtml(course.instructorName || `강사 #${course.instructorId}`)}<div class="mt-1 text-[10px] text-slate-400">${escapeHtml(formatDateTime(course.submittedAt))}</div></td>
                <td class="px-6 py-3 text-right"><button data-admin-click="reviewCourse(${course.courseId})" class="admin-course-review-open" type="button"><i class="fas fa-search"></i>검수하기</button></td>
              </tr>`,
          )
          .join('')
      : buildEmptyRow(3, '검수 대기 중인 강의가 없습니다.'))
    renderCourseReviewHistory(history)
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(3, error instanceof Error ? error.message : '강의 검수 목록을 불러오지 못했습니다.'))
    renderAdminMarkup(getElement('courseReviewHistoryBody'), buildErrorRow(5, '강의 검수 이력을 불러오지 못했습니다.'))
  }
}

function renderCourseReviewHistory(history: AdminCourseReviewHistory[]) {
  const tbody = getElement('courseReviewHistoryBody')
  renderAdminMarkup(tbody, history.length
    ? history.map((item) => `
      <tr class="border-b border-slate-100">
        <td class="px-6 py-3 font-mono text-xs text-slate-500">#${item.courseId}</td>
        <td class="px-6 py-3 text-xs text-slate-600">강사 #${item.instructorId}</td>
        <td class="px-6 py-3"><span class="rounded-full px-2 py-1 text-[10px] font-bold ${item.action === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">${escapeHtml(item.action)}</span></td>
        <td class="px-6 py-3 text-xs text-slate-600">${escapeHtml(item.reason)}</td>
        <td class="px-6 py-3 text-xs text-slate-400">관리자 #${item.adminId}<small class="mt-1 block">${escapeHtml(formatDateTime(item.processedAt))}</small></td>
      </tr>`).join('')
    : buildEmptyRow(5, '처리된 강의 검수 이력이 없습니다.'))
}

function getReportTargetFilterLabel(report: AdminModerationReport) {
  return report.targetLabel?.trim() || reportTargetLabel(report)
}

function renderReportTargetOptions() {
  const select = getElement<HTMLSelectElement>('reportTargetFilter')
  const labels = [...new Set(reportItems.map(getReportTargetFilterLabel))].sort((left, right) => left.localeCompare(right, 'ko'))

  if (filterState.reportTargetLabel && !labels.includes(filterState.reportTargetLabel)) {
    filterState.reportTargetLabel = ''
  }

  renderAdminMarkup(select, [
    '<option value="">전체 신고 대상</option>',
    ...labels.map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`),
  ].join(''))
  select.value = filterState.reportTargetLabel
}

function renderReportRows(reports: AdminModerationReport[]) {
  const tbody = getElement('reportTableBody')
  renderAdminMarkup(tbody, reports.length
    ? reports
        .map((report: AdminModerationReport) => {
          const isPending = report.status === 'PENDING'
          const blindAction = isPending && report.contentId
            ? `<button data-admin-click="blindContent(${report.reportId})" class="rounded bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 hover:text-rose-800" type="button">블라인드</button>`
            : ''
          const unblindAction = report.blinded && report.contentId
            ? `<button data-admin-click="unblindContent(${report.reportId})" class="rounded bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100" type="button">블라인드 해제</button>`
            : ''
          const actionLabels: Record<string, string> = { WARNING: '경고', SUSPEND: '계정 정지', DISMISS: '기각' }
          const managementActions = isPending
            ? `${blindAction}${unblindAction}<button data-admin-click="resolveReport(${report.reportId}, 'WARNING')" class="admin-report-action is-warning" type="button">경고</button><button data-admin-click="resolveReport(${report.reportId}, 'SUSPEND')" class="admin-report-action is-danger" type="button">정지</button><button data-admin-click="resolveReport(${report.reportId}, 'DISMISS')" class="admin-report-action" type="button">기각</button>`
            : `${unblindAction}<div class="admin-report-resolution"><strong>${escapeHtml(actionLabels[report.actionTaken ?? ''] ?? report.actionTaken ?? '처리 완료')}</strong><span>${escapeHtml(report.resolutionReason || '')}</span><span>${escapeHtml(formatDateTime(report.resolvedAt))}</span></div>`

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
                <div class="admin-report-actions">${managementActions}</div>
              </td>
            </tr>`
        })
        .join('')
    : buildEmptyRow(3, '조건에 맞는 신고가 없습니다.'))
}

function applyReportFilters() {
  const keyword = normalizeText(filterState.reportQuery)
  const filteredReports = reportItems.filter((report) => {
    const matchesText = matchesKeyword(keyword, [
      report.reportId,
      reportTargetLabel(report),
      reportTargetSummary(report),
      reportReporterSummary(report),
      report.contentTitle,
      report.contentPreview,
      report.reason,
    ])
    const matchesTarget = !filterState.reportTargetLabel
      || getReportTargetFilterLabel(report) === filterState.reportTargetLabel
    const matchesContent = !filterState.reportContentLink
      || (filterState.reportContentLink === 'LINKED' ? Boolean(report.contentId) : !report.contentId)

    return matchesText && matchesTarget && matchesContent
  })

  renderReportRows(filteredReports)
  updateFilterSummary('reportFilterSummary', reportItems.length, filteredReports.length)
}

function resetReportFilters() {
  filterState.reportQuery = ''
  filterState.reportTargetLabel = ''
  filterState.reportContentLink = ''
  getElement<HTMLInputElement>('reportFilterInput').value = ''
  getElement<HTMLSelectElement>('reportTargetFilter').value = ''
  getElement<HTMLSelectElement>('reportContentFilter').value = ''
  applyReportFilters()
}

async function fetchReports() {
  const tbody = getElement('reportTableBody')
  renderAdminMarkup(tbody, buildLoadingRow(3, '신고 목록을 불러오는 중입니다...'))

  try {
    reportItems = await adminApi.getReports(filterState.reportStatus)
    reportMap = new Map(reportItems.map((report) => [report.reportId, report]))
    renderReportTargetOptions()
    applyReportFilters()
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(3, error instanceof Error ? error.message : '신고 목록을 불러오지 못했습니다.'))
    updateFilterSummary('reportFilterSummary', 0, 0)
  }
}

async function fetchModerationStats() {
  const stats = await adminApi.getModerationStats()
  getElement('moderationTotalReports').textContent = formatNumber(stats.totalReports)
  getElement('moderationPendingReports').textContent = formatNumber(stats.pendingReports)
  getElement('moderationResolvedReports').textContent = formatNumber(stats.resolvedReports)
  getElement('moderationBlindedContents').textContent = formatNumber(stats.blindedContents)
  getElement('moderationSuspendedUsers').textContent = formatNumber(stats.suspendedUsers)
}

async function refreshActiveTab(force = false) {
  const tab = currentActiveTab
  if (!shouldLoadAdminTab(loadedTabs, tab, force)) {
    return
  }

  switch (tab) {
    case 'dashboard':
      await fetchOverview()
      break
    case 'tags':
      await fetchTags()
      break
    case 'governance':
      await fetchAdminGovernance()
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
      await Promise.all([fetchAccounts(), fetchAdminRoles()])
      break
    case 'reports':
      await Promise.all([fetchPendingCourses(), fetchReports(), fetchModerationStats()])
      break
    case 'operations':
      break
  }

  loadedTabs.add(tab)
}

function setActiveTab(nextTab: AdminTabKey) {
  currentActiveTab = nextTab
  window.dispatchEvent(new CustomEvent('devpath:admin-tab-change', { detail: nextTab }))

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
    tagPage = 1
    applyTagFilters()
  })
  getElement<HTMLButtonElement>('tagPagePrevious').addEventListener('click', () => {
    tagPage -= 1
    applyTagFilters()
  })
  getElement<HTMLButtonElement>('tagPageNext').addEventListener('click', () => {
    tagPage += 1
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
    nodePage = 1
    applyNodeFilters()
  })

  getElement<HTMLButtonElement>('nodePagePrevious').addEventListener('click', () => {
    nodePage -= 1
    applyNodeFilters()
  })
  getElement<HTMLButtonElement>('nodePageNext').addEventListener('click', () => {
    nodePage += 1
    applyNodeFilters()
  })

  getElement<HTMLButtonElement>('nodeFilterReset').addEventListener('click', resetNodeFilters)

  const nodeHubSectionFilter = getElement<HTMLSelectElement>('nodeHubSectionFilter')
  nodeHubSectionFilter.addEventListener('change', () => {
    filterState.nodeHubSectionKey = nodeHubSectionFilter.value
    filterState.nodeHubItemKey = ''
    filterState.nodeRoadmapId = ''
    nodePage = 1
    updateNodeFilterControls()
    applyNodeFilters()
  })

  const nodeHubItemFilter = getElement<HTMLSelectElement>('nodeHubItemFilter')
  nodeHubItemFilter.addEventListener('change', () => {
    filterState.nodeHubItemKey = nodeHubItemFilter.value
    filterState.nodeRoadmapId = ''
    nodePage = 1
    updateNodeFilterControls()
    applyNodeFilters()
  })

  const nodeRoadmapFilter = getElement<HTMLSelectElement>('nodeRoadmapFilter')
  nodeRoadmapFilter.addEventListener('change', () => {
    filterState.nodeRoadmapId = nodeRoadmapFilter.value
    nodePage = 1
    applyNodeFilters()
  })

  const nodeTypeFilter = getElement<HTMLSelectElement>('nodeTypeFilter')
  nodeTypeFilter.addEventListener('change', () => {
    filterState.nodeType = nodeTypeFilter.value
    nodePage = 1
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

  const reportFilterInput = getElement<HTMLInputElement>('reportFilterInput')
  reportFilterInput.addEventListener('input', () => {
    filterState.reportQuery = reportFilterInput.value
    applyReportFilters()
  })

  const reportTargetFilter = getElement<HTMLSelectElement>('reportTargetFilter')
  reportTargetFilter.addEventListener('change', () => {
    filterState.reportTargetLabel = reportTargetFilter.value
    applyReportFilters()
  })

  const reportContentFilter = getElement<HTMLSelectElement>('reportContentFilter')
  reportContentFilter.addEventListener('change', () => {
    filterState.reportContentLink = reportContentFilter.value
    applyReportFilters()
  })

  const reportStatusFilter = getElement<HTMLSelectElement>('reportStatusFilter')
  reportStatusFilter.addEventListener('change', () => {
    filterState.reportStatus = reportStatusFilter.value
    void runAdminAction(fetchReports)
  })

  getElement<HTMLButtonElement>('reportFilterReset').addEventListener('click', resetReportFilters)

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

  installAdminDashboardActions({ refreshActiveTab: () => refreshActiveTab(true), fetchTags, getTags: () => tagItems, getOfficialRoadmaps: () => officialRoadmapItems, getOfficialRoadmapEditingId: () => officialRoadmapEditingId, setOfficialRoadmapForm, resetOfficialRoadmapForm, fetchRoadmapBaseInfo, openRoadmapNodeModal: (node) => openRoadmapNodeModal(node, filterState.nodeRoadmapId), getRoadmapNode: (nodeId) => roadmapNodeMap.get(nodeId), fetchNodes, fetchAccounts, getAccount: (userId) => accountItems.find((account) => account.userId === userId), fetchRoles: fetchAdminRoles, getRoles: () => adminRoleItems, fetchOverview, fetchPendingCourses, fetchReports, getReport: (reportId) => reportMap.get(reportId) })
  installAccountDetailModalBindings()
  installCourseReviewModalBindings(async (courseId, decision, reason) => {
    if (decision === 'APPROVE') await adminApi.approveCourse(courseId, reason)
    else await adminApi.rejectCourse(courseId, reason)
    await Promise.all([fetchPendingCourses(), fetchOverview()])
  })
  installAdminGovernanceBindings(runAdminAction)
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
