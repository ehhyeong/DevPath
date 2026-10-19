import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const design = JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/routinecare-design.json', import.meta.url), 'utf8'))

test('미연동 시연 워크스페이스에서 열린 PR과 지연 리뷰를 표시하고 재방문에도 유지한다', async ({ page }, testInfo) => {
  const members = [
    { memberId: 1, learnerId: 7, learnerName: '김학습' },
    { memberId: 2, learnerId: 8, learnerName: '박주승' },
    { memberId: 3, learnerId: 9, learnerName: '김태형' },
  ]
  const summary = {
    reviewId: 1, workspaceId: 42, issueKey: '#PR-1', title: 'feat: RoutineCare 일별 식단·복약 기록 저장 API', status: 'OPEN',
    authorId: 7, authorName: '김학습', filePath: 'src/main/java/com/routinecare/record/DailyRecordService.java',
    sourceBranch: 'feature/daily-records', targetBranch: 'main', additions: 10, deletions: 0, aiCommentCount: 0, aiCodeReviewId: null as number | null,
  }
  let aiReview: unknown = null
  const detail = () => ({ summary, description: '일별 기록 저장 API 검토', diffText: '+ public DailyRecord record() {}', members, comments: [], aiReview })
  await page.addInitScript(() => {
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp: Math.floor(Date.now() / 1000) + 3600 }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({
      tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', name: '김학습', userId: 7,
      role: 'ROLE_LEARNER', exp: Math.floor(Date.now() / 1000) + 3600, storage: 'local',
    }))
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/workspaces/hub/projects/42/ai-design') {
      data = { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: new Date().toISOString(), design, demoWorkspace: true }
    } else if (path === '/api/workspaces/42/dashboard') {
      data = { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members, unresolvedTaskCount: 0, activeMilestoneCount: 4 }
    } else if (path === '/api/workspaces/42/code-reviews') {
      data = { workspaceId: 42, projectName: design.title, members, openReviews: [summary], closedReviews: [] }
    } else if (path === '/api/workspaces/42/code-reviews/1/ai-review') {
      await new Promise((resolve) => setTimeout(resolve, 5500))
      aiReview = {
        reviewId: 55, title: 'RoutineCare 기록 API 검토', summary: '사용자 권한과 중복 기록 방지를 보완하세요.',
        providerName: 'DEMO', commentCount: 1,
        comments: [{ commentId: 1, reviewId: 55, category: '보안', lineNumber: 9, title: '사용자 ID는 인증 정보에서 확인',
          message: '요청의 사용자 ID만 신뢰하지 마세요.', suggestion: '인증 사용자와 기록 소유권을 검증하세요.', status: 'PENDING' }],
      }
      summary.aiCodeReviewId = 55
      summary.aiCommentCount = 1
      data = detail()
    } else if (path === '/api/workspaces/42/code-reviews/1') {
      data = detail()
    }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/squad-review?workspaceId=42&ai=1')
  const runReview = page.getByRole('button', { name: 'AI 리뷰 실행', exact: true })
  await expect(runReview).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('GitHub 연결이 필요합니다')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /코드 피드백/ })).toHaveAttribute('aria-disabled', 'false')
  await expect(page.getByText('아직 AI 리뷰가 실행되지 않았습니다')).toBeVisible()
  await runReview.click()
  await expect(page.getByRole('button', { name: '분석 중', exact: true })).toBeDisabled()
  await expect(page.getByText('사용자 ID는 인증 정보에서 확인')).toBeVisible({ timeout: 15_000 })
  await page.reload()
  await expect(page.getByText('사용자 ID는 인증 정보에서 확인')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('GitHub 연결이 필요합니다')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('routinecare-demo-review.png'), fullPage: true })
})
