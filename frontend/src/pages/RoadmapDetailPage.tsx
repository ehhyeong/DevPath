import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AuthModal, { type AuthView } from '../components/AuthModal'
import LoginRequiredView from '../components/LoginRequiredView'
import RoadmapInfoContent from '../components/RoadmapInfoContent'
import SiteHeader from '../components/SiteHeader'
import { authApi, roadmapApi, userApi } from '../lib/api'
import {
  AUTH_SESSION_SYNC_EVENT,
  clearStoredAuthSession,
  getPostLoginRedirect,
  readStoredAuthSession,
} from '../lib/auth-session'
import { useInternalPageScroll } from '../lib/useInternalPageScroll'
import type { ProofCardSummary } from '../types/learner'
import type {
  RoadmapDetail,
  RoadmapNodeItem,
  RecommendationChange,
  RecommendationChangeHistory,
  RecommendStatus,
  NodeStatus,
  ChangeType,
  MyRoadmapSummary,
} from '../types/roadmap'

function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get('auth')

  return value === 'login' || value === 'signup' ? value : null
}

function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href)

  if (view) {
    url.searchParams.set('auth', view)
  } else {
    url.searchParams.delete('auth')
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function readPositiveNumberParam(params: URLSearchParams, key: string) {
  const rawValue = params.get(key)
  if (!rawValue) return 0

  const value = Number(rawValue)
  return Number.isInteger(value) && value > 0 ? value : 0
}

function findRoadmapByOriginalId(roadmaps: MyRoadmapSummary[], originalRoadmapId: number) {
  return roadmaps.find((roadmap) => roadmap.originalRoadmapId === originalRoadmapId) ?? null
}

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function isPendingNodeStatus(status: NodeStatus) {
  return status === 'PENDING' || status === 'NOT_STARTED'
}

function normalizeChangeType(type?: string | null): ChangeType | null {
  if (type === 'ADD' || type === 'MODIFY' || type === 'DELETE' || type === 'REORDER') return type
  return null
}

function inferHistoryChangeType(history: RecommendationChangeHistory): ChangeType | null {
  const normalized = normalizeChangeType(history.nodeChangeType)
  if (normalized) return normalized
  if (/^\[(복습|심화)\]/.test(history.nodeTitle)) return 'ADD'
  return null
}

function getNodeLessonProgressPercent(node: RoadmapNodeItem) {
  const rate = node.lessonCompletionRate ?? 0
  if (!Number.isFinite(rate)) return 0
  if (rate <= 1) return Math.max(0, Math.min(100, Math.round(rate * 100)))
  return Math.max(0, Math.min(100, Math.round(rate)))
}

function isNodeReadyToClear(node: RoadmapNodeItem) {
  if (node.status === 'COMPLETED' || node.status === 'LOCKED') return false
  // 클리어 가능 여부는 백엔드(NodeClearanceGate)가 단독 판정한 readyToClear를 신뢰한다.
  return node.readyToClear === true
}

const roadmapNodeBoxClassName =
  'node-box relative z-[20] flex w-[var(--roadmap-node-width)] cursor-pointer flex-col justify-center gap-[6px] rounded-[8px] border-[2px] border-solid border-[#334155] bg-[#fff] [padding:14px_20px] text-left [font-size:0.95rem] [font-weight:700] [box-shadow:0_4px_6px_-1px_rgba(0,0,0,0.05)] [transition:all_0.2s_cubic-bezier(0.4,0,0.2,1)] hover:[transform:translateY(-2px)] hover:border-[#00c471] hover:[box-shadow:0_10px_15px_-3px_rgba(0,0,0,0.1)]'

function getNodeBoxClass(node: RoadmapNodeItem, change?: RecommendationChange): string {
  if (change) {
    if (change.nodeChangeType === 'ADD') {
      return `${roadmapNodeBoxClassName} node-change-add border-[3px]! border-dashed! border-[#3b82f6]! bg-[#eff6ff]! [animation:pulse-blue_2s_infinite]`
    }
    if (change.nodeChangeType === 'MODIFY') {
      return `${roadmapNodeBoxClassName} node-change-modify border-[3px]! border-dashed! border-[#f59e0b]! bg-[#fef3c7]! [animation:pulse-orange_2s_infinite]`
    }
    if (change.nodeChangeType === 'DELETE') {
      return `${roadmapNodeBoxClassName} node-change-delete border-[3px]! border-dashed! border-[#ef4444]! bg-[#fee2e2]! opacity-[0.6] [animation:pulse-red_2s_infinite]`
    }
    if (change.nodeChangeType === 'REORDER') {
      return `${roadmapNodeBoxClassName} node-change-reorder border-[3px]! border-dashed! border-[#6366f1]! bg-[#eef2ff]! [animation:pulse-indigo_2s_infinite]`
    }
  }
  if (node.status === 'COMPLETED') return `${roadmapNodeBoxClassName} status-done bg-[#f0fdf4]! border-[#00c471]! text-[#166534]`
  if (node.status === 'IN_PROGRESS' || isNodeReadyToClear(node)) return `${roadmapNodeBoxClassName} status-active bg-[#fefce8]! border-[#eab308]! text-[#854d0e]`
  if (node.status === 'LOCKED') return `${roadmapNodeBoxClassName} bg-[#f1f5f9]! border-[#cbd5e1]! text-[#94a3b8] hover:[transform:none]! hover:[box-shadow:none]! hover:border-[#cbd5e1]!`
  return roadmapNodeBoxClassName  // PENDING/NOT_STARTED: 기본 스타일 (클릭 가능)
}

const changeItemClassName = 'change-item mb-[8px] cursor-pointer rounded-[8px] border-[1px] border-solid border-[#e2e8f0] bg-[#fff] p-[12px] hover:bg-[#f8fafc]'

function getChangeItemClass(type?: ChangeType | null) {
  if (type === 'ADD')    return `${changeItemClassName} new border-l-[#3b82f6]`
  if (type === 'MODIFY') return `${changeItemClassName} modified border-l-[#f59e0b]`
  if (type === 'DELETE') return `${changeItemClassName} delete border-l-[#ef4444]`
  if (type === 'REORDER') return `${changeItemClassName} reorder border-l-[#6366f1]`
  return changeItemClassName
}

function changeBadgeStyle(type?: ChangeType | null): CSSProperties {
  if (type === 'ADD')    return { background: '#3b82f6' }
  if (type === 'MODIFY') return { background: '#f59e0b' }
  if (type === 'DELETE') return { background: '#ef4444' }
  if (type === 'REORDER') return { background: '#6366f1' }
  return { background: '#64748b' }
}

function changeTypeLabel(type?: ChangeType | null) {
  if (type === 'ADD')    return '추가 제안'
  if (type === 'MODIFY') return '수정 제안'
  if (type === 'DELETE') return '삭제 제안'
  if (type === 'REORDER') return '순서변경 제안'
  return '변경 제안'
}

function nodeResourceSourceLabel(sourceType?: string | null) {
  switch ((sourceType ?? '').toUpperCase()) {
    case 'BLOG':
      return '블로그'
    case 'DOCS':
      return '문서'
    case 'VIDEO':
      return '영상'
    case 'OFFICIAL':
      return '공식'
    case 'COURSE':
      return '강의'
    default:
      return '자료'
  }
}

type EssentialConcept = {
  title: string
  description: string | null
}

function parseEssentialConcept(topic: string): EssentialConcept {
  const normalized = topic.trim()
  const separatorIndex = normalized.indexOf(':')

  if (separatorIndex <= 0) {
    return { title: normalized, description: null }
  }

  const title = normalized.slice(0, separatorIndex).trim()
  const description = normalized.slice(separatorIndex + 1).trim()

  return {
    title: title || normalized,
    description: description || null,
  }
}

function splitNodeDescription(content?: string | null) {
  const fallback = '상세 내용 준비 중입니다.'
  return (content && content.trim() ? content : fallback)
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function changeTypeIcon(type?: ChangeType | null) {
  if (type === 'ADD')    return 'fa-plus'
  if (type === 'MODIFY') return 'fa-edit'
  if (type === 'DELETE') return 'fa-trash'
  if (type === 'REORDER') return 'fa-arrows-up-down'
  return 'fa-history'
}

function changeChipStyle(type?: ChangeType | null): string {
  if (type === 'ADD')    return 'text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded'
  if (type === 'MODIFY') return 'text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded'
  if (type === 'DELETE') return 'text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded'
  if (type === 'REORDER') return 'text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded'
  return 'text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded'
}

function changeChipLabel(type?: ChangeType | null) {
  if (type === 'ADD')    return '추가'
  if (type === 'MODIFY') return '수정'
  if (type === 'DELETE') return '삭제'
  if (type === 'REORDER') return '순서변경'
  return '변경'
}

interface ProofCardBadgeProps {
  card: ProofCardSummary
}

// Proof 카드를 노드 내부 왼쪽 위(필수 배지와 동일 높이)에 출력해 옆 브랜치 노드와의 겹침을 방지한다.
function ProofCardBadge({ card }: ProofCardBadgeProps) {
  return (
    <div className="proof-card-badge" title={card.title} onClick={(e) => e.stopPropagation()}>
      <i className="fas fa-medal" />
      <span className="proof-card-badge-text">{card.title}</span>
    </div>
  )
}

interface ChangeLabelProps {
  change: RecommendationChange
}

function ChangeLabel({ change }: ChangeLabelProps) {
  return (
    <div
      className="absolute flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg"
      style={{
        top: '-32px',
        left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
        zIndex: 30,
        ...changeBadgeStyle(change.nodeChangeType),
      }}
    >
      <i className={`fas ${changeTypeIcon(change.nodeChangeType)}`} />
      {changeTypeLabel(change.nodeChangeType)}
    </div>
  )
}

type RoadmapLane = 'side-left' | 'left' | 'center' | 'right' | 'side-right'
type LayoutSlotKind = 'main-spine' | 'official-branch' | 'applied-branch' | 'suggested-branch' | 'ghost-add'
type LayoutEdgeKind = 'spine' | 'branch' | 'split' | 'merge' | 'applied-branch' | 'suggestion'
type EdgeTheme = 'default' | 'review' | 'advanced' | 'suggestion'

const ROADMAP_LANE_COLUMN: Record<RoadmapLane, number> = {
  'side-left': 1,
  left: 1,
  center: 2,
  right: 3,
  'side-right': 3,
}

type LayoutSpineItem =
  | { kind: 'node'; node: RoadmapNodeItem }
  | { kind: 'add'; change: RecommendationChange }

interface BranchBadgeMeta {
  label: string
  background: string
  color: string
  borderColor: string
  theme: EdgeTheme
}

interface LayoutSlot {
  id: string
  kind: LayoutSlotKind
  lane: RoadmapLane
  row: number
  stackOffset?: number
  node?: RoadmapNodeItem
  change?: RecommendationChange
  badge?: BranchBadgeMeta
}

interface LayoutEdge {
  id: string
  from: string
  to: string
  kind: LayoutEdgeKind
  theme: EdgeTheme
}

interface RoadmapLayout {
  slots: LayoutSlot[]
  edges: LayoutEdge[]
  rowCount: number
}

interface SlotRect {
  x: number
  y: number
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

function getBranchBadgeMeta(branchType?: string | null): BranchBadgeMeta {
  if (branchType === 'REVIEW') {
    return {
      label: '복습',
      background: '#fff7ed',
      color: '#ea580c',
      borderColor: '#fdba74',
      theme: 'review',
    }
  }
  if (branchType === 'ADVANCED') {
    return {
      label: '심화',
      background: '#eef2ff',
      color: '#4338ca',
      borderColor: '#a5b4fc',
      theme: 'advanced',
    }
  }
  return {
    label: '추천',
    background: '#eff6ff',
    color: '#1e40af',
    borderColor: '#93c5fd',
    theme: 'suggestion',
  }
}

function getSuggestionBadgeMeta(change: RecommendationChange): BranchBadgeMeta {
  const sourceText = `${change.nodeTitle} ${change.reason} ${change.contextSummary}`.toLowerCase()
  if (sourceText.includes('복습') || sourceText.includes('review')) {
    return getBranchBadgeMeta('REVIEW')
  }
  if (sourceText.includes('심화') || sourceText.includes('advanced')) {
    return getBranchBadgeMeta('ADVANCED')
  }
  return getBranchBadgeMeta(null)
}

function getOfficialBranchBadgeMeta(branchGroup: number): BranchBadgeMeta {
  return {
    label: `분기 ${branchGroup}`,
    background: '#f0f9ff',
    color: '#0369a1',
    borderColor: '#7dd3fc',
    theme: 'default',
  }
}

function sortRoadmapNodes(nodes: RoadmapNodeItem[]) {
  return [...nodes].sort((a, b) => a.sortOrder - b.sortOrder || a.customNodeId - b.customNodeId)
}

function sortChanges(changes: RecommendationChange[]) {
  return [...changes].sort(
    (a, b) => (a.nodeSortOrder ?? 9999) - (b.nodeSortOrder ?? 9999) || a.changeId - b.changeId,
  )
}

function makeLayoutSlotId(item: LayoutSpineItem) {
  return item.kind === 'node' ? `node-${item.node.customNodeId}` : `add-${item.change.changeId}`
}

function getLayoutSpineOrder(item: LayoutSpineItem) {
  return item.kind === 'node' ? item.node.sortOrder : item.change.nodeSortOrder ?? 9999
}

function makeLayoutSpineItems(nodes: RoadmapNodeItem[], adds: RecommendationChange[]): LayoutSpineItem[] {
  return [
    ...nodes.map((node) => ({ kind: 'node' as const, node })),
    ...adds.map((change) => ({ kind: 'add' as const, change })),
  ].sort((a, b) => getLayoutSpineOrder(a) - getLayoutSpineOrder(b))
}

function getOfficialBranchLane(groupIndex: number): RoadmapLane {
  return groupIndex % 2 === 0 ? 'left' : 'right'
}

const OFFICIAL_BRANCH_OFFSET_Y = 40
const POST_BRANCH_SPINE_OFFSET_Y = 88

function buildRoadmapLayout(nodes: RoadmapNodeItem[], changes: RecommendationChange[]): RoadmapLayout {
  const slots: LayoutSlot[] = []
  const edges: LayoutEdge[] = []
  const sortedNodes = sortRoadmapNodes(nodes)
  const suggestedBranchNodes = sortedNodes.filter((node) => node.isBranch)
  const structuralNodes = sortedNodes.filter((node) => !node.isBranch)
  const officialBranchNodes = structuralNodes.filter((node) => node.branchGroup != null)
  const officialBranchGroups = Array.from(
    new Set(
      officialBranchNodes
        .map((node) => node.branchGroup)
        .filter((branchGroup): branchGroup is number => branchGroup != null),
    ),
  ).sort((a, b) => a - b)
  const hasOfficialBranch = officialBranchGroups.length > 0
  const branchOrders = officialBranchNodes.map((node) => node.sortOrder)
  const minBranchOrder = hasOfficialBranch ? Math.min(...branchOrders) : Infinity
  const maxBranchOrder = hasOfficialBranch ? Math.max(...branchOrders) : -Infinity
  const spineNodes = structuralNodes.filter((node) => node.branchGroup == null)
  const addChanges = sortChanges(changes.filter((change) => change.nodeChangeType === 'ADD'))
  const branchAddChanges = addChanges.filter((change) => change.branchFromNodeId != null)
  const spineAddChanges = addChanges.filter((change) => change.branchFromNodeId == null)
  const suggestedNodesBySource = new Map<number, RoadmapNodeItem[]>()
  const suggestedAddsBySource = new Map<number, RecommendationChange[]>()
  const usedBranchRows = new Set<number>()
  let row = 1
  let rowCount = 1
  let previousCenterSlotId: string | null = null

  suggestedBranchNodes.forEach((node) => {
    if (node.branchFromNodeId == null) return
    const items = suggestedNodesBySource.get(node.branchFromNodeId) ?? []
    items.push(node)
    suggestedNodesBySource.set(node.branchFromNodeId, items)
  })

  branchAddChanges.forEach((change) => {
    if (change.branchFromNodeId == null) return
    const items = suggestedAddsBySource.get(change.branchFromNodeId) ?? []
    items.push(change)
    suggestedAddsBySource.set(change.branchFromNodeId, items)
  })

  function addSlot(slot: LayoutSlot) {
    slots.push(slot)
    rowCount = Math.max(rowCount, slot.row)
    return slot
  }

  function addEdge(from: string | null | undefined, to: string | null | undefined, kind: LayoutEdgeKind, theme: EdgeTheme = 'default') {
    if (!from || !to) return
    edges.push({ id: `${kind}-${from}-${to}-${edges.length}`, from, to, kind, theme })
  }

  function addCenteredSlot(slot: Omit<LayoutSlot, 'lane' | 'row'>, edgeKind: LayoutEdgeKind, theme: EdgeTheme = 'default') {
    const centeredSlot = addSlot({
      ...slot,
      lane: 'center',
      row,
    })
    addEdge(previousCenterSlotId, centeredSlot.id, edgeKind, theme)
    previousCenterSlotId = centeredSlot.id
    row += 1
    return centeredSlot
  }

  function reserveBranchRow(preferredRow: number) {
    let branchRow = preferredRow
    while (usedBranchRows.has(branchRow)) {
      branchRow += 1
    }
    usedBranchRows.add(branchRow)
    return branchRow
  }

  function addBranchSlot(
    sourceSlot: LayoutSlot,
    slot: Omit<LayoutSlot, 'lane' | 'row'>,
    offset: number,
    edgeKind: LayoutEdgeKind = 'suggestion',
    theme: EdgeTheme = 'suggestion',
  ) {
    // 추천 노드는 출발 노드와 같은 쪽에 배치한다. 좌측 분기는 좌측, 우측 분기는 우측,
    // 척추(center)에서 출발한 추천은 기존대로 우측에 둔다. (반대편 분기와의 겹침 방지)
    const branchLane: RoadmapLane =
      sourceSlot.lane === 'left' || sourceSlot.lane === 'side-left' ? 'left' : 'right'
    const branchSlot = addSlot({
      ...slot,
      lane: branchLane,
      row: reserveBranchRow(sourceSlot.row + offset),
      stackOffset: slot.stackOffset ?? sourceSlot.stackOffset,
    })
    addEdge(sourceSlot.id, branchSlot.id, edgeKind, theme)
    return branchSlot
  }

  function addSuggestedNode(node: RoadmapNodeItem, sourceSlot: LayoutSlot, offset: number) {
    const badge = getBranchBadgeMeta(node.branchType)
    addBranchSlot(sourceSlot, {
      id: `suggested-node-${node.customNodeId}`,
      kind: 'applied-branch',
      node,
      badge,
    }, offset, 'applied-branch', badge.theme)
  }

  function addSuggestedChange(change: RecommendationChange, sourceSlot: LayoutSlot, offset: number) {
    addBranchSlot(sourceSlot, {
      id: `suggested-add-${change.changeId}`,
      kind: 'suggested-branch',
      change,
      badge: getSuggestionBadgeMeta(change),
    }, offset)
  }

  function addSuggestions(sourceOriginalNodeId: number | null, sourceSlot: LayoutSlot) {
    if (sourceOriginalNodeId == null) {
      return
    }
    const suggestedNodes = suggestedNodesBySource.get(sourceOriginalNodeId) ?? []
    const suggestedAdds = suggestedAddsBySource.get(sourceOriginalNodeId) ?? []
    let offset = 0

    suggestedNodes.forEach((node) => {
      addSuggestedNode(node, sourceSlot, offset)
      offset += 1
    })
    suggestedAdds.forEach((change) => {
      addSuggestedChange(change, sourceSlot, offset)
      offset += 1
    })
  }

  function addSpineItem(
    item: LayoutSpineItem,
    options: { connectFromPrevious?: boolean; edgeKind?: LayoutEdgeKind; theme?: EdgeTheme; stackOffset?: number } = {},
  ) {
    const {
      connectFromPrevious = true,
      edgeKind = item.kind === 'node' ? 'spine' : 'suggestion',
      theme = item.kind === 'add' ? 'suggestion' : 'default',
      stackOffset,
    } = options
    const id = makeLayoutSlotId(item)
    if (!connectFromPrevious) previousCenterSlotId = null
    const sourceSlot = addCenteredSlot({
      id,
      kind: item.kind === 'node' ? 'main-spine' : 'ghost-add',
      stackOffset,
      node: item.kind === 'node' ? item.node : undefined,
      change: item.kind === 'add' ? item.change : undefined,
      badge: item.kind === 'add' ? getSuggestionBadgeMeta(item.change) : undefined,
    }, edgeKind, theme)
    if (item.kind === 'node') {
      addSuggestions(item.node.originalNodeId, sourceSlot)
    }
    return sourceSlot
  }

  function addOfficialBranchGroup(
    branchGroup: number,
    lane: RoadmapLane,
    branchStartRow: number,
    splitSourceSlotId: string | null,
  ): string | null {
    const groupNodes = officialBranchNodes
      .filter((node) => node.branchGroup === branchGroup)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.customNodeId - b.customNodeId)
    let previousBranchSlotId: string | null = null
    let lastBranchSlotId: string | null = null

    groupNodes.forEach((node, index) => {
      const branchSlot = addSlot({
        id: `node-${node.customNodeId}`,
        kind: 'official-branch',
        lane,
        row: branchStartRow + index,
        stackOffset: OFFICIAL_BRANCH_OFFSET_Y,
        node: {
          ...node,
          branchGroup: node.branchGroup ?? branchGroup,
        },
        badge: getOfficialBranchBadgeMeta(branchGroup),
      })
      usedBranchRows.add(branchSlot.row)

      if (index === 0) {
        addEdge(splitSourceSlotId, branchSlot.id, 'split')
      } else {
        addEdge(previousBranchSlotId, branchSlot.id, 'branch')
      }

      previousBranchSlotId = branchSlot.id
      lastBranchSlotId = branchSlot.id
      addSuggestions(node.originalNodeId, branchSlot)
    })

    return lastBranchSlotId
  }

  const preSpineNodes = hasOfficialBranch
    ? spineNodes.filter((node) => node.sortOrder < minBranchOrder)
    : spineNodes
  const postSpineNodes = hasOfficialBranch
    ? spineNodes.filter((node) => node.sortOrder > maxBranchOrder)
    : []
  const preSpineAdds = hasOfficialBranch
    ? spineAddChanges.filter((change) => (change.nodeSortOrder ?? 9999) < minBranchOrder)
    : spineAddChanges
  const postSpineAdds = hasOfficialBranch
    ? spineAddChanges.filter((change) => (change.nodeSortOrder ?? 9999) >= minBranchOrder)
    : []

  makeLayoutSpineItems(preSpineNodes, preSpineAdds).forEach((item) => {
    addSpineItem(item)
  })

  if (hasOfficialBranch) {
    const branchStartRow = row
    const splitSourceSlotId = previousCenterSlotId
    const maxBranchDepth = Math.max(
      0,
      ...officialBranchGroups.map((branchGroup) => (
        officialBranchNodes.filter((node) => node.branchGroup === branchGroup).length
      )),
    )
    // 공식 분기 노드가 차지할 행을 미리 선점해, 분기 노드에 달리는 추천 노드가
    // 분기 팬 아래의 빈 행으로 안전하게 내려가도록 한다(같은 컬럼 행 충돌 방지).
    for (let i = 0; i < maxBranchDepth; i += 1) {
      usedBranchRows.add(branchStartRow + i)
    }
    const branchEndSlotIds = officialBranchGroups
      .map((branchGroup, index) => addOfficialBranchGroup(
        branchGroup,
        getOfficialBranchLane(index),
        branchStartRow,
        splitSourceSlotId,
      ))
      .filter((slotId): slotId is string => slotId != null)
    row = Math.max(branchStartRow + maxBranchDepth, rowCount + 1)

    const postSpineItems = makeLayoutSpineItems(postSpineNodes, postSpineAdds)
    if (branchEndSlotIds.length > 0 && postSpineItems.length > 0) {
      const mergeSlot = addSpineItem(postSpineItems[0], {
        connectFromPrevious: false,
        stackOffset: POST_BRANCH_SPINE_OFFSET_Y,
      })
      branchEndSlotIds.forEach((slotId) => addEdge(slotId, mergeSlot.id, 'merge'))
      postSpineItems.slice(1).forEach((item) => {
        addSpineItem(item, { stackOffset: POST_BRANCH_SPINE_OFFSET_Y })
      })
    } else {
      postSpineItems.forEach((item) => {
        addSpineItem(item, { stackOffset: POST_BRANCH_SPINE_OFFSET_Y })
      })
    }
  }

  return { slots, edges, rowCount }
}

const roadmapRuleBadgeClassName =
  'absolute top-[-10px] right-[10px] [font-size:0.7rem] [padding:2px_8px] [border-radius:99px] [font-weight:800] [border:1px_solid] z-[30] [box-shadow:0_2px_4px_rgba(0,0,0,0.1)]'
const roadmapNodeHeaderClassName = 'flex w-full min-w-0 items-center justify-between gap-[10px]'
const roadmapNodeTitleGroupClassName = 'flex min-w-0 flex-[1_1_auto] items-center gap-[8px] [font-size:1.05rem] [&_i]:flex-[0_0_auto]'
const roadmapNodeTitleTextClassName = 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'
const roadmapNodeDescriptionClassName = 'mt-[4px] whitespace-normal [overflow-wrap:anywhere] [font-size:0.75rem] leading-[1.4] [font-weight:500] opacity-[0.7]'
const roadmapNodeMetaClassName = 'ml-auto flex flex-[0_0_auto] gap-[4px] whitespace-nowrap'
const roadmapNodeMetaTagClassName = 'inline-flex flex-[0_0_auto] items-center whitespace-nowrap bg-[rgba(0,0,0,0.06)] [padding:2px_8px] rounded-[4px] [font-size:0.7rem] [font-weight:normal] leading-[1.2]'

interface RoadmapNodeCardProps {
  node: RoadmapNodeItem
  proofCard?: ProofCardSummary
  pendingChange?: RecommendationChange
  badge?: BranchBadgeMeta
  onNodeClick?: (node: RoadmapNodeItem) => void
}

function RoadmapNodeCard({ node, proofCard, pendingChange, badge, onNodeClick }: RoadmapNodeCardProps) {
  const readyToClear = isNodeReadyToClear(node)
  const progressPercent = node.clearProgressPercent ?? getNodeLessonProgressPercent(node)
  const visibleBadge = badge ?? {
    label: '필수',
    background: '#ecfdf5',
    color: '#166534',
    borderColor: '#00c471',
    theme: 'default' as const,
  }

  function handleClick() {
    onNodeClick?.(node)
  }

  return (
    <div className={getNodeBoxClass(node, pendingChange)} onClick={handleClick}>
      {pendingChange && <ChangeLabel change={pendingChange} />}
      {proofCard && node.status === 'COMPLETED' && (
        <ProofCardBadge card={proofCard} />
      )}
      <div
        className={roadmapRuleBadgeClassName}
        style={{
          background: visibleBadge.background,
          color: visibleBadge.color,
          borderColor: visibleBadge.borderColor,
        }}
      >
        {visibleBadge.label}
      </div>
      <div className={roadmapNodeHeaderClassName}>
        <div className={roadmapNodeTitleGroupClassName}>
          {node.status === 'COMPLETED' && (
            <i className="fas fa-check-circle" style={{ color: '#00c471' }} />
          )}
          {node.status === 'IN_PROGRESS' && (
            <i className="fas fa-spinner" style={{ color: '#eab308' }} />
          )}
          {readyToClear && node.status !== 'IN_PROGRESS' && (
            <i className="fas fa-circle-check" style={{ color: '#eab308' }} />
          )}
          {node.status === 'LOCKED' && (
            <i className="fas fa-lock" style={{ color: '#94a3b8' }} />
          )}
          {isPendingNodeStatus(node.status) && !readyToClear && (
            <i className="fas fa-circle" style={{ color: '#cbd5e1' }} />
          )}
          <span className={roadmapNodeTitleTextClassName} title={node.title}>{node.title}</span>
        </div>
        {node.status === 'IN_PROGRESS' && (
          <div className={roadmapNodeMetaClassName}>
            <span className={roadmapNodeMetaTagClassName}>진행중</span>
          </div>
        )}
        {readyToClear && node.status !== 'IN_PROGRESS' && (
          <div className={roadmapNodeMetaClassName}>
            <span className={roadmapNodeMetaTagClassName}>완료가능</span>
          </div>
        )}
        {isPendingNodeStatus(node.status) && !readyToClear && !node.deferred && (
          <div className={roadmapNodeMetaClassName}>
            <span className={roadmapNodeMetaTagClassName}>대기중</span>
          </div>
        )}
        {node.deferred && node.status !== 'COMPLETED' && (
          <div className={roadmapNodeMetaClassName}>
            <span className={roadmapNodeMetaTagClassName}>스킵</span>
          </div>
        )}
      </div>
      {node.content && <div className={roadmapNodeDescriptionClassName}>{node.content}</div>}
      {node.requiredTags && node.requiredTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {node.requiredTags.map((tag) => {
            const satisfied = (node.satisfiedTags ?? []).includes(tag)
            return (
              <span
                key={tag}
                className={
                  satisfied
                    ? 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300'
                    : 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200'
                }
              >
                {tag}
              </span>
            )
          })}
        </div>
      )}
      {node.status !== 'COMPLETED' && node.status !== 'LOCKED'
        && (node.status === 'IN_PROGRESS' || readyToClear || progressPercent > 0) && (
        <div className="progress-container mt-[6px] flex w-full items-center gap-[8px]">
          <div className="node-progress-bg h-[6px] overflow-hidden rounded-[99px] bg-[rgba(0,0,0,0.1)] [flex:1_1_0%]">
            <div
              className="node-progress-bar h-full rounded-[99px] bg-[#eab308]"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
          <span className="progress-pct whitespace-nowrap text-[#b45309] [font-size:10px] [font-weight:800]">
            {progressPercent}%
          </span>
        </div>
      )}
    </div>
  )
}

interface GhostAddCardProps {
  change: RecommendationChange
  processing: boolean
  badge?: BranchBadgeMeta
  onApply: (id: number) => void
  onIgnore: (id: number) => void
}

function GhostAddCard({ change, processing, badge, onApply, onIgnore }: GhostAddCardProps) {
  const visibleBadge = badge ?? getBranchBadgeMeta(null)

  return (
    <div
      className={`${roadmapNodeBoxClassName} node-change-add border-[3px]! border-dashed! border-[#3b82f6]! bg-[#eff6ff]! [animation:pulse-blue_2s_infinite]`}
      style={{ color: '#1e40af' }}
    >
      <ChangeLabel change={change} />
      <div
        className={roadmapRuleBadgeClassName}
        style={{
          background: visibleBadge.background,
          color: visibleBadge.color,
          borderColor: visibleBadge.borderColor,
        }}
      >
        {visibleBadge.label}
      </div>
      <div className={roadmapNodeHeaderClassName}>
        <div className={roadmapNodeTitleGroupClassName}>
          <i className="fas fa-plus-circle text-blue-500" />
          <span className={roadmapNodeTitleTextClassName} title={change.nodeTitle}>{change.nodeTitle}</span>
        </div>
      </div>
      <div className={roadmapNodeDescriptionClassName}>{change.contextSummary || change.reason}</div>
      <div className="mt-2 flex gap-1.5">
        <button
          disabled={processing}
          onClick={() => onApply(change.changeId)}
          className="rounded-md bg-blue-500 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          추가 적용
        </button>
        <button
          disabled={processing}
          onClick={() => onIgnore(change.changeId)}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-0.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-50"
        >
          무시
        </button>
      </div>
    </div>
  )
}

function areSlotRectsEqual(left: Record<string, SlotRect>, right: Record<string, SlotRect>) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => {
    const a = left[key]
    const b = right[key]
    return b && a.x === b.x && a.y === b.y && a.top === b.top && a.right === b.right
      && a.bottom === b.bottom && a.left === b.left && a.width === b.width && a.height === b.height
  })
}

function makeEdgePath(edge: LayoutEdge, rects: Record<string, SlotRect>) {
  const from = rects[edge.from]
  const to = rects[edge.to]
  if (!from || !to) return null

  if (edge.kind === 'suggestion' || edge.kind === 'applied-branch') {
    if (Math.abs(from.x - to.x) < 2) {
      return `M ${from.x} ${from.bottom} L ${to.x} ${to.top}`
    }
    const exitsRight = to.x >= from.x
    const startX = exitsRight ? from.right : from.left
    const startY = from.y
    const endX = exitsRight ? to.left : to.right
    const endY = to.y
    if (Math.abs(startY - endY) < 2) {
      return `M ${startX} ${startY} L ${endX} ${endY}`
    }
    const midX = startX + (endX - startX) / 2
    return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`
  }

  const startX = from.x
  const startY = from.bottom
  const endX = to.x
  const endY = to.top
  if (Math.abs(startX - endX) < 2) {
    return `M ${startX} ${startY} L ${endX} ${endY}`
  }

  if (edge.kind === 'split') {
    const splitBusY = startY + 46
    const midY = splitBusY < endY ? splitBusY : endY - 24
    return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`
  }

  if (edge.kind === 'merge') {
    const mergeBusY = endY - 46
    const midY = mergeBusY > startY ? mergeBusY : startY + 24
    return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`
  }

  const midY = startY + Math.max(28, (endY - startY) / 2)
  return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`
}

interface RoadmapGraphProps {
  layout: RoadmapLayout
  proofCardByNodeId: Record<number, ProofCardSummary | undefined>
  changeByNodeId: Record<number, RecommendationChange | undefined>
  processing: boolean
  onNodeClick: (node: RoadmapNodeItem) => void
  onApply: (id: number) => void
  onIgnore: (id: number) => void
}

function RoadmapGraph({
  layout,
  proofCardByNodeId,
  changeByNodeId,
  processing,
  onNodeClick,
  onApply,
  onIgnore,
}: RoadmapGraphProps) {
  const graphRef = useRef<HTMLDivElement | null>(null)
  const slotRefs = useRef(new Map<string, HTMLDivElement>())
  const [slotRects, setSlotRects] = useState<Record<string, SlotRect>>({})
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    function measure() {
      const graph = graphRef.current
      if (!graph) return
      const graphRect = graph.getBoundingClientRect()
      const nextRects: Record<string, SlotRect> = {}

      slotRefs.current.forEach((element, id) => {
        const rect = element.getBoundingClientRect()
        nextRects[id] = {
          x: Math.round(rect.left - graphRect.left + rect.width / 2),
          y: Math.round(rect.top - graphRect.top + rect.height / 2),
          top: Math.round(rect.top - graphRect.top),
          right: Math.round(rect.right - graphRect.left),
          bottom: Math.round(rect.bottom - graphRect.top),
          left: Math.round(rect.left - graphRect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })

      const nextGraphSize = {
        width: Math.round(graphRect.width),
        height: Math.round(graphRect.height),
      }
      setGraphSize((current) => current.width === nextGraphSize.width && current.height === nextGraphSize.height
        ? current
        : nextGraphSize)
      setSlotRects((current) => areSlotRectsEqual(current, nextRects) ? current : nextRects)
    }

    measure()
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (resizeObserver) {
      if (graphRef.current) resizeObserver.observe(graphRef.current)
      slotRefs.current.forEach((element) => resizeObserver.observe(element))
    }
    window.addEventListener('resize', measure)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [layout])

  function registerSlot(id: string) {
    return (element: HTMLDivElement | null) => {
      if (element) {
        slotRefs.current.set(id, element)
      } else {
        slotRefs.current.delete(id)
      }
    }
  }

  function renderSlot(slot: LayoutSlot) {
    if (slot.node) {
      const nodeOriginalId = slot.node.originalNodeId
      return (
        <RoadmapNodeCard
          node={slot.node}
          proofCard={nodeOriginalId == null ? undefined : proofCardByNodeId[nodeOriginalId]}
          pendingChange={nodeOriginalId == null ? undefined : changeByNodeId[nodeOriginalId]}
          badge={slot.badge}
          onNodeClick={onNodeClick}
        />
      )
    }
    if (slot.change) {
      return (
        <GhostAddCard
          change={slot.change}
          processing={processing}
          badge={slot.badge}
          onApply={onApply}
          onIgnore={onIgnore}
        />
      )
    }
    return null
  }

  return (
    <div className="roadmap-canvas-scroll">
      <div
        ref={graphRef}
        className="roadmap-graph"
        style={{
          gridTemplateRows: `repeat(${Math.max(layout.rowCount, 1)}, minmax(var(--roadmap-row-min-height), auto))`,
        }}
      >
        <svg
          className="roadmap-edge-layer"
          width={graphSize.width}
          height={graphSize.height}
          viewBox={`0 0 ${graphSize.width} ${graphSize.height}`}
          aria-hidden="true"
        >
          {layout.edges.map((edge) => {
            const path = makeEdgePath(edge, slotRects)
            if (!path) return null
            return (
              <path
                key={edge.id}
                d={path}
                className={`roadmap-edge roadmap-edge-${edge.kind} roadmap-edge-theme-${edge.theme}`}
              />
            )
          })}
        </svg>

        {layout.slots.map((slot) => (
          <div
            key={slot.id}
            ref={registerSlot(slot.id)}
            className={`roadmap-slot roadmap-slot-${slot.kind} roadmap-lane-${slot.lane} ${
              slot.kind === 'suggested-branch'
                ? '[&_.node-box]:border-[3px]! [&_.node-box]:border-dashed! [&_.node-box]:border-[#3b82f6]! [&_.node-box]:bg-[#eff6ff]! [&_.node-box]:text-[#1e40af] [&_.node-box]:[animation:pulse-blue_2s_infinite]'
                : ''
            }`}
            style={{
              gridColumn: ROADMAP_LANE_COLUMN[slot.lane],
              gridRow: slot.row,
              '--slot-offset-y': `${slot.stackOffset ?? 0}px`,
            } as CSSProperties}
          >
            {renderSlot(slot)}
          </div>
        ))}
      </div>
    </div>
  )
}

function buildRoadmapReturnHref(customRoadmapId: number, customNodeId?: number | null) {
  const params = new URLSearchParams({ id: String(customRoadmapId) })
  if (customNodeId) params.set('nodeId', String(customNodeId))
  return `/roadmap?${params.toString()}`
}

function appendReturnTo(href: string, returnTo: string) {
  const [path, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  params.set('returnTo', returnTo)
  return `${path}?${params.toString()}`
}

function buildCourseDetailUrl(courseId: number, returnTo: string, originalRoadmapId?: number | null, originalNodeId?: number | null) {
  let url = `/course-detail?courseId=${courseId}`
  if (originalRoadmapId != null) url += `&originalRoadmapId=${originalRoadmapId}`
  if (originalNodeId != null) url += `&originalNodeId=${originalNodeId}`
  return appendReturnTo(url, returnTo)
}

function buildLectureListUrl(tags: string[], returnTo?: string): string {
  const params = new URLSearchParams()
  if (tags.length > 0) params.set('tags', tags.join(','))
  if (returnTo) params.set('returnTo', returnTo)
  const query = params.toString()
  return `/lecture-list${query ? `?${query}` : ''}`
}

interface NodeDrawerProps {
  node: RoadmapNodeItem | null
  customRoadmapId: number
  originalRoadmapId: number | null
  editMode: boolean
  onClose: () => void
  onCleared: () => void
}

function NodeDrawer({ node, customRoadmapId, originalRoadmapId, editMode, onClose, onCleared }: NodeDrawerProps) {
  const [clearing, setClearing] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!node) return null

  async function handleDefer() {
    if (!node) return
    const next = !node.deferred
    const message = next
      ? `"${node.title}" 노드를 스킵하시겠습니까? 완료하지 않아도 다음 노드를 진행할 수 있습니다.`
      : `"${node.title}" 노드의 스킵을 해제하시겠습니까?`
    if (!confirm(message)) return
    setBusy(true)
    try {
      if (next) await roadmapApi.deferNode(customRoadmapId, node.customNodeId)
      else await roadmapApi.undeferNode(customRoadmapId, node.customNodeId)
      onCleared()
      onClose()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!node) return
    if (!confirm(`"${node.title}" 노드를 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return
    setBusy(true)
    try {
      await roadmapApi.deleteNode(customRoadmapId, node.customNodeId)
      onCleared()
      onClose()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(up: boolean) {
    if (!node) return
    setBusy(true)
    try {
      if (up) await roadmapApi.moveNodeUp(customRoadmapId, node.customNodeId)
      else await roadmapApi.moveNodeDown(customRoadmapId, node.customNodeId)
      onCleared()
      onClose()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSetBranch(branchGroup: number | null) {
    if (!node) return
    setBusy(true)
    try {
      await roadmapApi.setNodeBranch(customRoadmapId, node.customNodeId, branchGroup)
      onCleared()
      onClose()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleClear() {
    if (!node) return
    if (!confirm(`"${node.title}" 노드를 완료 처리하시겠습니까?`)) return
    setClearing(true)
    try {
      await roadmapApi.clearNode(customRoadmapId, node.customNodeId)

      // ── [TEST] 노드 완료 시 동적 추천 생성을 백그라운드로 트리거 ─────────────
      // 실 서비스에서는 진단 퀴즈 제출(submitQuizAnswer) 흐름으로 대체 예정
      const recommendationRoadmapId = originalRoadmapId ?? customRoadmapId
      const recommendationCustomRoadmapId = originalRoadmapId == null ? customRoadmapId : null
      if (node.originalNodeId != null) {
        try {
          await roadmapApi.testRunDiagnosis(
            recommendationRoadmapId,
            node.originalNodeId,
            recommendationCustomRoadmapId,
          )
        } catch (recErr) {
          console.warn('[TEST] 진단 추천 트리거 실패 (무시):', (recErr as Error).message)
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      onCleared()
      onClose()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setClearing(false)
    }
  }

  const canClear =
    (node.status === 'PENDING' || node.status === 'IN_PROGRESS')
    && isNodeReadyToClear(node)
  const roadmapReturnHref = buildRoadmapReturnHref(customRoadmapId, node.customNodeId)
  const resources = node.resources ?? []
  const descriptionParagraphs = splitNodeDescription(node.content)
  const concepts = (node.subTopics ?? []).map(parseEssentialConcept).filter((concept) => concept.title.length > 0)

  return (
    <>
      <div
        className="drawer-overlay fixed bottom-[0] left-[0] right-[0] top-[var(--roadmap-fixed-top)] z-[150] bg-[rgba(0,0,0,0.3)] [backdrop-filter:blur(2px)]"
        onClick={onClose}
      />
      <aside
        className={`side-drawer fixed right-[0] top-[var(--roadmap-fixed-top)] z-[200] flex h-[calc(100dvh-var(--roadmap-fixed-top))] w-[min(500px,100vw)] flex-col border-l-[1px] border-solid border-[#e5e7eb] bg-[#fff] [box-shadow:-4px_0_32px_rgba(0,0,0,0.12)] [transition:transform_0.3s_ease] ${node ? 'open [transform:translateX(0)]' : '[transform:translateX(100%)]'}`}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-white bg-black px-2 py-1 rounded">Topic</span>
              {node.status === 'COMPLETED' && (
                <span className="text-[10px] font-bold text-white bg-[#00c471] px-2 py-1 rounded">완료</span>
              )}
              {node.status === 'IN_PROGRESS' && (
                <span className="text-[10px] font-bold text-white bg-yellow-400 px-2 py-1 rounded">진행중</span>
              )}
              {node.deferred && node.status !== 'COMPLETED' && (
                <span className="text-[10px] font-bold text-white bg-gray-400 px-2 py-1 rounded">스킵</span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 leading-tight break-words">{node.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600 p-2">
            <i className="fas fa-times text-xl" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="mb-[34px] text-[#374151] [font-size:0.9rem] [font-weight:500] [line-height:1.9] [&_p+p]:mt-[14px]">
            {descriptionParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <section className="mb-[34px]">
            <h3 className="mb-[12px] text-[#374151] [font-size:0.92rem] [font-weight:800]">반드시 알아야 할 개념</h3>
            {concepts.length > 0 ? (
              <ul className="m-[0] flex list-none flex-col gap-[10px] p-[0] text-[#4b5563] [font-size:0.9rem] [line-height:1.8]">
                {concepts.map((concept) => (
                  <li key={`${concept.title}-${concept.description ?? ''}`} className="relative pl-[14px] [overflow-wrap:anywhere] before:absolute before:left-[0] before:text-[#6b7280] before:content-['-'] before:[font-weight:700]">
                    <span className="text-[#374151] [font-weight:800]">{concept.title}</span>
                    {concept.description && (
                      <span className="text-[#4b5563] [font-weight:500]">: {concept.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="node-empty-text text-[#9ca3af] [font-size:0.86rem] [font-weight:600] [line-height:1.7] [padding:14px_0]">관리자에서 핵심 개념을 등록하면 여기에 표시됩니다.</p>
            )}
          </section>

          <section className="mb-[34px]">
            <h3 className="mb-[8px] flex items-center gap-[10px] border-b-[1px] border-solid border-[#edf2f7] pb-[12px] text-[#00a862] [font-size:0.92rem] [font-weight:800]">
              <i className="fas fa-heart text-[#00c471]" />
              추천 무료 자료
            </h3>
            {resources.length > 0 ? (
              <div className="flex flex-col">
                {resources.map((resource) => (
                  <a
                    key={resource.resourceId}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-[14px] border-b-[1px] border-solid border-[#edf2f7] [padding:13px_6px_14px] [color:inherit] no-underline [transition:background-color_0.15s_ease,color_0.15s_ease] hover:bg-[#f7fffb]"
                  >
                    <div className="min-w-[0]">
                      <span className="text-[#374151] [font-size:0.9rem] [font-weight:700] [line-height:1.5] underline underline-offset-[3px] group-hover:text-[#008f55]">{resource.title}</span>
                      {resource.description && (
                        <p className="mt-[5px] text-[#6b7280] [font-size:0.78rem] [font-weight:500] [line-height:1.55]">{resource.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-[4px] bg-[#e5e7eb] [padding:5px_7px] text-[#6b7280] [font-size:0.7rem] [font-weight:800] [line-height:1]">{nodeResourceSourceLabel(resource.sourceType)}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="node-empty-text text-[#9ca3af] [font-size:0.86rem] [font-weight:600] [line-height:1.7] [padding:14px_0]">추천 자료 준비 중입니다.</p>
            )}
          </section>
        </div>
        <div className="p-6 border-t border-gray-100 bg-white space-y-3 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {node.status === 'LOCKED' ? (
            <button
              disabled
              className="w-full bg-gray-100 text-gray-400 py-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 cursor-not-allowed"
            >
              <i className="fas fa-lock" /> 이전 노드를 완료해야 수강할 수 있습니다
            </button>
          ) : (
            <>
              {node.status !== 'COMPLETED' && (
                canClear
                  ? (
                    <button
                      onClick={handleClear}
                      disabled={clearing}
                      className="w-full bg-[#00c471] hover:bg-green-600 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition"
                    >
                      {clearing
                        ? <><i className="fas fa-spinner fa-spin" /> 처리 중...</>
                        : <><i className="fas fa-check-circle" /> 이 노드 완료하기</>
                      }
                    </button>
                  ) : (
                    // [TEMP] 추천 무료 강좌 이동 — 임시 하드코딩, 추후 삭제 예정
                    <button
                      onClick={async () => {
                        try {
                          const courseId = await roadmapApi.getRecommendedFreeCourse(customRoadmapId, node.customNodeId)
                          if (courseId) {
                            window.location.href = buildCourseDetailUrl(courseId, roadmapReturnHref, originalRoadmapId, node.originalNodeId)
                          } else {
                            window.location.href = buildLectureListUrl(node.requiredTags ?? [], roadmapReturnHref)
                          }
                        } catch {
                          window.location.href = buildLectureListUrl(node.requiredTags ?? [], roadmapReturnHref)
                        }
                      }}
                      className="w-full bg-[#00c471] hover:bg-green-600 text-white py-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition"
                    >
                      <i className="fas fa-play-circle" /> 추천 무료 강좌 보기
                    </button>
                    // [/TEMP]
                  )
              )}
              <button
                onClick={() => { window.location.href = buildLectureListUrl(node.requiredTags ?? [], roadmapReturnHref) }}
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition"
              >
                <i className="fas fa-list" /> 전체 강좌 목록 보기
              </button>
            </>
          )}
          {editMode && (
            <>
              <div className="flex gap-3">
                <button
                  onClick={() => handleMove(true)}
                  disabled={busy}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition"
                >
                  <i className="fas fa-arrow-up" /> 위로 이동
                </button>
                <button
                  onClick={() => handleMove(false)}
                  disabled={busy}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition"
                >
                  <i className="fas fa-arrow-down" /> 아래로 이동
                </button>
              </div>
              <div className="flex gap-2">
                <span className="self-center text-xs font-bold text-gray-400 shrink-0">분기</span>
                {([
                  { label: '중앙', value: null as number | null },
                  { label: '좌', value: 1 as number | null },
                  { label: '우', value: 2 as number | null },
                ]).map((opt) => {
                  const current = (node.branchGroup ?? null) === opt.value
                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleSetBranch(opt.value)}
                      disabled={busy || current}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm transition border ${
                        current
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3">
                {node.status !== 'COMPLETED' && (
                  <button
                    onClick={handleDefer}
                    disabled={busy}
                    className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition"
                  >
                    <i className="fas fa-pause-circle" /> {node.deferred ? '스킵 해제' : '스킵하기'}
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex-1 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50 text-red-600 py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition"
                >
                  <i className="fas fa-trash-alt" /> 삭제
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

// ── 변경사항 패널 ─────────────────────────────────────────────────────────────

interface ChangesPanelProps {
  open: boolean
  onClose: () => void
  pendingChanges: RecommendationChange[]
  histories: RecommendationChangeHistory[]
  onApply: (changeId: number) => void
  onIgnore: (changeId: number) => void
  onApplyAll: () => void
  processing: boolean
}

type FilterType = 'all' | 'ADD' | 'MODIFY' | 'DELETE' | 'REORDER'

const changesPanelTabClassName = 'tab-btn flex-[1_1_0] min-w-0 m-0! [padding:12px_0]! [font-weight:bold]! [font-size:14px]! border-b-[2px]! [border-bottom-style:solid]!'
const changesPanelActiveTabClassName = 'active border-b-[#00c471]! bg-[#f0fdf4] text-[#00c471]!'
const changesPanelInactiveTabClassName = 'border-b-transparent! text-[#64748b]!'

function ChangesPanel({
  open,
  onClose,
  pendingChanges,
  histories,
  onApply,
  onIgnore,
  onApplyAll,
  processing,
}: ChangesPanelProps) {
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = filter === 'all'
    ? pendingChanges
    : pendingChanges.filter((c) => c.nodeChangeType === filter)

  return (
    <div
      id="changesPanel"
      className={`changes-panel fixed bottom-[0] right-[0] top-[var(--roadmap-fixed-top)] z-[100] flex w-[var(--changes-panel-width)] flex-col border-l-[1px] border-solid border-[#e5e7eb] bg-[#fff] [box-shadow:-4px_0_24px_rgba(0,0,0,0.08)] [transition:transform_0.3s_ease] ${open ? 'open [transform:translateX(0)]' : '[transform:translateX(100%)]'}`}
    >
      {/* 패널 헤더 */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="font-bold text-lg text-gray-900">로드맵 관리</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <i className="fas fa-times text-xl" />
        </button>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-100 bg-white">
        <button
          className={`${changesPanelTabClassName} ${tab === 'pending' ? changesPanelActiveTabClassName : changesPanelInactiveTabClassName}`}
          onClick={() => setTab('pending')}
        >
          대기중 ({pendingChanges.length})
        </button>
        <button
          className={`${changesPanelTabClassName} ${tab === 'history' ? changesPanelActiveTabClassName : changesPanelInactiveTabClassName}`}
          onClick={() => setTab('history')}
        >
          완료됨 ({histories.length})
        </button>
      </div>

      {/* 필터 (pending 탭에서만) */}
      {tab === 'pending' && (
        <div className="flex gap-2 p-3 bg-white border-b border-gray-100 overflow-x-auto">
          {(['all', 'ADD', 'MODIFY', 'DELETE', 'REORDER'] as const).map((f) => (
            <button
              key={f}
              className={`[padding:4px_10px] [border-radius:99px] [font-size:11px]! [font-weight:bold] cursor-pointer ${
                filter === f
                  ? '[border:1px_solid_#1e293b] bg-[#1e293b] text-[#fff]'
                  : '[border:1px_solid_#e2e8f0] text-[#64748b]'
              }`}
              onClick={() => setFilter(f)}
            >
              {f === 'all'
                ? '전체'
                : f === 'ADD'
                  ? '추가'
                  : f === 'MODIFY'
                    ? '수정'
                    : f === 'DELETE'
                      ? '삭제'
                      : '순서변경'}
            </button>
          ))}
        </div>
      )}

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50">
        {tab === 'pending' && (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center text-xs text-gray-400 py-8">변경사항이 없습니다.</div>
            )}
            {filtered.map((change) => (
              <div key={change.changeId} className={getChangeItemClass(change.nodeChangeType)}>
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background:
                        change.nodeChangeType === 'ADD' ? '#dbeafe' :
                        change.nodeChangeType === 'MODIFY' ? '#fed7aa' :
                        change.nodeChangeType === 'REORDER' ? '#e0e7ff' : '#fee2e2',
                    }}
                  >
                    <i
                      className={`fas ${changeTypeIcon(change.nodeChangeType)} text-xs`}
                      style={{
                        color:
                          change.nodeChangeType === 'ADD' ? '#2563eb' :
                          change.nodeChangeType === 'MODIFY' ? '#d97706' :
                          change.nodeChangeType === 'REORDER' ? '#4f46e5' : '#dc2626',
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={changeChipStyle(change.nodeChangeType)}>
                        {changeChipLabel(change.nodeChangeType)}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 mb-1">
                      {change.nodeChangeType === 'DELETE' ? (
                        <span className="line-through opacity-60">{change.nodeTitle}</span>
                      ) : (
                        change.nodeTitle
                      )}
                    </h4>
                    {change.nodeChangeType === 'REORDER' && (
                      <p className="text-xs text-indigo-600 mb-1">
                        <i className="fas fa-arrow-right-long mr-1" />
                        {change.reorderAfterNodeTitle
                          ? `"${change.reorderAfterNodeTitle}" 다음으로 이동`
                          : '맨 앞으로 이동'}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{change.reason}</p>
                    <div className="flex gap-2">
                      <button
                        disabled={processing}
                        onClick={() => onApply(change.changeId)}
                        className="inline-flex h-8 min-w-[52px] items-center justify-center rounded-md bg-[#00c471] px-3 text-sm font-bold leading-none text-white transition hover:bg-green-600 disabled:opacity-50"
                      >
                        적용
                      </button>
                      <button
                        disabled={processing}
                        onClick={() => onIgnore(change.changeId)}
                        className="inline-flex h-8 min-w-[52px] items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-sm font-bold leading-none text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                      >
                        무시
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {histories.length === 0 && (
              <div className="text-center text-xs text-gray-400 py-8">적용된 변경사항이 없습니다.</div>
            )}
            {histories.map((h) => {
              const historyChangeType = inferHistoryChangeType(h)
              return (
                <div key={h.changeId} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={changeChipStyle(historyChangeType)}>{changeChipLabel(historyChangeType)}</span>
                    <span className="text-xs text-gray-400">
                      {h.decisionStatus === 'APPLIED' ? '적용됨' : '무시됨'}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-gray-800">{h.nodeTitle}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(h.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      {tab === 'pending' && pendingChanges.length > 0 && (
        <div className="p-4 border-t border-gray-100 bg-white space-y-2">
          <button
            disabled={processing}
            onClick={onApplyAll}
            className="w-full bg-[#00c471] hover:bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <i className="fas fa-check" />
            변경사항 모두 적용하기
          </button>
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

interface RoadmapMetricsProps {
  changesCount: number
  totalNodes: number
  doneNodes: number
  progressPct: number
  onToggleChangesPanel: () => void
}

interface RoadmapPageToolbarProps extends RoadmapMetricsProps {
  currentCustomRoadmapId: number
  currentTitle: string
  roadmaps: MyRoadmapSummary[]
}

const roadmapNodeCountWrapClassName = 'inline-flex items-stretch gap-[1px] overflow-hidden rounded-[6px] bg-[#e5e7eb] [box-shadow:0_1px_6px_rgba(0,0,0,0.04)]'
const roadmapNodeCountCardClassName = 'flex min-w-[42px] flex-col items-center justify-center gap-[2px] [padding:5px_10px]'
const roadmapTotalNodeCountCardClassName = '[background:linear-gradient(135deg,_#00c471_0%,_#00e887_100%)]'
const roadmapDoneNodeCountCardClassName = '[background:linear-gradient(135deg,_#3b82f6_0%,_#60a5fa_100%)]'
const roadmapNodeCountNumberClassName = '[font-size:17px] leading-[1] [font-weight:900] text-[#fff]'
const roadmapNodeCountLabelClassName = '[font-size:8px] leading-[1] [font-weight:800] text-[#fff]'

function RoadmapHeaderMetrics({
  changesCount,
  totalNodes,
  doneNodes,
  progressPct,
  onToggleChangesPanel,
}: RoadmapMetricsProps) {
  return (
    <div className="roadmap-header-metrics">
      <button
        type="button"
        onClick={onToggleChangesPanel}
        className="relative flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-xs font-bold"
      >
        <i className="fas fa-history" />
        <span>{'\uBCC0\uACBD\uC0AC\uD56D'}</span>
        {changesCount > 0 ? (
          <span className="badge-pulse absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
            {changesCount}
          </span>
        ) : null}
      </button>

      <div className={roadmapNodeCountWrapClassName} title={'\uC804\uCCB4 / \uC644\uB8CC'}>
        <div className={`${roadmapNodeCountCardClassName} total ${roadmapTotalNodeCountCardClassName}`}>
          <span className={roadmapNodeCountNumberClassName}>{totalNodes}</span>
          <span className={roadmapNodeCountLabelClassName}>{'\uC804\uCCB4'}</span>
        </div>
        <div className={`${roadmapNodeCountCardClassName} done ${roadmapDoneNodeCountCardClassName}`}>
          <span className={roadmapNodeCountNumberClassName}>{doneNodes}</span>
          <span className={roadmapNodeCountLabelClassName}>{'\uC644\uB8CC'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
        <span className="text-xs text-gray-500">{'\uC9C4\uD589\uB960'}</span>
        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#00c471]" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-xs font-bold text-[#00c471]">{progressPct}%</span>
      </div>
    </div>
  )
}

function RoadmapSwitcherDropdown({
  currentCustomRoadmapId,
  currentTitle,
  roadmaps,
  badgeStyle = false,
}: {
  currentCustomRoadmapId: number
  currentTitle: string
  roadmaps: MyRoadmapSummary[]
  badgeStyle?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const btnClass = badgeStyle
    ? 'flex items-center gap-2 text-sm font-extrabold text-gray-800 bg-white/80 backdrop-blur px-3 py-2 rounded-lg border border-gray-200 shadow-sm hover:bg-white transition'
    : 'flex items-center gap-1.5 text-sm font-bold text-gray-700 hover:text-gray-900 max-w-[220px] transition'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={btnClass}
      >
        <i className="fas fa-server text-[#00c471] shrink-0" />
        <span className="truncate max-w-[180px]">{currentTitle || '로드맵'}</span>
        <i className={`fas fa-chevron-down text-[10px] text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">내 로드맵 전환</p>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {roadmaps.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">로드맵이 없습니다.</p>
            ) : (
              roadmaps.map((rm) => (
                <button
                  key={rm.customRoadmapId}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    if (rm.customRoadmapId !== currentCustomRoadmapId) {
    window.location.assign(`/roadmap?id=${rm.customRoadmapId}`)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition ${rm.customRoadmapId === currentCustomRoadmapId ? 'bg-green-50' : ''}`}
                >
                  <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${rm.originalRoadmapId === null ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {rm.originalRoadmapId === null ? 'B' : 'R'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 truncate">{rm.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {rm.originalRoadmapId === null ? '빌더 생성' : '공식 로드맵'}
                    </p>
                  </div>
                  {rm.customRoadmapId === currentCustomRoadmapId && (
                    <i className="fas fa-check text-[#00c471] text-xs shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 px-3 py-2">
            <a
              href="/my-roadmap-list"
              className="text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition"
            >
              <i className="fas fa-list text-[10px]" />
              내 로드맵 관리
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function RoadmapPageToolbar({
  changesCount,
  totalNodes,
  doneNodes,
  progressPct,
  onToggleChangesPanel,
  currentCustomRoadmapId,
  currentTitle,
  roadmaps,
}: RoadmapPageToolbarProps) {
  return (
    <div className="roadmap-page-toolbar">
      <div className="roadmap-page-toolbar__inner">
        <div className="roadmap-page-toolbar__left roadmap-page-toolbar__left--mobile">
          <RoadmapSwitcherDropdown
            currentCustomRoadmapId={currentCustomRoadmapId}
            currentTitle={currentTitle}
            roadmaps={roadmaps}
          />
        </div>

        <div className="roadmap-page-toolbar__right roadmap-page-toolbar__right--mobile">
          <button
            type="button"
            onClick={onToggleChangesPanel}
            className="relative flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-xs font-bold"
          >
            <i className="fas fa-history" />
            <span>{'\uBCC0\uACBD\uC0AC\uD56D'}</span>
            {changesCount > 0 ? (
              <span className="badge-pulse absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                {changesCount}
              </span>
            ) : null}
          </button>

          <div className={roadmapNodeCountWrapClassName} title={'\uC804\uCCB4 / \uC644\uB8CC'}>
            <div className={`${roadmapNodeCountCardClassName} total ${roadmapTotalNodeCountCardClassName}`}>
              <span className={roadmapNodeCountNumberClassName}>{totalNodes}</span>
              <span className={roadmapNodeCountLabelClassName}>{'\uC804\uCCB4'}</span>
            </div>
            <div className={`${roadmapNodeCountCardClassName} done ${roadmapDoneNodeCountCardClassName}`}>
              <span className={roadmapNodeCountNumberClassName}>{doneNodes}</span>
              <span className={roadmapNodeCountLabelClassName}>{'\uC644\uB8CC'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <span className="text-xs text-gray-500">{'\uC9C4\uD589\uB960'}</span>
            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#00c471]" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs font-bold text-[#00c471]">{progressPct}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RoadmapDetailPage() {
  useInternalPageScroll()

  const params = new URLSearchParams(window.location.search)
  const customRoadmapId = readPositiveNumberParam(params, 'id')
  const originalRoadmapId = readPositiveNumberParam(params, 'original')
  const initialNodeId = readPositiveNumberParam(params, 'nodeId')

  const [session, setSession]       = useState(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView]     = useState<AuthView | null>(() => readAuthViewFromLocation())
  const [roadmap, setRoadmap]       = useState<RoadmapDetail | null>(null)
  const [changes, setChanges]       = useState<RecommendationChange[]>([])
  const [histories, setHistories]   = useState<RecommendationChangeHistory[]>([])
  const [proofCards, setProofCards] = useState<ProofCardSummary[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [panelOpen, setPanelOpen]   = useState(false)
  const [infoOpen, setInfoOpen]     = useState(false)
  const [processing, setProcessing] = useState(false)
  const [drawerNode, setDrawerNode] = useState<RoadmapNodeItem | null>(null)
  const [myRoadmaps, setMyRoadmaps] = useState<MyRoadmapSummary[]>([])
  const [editMode, setEditMode] = useState(false)
  const [recommendPolling, setRecommendPolling] = useState(false)
  const [recommendStatus, setRecommendStatus] = useState<RecommendStatus | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const resetRoadmapPageState = useCallback((options?: { keepRoadmap?: boolean }) => {
    if (!options?.keepRoadmap) {
      setRoadmap(null)
    }
    setChanges([])
    setHistories([])
    setProofCards([])
    setMyRoadmaps([])
    setError(null)
    setPanelOpen(false)
    setInfoOpen(false)
    setProcessing(false)
    setDrawerNode(null)
    setRecommendPolling(false)
    setRecommendStatus(null)
  }, [])

  // 노드 클리어 후 백그라운드 추천 생성의 진행 상태를 폴링한다.
  // 시간 상한(매직넘버) 없이, DONE/FAILED 또는 RUNNING 후 IDLE(=TTL 만료=작업 종료)일 때만 종료한다.
  // 페이지에 머무는 동안은 생성이 얼마가 걸리든 완료되면 자동 반영된다(언마운트 시 정리).
  useEffect(() => {
    if (!recommendPolling) return
    const recommendationRoadmapId = roadmap?.originalRoadmapId ?? customRoadmapId
    const recommendationCustomRoadmapId = roadmap?.originalRoadmapId == null ? customRoadmapId : null
    if (recommendationRoadmapId == null) {
      setRecommendPolling(false)
      return
    }

    let cancelled = false
    let sawRunning = false
    let idleCount = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const reflectChanges = async () => {
      try {
        const changesData = await roadmapApi.getPendingChanges(
          roadmap?.originalRoadmapId ?? null,
          undefined,
          recommendationCustomRoadmapId,
        )
        if (!cancelled) setChanges(changesData)
      } catch { /* 무시 */ }
    }

    const poll = async () => {
      try {
        const status = await roadmapApi.getRecommendStatus(recommendationRoadmapId)
        if (cancelled) return
        if (status.status === 'RUNNING') {
          sawRunning = true
          idleCount = 0
          setRecommendStatus(status)
        } else if (status.status === 'DONE') {
          setRecommendStatus(status)
          await reflectChanges()
          setRecommendPolling(false)
          return
        } else if (status.status === 'FAILED') {
          setRecommendStatus(status)
          setRecommendPolling(false)
          return
        } else {
          // IDLE: RUNNING을 본 적 있으면 TTL 만료(=작업 종료)로 간주해 마지막 반영 후 종료.
          // 아직 RUNNING을 못 봤으면 트리거가 늦는 경우이므로 잠시만 재시도한다.
          idleCount += 1
          if (sawRunning || idleCount > 5) {
            await reflectChanges()
            if (!cancelled) setRecommendStatus(null)
            setRecommendPolling(false)
            return
          }
        }
      } catch { /* 무시하고 재시도 */ }
      if (!cancelled) timer = setTimeout(poll, 3000)
    }

    poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [customRoadmapId, recommendPolling, roadmap?.originalRoadmapId])

  // 결과 없음/실패 상태 칩은 잠시 후 자동으로 사라진다.
  useEffect(() => {
    if (!recommendStatus) return
    const isEmptyDone = recommendStatus.status === 'DONE' && recommendStatus.count === 0
    if (!isEmptyDone && recommendStatus.status !== 'FAILED') return
    const timer = setTimeout(() => setRecommendStatus(null), 4000)
    return () => clearTimeout(timer)
  }, [recommendStatus])

  useEffect(() => {
    const syncSession = () => {
      setSession(readStoredAuthSession())
    }

    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    syncSession()

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  useEffect(() => {
    syncAuthViewInLocation(authView)
  }, [authView])

  useEffect(() => {
    if (!session) {
      setProfileImage(null)
      return
    }

    const controller = new AbortController()

    userApi
      .getMyProfile(controller.signal)
      .then((profile) => {
        setProfileImage(profile.profileImage)
      })
      .catch(() => {
        setProfileImage(null)
      })

    return () => {
      controller.abort()
    }
  }, [session])

  useEffect(() => {
    if (!session?.userId) {
      abortRef.current?.abort()
      resetRoadmapPageState({ keepRoadmap: true })
      setLoading(false)
      return
    }

    resetRoadmapPageState()
    setLoading(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    if (!customRoadmapId) {
      ;(async () => {
        try {
          if (originalRoadmapId) {
            try {
              const data = await roadmapApi.copyRoadmap(originalRoadmapId)
      window.location.replace(`/roadmap?id=${data.customRoadmapId}`)
            } catch (copyError) {
              const isAlreadyExists =
                typeof copyError === 'object'
                && copyError !== null
                && 'status' in copyError
                && (copyError as { status?: unknown }).status === 409
              if (isAlreadyExists) {
                // 이미 복사된 로드맵이면 안내 화면 없이 기존 로드맵으로 이동한다.
                const list = await roadmapApi.getMyRoadmaps(ctrl.signal)
                const existingRoadmap = findRoadmapByOriginalId(list.roadmaps, originalRoadmapId)
                if (existingRoadmap) {
                  window.location.replace(`/roadmap?id=${existingRoadmap.customRoadmapId}`)
                } else {
                  setError('이미 복사된 로드맵을 찾을 수 없습니다.')
                  setLoading(false)
                }
              } else {
                setError(copyError instanceof Error ? copyError.message : '로드맵을 생성할 수 없습니다.')
                setLoading(false)
              }
            }
          } else {
            const list = await roadmapApi.getMyRoadmaps(ctrl.signal)
            if (list.roadmaps.length > 0) {
        window.location.replace(`/roadmap?id=${list.roadmaps[0].customRoadmapId}`)
            } else {
              window.location.replace('/roadmap-hub')
            }
          }
        } catch {
          window.location.replace('/roadmap-hub')
        }
      })()
      return () => ctrl.abort()
    }

    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    roadmapApi.getMyRoadmapDetail(customRoadmapId, signal)
      .then(async (roadmapData) => {
        const scopedRoadmapId = roadmapData.originalRoadmapId
        const scopedCustomRoadmapId = scopedRoadmapId == null ? customRoadmapId : null
        const [changesData, historiesData, proofCardsData, roadmapsData] = await Promise.all([
          roadmapApi.getPendingChanges(scopedRoadmapId, signal, scopedCustomRoadmapId),
          roadmapApi.getChangeHistories(scopedRoadmapId, signal, scopedCustomRoadmapId),
          roadmapApi.getProofCards(signal),
          roadmapApi.getMyRoadmaps(signal),
        ])

        return { roadmapData, changesData, historiesData, proofCardsData, roadmapsData }
      })
      .then(({ roadmapData, changesData, historiesData, proofCardsData, roadmapsData }) => {
        setRoadmap(roadmapData)
        setChanges(changesData)
        setHistories(historiesData)
        setProofCards(proofCardsData)
        setMyRoadmaps(roadmapsData.roadmaps)
        setDrawerNode(
          initialNodeId
            ? roadmapData.nodes.find((node) => node.customNodeId === initialNodeId && node.status !== 'LOCKED') ?? null
            : null,
        )

        if (changesData.length > 0) {
          setTimeout(() => setPanelOpen(true), 800)
        }
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false)
      })

    return () => abortRef.current?.abort()
  }, [customRoadmapId, initialNodeId, originalRoadmapId, resetRoadmapPageState, session?.userId])

  // ── 이벤트 핸들러 ────────────────────────────────────────────────────────────

  async function handleApply(changeId: number) {
    setProcessing(true)
    try {
      await roadmapApi.applyChange(changeId)
      const applied = changes.find((c) => c.changeId === changeId)
      setChanges((prev) => prev.filter((c) => c.changeId !== changeId))
      if (applied) {
        setHistories((prev) => [
          {
            changeId: applied.changeId,
            nodeId: applied.nodeId,
            nodeTitle: applied.nodeTitle,
            nodeChangeType: applied.nodeChangeType,
            decisionStatus: 'APPLIED',
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ])
      }
      // 로드맵 새로고침 (DELETE인 경우 백엔드가 아직 노드를 제거하지 않으므로 로컬에서 필터링)
      const updated = await roadmapApi.getMyRoadmapDetail(customRoadmapId)
      if (applied?.nodeChangeType === 'DELETE') {
        setRoadmap({ ...updated, nodes: updated.nodes.filter((n) => n.originalNodeId !== applied.nodeId) })
      } else {
        setRoadmap(updated)
      }
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleIgnore(changeId: number) {
    setProcessing(true)
    try {
      await roadmapApi.ignoreChange(changeId)
      const ignored = changes.find((c) => c.changeId === changeId)
      setChanges((prev) => prev.filter((c) => c.changeId !== changeId))
      if (ignored) {
        setHistories((prev) => [
          {
            changeId: ignored.changeId,
            nodeId: ignored.nodeId,
            nodeTitle: ignored.nodeTitle,
            nodeChangeType: ignored.nodeChangeType,
            decisionStatus: 'IGNORED',
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ])
      }
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleApplyAll() {
    if (!confirm(`${changes.length}개의 변경사항을 모두 적용하시겠습니까?`)) return
    setProcessing(true)
    try {
      for (const c of changes) {
        await roadmapApi.applyChange(c.changeId)
      }
      setHistories((prev) => [
        ...changes.map((c) => ({
          changeId: c.changeId,
          nodeId: c.nodeId,
          nodeTitle: c.nodeTitle,
          nodeChangeType: c.nodeChangeType,
          decisionStatus: 'APPLIED' as const,
          updatedAt: new Date().toISOString(),
        })),
        ...prev,
      ])
      const deleteNodeIds = new Set(changes.filter((c) => c.nodeChangeType === 'DELETE').map((c) => c.nodeId))
      setChanges([])
      const updated = await roadmapApi.getMyRoadmapDetail(customRoadmapId)
      if (deleteNodeIds.size > 0) {
        setRoadmap({
          ...updated,
          nodes: updated.nodes.filter((n) => n.originalNodeId == null || !deleteNodeIds.has(n.originalNodeId)),
        })
      } else {
        setRoadmap(updated)
      }
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  // ── 파생 데이터 ──────────────────────────────────────────────────────────────

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // Server logout failure should not block local session cleanup.
    } finally {
      abortRef.current?.abort()
      clearStoredAuthSession()
      setSession(null)
      setProfileImage(null)
      resetRoadmapPageState({ keepRoadmap: true })
      setLoading(false)
    }
  }

  function openAuthModal(view: AuthView) {
    setAuthView(view)
  }

  function closeAuthModal() {
    setAuthView(null)
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    closeAuthModal()
  }

  const proofCardByNodeId = useMemo(
    () => Object.fromEntries(proofCards.map((p) => [p.nodeId, p])) as Record<number, ProofCardSummary | undefined>,
    [proofCards],
  )
  const changeByNodeId = useMemo(
    () => Object.fromEntries(
      changes
        .filter((c) => c.nodeChangeType !== 'ADD')
        .map((c) => [c.nodeId, c]),
    ) as Record<number, RecommendationChange | undefined>,
    [changes],
  )
  const addChanges = changes.filter((c) => c.nodeChangeType === 'ADD')
  const totalNodes = (roadmap?.nodes.length ?? 0) + addChanges.length
  const doneNodes  = roadmap?.nodes.filter((n) => n.status === 'COMPLETED').length ?? 0
  const progressPct = roadmap ? Math.round(roadmap.progressRate) : 0
  const roadmapLayout = useMemo(
    () => buildRoadmapLayout(roadmap?.nodes ?? [], changes),
    [roadmap?.nodes, changes],
  )

  // ── 렌더 ─────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-[#00c471] mb-3" />
          <p className="text-sm text-gray-500">로드맵을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!session) return <LoginRequiredView />

  if (error || !roadmap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-3xl text-red-400 mb-3" />
          <p className="text-sm text-gray-600">{error ?? '로드맵을 불러올 수 없습니다.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#00c471] text-white text-sm font-bold rounded-lg"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const showLegacyHeader = false

  return (
    <div className="roadmap-page text-gray-800">

      {/* ── 헤더 ──────────────────────────────────────────────────────────────── */}
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => openAuthModal('login')}
        activeNavHref="/roadmap-hub"
        startOverlay={(
          <a href="/roadmap-hub" className="pointer-events-auto absolute top-[50%] left-[calc((var(--left-rail)*-1)+28px)] inline-flex items-center gap-[4px] [transform:translateY(-50%)] text-[#6b7280] [font-size:13px] [font-weight:800] leading-[1] whitespace-nowrap [transition:color_0.2s_ease,transform_0.2s_ease] hover:[transform:translateY(-50%)_translateX(-1px)] hover:text-[#111827]" aria-label="로드맵 목록으로 돌아가기">
            <i className="fas fa-arrow-left" />
            <span>로드맵 목록</span>
          </a>
        )}
        endOverlay={(
          <div className="roadmap-header-metrics-shell">
            <div className="roadmap-header-metrics-shell__inner">
              <RoadmapHeaderMetrics
                changesCount={changes.length}
                totalNodes={totalNodes}
                doneNodes={doneNodes}
                progressPct={progressPct}
                onToggleChangesPanel={() => setPanelOpen((value) => !value)}
              />
            </div>
          </div>
        )}
      />

      <RoadmapPageToolbar
        changesCount={changes.length}
        totalNodes={totalNodes}
        doneNodes={doneNodes}
        progressPct={progressPct}
        onToggleChangesPanel={() => setPanelOpen((value) => !value)}
        currentCustomRoadmapId={customRoadmapId}
        currentTitle={roadmap?.title ?? ''}
        roadmaps={myRoadmaps}
      />

      {showLegacyHeader ? <header className="app-header">
        <div className="max-w-[1600px] mx-auto w-full px-6 h-full grid items-center gap-4" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          {/* 왼쪽: 뒤로 + 로고 */}
          <div className="flex items-center gap-4 shrink-0">
            <a
              href="/roadmap-hub"
              className="text-gray-500 hover:text-gray-800 font-bold text-sm flex items-center gap-1"
            >
              <i className="fas fa-arrow-left" /> 목록
            </a>
            <a href="/home" className="flex items-center gap-2 font-bold text-gray-900">
              <i className="fas fa-code-branch text-[#00c471]" />
              <span>DevPath</span>
            </a>
          </div>

          {/* 가운데: 네비게이션 */}
          <nav className="flex justify-center overflow-x-auto">
            <div className="header-nav-links text-sm font-bold text-gray-500">
              <a href="/roadmap-hub" className="text-[#00c471] border-b-2 border-[#00c471] pb-1 transition">로드맵</a>
              <a href="/lecture-list" className="hover:text-[#00c471] transition">강의</a>
              <a href="/project-list" className="hover:text-[#00c471] transition">프로젝트</a>
              <a href="/community-list" className="hover:text-[#00c471] transition">커뮤니티</a>
              <a href="/job-matching" className="hover:text-[#00c471] transition">채용분석</a>
            </div>
          </nav>

          {/* 오른쪽: 변경사항 버튼 + 노드 카운트 + 진행률 + 프로필 */}
          <div className="flex items-center gap-3 shrink-0">
            {/* 변경사항 버튼 */}
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="relative flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-xs font-bold"
            >
              <i className="fas fa-history" />
              <span>변경사항</span>
              {changes.length > 0 && (
                <span className="badge-pulse absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                  {changes.length}
                </span>
              )}
            </button>

            {/* 노드 카운트 */}
            <div className={roadmapNodeCountWrapClassName} title="전체 / 완료">
              <div className={`${roadmapNodeCountCardClassName} total ${roadmapTotalNodeCountCardClassName}`}>
                <span className={roadmapNodeCountNumberClassName}>{totalNodes}</span>
                <span className={roadmapNodeCountLabelClassName}>전체</span>
              </div>
              <div className={`${roadmapNodeCountCardClassName} done ${roadmapDoneNodeCountCardClassName}`}>
                <span className={roadmapNodeCountNumberClassName}>{doneNodes}</span>
                <span className={roadmapNodeCountLabelClassName}>완료</span>
              </div>
            </div>

            {/* 진행률 */}
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <span className="text-xs text-gray-500">진행률</span>
              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#00c471]" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-xs font-bold text-[#00c471]">{progressPct}%</span>
            </div>

            {/* 프로필 */}
            <div
              className="flex items-center gap-2 cursor-pointer ml-1"
                onClick={() => { window.location.href = '/profile' }}
            >
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                className="w-9 h-9 rounded-full border border-gray-200 shadow-sm"
                alt="me"
              />
            </div>
          </div>
        </div>
      </header> : null}

      {/* ── 추천 생성 상태 칩 ──────────────────────────────────────────────── */}
      {recommendStatus && recommendStatus.status !== 'IDLE' && (
        <div className="fixed bottom-20 right-6 z-[60]">
          {recommendStatus.status === 'RUNNING' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg bg-white text-gray-700 border border-gray-300">
              <i className="fas fa-spinner fa-spin text-[#00c471]" />
              AI 추천 분석 중…
            </div>
          )}
          {recommendStatus.status === 'DONE' && recommendStatus.count > 0 && (
            <button
              onClick={() => { setPanelOpen(true); setRecommendStatus(null) }}
              className="flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg bg-[#00c471] text-white hover:bg-green-600 transition"
            >
              <i className="fas fa-wand-magic-sparkles" />
              추천 {recommendStatus.count}개 — 보기
            </button>
          )}
          {recommendStatus.status === 'DONE' && recommendStatus.count === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg bg-white text-gray-500 border border-gray-300">
              <i className="fas fa-circle-check text-gray-400" />
              추가 추천 없음
            </div>
          )}
          {recommendStatus.status === 'FAILED' && (
            <button
              onClick={async () => {
                const recommendationRoadmapId = roadmap?.originalRoadmapId ?? customRoadmapId
                const recommendationCustomRoadmapId =
                  roadmap?.originalRoadmapId == null ? customRoadmapId : null
                const nodeId = recommendStatus.nodeId
                if (recommendationRoadmapId == null || nodeId == null) { setRecommendStatus(null); return }
                try {
                  await roadmapApi.testRunDiagnosis(
                    recommendationRoadmapId,
                    nodeId,
                    recommendationCustomRoadmapId,
                  )
                } catch { /* 무시 */ }
                setRecommendStatus({ status: 'RUNNING', nodeId, count: 0 })
                setRecommendPolling(true)
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg bg-white text-red-600 border border-red-300 hover:bg-red-50 transition"
            >
              <i className="fas fa-triangle-exclamation" />
              추천 생성 실패 — 다시 시도
            </button>
          )}
        </div>
      )}

      {/* ── 편집모드 토글 ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setEditMode((v) => !v)}
        className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm shadow-lg transition ${
          editMode
            ? 'bg-[#00c471] text-white hover:bg-green-600'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
        title="노드 순서변경·스킵·삭제 편집"
      >
        <i className={`fas ${editMode ? 'fa-check' : 'fa-pen'}`} />
        {editMode ? '편집 완료' : '편집'}
      </button>

      {/* ── 노드 드로어 ──────────────────────────────────────────────────────── */}
      <NodeDrawer
        node={drawerNode}
        customRoadmapId={customRoadmapId}
        originalRoadmapId={roadmap.originalRoadmapId}
        editMode={editMode}
        onClose={() => setDrawerNode(null)}
        onCleared={async () => {
          const updated = await roadmapApi.getMyRoadmapDetail(customRoadmapId)
          setRoadmap(updated)                       // 클리어 상태 즉시 반영

          // 추천은 백그라운드 생성되므로 진행 상태를 폴링한다(드로어/패널을 닫고
          // 다른 작업을 해도 완료되면 자동 표시). 실제 폴링은 아래 useEffect가 담당.
          setRecommendStatus({ status: 'RUNNING', nodeId: null, count: 0 })
          setRecommendPolling(true)
        }}
      />

      {/* ── 변경사항 패널 ─────────────────────────────────────────────────────── */}
      <ChangesPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        pendingChanges={changes}
        histories={histories}
        onApply={handleApply}
        onIgnore={handleIgnore}
        onApplyAll={handleApplyAll}
        processing={processing}
      />

      {/* ── 메인 콘텐츠 ───────────────────────────────────────────────────────── */}
      <main className={`roadmap-main${panelOpen ? ' panel-open' : ''} relative w-full`}>

        {/* 로드맵 카테고리 라벨 (전환 드롭다운) */}
        <div className="fixed top-[calc(var(--roadmap-fixed-top)+12px)] left-8 z-[60]">
          <RoadmapSwitcherDropdown
            currentCustomRoadmapId={customRoadmapId}
            currentTitle={roadmap.title}
            roadmaps={myRoadmaps}
            badgeStyle
          />
        </div>

        <div className="roadmap-content relative flex flex-col items-center w-full">

          {/* ── 정보 아코디언 ────────────────────────────────────────────────── */}
          <div className="w-full max-w-4xl px-4 mt-8 mb-16 relative z-20">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setInfoOpen((v) => !v)}
              >
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <i className="fas fa-info-circle text-gray-400" />
                  {roadmap.infoTitle?.trim() || roadmap.title}
                </div>
                <i className={`fas fa-chevron-down text-gray-400 [transition:transform_0.3s]! ${infoOpen ? '[transform:rotate(180deg)]' : ''}`} />
              </div>
              <div className={`${infoOpen ? 'max-h-[800px] [transition:max-height_0.5s_ease-in]' : 'max-h-0 [transition:max-height_0.3s_ease-out]'} overflow-hidden bg-gray-50 border-t border-gray-100`}>
                <RoadmapInfoContent content={roadmap.infoContent} />
              </div>
            </div>
          </div>

          {/* ── 로드맵 트리 ─────────────────────────────────────────────────── */}
          <RoadmapGraph
            layout={roadmapLayout}
            proofCardByNodeId={proofCardByNodeId}
            changeByNodeId={changeByNodeId}
            processing={processing}
            onNodeClick={setDrawerNode}
            onApply={handleApply}
            onIgnore={handleIgnore}
          />

          <div className="flex justify-center items-center py-8 relative z-20">
            {progressPct === 100 ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#00c471] to-[#00e887] shadow-lg mb-6 animate-pulse">
                  <i className="fas fa-trophy text-white text-3xl" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">🎉 로드맵 완료!</h3>
                <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
                  {roadmap.title}의 모든 과정을 마스터하셨습니다.<br />
                  이제 실전 프로젝트로 나아갈 준비가 되었습니다!
                </p>
                <div className="mt-8 flex gap-3 justify-center">
                  <button
                    onClick={() => { window.location.href = '/project-list' }}
                    className="px-6 py-3 bg-[#00c471] hover:bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center gap-2"
                  >
                    <i className="fas fa-rocket" /> 프로젝트 시작하기
                  </button>
                  <button
                    onClick={() => { window.location.href = '/roadmap-hub' }}
                    className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm border-2 border-gray-200 transition flex items-center gap-2"
                  >
                    <i className="fas fa-map" /> 다른 로드맵 보러가기
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-30">
                <i className="fas fa-trophy text-4xl text-gray-400 mb-2" />
                <p className="text-xs text-gray-400 font-bold">모든 노드를 완료하면 트로피를 받습니다</p>
              </div>
            )}
          </div>

        </div>
      </main>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={closeAuthModal}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </div>
  )
}
