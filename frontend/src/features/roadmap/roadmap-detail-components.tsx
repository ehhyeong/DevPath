import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { roadmapApi } from '../../lib/api/roadmap'
import type { MyRoadmapSummary } from '../../types/roadmap'
import { type ChangeLabelProps, type ChangesPanelProps, type FilterType, type GhostAddCardProps, type LayoutSlot, type NodeDrawerProps, type ProofCardBadgeProps, type RoadmapGraphProps, type RoadmapMetricsProps, type RoadmapNodeCardProps, type RoadmapPageToolbarProps, type SlotRect, areSlotRectsEqual, buildCourseDetailUrl, buildLectureListUrl, buildRoadmapReturnHref, changeBadgeStyle, changeChipLabel, changeChipStyle, changesPanelActiveTabClassName, changesPanelInactiveTabClassName, changesPanelTabClassName, changeTypeIcon, changeTypeLabel, getBranchBadgeMeta, getChangeItemClass, getNodeBoxClass, getNodeLessonProgressPercent, inferHistoryChangeType, isNodeReadyToClear, isPendingNodeStatus, makeEdgePath, nodeResourceSourceLabel, parseEssentialConcept, ROADMAP_LANE_COLUMN, roadmapCanvasScrollClassName, roadmapDoneNodeCountCardClassName, roadmapEdgeBaseClassName, roadmapEdgeLayerClassName, roadmapEdgeStrokeClassName, roadmapGraphClassName, roadmapHeaderMetricsClassName, roadmapNodeBoxClassName, roadmapNodeCountCardClassName, roadmapNodeCountLabelClassName, roadmapNodeCountNumberClassName, roadmapNodeCountWrapClassName, roadmapNodeDescriptionClassName, roadmapNodeHeaderClassName, roadmapNodeMetaClassName, roadmapNodeMetaTagClassName, roadmapNodeTitleGroupClassName, roadmapNodeTitleTextClassName, roadmapProofCardBadgeClassName, roadmapRuleBadgeClassName, roadmapSlotBaseClassName, roadmapSuggestionEdgeClassName, roadmapTotalNodeCountCardClassName, splitNodeDescription } from './roadmap-detail-support'

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
    <div className={roadmapCanvasScrollClassName}>
      <div
        ref={graphRef}
        className={roadmapGraphClassName}
        style={{
          gridTemplateRows: `repeat(${Math.max(layout.rowCount, 1)}, minmax(var(--roadmap-row-min-height), auto))`,
        }}
      >
        <svg
          className={roadmapEdgeLayerClassName}
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
            className={`${roadmapSlotBaseClassName} roadmap-slot-${slot.kind} roadmap-lane-${slot.lane} ${
              slot.kind === 'official-branch' ? '[align-self:stretch]' : ''
            } ${
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

export function NodeDrawer({ node, customRoadmapId, originalRoadmapId, editMode, onClose, onCleared }: NodeDrawerProps) {
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

      // 노드 완료 시 동적 추천 생성을 백그라운드로 트리거한다.
      const recommendationRoadmapId = originalRoadmapId ?? customRoadmapId
      const recommendationCustomRoadmapId = originalRoadmapId == null ? customRoadmapId : null
      if (node.originalNodeId != null) {
        try {
          await roadmapApi.testRunDiagnosis(
            recommendationRoadmapId,
            node.originalNodeId,
            recommendationCustomRoadmapId,
          )
        } catch {
          // Recommendation generation must not block node completion.
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

export function ChangesPanel({
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

export function RoadmapHeaderMetrics({
  changesCount,
  totalNodes,
  doneNodes,
  progressPct,
  onToggleChangesPanel,
}: RoadmapMetricsProps) {
  return (
    <div className={roadmapHeaderMetricsClassName}>
      <button
        type="button"
        onClick={onToggleChangesPanel}
        className="relative flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-xs font-bold"
      >
        <i className="fas fa-history" />
        <span>{'\uBCC0\uACBD\uC0AC\uD56D'}</span>
        {changesCount > 0 ? (
          <span className="[animation:badge-pulse_2s_infinite] absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
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

export function RoadmapSwitcherDropdown({
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

export function RoadmapPageToolbar({
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
              <span className="[animation:badge-pulse_2s_infinite] absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
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
