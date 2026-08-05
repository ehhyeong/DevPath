import { getRoadmapNodeVisual } from '../../lib/roadmap-icons'
import type { RoadmapHubCatalog, RoadmapHubItem } from '../../types/roadmap-hub'
import type { OfficialRoadmapDetail, OfficialRoadmapNode } from '../../types/roadmap'

export interface SkillModule {
  dbId: number
  source: 'BUILDER_MODULE' | 'OFFICIAL_NODE'
  builderModuleId: number | null
  originalNodeId: number | null
  id: string
  title: string
  category: string
  icon: string
  color: string
  bgColor: string
  topics: string[]
}

export interface RoadmapTemplate {
  roadmapId: number
  label: string
  sectionTitle: string
  item: RoadmapHubItem
}

export interface BuilderNode {
  instanceId: string
  module: SkillModule
  sortOrder: number        // 타임라인 위치 (1부터)
  branchGroup: number | null  // null=척추, 1=왼쪽, 2=오른쪽
}

export interface TimelineRow {
  sortOrder: number
  nodes: BuilderNode[]
  isBranching: boolean
}

export type ActiveDrag =
  | { kind: 'MODULE'; module: SkillModule }
  | { kind: 'NODE'; instanceId: string; sortOrder: number; branchGroup: number | null }

export function makeInstanceId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function getModuleUsageKey(module: SkillModule) {
  return `${module.source}:${module.source === 'OFFICIAL_NODE' ? module.originalNodeId : module.builderModuleId}`
}

function splitSubTopics(value?: string | null) {
  if (!value) return []
  return value
    .split(/[,;|]/)
    .map((topic) => topic.trim())
    .filter(Boolean)
}

export function getTopicSummary(value: string) {
  return value.split(':')[0]?.trim() || value.trim()
}

export function getCategoryBadgeVisual(category: string) {
  const normalized = category.replace(/\s/g, '').toLowerCase()

  if (normalized.includes('직무별') || normalized.includes('job')) {
    return {
      icon: 'fa-briefcase',
      className: 'border-blue-200 bg-blue-50 text-blue-600',
    }
  }

  if (normalized.includes('기술별') || normalized.includes('skill') || normalized.includes('tech')) {
    return {
      icon: 'fa-code',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    }
  }

  return {
    icon: 'fa-map',
    className: 'border-gray-200 bg-gray-100 text-gray-500',
  }
}

function mapOfficialNodeToModule(
  detail: OfficialRoadmapDetail,
  node: OfficialRoadmapNode,
  template: RoadmapTemplate | null,
): SkillModule {
  const visual = getRoadmapNodeVisual({
    title: node.title,
    subTopics: node.subTopics,
    nodeType: node.nodeType,
    roadmapTitle: template?.item.subtitle ?? template?.label ?? detail.title,
    category: template?.sectionTitle ?? detail.title,
  })
  const topics = splitSubTopics(node.subTopics)

  return {
    dbId: -node.nodeId,
    source: 'OFFICIAL_NODE',
    builderModuleId: null,
    originalNodeId: node.nodeId,
    id: `official-${node.nodeId}`,
    title: node.title,
    category: template?.sectionTitle ?? detail.title,
    icon: visual.icon,
    color: visual.color,
    bgColor: visual.bgColor,
    topics: topics.length > 0 ? topics : [node.nodeType ?? detail.title],
  }
}

export function mapDetailToModules(
  detail: OfficialRoadmapDetail,
  template: RoadmapTemplate | null,
) {
  return [...detail.nodes]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nodeId - b.nodeId)
    .map((node) => mapOfficialNodeToModule(detail, node, template))
}

export function buildRoadmapTemplates(catalog: RoadmapHubCatalog): RoadmapTemplate[] {
  return catalog.sections
    .filter((section) => section.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((section) =>
      section.items
        .filter((item) => item.active && item.linkedRoadmapId !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          roadmapId: item.linkedRoadmapId as number,
          label: item.title || item.linkedRoadmapTitle || `Roadmap ${item.linkedRoadmapId}`,
          sectionTitle: section.title,
          item,
        })),
    )
}

export function filterRoadmapTemplates(
  templates: RoadmapTemplate[],
  section: string,
  keyword: string,
) {
  const q = keyword.trim().toLowerCase()
  return templates.filter((template) => {
    const matchesSection = section === 'ALL' || template.sectionTitle === section
    const matchesKeyword =
      !q ||
      template.label.toLowerCase().includes(q) ||
      template.sectionTitle.toLowerCase().includes(q) ||
      (template.item.subtitle ?? '').toLowerCase().includes(q) ||
      (template.item.linkedRoadmapTitle ?? '').toLowerCase().includes(q)

    return matchesSection && matchesKeyword
  })
}
