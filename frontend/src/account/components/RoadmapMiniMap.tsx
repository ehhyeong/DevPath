import type { MyRoadmapSummary, RoadmapDetail, RoadmapNodeItem } from '../../types/roadmap'

type MiniLane = 'left' | 'center' | 'right'
type MiniEdgeKind = 'spine' | 'branch' | 'split' | 'merge'

interface MiniGraphNode {
  id: string
  title: string
  status: RoadmapNodeItem['status']
  lane: MiniLane
  row: number
  lessonProgressPercent: number
}

interface MiniGraphEdge {
  id: string
  from: string
  to: string
  kind: MiniEdgeKind
}

interface MiniGraphLayout {
  nodes: MiniGraphNode[]
  edges: MiniGraphEdge[]
  rowCount: number
}

interface RoadmapMiniMapProps {
  roadmap: RoadmapDetail | null
  roadmapSummary: MyRoadmapSummary | null
  progressPercent: number
}

const SVG_WIDTH = 420
const SVG_PADDING_X = 12
const SVG_PADDING_Y = 24
const NODE_WIDTH = 124
const NODE_HEIGHT = 66
const ROW_GAP = 86
const GRAPH_MIN_HEIGHT = 400
const LANE_X: Record<MiniLane, number> = {
  left: SVG_PADDING_X + NODE_WIDTH / 2,
  center: SVG_WIDTH / 2,
  right: SVG_WIDTH - SVG_PADDING_X - NODE_WIDTH / 2,
}

function clampPercent(value: number | null | undefined) {
  return Math.max(0, Math.min(100, Math.round(value ?? 0)))
}

function sortNodes(nodes: RoadmapNodeItem[]) {
  return [...nodes].sort((left, right) => left.sortOrder - right.sortOrder || left.customNodeId - right.customNodeId)
}

function toNodeProgressPercent(node: RoadmapNodeItem) {
  return clampPercent((node.lessonCompletionRate ?? 0) * 100)
}

function addGraphEdge(
  edges: MiniGraphEdge[],
  from: string | null | undefined,
  to: string | null | undefined,
  kind: MiniEdgeKind,
) {
  if (!from || !to) return
  edges.push({ id: `${kind}-${from}-${to}-${edges.length}`, from, to, kind })
}

function buildMiniGraphLayout(nodes: RoadmapNodeItem[]): MiniGraphLayout {
  const sortedNodes = sortNodes(nodes)
  const structuralNodes = sortedNodes.filter((node) => node.branchKind !== 'REVIEW' && node.branchKind !== 'ADVANCED')
  const officialBranchNodes = structuralNodes.filter((node) => node.laneKey != null)
  const officialBranchGroups = Array.from(
    new Set(
      officialBranchNodes
        .map((node) => node.laneKey)
        .filter((laneKey): laneKey is number => laneKey != null),
    ),
  ).sort((left, right) => left - right)

  const hasOfficialBranches = officialBranchGroups.length > 0
  const branchOrders = officialBranchNodes.map((node) => node.sortOrder)
  const minBranchOrder = hasOfficialBranches ? Math.min(...branchOrders) : Number.POSITIVE_INFINITY
  const maxBranchOrder = hasOfficialBranches ? Math.max(...branchOrders) : Number.NEGATIVE_INFINITY
  const spineNodes = structuralNodes.filter((node) => node.laneKey == null)
  const preBranchSpineNodes = hasOfficialBranches
    ? spineNodes.filter((node) => node.sortOrder < minBranchOrder)
    : spineNodes
  const postBranchSpineNodes = hasOfficialBranches
    ? spineNodes.filter((node) => node.sortOrder > maxBranchOrder)
    : []

  const graphNodes: MiniGraphNode[] = []
  const graphEdges: MiniGraphEdge[] = []
  let nextRow = 0
  let rowCount = 0
  let previousCenterNodeId: string | null = null

  function pushNode(node: RoadmapNodeItem, lane: MiniLane, row: number) {
    const graphNode: MiniGraphNode = {
      id: `node-${node.customNodeId}`,
      title: node.title,
      status: node.status,
      lane,
      row,
      lessonProgressPercent: toNodeProgressPercent(node),
    }
    graphNodes.push(graphNode)
    rowCount = Math.max(rowCount, row + 1)
    return graphNode
  }

  function pushCenterNode(node: RoadmapNodeItem, connectFromPrevious = true) {
    const graphNode = pushNode(node, 'center', nextRow)
    if (connectFromPrevious) {
      addGraphEdge(graphEdges, previousCenterNodeId, graphNode.id, 'spine')
    }
    previousCenterNodeId = graphNode.id
    nextRow += 1
    return graphNode
  }

  preBranchSpineNodes.forEach((node) => pushCenterNode(node))

  if (hasOfficialBranches) {
    const branchStartRow = nextRow
    const splitFromId = previousCenterNodeId
    const branchEndNodeIds: string[] = []
    let deepestBranchDepth = 0

    officialBranchGroups.forEach((laneKey, index) => {
      const lane: MiniLane = index % 2 === 0 ? 'left' : 'right'
      const nodesInGroup = officialBranchNodes
        .filter((node) => node.laneKey === laneKey)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.customNodeId - right.customNodeId)

      deepestBranchDepth = Math.max(deepestBranchDepth, nodesInGroup.length)

      let previousBranchNodeId: string | null = null
      nodesInGroup.forEach((node, nodeIndex) => {
        const graphNode = pushNode(node, lane, branchStartRow + nodeIndex)
        if (nodeIndex === 0) {
          addGraphEdge(graphEdges, splitFromId, graphNode.id, 'split')
        } else {
          addGraphEdge(graphEdges, previousBranchNodeId, graphNode.id, 'branch')
        }
        previousBranchNodeId = graphNode.id
      })

      if (previousBranchNodeId) {
        branchEndNodeIds.push(previousBranchNodeId)
      }
    })

    nextRow = branchStartRow + deepestBranchDepth

    if (postBranchSpineNodes.length > 0) {
      const firstPostBranchNode = pushCenterNode(postBranchSpineNodes[0], false)
      branchEndNodeIds.forEach((branchEndNodeId) => {
        addGraphEdge(graphEdges, branchEndNodeId, firstPostBranchNode.id, 'merge')
      })
      postBranchSpineNodes.slice(1).forEach((node) => pushCenterNode(node))
    }
  }

  return { nodes: graphNodes, edges: graphEdges, rowCount }
}

function pickFocusNode(nodes: RoadmapNodeItem[]) {
  const candidates = sortNodes(nodes).filter((node) => node.branchKind !== 'REVIEW' && node.branchKind !== 'ADVANCED')
  return (
    candidates.find((node) => node.status === 'IN_PROGRESS') ??
    candidates.find((node) => node.status === 'PENDING') ??
    candidates.find((node) => node.status === 'LOCKED') ??
    candidates[candidates.length - 1] ??
    null
  )
}

function formatActivityLabel(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${Math.max(1, diffMin)}분 전`
  const diffHour = Math.floor(diffMs / 3600000)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffDay < 7) return `${diffDay}일 전`

  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date)
}

function graphHeight(rowCount: number) {
  const contentHeight = SVG_PADDING_Y * 2 + Math.max(0, rowCount - 1) * ROW_GAP + NODE_HEIGHT
  return Math.max(GRAPH_MIN_HEIGHT, contentHeight)
}

function toNodeCenterY(row: number) {
  return SVG_PADDING_Y + row * ROW_GAP + NODE_HEIGHT / 2
}

function wrapTitle(title: string, maxCharsPerLine = 12, maxLines = 2) {
  const normalized = title.trim().replace(/\s+/g, ' ')
  if (!normalized) return ['-']

  const lines: string[] = []
  let index = 0

  while (index < normalized.length && lines.length < maxLines) {
    let segment = normalized.slice(index, index + maxCharsPerLine)
    index += segment.length
    if (lines.length === maxLines - 1 && index < normalized.length) {
      segment = `${segment.slice(0, Math.max(1, maxCharsPerLine - 1))}…`
      index = normalized.length
    }
    lines.push(segment)
  }

  return lines
}

function nodePalette(node: MiniGraphNode) {
  switch (node.status) {
    case 'COMPLETED':
      return { fill: '#f0fdf4', stroke: '#4ade80', text: '#166534', dot: '#22c55e', progressBg: '#dcfce7', progressFill: '#16a34a' }
    case 'IN_PROGRESS':
      return { fill: '#ffffff', stroke: '#22c55e', text: '#15803d', dot: '#16a34a', progressBg: '#dcfce7', progressFill: '#16a34a' }
    case 'LOCKED':
      return { fill: '#f8fafc', stroke: '#e2e8f0', text: '#94a3b8', dot: '#cbd5e1', progressBg: '#f1f5f9', progressFill: '#94a3b8' }
    default:
      return { fill: '#fafafa', stroke: '#e2e8f0', text: '#475569', dot: '#94a3b8', progressBg: '#f1f5f9', progressFill: '#94a3b8' }
  }
}

function edgeStyle(kind: MiniEdgeKind, source: MiniGraphNode, target: MiniGraphNode) {
  const isActive =
    source.status === 'COMPLETED' || source.status === 'IN_PROGRESS' || target.status === 'IN_PROGRESS'

  if (kind === 'spine') {
    return {
      stroke: isActive ? '#4ade80' : '#e2e8f0',
      strokeWidth: isActive ? 2.4 : 1.8,
      strokeDasharray: undefined,
    }
  }

  return {
    stroke: isActive ? '#86efac' : '#e2e8f0',
    strokeWidth: 1.5,
    strokeDasharray: isActive ? undefined : '4 3',
  }
}

function buildEdgePath(edge: MiniGraphEdge, nodesById: Map<string, MiniGraphNode>) {
  const source = nodesById.get(edge.from)
  const target = nodesById.get(edge.to)
  if (!source || !target) return null

  const sourceX = LANE_X[source.lane]
  const sourceBottomY = toNodeCenterY(source.row) + NODE_HEIGHT / 2
  const targetX = LANE_X[target.lane]
  const targetTopY = toNodeCenterY(target.row) - NODE_HEIGHT / 2

  if (source.lane === target.lane) {
    return `M ${sourceX} ${sourceBottomY} L ${targetX} ${targetTopY}`
  }

  const midY = sourceBottomY + (targetTopY - sourceBottomY) / 2
  return `M ${sourceX} ${sourceBottomY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetTopY}`
}

function StatusIcon({ status }: { status: RoadmapNodeItem['status'] }) {
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 4L3.2 5.8L6.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  if (status === 'IN_PROGRESS') {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg width="6" height="8" viewBox="0 0 6 8" fill="none">
          <path d="M1.5 1.5L4.5 4L1.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-400">
      <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
        <circle cx="3" cy="3" r="1.5" fill="currentColor" />
      </svg>
    </span>
  )
}

export default function RoadmapMiniMap({ roadmap, roadmapSummary, progressPercent }: RoadmapMiniMapProps) {
  if (!roadmap) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <i className="fas fa-map text-xl text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-500">최근 학습 로드맵 없음</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-400">
          로드맵 허브에서 로드맵을<br />시작하면 여기에 표시됩니다.
        </p>
      </div>
    )
  }

  const layout = buildMiniGraphLayout(roadmap.nodes)
  const nodesById = new Map(layout.nodes.map((node) => [node.id, node]))
  const focusNode = pickFocusNode(roadmap.nodes)
  const completedNodes = roadmap.nodes.filter((node) => node.status === 'COMPLETED').length
  const totalStructuralNodes = roadmap.nodes.filter((node) => node.branchKind !== 'REVIEW' && node.branchKind !== 'ADVANCED').length
  const hasBranch = roadmap.nodes.some((node) => node.laneKey != null)
  const lastActivityLabel = formatActivityLabel(
    roadmapSummary?.lastStudiedAt ?? roadmapSummary?.updatedAt ?? roadmapSummary?.createdAt ?? null,
  )
  const height = graphHeight(layout.rowCount)
  const focusProgress = focusNode?.status === 'IN_PROGRESS' ? toNodeProgressPercent(focusNode) : null
  const clamped = clampPercent(progressPercent)

  return (
    <div className="space-y-3">
      {/* 진행률 요약 카드 */}
      <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-bold text-gray-900">{roadmap.title}</p>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            {clamped}%
          </span>
        </div>

        {lastActivityLabel && (
          <p className="mt-0.5 text-[11px] text-gray-400">
            <i className="fas fa-clock mr-1 opacity-70" />
            {lastActivityLabel} 학습
          </p>
        )}

        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${clamped}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[11px] font-medium text-emerald-700">
            {completedNodes} / {totalStructuralNodes} 노드 완료
          </p>
        </div>
      </div>

      {/* 미니 로드맵 그래프 */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <span className="text-[11px] font-semibold text-slate-500">학습 경로</span>
          <span className="text-[11px] text-slate-400">
            {hasBranch ? '분기 포함' : '직선 흐름'}
          </span>
        </div>

        <div className="max-h-[400px] overflow-y-auto px-1 py-2">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${height}`}
            className="w-full"
            style={{ height: `${height}px` }}
            role="img"
            aria-label={roadmap.title}
          >
            {layout.edges.map((edge) => {
              const source = nodesById.get(edge.from)
              const target = nodesById.get(edge.to)
              const path = buildEdgePath(edge, nodesById)
              if (!source || !target || !path) return null
              const style = edgeStyle(edge.kind, source, target)
              return (
                <path
                  key={edge.id}
                  d={path}
                  fill="none"
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            })}

            {layout.nodes.map((node) => {
              const palette = nodePalette(node)
              const centerX = LANE_X[node.lane]
              const centerY = toNodeCenterY(node.row)
              const x = centerX - NODE_WIDTH / 2
              const y = centerY - NODE_HEIGHT / 2
              const lines = wrapTitle(node.title)
              const isActive = node.status === 'IN_PROGRESS'

              return (
                <g key={node.id}>
                  <title>{node.title}</title>

                  {/* 그림자 효과 */}
                  {isActive && (
                    <rect
                      x={x + 1}
                      y={y + 2}
                      rx="12"
                      ry="12"
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      fill="#22c55e"
                      opacity="0.12"
                    />
                  )}

                  <rect
                    x={x}
                    y={y}
                    rx="12"
                    ry="12"
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    fill={palette.fill}
                    stroke={palette.stroke}
                    strokeWidth={isActive ? 1.8 : 1.2}
                  />

                  {/* 완료 노드 좌상단 체크 점 */}
                  <circle
                    cx={x + 9}
                    cy={y + 9}
                    r="3"
                    fill={palette.dot}
                    opacity={node.status === 'LOCKED' ? 0.5 : 1}
                  />

                  {lines.map((line, index) => (
                    <text
                      key={`${node.id}-line-${index}`}
                      x={centerX}
                      y={y + 25 + index * 14}
                      fill={palette.text}
                      fontSize="12.5"
                      fontWeight={isActive ? '800' : '600'}
                      textAnchor="middle"
                    >
                      {line}
                    </text>
                  ))}

                  {/* IN_PROGRESS 진행률 바 — clipPath로 양끝 둥글게 클리핑 */}
                  {isActive && (() => {
                    const barX = x + 10
                    const barY = y + NODE_HEIGHT - 12
                    const barW = NODE_WIDTH - 20
                    const barH = 4
                    const fillW = Math.max(0, (barW * node.lessonProgressPercent) / 100)
                    const clipId = `progress-clip-${node.id}`
                    return (
                      <>
                        <defs>
                          <clipPath id={clipId}>
                            <rect x={barX} y={barY} rx={barH / 2} ry={barH / 2} width={barW} height={barH} />
                          </clipPath>
                        </defs>
                        {/* 배경 */}
                        <rect x={barX} y={barY} rx={barH / 2} ry={barH / 2} width={barW} height={barH} fill={palette.progressBg} />
                        {/* 채움 — clipPath로 바깥으로 삐져나오지 않게 */}
                        <rect
                          x={barX}
                          y={barY}
                          width={fillW}
                          height={barH}
                          fill={palette.progressFill}
                          clipPath={`url(#${clipId})`}
                        />
                      </>
                    )
                  })()}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* 현재 학습 노드 */}
      {focusNode && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
          <StatusIcon status={focusNode.status} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {focusNode.status === 'COMPLETED' ? '마지막 완료' : focusNode.status === 'IN_PROGRESS' ? '현재 학습 중' : '다음 학습'}
            </p>
            <p className="truncate text-sm font-semibold text-gray-800">{focusNode.title}</p>
          </div>
          {focusProgress != null && (
            <span className="shrink-0 text-xs font-bold text-emerald-600">{focusProgress}%</span>
          )}
        </div>
      )}
    </div>
  )
}
