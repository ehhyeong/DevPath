import { type CSSProperties } from 'react'
import { type AuthView } from '../../components/AuthModal'
import type { ProofCardSummary } from '../../types/learner'
import type { ChangeType,MyRoadmapSummary,NodeStatus,RecommendationChange,RecommendationChangeHistory,RoadmapNodeItem } from '../../types/roadmap'


export function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get('auth')

  return value === 'login' || value === 'signup' ? value : null
}

export function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href)

  if (view) {
    url.searchParams.set('auth', view)
  } else {
    url.searchParams.delete('auth')
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

export function readPositiveNumberParam(params: URLSearchParams, key: string) {
  const rawValue = params.get(key)
  if (!rawValue) return 0

  const value = Number(rawValue)
  return Number.isInteger(value) && value > 0 ? value : 0
}

export function findRoadmapByOriginalId(roadmaps: MyRoadmapSummary[], originalRoadmapId: number) {
  return roadmaps.find((roadmap) => roadmap.originalRoadmapId === originalRoadmapId) ?? null
}

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

export function isPendingNodeStatus(status: NodeStatus) {
  return status === 'PENDING' || status === 'NOT_STARTED'
}

export function normalizeChangeType(type?: string | null): ChangeType | null {
  if (type === 'ADD' || type === 'MODIFY' || type === 'DELETE' || type === 'REORDER') return type
  return null
}

export function inferHistoryChangeType(history: RecommendationChangeHistory): ChangeType | null {
  const normalized = normalizeChangeType(history.nodeChangeType)
  if (normalized) return normalized
  if (/^\[(복습|심화)\]/.test(history.nodeTitle)) return 'ADD'
  return null
}

export function getNodeLessonProgressPercent(node: RoadmapNodeItem) {
  const rate = node.lessonCompletionRate ?? 0
  if (!Number.isFinite(rate)) return 0
  if (rate <= 1) return Math.max(0, Math.min(100, Math.round(rate * 100)))
  return Math.max(0, Math.min(100, Math.round(rate)))
}

export function isNodeReadyToClear(node: RoadmapNodeItem) {
  if (node.status === 'COMPLETED' || node.status === 'LOCKED') return false
  // 클리어 가능 여부는 백엔드(NodeClearanceGate)가 단독 판정한 readyToClear를 신뢰한다.
  return node.readyToClear === true
}

export const roadmapNodeBoxClassName =
  'node-box relative z-[20] flex w-[var(--roadmap-node-width)] cursor-pointer flex-col justify-center gap-[6px] rounded-[8px] border-[2px] border-solid border-[#334155] bg-[#fff] [padding:14px_20px] text-left [font-size:0.95rem] [font-weight:700] [box-shadow:0_4px_6px_-1px_rgba(0,0,0,0.05)] [transition:all_0.2s_cubic-bezier(0.4,0,0.2,1)] hover:[transform:translateY(-2px)] hover:border-[#00c471] hover:[box-shadow:0_10px_15px_-3px_rgba(0,0,0,0.1)]'

export function getNodeBoxClass(node: RoadmapNodeItem, change?: RecommendationChange): string {
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

export const changeItemClassName = 'change-item mb-[8px] cursor-pointer rounded-[8px] border-[1px] border-solid border-[#e2e8f0] bg-[#fff] p-[12px] hover:bg-[#f8fafc]'

export function getChangeItemClass(type?: ChangeType | null) {
  if (type === 'ADD')    return `${changeItemClassName} new border-l-[#3b82f6]`
  if (type === 'MODIFY') return `${changeItemClassName} modified border-l-[#f59e0b]`
  if (type === 'DELETE') return `${changeItemClassName} delete border-l-[#ef4444]`
  if (type === 'REORDER') return `${changeItemClassName} reorder border-l-[#6366f1]`
  return changeItemClassName
}

export function changeBadgeStyle(type?: ChangeType | null): CSSProperties {
  if (type === 'ADD')    return { background: '#3b82f6' }
  if (type === 'MODIFY') return { background: '#f59e0b' }
  if (type === 'DELETE') return { background: '#ef4444' }
  if (type === 'REORDER') return { background: '#6366f1' }
  return { background: '#64748b' }
}

export function changeTypeLabel(type?: ChangeType | null) {
  if (type === 'ADD')    return '추가 제안'
  if (type === 'MODIFY') return '수정 제안'
  if (type === 'DELETE') return '삭제 제안'
  if (type === 'REORDER') return '순서변경 제안'
  return '변경 제안'
}

export function nodeResourceSourceLabel(sourceType?: string | null) {
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

export type EssentialConcept = {
  title: string
  description: string | null
}

export function parseEssentialConcept(topic: string): EssentialConcept {
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

export function splitNodeDescription(content?: string | null) {
  const fallback = '상세 내용 준비 중입니다.'
  return (content && content.trim() ? content : fallback)
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export function changeTypeIcon(type?: ChangeType | null) {
  if (type === 'ADD')    return 'fa-plus'
  if (type === 'MODIFY') return 'fa-edit'
  if (type === 'DELETE') return 'fa-trash'
  if (type === 'REORDER') return 'fa-arrows-up-down'
  return 'fa-history'
}

export function changeChipStyle(type?: ChangeType | null): string {
  if (type === 'ADD')    return 'text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded'
  if (type === 'MODIFY') return 'text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded'
  if (type === 'DELETE') return 'text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded'
  if (type === 'REORDER') return 'text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded'
  return 'text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded'
}

export function changeChipLabel(type?: ChangeType | null) {
  if (type === 'ADD')    return '추가'
  if (type === 'MODIFY') return '수정'
  if (type === 'DELETE') return '삭제'
  if (type === 'REORDER') return '순서변경'
  return '변경'
}

export interface ProofCardBadgeProps {
  card: ProofCardSummary
}

export const roadmapProofCardBadgeClassName =
  'absolute top-[-10px] left-[10px] z-[30] inline-flex max-w-[calc(100%-72px)] cursor-pointer items-center gap-[4px] rounded-[99px] border-[1px] border-solid border-[#00c471] bg-white [padding:2px_8px] [font-size:0.7rem] font-[800] text-[#00c471] [box-shadow:0_2px_4px_rgba(0,0,0,0.1)] [transition:transform_0.2s] hover:[transform:translateY(-1px)]'

export interface ChangeLabelProps {
  change: RecommendationChange
}

export type RoadmapLane = 'side-left' | 'left' | 'center' | 'right' | 'side-right'
export type LayoutSlotKind = 'main-spine' | 'official-branch' | 'applied-branch' | 'suggested-branch' | 'ghost-add'
export type LayoutEdgeKind = 'spine' | 'branch' | 'split' | 'merge' | 'applied-branch' | 'suggestion'
export type EdgeTheme = 'default' | 'review' | 'advanced' | 'suggestion'

export const ROADMAP_LANE_COLUMN: Record<RoadmapLane, number> = {
  'side-left': 1,
  left: 1,
  center: 2,
  right: 3,
  'side-right': 3,
}

export type LayoutSpineItem =
  | { kind: 'node'; node: RoadmapNodeItem }
  | { kind: 'add'; change: RecommendationChange }

export interface BranchBadgeMeta {
  label: string
  background: string
  color: string
  borderColor: string
  theme: EdgeTheme
}

export interface LayoutSlot {
  id: string
  kind: LayoutSlotKind
  lane: RoadmapLane
  row: number
  stackOffset?: number
  node?: RoadmapNodeItem
  change?: RecommendationChange
  badge?: BranchBadgeMeta
}

export interface LayoutEdge {
  id: string
  from: string
  to: string
  kind: LayoutEdgeKind
  theme: EdgeTheme
}

export interface RoadmapLayout {
  slots: LayoutSlot[]
  edges: LayoutEdge[]
  rowCount: number
}

export interface SlotRect {
  x: number
  y: number
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

export function getBranchBadgeMeta(branchKind?: string | null): BranchBadgeMeta {
  if (branchKind === 'REVIEW') {
    return {
      label: '복습',
      background: '#fff7ed',
      color: '#ea580c',
      borderColor: '#fdba74',
      theme: 'review',
    }
  }
  if (branchKind === 'ADVANCED') {
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

export function getSuggestionBadgeMeta(change: RecommendationChange): BranchBadgeMeta {
  const sourceText = `${change.nodeTitle} ${change.reason} ${change.contextSummary}`.toLowerCase()
  if (sourceText.includes('복습') || sourceText.includes('review')) {
    return getBranchBadgeMeta('REVIEW')
  }
  if (sourceText.includes('심화') || sourceText.includes('advanced')) {
    return getBranchBadgeMeta('ADVANCED')
  }
  return getBranchBadgeMeta(null)
}

export function getOfficialBranchBadgeMeta(laneKey: number): BranchBadgeMeta {
  return {
    label: `갈래 ${laneKey}`,
    background: '#f0f9ff',
    color: '#0369a1',
    borderColor: '#7dd3fc',
    theme: 'default',
  }
}

export function sortRoadmapNodes(nodes: RoadmapNodeItem[]) {
  return [...nodes].sort((a, b) => a.sortOrder - b.sortOrder || a.customNodeId - b.customNodeId)
}

export function sortChanges(changes: RecommendationChange[]) {
  return [...changes].sort(
    (a, b) => (a.nodeSortOrder ?? 9999) - (b.nodeSortOrder ?? 9999) || a.changeId - b.changeId,
  )
}

export function makeLayoutSlotId(item: LayoutSpineItem) {
  return item.kind === 'node' ? `node-${item.node.customNodeId}` : `add-${item.change.changeId}`
}

export function getLayoutSpineOrder(item: LayoutSpineItem) {
  return item.kind === 'node' ? item.node.sortOrder : item.change.nodeSortOrder ?? 9999
}

export function makeLayoutSpineItems(nodes: RoadmapNodeItem[], adds: RecommendationChange[]): LayoutSpineItem[] {
  return [
    ...nodes.map((node) => ({ kind: 'node' as const, node })),
    ...adds.map((change) => ({ kind: 'add' as const, change })),
  ].sort((a, b) => getLayoutSpineOrder(a) - getLayoutSpineOrder(b))
}

export function getOfficialBranchLane(groupIndex: number): RoadmapLane {
  return groupIndex % 2 === 0 ? 'left' : 'right'
}

export const OFFICIAL_BRANCH_OFFSET_Y = 40
export const POST_BRANCH_SPINE_OFFSET_Y = 88

// 레인 트리 레이아웃: anchorNodeId(부모 커스텀노드)로 트리를 만들어 척추=center, 분기=left/right,
// 중첩·다구역은 side-left/side-right로 배치한다(다층 체인은 같은 레인 행 누적). 레인 모델 로드맵 전용.
export function buildRoadmapLayout(
  nodes: RoadmapNodeItem[],
  changes: RecommendationChange[],
): RoadmapLayout {
  const slots: LayoutSlot[] = []
  const edges: LayoutEdge[] = []
  let rowCount = 1
  let nextRow = 1
  const placed: { node: RoadmapNodeItem; slotId: string; column: RoadmapLane }[] = []

  const byAnchor = new Map<number, RoadmapNodeItem[]>()
  nodes.forEach((n) => {
    if (n.anchorNodeId == null) return
    const arr = byAnchor.get(n.anchorNodeId) ?? []
    arr.push(n)
    byAnchor.set(n.anchorNodeId, arr)
  })
  const pendingBySource = new Map<number, RecommendationChange[]>()
  changes
    .filter((c) => c.nodeChangeType === 'ADD' && c.branchFromNodeId != null)
    .forEach((c) => {
      const key = c.branchFromNodeId as number
      const arr = pendingBySource.get(key) ?? []
      arr.push(c)
      pendingBySource.set(key, arr)
    })

  function pushSlot(slot: LayoutSlot) {
    slots.push(slot)
    rowCount = Math.max(rowCount, slot.row)
    return slot
  }
  function pushEdge(from: string | null, to: string, kind: LayoutEdgeKind, theme: EdgeTheme = 'default') {
    if (!from) return
    edges.push({ id: `${kind}-${from}-${to}-${edges.length}`, from, to, kind, theme })
  }
  function columnFor(depth: number, child: RoadmapNodeItem): RoadmapLane {
    const structural = child.branchKind === 'BRANCH'
    if (depth === 1) {
      if (structural) return child.laneKey === 1 ? 'left' : 'right'
      return child.branchKind === 'REVIEW' ? 'side-left' : 'side-right'
    }
    if (structural) return child.laneKey === 1 ? 'side-left' : 'side-right'
    return child.branchKind === 'REVIEW' ? 'side-left' : 'side-right'
  }
  function sortByOrderInLane(list: RoadmapNodeItem[]) {
    return list
      .slice()
      .sort((a, b) => (a.orderInLane ?? 0) - (b.orderInLane ?? 0) || a.customNodeId - b.customNodeId)
  }

  // 반환: 이 부모에 매달린 구조 분기(BRANCH) 레인들의 끝 slotId(합류 소스). 유형 A(복습/심화)는 합류 없으므로 제외.
  function layoutBranchesOf(
    parent: RoadmapNodeItem,
    parentSlotId: string,
    depth: number,
  ): string[] {
    const children = byAnchor.get(parent.customNodeId)
    if (!children || children.length === 0) return []
    const layers = new Map<number, RoadmapNodeItem[]>()
    children.forEach((c) => {
      const k = c.orderInLane ?? 0
      const arr = layers.get(k) ?? []
      arr.push(c)
      layers.set(k, arr)
    })
    const prevByLane = new Map<number, string>()
    const structuralEndByLane = new Map<number, string>()
    const childSlots: { node: RoadmapNodeItem; slotId: string }[] = []
    Array.from(layers.keys())
      .sort((a, b) => a - b)
      .forEach((layerKey) => {
        const layerRow = nextRow++
        ;(layers.get(layerKey) as RoadmapNodeItem[])
          .slice()
          .sort((a, b) => (a.laneKey ?? 0) - (b.laneKey ?? 0))
          .forEach((child) => {
            const structural = child.branchKind === 'BRANCH'
            const column = columnFor(depth, child)
            const slot = pushSlot({
              id: `node-${child.customNodeId}`,
              kind: structural ? 'official-branch' : 'applied-branch',
              lane: column,
              row: layerRow,
              stackOffset: OFFICIAL_BRANCH_OFFSET_Y,
              node: child,
              badge: structural
                ? getOfficialBranchBadgeMeta(child.laneKey ?? 1)
                : getBranchBadgeMeta(child.branchKind),
            })
            const laneId = child.laneKey ?? 0
            const prevId = prevByLane.get(laneId)
            const theme: EdgeTheme =
              child.branchKind === 'REVIEW'
                ? 'review'
                : child.branchKind === 'ADVANCED'
                  ? 'advanced'
                  : 'default'
            pushEdge(prevId ?? parentSlotId, slot.id, prevId ? 'branch' : 'split', theme)
            prevByLane.set(laneId, slot.id)
            if (structural) structuralEndByLane.set(laneId, slot.id)
            placed.push({ node: child, slotId: slot.id, column })
            childSlots.push({ node: child, slotId: slot.id })
          })
      })
    childSlots.forEach(({ node, slotId }) => layoutBranchesOf(node, slotId, depth + 1))
    return Array.from(structuralEndByLane.values())
  }

  const spine = sortByOrderInLane(nodes.filter((n) => n.branchKind === 'SPINE'))
  let prevSpineId: string | null = null
  let pendingMergeEnds: string[] = []
  spine.forEach((sp) => {
    const slot = pushSlot({
      id: `node-${sp.customNodeId}`,
      kind: 'main-spine',
      lane: 'center',
      row: nextRow++,
      node: sp,
    })
    // 직전 척추가 갈림길(BRANCH fork)이면 직결 spine 대신 각 갈래 끝에서 이 노드로 합류(merge)한다.
    if (pendingMergeEnds.length > 0) {
      pendingMergeEnds.forEach((end) => pushEdge(end, slot.id, 'merge'))
    } else {
      pushEdge(prevSpineId, slot.id, 'spine')
    }
    prevSpineId = slot.id
    placed.push({ node: sp, slotId: slot.id, column: 'center' })
    pendingMergeEnds = layoutBranchesOf(sp, slot.id, 1)
  })

  // 미적용(pending) 추천 노드는 출발 노드 옆 side 컬럼에 제안 슬롯으로 표시한다.
  placed.forEach(({ node, slotId, column }) => {
    if (node.originalNodeId == null) return
    const pending = pendingBySource.get(node.originalNodeId)
    if (!pending) return
    pending.forEach((change) => {
      const slot = pushSlot({
        id: `suggested-add-${change.changeId}`,
        kind: 'suggested-branch',
        lane: column === 'left' || column === 'side-left' ? 'side-left' : 'side-right',
        row: nextRow++,
        change,
        badge: getSuggestionBadgeMeta(change),
      })
      pushEdge(slotId, slot.id, 'suggestion', 'suggestion')
    })
  })

  return { slots, edges, rowCount }
}

export const roadmapRuleBadgeClassName =
  'absolute top-[-10px] right-[10px] [font-size:0.7rem] [padding:2px_8px] [border-radius:99px] [font-weight:800] [border:1px_solid] z-[30] [box-shadow:0_2px_4px_rgba(0,0,0,0.1)]'
export const roadmapNodeHeaderClassName = 'flex w-full min-w-0 items-center justify-between gap-[10px]'
export const roadmapNodeTitleGroupClassName = 'flex min-w-0 flex-[1_1_auto] items-center gap-[8px] [font-size:1.05rem] [&_i]:flex-[0_0_auto]'
export const roadmapNodeTitleTextClassName = 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'
export const roadmapNodeDescriptionClassName = 'mt-[4px] whitespace-normal [overflow-wrap:anywhere] [font-size:0.75rem] leading-[1.4] [font-weight:500] opacity-[0.7]'
export const roadmapNodeMetaClassName = 'ml-auto flex flex-[0_0_auto] gap-[4px] whitespace-nowrap'
export const roadmapNodeMetaTagClassName = 'inline-flex flex-[0_0_auto] items-center whitespace-nowrap bg-[rgba(0,0,0,0.06)] [padding:2px_8px] rounded-[4px] [font-size:0.7rem] [font-weight:normal] leading-[1.2]'

export interface RoadmapNodeCardProps {
  node: RoadmapNodeItem
  proofCard?: ProofCardSummary
  pendingChange?: RecommendationChange
  badge?: BranchBadgeMeta
  onNodeClick?: (node: RoadmapNodeItem) => void
}

export interface GhostAddCardProps {
  change: RecommendationChange
  processing: boolean
  badge?: BranchBadgeMeta
  onApply: (id: number) => void
  onIgnore: (id: number) => void
}

export function areSlotRectsEqual(left: Record<string, SlotRect>, right: Record<string, SlotRect>) {
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

export function makeEdgePath(edge: LayoutEdge, rects: Record<string, SlotRect>) {
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

export interface RoadmapGraphProps {
  layout: RoadmapLayout
  proofCardByNodeId: Record<number, ProofCardSummary | undefined>
  changeByNodeId: Record<number, RecommendationChange | undefined>
  processing: boolean
  onNodeClick: (node: RoadmapNodeItem) => void
  onApply: (id: number) => void
  onIgnore: (id: number) => void
}

export const roadmapCanvasScrollClassName =
  'roadmap-canvas-scroll w-full [overflow-x:auto] [overflow-y:visible] [padding:8px_16px_32px]'
export const roadmapGraphClassName =
  'roadmap-graph relative grid [grid-template-columns:var(--roadmap-side-node-width)_var(--roadmap-node-width)_var(--roadmap-side-node-width)] [column-gap:var(--roadmap-lane-gap)] [row-gap:var(--roadmap-row-gap)] items-center justify-items-center w-max min-w-[calc(var(--roadmap-side-node-width)*2+var(--roadmap-node-width)+var(--roadmap-lane-gap)*2)] [margin:0_auto] [padding:32px_0_72px]'
export const roadmapEdgeLayerClassName =
  'roadmap-edge-layer absolute [inset:0] z-[1] pointer-events-none overflow-visible'
export const roadmapEdgeBaseClassName =
  'roadmap-edge [fill:none] [stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round]'
export const roadmapEdgeStrokeClassName: Record<EdgeTheme, string> = {
  default: '[stroke:var(--roadmap-line-color)]',
  review: '[stroke:#ea580c]',
  advanced: '[stroke:#4338ca]',
  suggestion: '[stroke:#3b82f6]',
}
export const roadmapSuggestionEdgeClassName = '[stroke:#3b82f6] [stroke-dasharray:8_8]'
export const roadmapSlotBaseClassName =
  'roadmap-slot relative z-[5] flex justify-center w-full [transform:translateY(var(--slot-offset-y,_0))]'

export function buildRoadmapReturnHref(customRoadmapId: number, customNodeId?: number | null) {
  const params = new URLSearchParams({ id: String(customRoadmapId) })
  if (customNodeId) params.set('nodeId', String(customNodeId))
  return `/roadmap?${params.toString()}`
}

export function appendReturnTo(href: string, returnTo: string) {
  const [path, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  params.set('returnTo', returnTo)
  return `${path}?${params.toString()}`
}

export function buildCourseDetailUrl(courseId: number, returnTo: string, originalRoadmapId?: number | null, originalNodeId?: number | null) {
  let url = `/course-detail?courseId=${courseId}`
  if (originalRoadmapId != null) url += `&originalRoadmapId=${originalRoadmapId}`
  if (originalNodeId != null) url += `&originalNodeId=${originalNodeId}`
  return appendReturnTo(url, returnTo)
}

export function buildLectureListUrl(tags: string[], returnTo?: string): string {
  const params = new URLSearchParams()
  if (tags.length > 0) params.set('tags', tags.join(','))
  if (returnTo) params.set('returnTo', returnTo)
  const query = params.toString()
  return `/lecture-list${query ? `?${query}` : ''}`
}

export interface NodeDrawerProps {
  node: RoadmapNodeItem | null
  customRoadmapId: number
  originalRoadmapId: number | null
  allNodes: RoadmapNodeItem[]
  editMode: boolean
  onClose: () => void
  onCleared: () => void
}

// ── 변경사항 패널 ─────────────────────────────────────────────────────────────

export interface ChangesPanelProps {
  open: boolean
  onClose: () => void
  pendingChanges: RecommendationChange[]
  histories: RecommendationChangeHistory[]
  onApply: (changeId: number) => void
  onIgnore: (changeId: number) => void
  onApplyAll: () => void
  processing: boolean
}

export type FilterType = 'all' | 'ADD' | 'MODIFY' | 'DELETE' | 'REORDER'

export const changesPanelTabClassName = 'tab-btn flex-[1_1_0] min-w-0 m-0! [padding:12px_0]! [font-weight:bold]! [font-size:14px]! border-b-[2px]! [border-bottom-style:solid]!'
export const changesPanelActiveTabClassName = 'active border-b-[#00c471]! bg-[#f0fdf4] text-[#00c471]!'
export const changesPanelInactiveTabClassName = 'border-b-transparent! text-[#64748b]!'

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export interface RoadmapMetricsProps {
  changesCount: number
  totalNodes: number
  doneNodes: number
  progressPct: number
  onToggleChangesPanel: () => void
}

export interface RoadmapPageToolbarProps extends RoadmapMetricsProps {
  currentCustomRoadmapId: number
  currentTitle: string
  roadmaps: MyRoadmapSummary[]
}

export const roadmapPageClassName = 'h-[100dvh] min-h-0 w-full overflow-hidden bg-[#f8f9fa]'
export const roadmapMainClassName =
  'roadmap-main h-[calc(100dvh-var(--roadmap-fixed-top))] max-h-[calc(100dvh-var(--roadmap-fixed-top))] min-h-0 mt-[var(--roadmap-fixed-top)] overflow-x-hidden [overflow-y:auto] bg-[#f8f9fa] [overscroll-behavior-y:contain] [scrollbar-gutter:stable]'
export const roadmapContentClassName =
  'roadmap-content max-w-[1400px] min-h-full [margin-left:auto] [margin-right:auto] pt-[var(--roadmap-content-gap)] pb-[96px] [transition:max-width_0.3s_ease,margin_0.3s_ease,padding-left_0.3s_ease,padding-right_0.3s_ease]'
export const roadmapNodeCountWrapClassName = 'inline-flex items-stretch gap-[1px] overflow-hidden rounded-[6px] bg-[#e5e7eb] [box-shadow:0_1px_6px_rgba(0,0,0,0.04)]'
export const roadmapNodeCountCardClassName = 'flex min-w-[42px] flex-col items-center justify-center gap-[2px] [padding:5px_10px]'
export const roadmapTotalNodeCountCardClassName = '[background:linear-gradient(135deg,_#00c471_0%,_#00e887_100%)]'
export const roadmapDoneNodeCountCardClassName = '[background:linear-gradient(135deg,_#3b82f6_0%,_#60a5fa_100%)]'
export const roadmapNodeCountNumberClassName = '[font-size:17px] leading-[1] [font-weight:900] text-[#fff]'
export const roadmapNodeCountLabelClassName = '[font-size:8px] leading-[1] [font-weight:800] text-[#fff]'
export const roadmapHeaderMetricsClassName = 'mr-[168px] flex items-center gap-[12px] pointer-events-auto'
export const roadmapHeaderMetricsShellClassName = 'roadmap-header-metrics-shell hidden h-full w-full'
export const roadmapHeaderMetricsShellInnerClassName =
  'flex h-full w-full items-center justify-end pointer-events-none [margin-inline:auto] [padding-inline:clamp(16px,3vw,32px)]'
