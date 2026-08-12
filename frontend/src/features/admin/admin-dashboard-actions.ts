import { adminApi } from '../../lib/admin-api'
import { authApi } from '../../lib/api/auth'
import { clearStoredAuthSession, readStoredAuthSession } from '../../lib/auth-session'
import type { AdminAccount, AdminModerationReport, AdminOfficialRoadmap, AdminRoadmapNode, AdminRole, AdminTag } from '../../types/admin'
import { adminActions } from './admin-action-registry'
import { installCourseCatalogActions } from './admin-course-catalog'
import { installNodeResourceActions } from './admin-node-resources'
import { installRoadmapHubActions } from './admin-roadmap-hub'
import { installRoadmapInfoActions } from './admin-roadmap-info'
import { parseNodeIdList, type RoadmapNodePayload } from './admin-dashboard-support'
import { openAccountDetailModal } from './admin-account-detail'
import { openCourseReviewModal, previewCourseReviewLesson } from './admin-course-review'
import { installAdminGovernanceActions } from './admin-governance'

type Dependencies = {
  refreshActiveTab: () => Promise<void>
  fetchTags: () => Promise<void>
  getTags: () => AdminTag[]
  getOfficialRoadmaps: () => AdminOfficialRoadmap[]
  getOfficialRoadmapEditingId: () => number | null
  setOfficialRoadmapForm: (roadmap: AdminOfficialRoadmap) => void
  resetOfficialRoadmapForm: () => void
  fetchRoadmapBaseInfo: () => Promise<void>
  openRoadmapNodeModal: (node?: AdminRoadmapNode) => Promise<RoadmapNodePayload | null>
  getRoadmapNode: (nodeId: number) => AdminRoadmapNode | undefined
  fetchNodes: () => Promise<void>
  fetchAccounts: () => Promise<void>
  getAccount: (userId: number) => AdminAccount | undefined
  fetchRoles: () => Promise<void>
  getRoles: () => AdminRole[]
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
  installAdminGovernanceActions(runAdminAction)
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
  adminActions.editTag = async (tagId: number) => {
    await runAdminAction(async () => {
      const tag = deps.getTags().find((item) => item.id === tagId)
      if (!tag) {
        window.alert('수정할 태그를 찾지 못했습니다.')
        return
      }
      const name = window.prompt('태그명을 수정하세요.', tag.name)
      if (!name?.trim()) return
      const description = window.prompt('태그 설명을 수정하세요.', tag.description ?? '')
      if (description === null) return
      await adminApi.updateTag(tagId, { name: name.trim(), description: description.trim() || null })
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
  adminActions.deleteTag = async (tagId: number) => {
    await runAdminAction(async () => {
      const tag = deps.getTags().find((item) => item.id === tagId)
      if (!tag || !window.confirm(`'${tag.name}' 태그를 삭제하시겠습니까? 기존 연결은 보존되고 새 선택 목록에서는 제외됩니다.`)) return
      await adminApi.deleteTag(tagId)
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
  adminActions.deleteRoadmapNode = async (nodeId: number) => {
    await runAdminAction(async () => {
      const node = deps.getRoadmapNode(nodeId)
      if (!node || !window.confirm(`'${node.title}' 마스터 노드를 삭제하시겠습니까? 학습·강의 데이터에서 사용하는 노드는 삭제가 거부됩니다.`)) return
      await adminApi.deleteRoadmapNode(nodeId)
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
  adminActions.viewAccountDetails = async (userId: number) => {
    await runAdminAction(async () => {
      const [account, logs, permission] = await Promise.all([
        adminApi.getAccount(userId),
        adminApi.getAccountLogs(userId),
        adminApi.getUserPermission(userId),
      ])
      openAccountDetailModal(account, logs, permission)
    })
  }
  adminActions.changeAccountStatus = async (userId: number, action: string) => {
    await runAdminAction(async () => {
      let actionLabel: string
      let actionRunner: (targetUserId: number, reason: string) => Promise<void>

      switch (action) {
        case 'RESTRICT':
          actionLabel = '제한'
          actionRunner = adminApi.restrictAccount
          break
        case 'DEACTIVATE':
          actionLabel = '비활성화'
          actionRunner = adminApi.deactivateAccount
          break
        case 'RESTORE':
          actionLabel = '복구'
          actionRunner = adminApi.restoreAccount
          break
        case 'WITHDRAW':
          actionLabel = '탈퇴 처리'
          actionRunner = adminApi.withdrawAccount
          break
        default:
          window.alert('지원하지 않는 계정 처리입니다.')
          return
      }
      if (action === 'WITHDRAW' && !window.confirm('탈퇴 처리한 계정은 관리자 화면에서 복구할 수 없습니다. 계속하시겠습니까?')) return
      const reason = window.prompt(`${actionLabel} 사유를 입력하세요.`)
      if (!reason?.trim()) return
      await actionRunner(userId, reason.trim())
      await Promise.all([deps.fetchAccounts(), deps.fetchOverview()])
    })
  }
  adminActions.approveInstructor = async (userId: number) => {
    await runAdminAction(async () => {
      const reason = window.prompt('강사 승인 메모를 입력하세요.', '강사 가입 승인')
      if (!reason?.trim()) return
      await adminApi.approveInstructor(userId, reason.trim())
      await deps.fetchAccounts()
    })
  }
  adminActions.changeInstructorGrade = async (userId: number) => {
    await runAdminAction(async () => {
      const account = deps.getAccount(userId)
      const grade = window.prompt('강사 등급을 입력하세요.', account?.instructorGrade ?? 'STANDARD')
      if (!grade?.trim()) return
      await adminApi.updateInstructorGrade(userId, grade.trim().toUpperCase())
      await deps.fetchAccounts()
    })
  }
  adminActions.createAdminRole = async () => {
    await runAdminAction(async () => {
      const roleName = window.prompt('관리자 Role 이름을 입력하세요.', 'ROLE_ADMIN_OPERATION')
      if (!roleName?.trim()) return
      const description = window.prompt('Role 설명을 입력하세요.', '')
      if (description === null) return
      const supportedCodes = await adminApi.getAdminPermissionCodes()
      const codes = window.prompt(`권한 코드를 쉼표로 구분해 입력하세요.\n사용 가능 코드\n${supportedCodes.join('\n')}`, 'ADMIN_MODERATION_RESOLVE')
      if (codes === null) return
      await adminApi.createRole({
        roleName: roleName.trim().toUpperCase(),
        description: description.trim() || null,
        permissionCodes: codes.split(',').map((code) => code.trim()).filter(Boolean),
      })
      await deps.fetchRoles()
    })
  }
  adminActions.editAdminRole = async (roleId: number) => {
    await runAdminAction(async () => {
      const role = deps.getRoles().find((item) => item.id === roleId)
      if (!role) {
        window.alert('수정할 관리자 Role을 찾지 못했습니다.')
        return
      }
      const roleName = window.prompt('관리자 Role 이름을 수정하세요.', role.roleName)
      if (!roleName?.trim()) return
      const description = window.prompt('Role 설명을 수정하세요.', role.description ?? '')
      if (description === null) return
      const supportedCodes = await adminApi.getAdminPermissionCodes()
      const codes = window.prompt(`권한 코드를 쉼표로 구분해 수정하세요.\n사용 가능 코드\n${supportedCodes.join('\n')}`, role.permissionCodes.join(', '))
      if (codes === null) return
      await adminApi.updateRole(roleId, {
        roleName: roleName.trim().toUpperCase(),
        description: description.trim() || null,
        permissionCodes: codes.split(',').map((code) => code.trim()).filter(Boolean),
      })
      await deps.fetchRoles()
    })
  }
  adminActions.deleteAdminRole = async (roleId: number) => {
    await runAdminAction(async () => {
      const role = deps.getRoles().find((item) => item.id === roleId)
      if (!role || !window.confirm(`'${role.roleName}' Role을 삭제하시겠습니까? 배정 중인 관리자에게서는 해당 Role이 해제됩니다.`)) return
      await adminApi.deleteRole(roleId)
      await deps.fetchRoles()
    })
  }
  adminActions.assignAdminRole = async (userId: number) => {
    await runAdminAction(async () => {
      const roles = deps.getRoles()
      if (!roles.length) {
        window.alert('먼저 관리자 Role을 등록하세요.')
        return
      }
      const roleGuide = roles.map((role) => `${role.id}: ${role.roleName}`).join('\n')
      const input = window.prompt(`배정할 관리자 Role ID를 입력하세요.\n${roleGuide}`)
      if (!input?.trim()) return
      const roleId = Number(input)
      if (!Number.isInteger(roleId) || !roles.some((role) => role.id === roleId)) {
        window.alert('목록에 있는 Role ID를 입력하세요.')
        return
      }
      await adminApi.assignAdminRole(userId, roleId)
      await deps.fetchAccounts()
    })
  }
  adminActions.clearAdminRole = async (userId: number) => {
    await runAdminAction(async () => {
      const permission = await adminApi.getUserPermission(userId)
      if (!permission.adminRoleId) {
        window.alert('배정된 관리자 Role이 없습니다.')
        return
      }
      if (!window.confirm(`'${permission.adminRoleName ?? '관리자 Role'}' 배정을 해제하시겠습니까? 배정된 세부 권한이 제거됩니다.`)) return
      await adminApi.clearAdminRole(userId)
      await deps.fetchAccounts()
    })
  }
  adminActions.reviewCourse = async (courseId: number) => {
    await runAdminAction(async () => {
      openCourseReviewModal(await adminApi.getCourseReview(courseId))
    })
  }
  adminActions.previewCourseReviewLesson = previewCourseReviewLesson
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
  adminActions.unblindContent = async (reportId: number) => {
    await runAdminAction(async () => {
      const report = deps.getReport(reportId)
      if (!report?.contentId) return
      const reason = window.prompt('블라인드 해제 사유를 입력하세요.')
      if (!reason?.trim()) return
      await adminApi.unblindContent(report.contentId, reason.trim())
      await Promise.all([deps.fetchReports(), deps.fetchOverview()])
    })
  }
  adminActions.resolveReport = async (reportId: number, action: string) => {
    await runAdminAction(async () => {
      if (action !== 'WARNING' && action !== 'SUSPEND' && action !== 'DISMISS') {
        window.alert('지원하지 않는 신고 처리입니다.')
        return
      }
      const labels = { WARNING: '경고', SUSPEND: '계정 정지', DISMISS: '기각' } as const
      if (action === 'SUSPEND' && !window.confirm('신고 대상 계정을 제한하고 신고를 처리합니다. 계속하시겠습니까?')) return
      const reason = window.prompt(`${labels[action]} 처리 메모를 입력하세요.`, action === 'DISMISS' ? '문제 없음' : '')
      if (!reason?.trim()) return
      await adminApi.resolveReport(reportId, reason.trim(), action)
      await Promise.all([deps.fetchReports(), deps.fetchOverview()])
    })
  }
}
