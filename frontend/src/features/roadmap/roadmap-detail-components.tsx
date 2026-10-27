import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { type ChangeLabelProps, type GhostAddCardProps, type LayoutSlot, type ProofCardBadgeProps, type RoadmapGraphProps, type RoadmapNodeCardProps, type SlotRect, areSlotRectsEqual, changeBadgeStyle, changeTypeIcon, changeTypeLabel, getBranchBadgeMeta, getNodeBoxClass, getNodeLessonProgressPercent, isNodeReadyToClear, isPendingNodeStatus, getEdgeBusY, getLaneGridColumn, makeEdgePath, roadmapCanvasScrollClassName, roadmapEdgeBaseClassName, roadmapEdgeLayerClassName, roadmapEdgeStrokeClassName, roadmapGraphClassName, roadmapNodeBoxClassName, roadmapNodeDescriptionClassName, roadmapNodeHeaderClassName, roadmapNodeMetaClassName, roadmapNodeMetaTagClassName, roadmapNodeTitleGroupClassName, roadmapNodeTitleTextClassName, roadmapProofCardBadgeClassName, roadmapRuleBadgeClassName, roadmapSlotBaseClassName, roadmapSuggestionEdgeClassName } from './roadmap-detail-support'

// Proof 카드를 노드 내부 왼쪽 위(필수 배지와 동일 높이)에 출력해 옆 브랜치 노드와의 겹침을 방지한다.
export function ProofCardBadge({ card }: ProofCardBadgeProps) {
  return (
    <div className={roadmapProofCardBadgeClassName} title={card.title} onClick={(e) => e.stopPropagation()}>
      <i className="fas fa-medal flex-[0_0_auto] text-[#f59e0b]" />
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{card.title}</span>
    </div>
  )
}

export function ChangeLabel({ change }: ChangeLabelProps) {
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

export function RoadmapNodeCard({ node, proofCard, pendingChange, badge, onNodeClick }: RoadmapNodeCardProps) {
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

export function GhostAddCard({ change, processing, badge, onApply, onIgnore }: GhostAddCardProps) {
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

export function RoadmapGraph({
  layout,
  proofCardByNodeId,
  changeByNodeId,
  processing,
  onNodeClick,
  onApply,
  onIgnore,
}: RoadmapGraphProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<HTMLDivElement | null>(null)
  const slotRefs = useRef(new Map<string, HTMLDivElement>())
  const [slotRects, setSlotRects] = useState<Record<string, SlotRect>>({})
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 })

  // 4칸 배치가 화면보다 넓으면 척추가 가운데 오도록 가로 스크롤을 맞춘다.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!layout.hasOuterLanes || !canvas || canvas.scrollWidth <= canvas.clientWidth) return
    canvas.scrollLeft = (canvas.scrollWidth - canvas.clientWidth) / 2
  }, [layout.hasOuterLanes])

  useEffect(() => {
    // 같은 줄의 갈래 카드끼리만 높이를 맞춘다(그 줄의 곁가지 카드 높이에는 끌려가지 않게).
    function equalizeBranchHeights() {
      const boxesByRow = new Map<number, HTMLElement[]>()
      layout.slots.forEach((slot) => {
        if (slot.kind !== 'official-branch') return
        const box = slotRefs.current.get(slot.id)?.querySelector<HTMLElement>('.node-box')
        if (!box) return
        box.style.minHeight = ''
        boxesByRow.set(slot.row, [...(boxesByRow.get(slot.row) ?? []), box])
      })
      boxesByRow.forEach((boxes) => {
        const height = Math.max(...boxes.map((box) => box.getBoundingClientRect().height))
        boxes.forEach((box) => {
          box.style.minHeight = `${height}px`
        })
      })
    }

    function measure() {
      const graph = graphRef.current
      if (!graph) return
      equalizeBranchHeights()
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

  const edgeBusY = getEdgeBusY(layout.edges, slotRects, layout.slots)

  return (
    <div ref={canvasRef} className={roadmapCanvasScrollClassName}>
      <div
        ref={graphRef}
        className={roadmapGraphClassName}
        style={{
          gridTemplateRows: `repeat(${Math.max(layout.rowCount, 1)}, minmax(var(--roadmap-row-min-height), auto))`,
          // 바깥 칸이 생기면 곁 카드와 간격을 줄여 화면 안에 들어오게 한다(척추는 가운데에 걸쳐 원래 폭 유지).
          // 가운데 폭 0인 칸은 갈래 1·2 사이에만 간격을 한 번 더 넣기 위한 것이다.
          ...(layout.hasOuterLanes
            ? {
                '--roadmap-side-node-width': '300px',
                '--roadmap-lane-gap': '40px',
                gridTemplateColumns:
                  'repeat(2, var(--roadmap-side-node-width)) 0px repeat(2, var(--roadmap-side-node-width))',
              }
            : {}),
        } as CSSProperties}
      >
        <svg
          className={roadmapEdgeLayerClassName}
          width={graphSize.width}
          height={graphSize.height}
          viewBox={`0 0 ${graphSize.width} ${graphSize.height}`}
          aria-hidden="true"
        >
          {layout.edges.map((edge) => {
            const path = makeEdgePath(edge, slotRects, edgeBusY[edge.id])
            if (!path) return null
            return (
              <path
                key={edge.id}
                d={path}
                className={`${roadmapEdgeBaseClassName} roadmap-edge-${edge.kind} roadmap-edge-theme-${edge.theme} ${
                  edge.kind === 'suggestion'
                    ? roadmapSuggestionEdgeClassName
                    : roadmapEdgeStrokeClassName[edge.theme]
                }`}
              />
            )
          })}
        </svg>

        {layout.slots.map((slot) => (
          <div
            key={slot.id}
            ref={registerSlot(slot.id)}
            data-slot-id={slot.id}
            className={`${roadmapSlotBaseClassName} roadmap-slot-${slot.kind} roadmap-lane-${slot.lane} ${
              slot.kind === 'official-branch' ||
              slot.kind === 'applied-branch' ||
              slot.kind === 'suggested-branch' ||
              (slot.kind === 'ghost-add' && (slot.lane === 'side-left' || slot.lane === 'side-right'))
                ? '[&_.node-box]:[width:var(--roadmap-side-node-width)]'
                : ''
            } ${
              (slot.kind === 'official-branch' && slot.lane === 'right') ||
              ((slot.kind === 'applied-branch' || slot.kind === 'suggested-branch') &&
                (slot.lane === 'right' || slot.lane === 'side-right'))
                ? '[justify-content:flex-start]!'
                : (slot.kind === 'official-branch' && slot.lane === 'left') ||
                    ((slot.kind === 'applied-branch' || slot.kind === 'suggested-branch') &&
                      (slot.lane === 'left' || slot.lane === 'side-left'))
                  ? '[justify-content:flex-end]!'
                  : ''
            } ${
              slot.kind === 'suggested-branch'
                ? '[&_.node-box]:border-[3px]! [&_.node-box]:border-dashed! [&_.node-box]:border-[#3b82f6]! [&_.node-box]:bg-[#eff6ff]! [&_.node-box]:text-[#1e40af] [&_.node-box]:[animation:pulse-blue_2s_infinite]'
                : ''
            }`}
            style={{
              gridColumn: getLaneGridColumn(slot.lane, layout.hasOuterLanes),
              gridRow: slot.row,
              // 두 칸에 걸친 척추는 칸을 카드 폭에 맞춰야 곁가지 연결선이 카드 가장자리에서 나간다.
              width: layout.hasOuterLanes && slot.lane === 'center' ? 'max-content' : undefined,
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

export { NodeDrawer,ChangesPanel,RoadmapHeaderMetrics,RoadmapSwitcherDropdown,RoadmapPageToolbar } from './roadmap-detail-panels'
