import type { MyRoadmapSummary } from '../../types/roadmap'

export function progressOf(roadmap: MyRoadmapSummary): number {
  return Math.max(0, Math.min(100, Math.round(roadmap.progressRate)))
}
