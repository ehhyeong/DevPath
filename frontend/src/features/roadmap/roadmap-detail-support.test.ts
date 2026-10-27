import { describe, expect, it } from 'vitest'
import type { RecommendationChange, RoadmapNodeItem } from '../../types/roadmap'
import { buildRoadmapLayout, getEdgeBusY, getLaneGridColumn, type SlotRect } from './roadmap-detail-support'

function node(customNodeId: number, lane: Partial<RoadmapNodeItem> = {}): RoadmapNodeItem {
  return {
    customNodeId,
    originalNodeId: customNodeId + 1000,
    title: `노드 ${customNodeId}`,
    sortOrder: customNodeId,
    status: 'LOCKED',
    prerequisiteCustomNodeIds: [],
    branchKind: 'SPINE',
    orderInLane: customNodeId,
    ...lane,
  }
}

function suggestion(changeId: number, anchorCustomNodeId: number, branchType: string): RecommendationChange {
  return {
    changeId,
    sourceRecommendationId: null,
    nodeId: 9000 + changeId,
    nodeTitle: `제안 ${changeId}`,
    nodeSortOrder: null,
    branchFromNodeId: null,
    anchorCustomNodeId,
    branchType,
    reorderAfterNodeId: null,
    reorderAfterNodeTitle: null,
    reason: '',
    contextSummary: '',
    nodeChangeType: 'ADD',
    decisionStatus: 'PENDING',
    suggestedAt: '2026-10-27 00:00:00',
    appliedAt: null,
    ignoredAt: null,
  }
}

// 척추 1 → 갈림길(갈래1: 2→4, 갈래2: 3) → 척추 5
const forkNodes = [
  node(1),
  node(2, { branchKind: 'BRANCH', anchorNodeId: 1, laneKey: 1, orderInLane: 0 }),
  node(3, { branchKind: 'BRANCH', anchorNodeId: 1, laneKey: 2, orderInLane: 0 }),
  node(4, { branchKind: 'BRANCH', anchorNodeId: 1, laneKey: 1, orderInLane: 1 }),
  node(5, { orderInLane: 1 }),
]

function slotOf(layout: ReturnType<typeof buildRoadmapLayout>, id: string) {
  const slot = layout.slots.find((s) => s.id === id)
  if (!slot) throw new Error(`${id} 슬롯 없음`)
  return { lane: slot.lane, row: slot.row, column: getLaneGridColumn(slot.lane, layout.hasOuterLanes) }
}

describe('buildRoadmapLayout 곁가지 배치', () => {
  it('갈래에 곁가지가 없으면 기존 3열 배치를 그대로 쓴다', () => {
    const layout = buildRoadmapLayout(forkNodes, [])

    expect(layout.hasOuterLanes).toBe(false)
    expect(slotOf(layout, 'node-1')).toEqual({ lane: 'center', row: 1, column: '2' })
    expect(slotOf(layout, 'node-2')).toEqual({ lane: 'left', row: 2, column: '1' })
    expect(slotOf(layout, 'node-3')).toEqual({ lane: 'right', row: 2, column: '3' })
    expect(slotOf(layout, 'node-5')).toEqual({ lane: 'center', row: 4, column: '2' })
  })

  it('척추의 곁가지는 종류대로 척추 옆 같은 행에 놓인다', () => {
    const layout = buildRoadmapLayout(
      [
        node(1),
        node(6, { branchKind: 'REVIEW', anchorNodeId: 1, laneKey: 1, orderInLane: 0 }),
        node(7, { branchKind: 'ADVANCED', anchorNodeId: 1, laneKey: 2, orderInLane: 0 }),
        node(5, { orderInLane: 1 }),
      ],
      [],
    )

    expect(layout.hasOuterLanes).toBe(false)
    expect(slotOf(layout, 'node-6')).toEqual({ lane: 'side-left', row: 1, column: '1' })
    expect(slotOf(layout, 'node-7')).toEqual({ lane: 'side-right', row: 1, column: '3' })
    expect(slotOf(layout, 'node-5').row).toBe(2)
  })

  it('왼쪽 갈래의 곁가지는 바깥 왼쪽 칸 같은 행에 놓이고 행이 늘지 않는다', () => {
    const layout = buildRoadmapLayout(
      [...forkNodes, node(8, { branchKind: 'ADVANCED', anchorNodeId: 2, laneKey: 1, orderInLane: 0 })],
      [],
    )

    expect(layout.hasOuterLanes).toBe(true)
    expect(slotOf(layout, 'node-8')).toEqual({ lane: 'side-left', row: 2, column: '1' })
    expect(slotOf(layout, 'node-2').column).toBe('2')
    expect(slotOf(layout, 'node-3').column).toBe('4')
    expect(slotOf(layout, 'node-1').column).toBe('2 / span 3')
    expect(slotOf(layout, 'node-5').row).toBe(4)
  })

  it('오른쪽 갈래의 복습 곁가지도 반대편으로 가지 않고 바깥 오른쪽에 놓인다', () => {
    const layout = buildRoadmapLayout(
      [...forkNodes, node(8, { branchKind: 'REVIEW', anchorNodeId: 3, laneKey: 1, orderInLane: 0 })],
      [],
    )

    expect(slotOf(layout, 'node-8')).toEqual({ lane: 'side-right', row: 2, column: '5' })
  })

  it('갈래에 매달린 생성 제안도 수락 후와 같은 바깥 칸에 놓인다', () => {
    const layout = buildRoadmapLayout(forkNodes, [suggestion(1, 4, 'ADVANCED')])

    expect(layout.hasOuterLanes).toBe(true)
    expect(slotOf(layout, 'suggested-add-1')).toEqual({ lane: 'side-left', row: 3, column: '1' })
  })

  it('곁가지에 매달린 곁가지는 같은 쪽 아래 칸으로 내려간다', () => {
    const layout = buildRoadmapLayout(
      [
        ...forkNodes,
        node(8, { branchKind: 'ADVANCED', anchorNodeId: 2, laneKey: 1, orderInLane: 0 }),
        node(9, { branchKind: 'ADVANCED', anchorNodeId: 8, laneKey: 1, orderInLane: 0 }),
      ],
      [],
    )

    expect(slotOf(layout, 'node-9')).toEqual({ lane: 'side-left', row: 3, column: '1' })
  })
})

describe('getEdgeBusY 갈라짐·합류선 높이', () => {
  // 행 번호마다 위아래 위치를 정한 가짜 측정값(행 높이 100, 행 간격 40)
  function rectsFor(layout: ReturnType<typeof buildRoadmapLayout>) {
    return Object.fromEntries(
      layout.slots.map((slot) => {
        const top = (slot.row - 1) * 140
        const rect: SlotRect = { x: 0, y: top + 50, top, right: 0, bottom: top + 100, left: 0, width: 0, height: 100 }
        return [slot.id, rect]
      }),
    )
  }

  it('갈림길 척추 아래에 곁가지가 쌓여도 갈라지는 선은 첫 갈래 줄 바로 위 빈 공간 가운데에 그린다', () => {
    const layout = buildRoadmapLayout(
      [
        ...forkNodes,
        node(8, { branchKind: 'ADVANCED', anchorNodeId: 1, laneKey: 1, orderInLane: 0 }),
        node(9, { branchKind: 'ADVANCED', anchorNodeId: 1, laneKey: 2, orderInLane: 0 }),
      ],
      [],
    )
    expect(slotOf(layout, 'node-9').row).toBe(2)
    expect(slotOf(layout, 'node-2').row).toBe(3)

    const busY = getEdgeBusY(layout.edges, rectsFor(layout), layout.slots)
    const splitBus = layout.edges.filter((e) => e.kind === 'split').map((e) => busY[e.id])
    // 2행(곁가지) 아래 끝 240과 3행(갈래) 위 끝 280의 가운데
    expect(splitBus).toEqual([260, 260])
  })

  it('합류선은 길이가 다른 갈래끼리도 합류 노드 바로 위 빈 공간 가운데의 같은 높이를 쓴다', () => {
    const layout = buildRoadmapLayout(forkNodes, [])
    const busY = getEdgeBusY(layout.edges, rectsFor(layout), layout.slots)
    const mergeBus = layout.edges.filter((e) => e.kind === 'merge').map((e) => busY[e.id])
    // 3행 아래 끝 380과 4행(합류 척추) 위 끝 420의 가운데
    expect(mergeBus).toEqual([400, 400])
  })
})
