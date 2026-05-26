export type NodeStatus = 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED' | 'PENDING' | 'NOT_STARTED'
export type ChangeType = 'ADD' | 'MODIFY' | 'DELETE'
export type DecisionStatus = 'PENDING' | 'APPLIED' | 'IGNORED'

export interface RoadmapNodeItem {
  customNodeId: number
  originalNodeId: number | null
  title: string
  sortOrder: number
  status: NodeStatus
  prerequisiteCustomNodeIds: number[]
  content?: string
  subTopics?: string[]
  branchGroup?: number | null
  isBranch?: boolean
  branchFromNodeId?: number | null
  branchType?: string | null
  lessonCompletionRate?: number
  requiredTagsSatisfied?: boolean
  requiredTags?: string[]
  resources?: RoadmapNodeResourceItem[]
}

export interface RoadmapNodeResourceItem {
  resourceId: number
  title: string
  url: string
  description?: string | null
  sourceType?: string | null
  sortOrder?: number | null
}

export interface RoadmapDetail {
  customRoadmapId: number
  originalRoadmapId: number | null
  title: string
  infoTitle?: string | null
  infoContent?: string | null
  progressRate: number
  createdAt: string
  nodes: RoadmapNodeItem[]
}

export interface OfficialRoadmapNode {
  nodeId: number
  roadmapId: number
  title: string
  content?: string | null
  nodeType?: string | null
  sortOrder: number
  subTopics?: string | null
  branchGroup?: number | null
}

export interface OfficialRoadmapDetail {
  roadmapId: number
  title: string
  description?: string | null
  isOfficial: boolean
  createdAt: string
  nodes: OfficialRoadmapNode[]
}

export interface RecommendationChange {
  changeId: number
  sourceRecommendationId: number | null
  nodeId: number
  nodeTitle: string
  nodeSortOrder: number | null
  branchFromNodeId: number | null
  reason: string
  contextSummary: string
  nodeChangeType: ChangeType
  decisionStatus: DecisionStatus
  suggestedAt: string
  appliedAt: string | null
  ignoredAt: string | null
}

export interface RecommendationChangeHistory {
  changeId: number
  nodeId: number
  nodeTitle: string
  nodeChangeType?: ChangeType
  changeStatus?: string
  decisionStatus: DecisionStatus
  updatedAt: string
}

export interface MyRoadmapSummary {
  customRoadmapId: number
  originalRoadmapId: number | null
  title: string
  progressRate: number
  isBuilderOrigin: boolean
  builderRoadmapId?: number | null
  createdAt: string
  updatedAt?: string | null
  lastStudiedAt?: string | null
}

export interface ProofCardTagItem {
  tagId: number
  tagName: string
  evidenceType: string
}

export interface ProofCardSummary {
  proofCardId: number
  nodeId: number | null
  nodeTitle: string | null
  courseId: number | null
  courseTitle: string | null
  title: string
  status: string
  issuedAt: string
}
