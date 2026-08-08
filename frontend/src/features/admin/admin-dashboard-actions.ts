import { adminApi } from '../../lib/admin-api'
import { authApi } from '../../lib/api/auth'
import { clearStoredAuthSession, readStoredAuthSession } from '../../lib/auth-session'
import type { AdminModerationReport, AdminOfficialRoadmap, AdminRoadmapNode } from '../../types/admin'
import { adminActions } from './admin-action-registry'
import { installCourseCatalogActions } from './admin-course-catalog'
import { installNodeResourceActions } from './admin-node-resources'
import { installRoadmapHubActions } from './admin-roadmap-hub'
import { installRoadmapInfoActions } from './admin-roadmap-info'
import { parseNodeIdList, type RoadmapNodePayload } from './admin-dashboard-support'

type Dependencies = {
  refreshActiveTab: () => Promise<void>
  fetchTags: () => Promise<void>
  getOfficialRoadmaps: () => AdminOfficialRoadmap[]
  getOfficialRoadmapEditingId: () => number | null
  setOfficialRoadmapForm: (roadmap: AdminOfficialRoadmap) => void
  resetOfficialRoadmapForm: () => void
  fetchRoadmapBaseInfo: () => Promise<void>
  openRoadmapNodeModal: (node?: AdminRoadmapNode) => Promise<RoadmapNodePayload | null>
  getRoadmapNode: (nodeId: number) => AdminRoadmapNode | undefined
  fetchNodes: () => Promise<void>
  fetchAccounts: () => Promise<void>
  fetchOverview: () => Promise<void>
  fetchPendingCourses: () => Promise<void>
  fetchReports: () => Promise<void>
  getReport: (reportId: number) => AdminModerationReport | undefined
}

export async function runAdminAction(task: () => Promise<void>) {
  try {
    await task()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.')
  }
}

export function installAdminDashboardActions(deps: Dependencies) {
  installRoadmapInfoActions(runAdminAction)
  installNodeResourceActions(runAdminAction)
  installCourseCatalogActions()
  installRoadmapHubActions()
  adminActions.refreshCurrentTab = () => void runAdminAction(deps.refreshActiveTab)
  adminActions.logout = async () => {
    await runAdminAction(async () => {
      const session = readStoredAuthSession()
      try {
        if (session?.refreshToken) await authApi.logout(session.refreshToken)
      } finally {
        clearStoredAuthSession()
        window.location.replace('/home?auth=login')
      }
    })
  }
  adminActions.createTag = async () => {
    await runAdminAction(async () => {
      const name = window.prompt('등록할 태그명을 입력하세요.')
      if (!name?.trim()) return
      const description = window.prompt('태그 설명을 입력하세요. 선택 사항입니다.')?.trim() ?? ''
      await adminApi.createTag({ name: name.trim(), description: description || null })
      await deps.fetchTags()
    })
  }
  adminActions.mergeTag = async (tagId: number) => {
    await runAdminAction(async () => {
      const targetId = window.prompt('병합할 대상 태그 ID를 입력하세요.')
      if (!targetId?.trim()) return
      const parsedTargetId = Number(targetId)
      if (!Number.isFinite(parsedTargetId)) {
        window.alert('숫자 ID를 입력하세요.')
        return
      }
      await adminApi.mergeTags([tagId], parsedTargetId)
      await deps.fetchTags()
    })
  }
  adminActions.editOfficialRoadmap = (roadmapId: number) => {
    const roadmap = deps.getOfficialRoadmaps().find((item) => item.roadmapId === roadmapId)
    if (!roadmap) {
      window.alert('수정할 공식 로드맵을 찾지 못했습니다.')
      return
    }
    deps.setOfficialRoadmapForm(roadmap)
  }
  adminActions.deleteOfficialRoadmap = async (roadmapId: number) => {
    await runAdminAction(async () => {
      const roadmap = deps.getOfficialRoadmaps().find((item) => item.roadmapId === roadmapId)
      if (!roadmap) {
        window.alert('삭제할 공식 로드맵을 찾지 못했습니다.')
        return
      }
      if (!window.confirm(`'${roadmap.title}' 공식 로드맵을 삭제하시겠습니까?\n연결된 노드는 관리자 목록에서 함께 제외됩니다.`)) return
      await adminApi.deleteOfficialRoadmap(roadmapId)
      if (deps.getOfficialRoadmapEditingId() === roadmapId) deps.resetOfficialRoadmapForm()
      await deps.fetchRoadmapBaseInfo()
      window.alert('공식 로드맵을 삭제했습니다.')
    })
  }
  adminActions.createRoadmapNode = async () => {
    await runAdminAction(async () => {
      const payload = await deps.openRoadmapNodeModal()
      if (!payload) return
      await adminApi.createRoadmapNode(payload)
      await deps.fetchNodes()
    })
  }
  adminActions.editRoadmapNode = async (nodeId: number) => {
    await runAdminAction(async () => {
      const node = deps.getRoadmapNode(nodeId)
      if (!node) {
        window.alert('수정할 노드를 찾지 못했습니다.')
        return
      }
      const payload = await deps.openRoadmapNodeModal(node)
      if (!payload) return
      await adminApi.updateRoadmapNode(nodeId, payload)
      await deps.fetchNodes()
    })
  }
  adminActions.updateNodeTags = async (nodeId: number) => {
    await runAdminAction(async () => {
      const input = window.prompt('필수 태그명을 쉼표로 구분해서 입력하세요.', deps.getRoadmapNode(nodeId)?.requiredTags.join(', ') ?? '')
      if (input === null) return
      const requiredTags = input.split(',').map((value) => value.trim()).filter(Boolean)
      if (!requiredTags.length) {
        window.alert('하나 이상의 태그를 입력하세요.')
        return
      }
      await adminApi.updateNodeRequiredTags(nodeId, requiredTags)
      await deps.fetchNodes()
    })
  }
  adminActions.updateNodePrerequisites = async (nodeId: number) => {
    await runAdminAction(async () => {
      const node = deps.getRoadmapNode(nodeId)
      if (!node) {
        window.alert('수정할 노드를 찾지 못했습니다.')
        return
      }
      const input = window.prompt('선행 노드 ID를 쉼표로 구분해서 입력하세요. 같은 로드맵의 노드만 지정할 수 있습니다.', node.prerequisiteNodeIds.join(', '))
      const prerequisiteNodeIds = parseNodeIdList(input)
      if (prerequisiteNodeIds === null) return
      await adminApi.updateNodePrerequisites(nodeId, prerequisiteNodeIds)
      await deps.fetchNodes()
    })
  }
  adminActions.updateNodeRules = async (nodeId: number) => {
    await runAdminAction(async () => {
      const node = deps.getRoadmapNode(nodeId)
      const description = window.prompt('완료 기준 코드를 입력하세요. 예: QUIZ_PASS', node?.completionRuleDescription ?? 'QUIZ_PASS')
      if (!description?.trim()) return
      const progressInput = window.prompt('필수 진행률을 0부터 100 사이 숫자로 입력하세요.', String(node?.requiredProgressRate ?? 100))
      if (!progressInput?.trim()) return
      const requiredProgressRate = Number(progressInput)
      if (!Number.isFinite(requiredProgressRate)) {
        window.alert('숫자 진행률을 입력하세요.')
        return
      }
      await adminApi.updateNodeCompletionRule(nodeId, description.trim(), requiredProgressRate)
      await deps.fetchNodes()
    })
  }
  adminActions.toggleAccountStatus = async (userId: number, status: string) => {
    await runAdminAction(async () => {
      const reason = window.prompt(`${status === 'ACTIVE' ? '제한' : '복구'} 사유를 입력하세요.`)
      if (!reason?.trim()) return
      if (status === 'ACTIVE') await adminApi.restrictAccount(userId, reason.trim())
      else await adminApi.restoreAccount(userId, reason.trim())
      await Promise.all([deps.fetchAccounts(), deps.fetchOverview()])
    })
  }
  adminActions.approveCourse = async (courseId: number) => {
    await runAdminAction(async () => {
      if (!window.confirm('이 강의를 승인하시겠습니까?')) return
      await adminApi.approveCourse(courseId, '관리자 승인')
      await Promise.all([deps.fetchPendingCourses(), deps.fetchOverview()])
    })
  }
  adminActions.rejectCourse = async (courseId: number) => {
    await runAdminAction(async () => {
      const reason = window.prompt('반려 사유를 입력하세요.')
      if (!reason?.trim()) return
      await adminApi.rejectCourse(courseId, reason.trim())
      await Promise.all([deps.fetchPendingCourses(), deps.fetchOverview()])
    })
  }
  adminActions.blindContent = async (reportId: number) => {
    await runAdminAction(async () => {
      const report = deps.getReport(reportId)
      if (!report?.contentId) {
        window.alert('블라인드 처리할 콘텐츠가 없습니다.')
        return
      }
      const reason = window.prompt('블라인드 사유를 입력하세요.', report.reason)
      if (!reason?.trim()) return
      await adminApi.blindContent(report.contentId, reason.trim())
      await Promise.all([deps.fetchReports(), deps.fetchOverview()])
    })
  }
  adminActions.resolveReport = async (reportId: number) => {
    await runAdminAction(async () => {
      const reason = window.prompt('처리 메모를 입력하세요.', '문제 없음')
      if (!reason?.trim()) return
      await adminApi.resolveReport(reportId, reason.trim(), 'DISMISS')
      await Promise.all([deps.fetchReports(), deps.fetchOverview()])
    })
  }
}
