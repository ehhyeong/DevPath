import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

for (const preset of ['routinecare', 'studymate', 'pantryshare', 'sprintdesk']) {
  const design = JSON.parse(readFileSync(new URL(`../../src/main/resources/demo/workspace/${preset}-design.json`, import.meta.url), 'utf8'))
  const review = JSON.parse(readFileSync(new URL(`../../src/main/resources/demo/workspace/${preset}-review.json`, import.meta.url), 'utf8'))

  test(`${preset} 추천 대기·생성·팀원·열린 PR과 지연 리뷰를 표시하고 재방문에도 유지한다`, async ({ page }, testInfo) => {
    // 추천·리뷰의 고정 대기 13초에 설계 탭 확인과 페이지 전환을 포함한다.
    test.setTimeout(60_000)
    const jobId = '876452a1-3d20-49d1-9b73-968746feab70'
    let generationStarted = 0
    let created = false
    const members = [
      { memberId: 1, learnerId: 7, learnerName: '김학습' },
      { memberId: 2, learnerId: 8, learnerName: '박주승' },
      { memberId: 3, learnerId: 9, learnerName: '김태형' },
    ]
    const summary = {
      reviewId: 1, workspaceId: 42, issueKey: '#PR-1', title: review.title, status: 'OPEN',
      authorId: 7, authorName: '김학습', filePath: review.filePath,
      sourceBranch: review.sourceBranch, targetBranch: 'main', additions: 10, deletions: 0, aiCommentCount: 0, aiCodeReviewId: null as number | null,
    }
    const comments = [
      { commentId: 1, reviewId: 1, authorId: 8, authorName: '박주승', filePath: summary.filePath, statusLabel: 'Commented',
        body: review.juseungComment },
      { commentId: 2, reviewId: 1, authorId: 9, authorName: '김태형', filePath: summary.filePath, statusLabel: 'Commented',
        body: review.taehyungComment },
    ]
    let aiReview: unknown = null
    const detail = () => ({ summary, description: review.description, diffText: review.diff, members, comments, aiReview })
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
      if (path === '/api/lounge/shell') {
        data = { user: { profileImage: null }, mySquads: [] }
      } else if (path === '/api/workspaces/hub/ai-design-jobs') {
        expect(route.request().postDataJSON()).toMatchObject({ difficulty: 'mvp', stackMode: 'auto', idea: null })
        generationStarted = Date.now()
        data = { jobId, status: 'PENDING', result: null }
      } else if (path === `/api/workspaces/hub/ai-design-jobs/${jobId}`) {
        const done = Date.now() - generationStarted >= 7500
        data = { jobId, status: done ? 'COMPLETED' : 'PROCESSING', result: done ? design : null }
      } else if (path === `/api/workspaces/hub/ai-design-jobs/${jobId}/workspace`) {
        created = true
        data = { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', design, demoWorkspace: true }
      } else if (path === '/api/workspaces/hub/projects/42/ai-design') {
        data = { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: new Date().toISOString(), design, demoWorkspace: true }
      } else if (path === '/api/workspaces/42/dashboard') {
        data = { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members, unresolvedTaskCount: 0, activeMilestoneCount: 4 }
      } else if (path === '/api/workspaces/42/code-reviews') {
        data = { workspaceId: 42, projectName: design.title, members, openReviews: [summary], closedReviews: [] }
      } else if (path === '/api/workspaces/42/code-reviews/1/ai-review') {
        await new Promise((resolve) => setTimeout(resolve, 5500))
        aiReview = {
          reviewId: 55, title: review.aiTitle, summary: review.aiSummary,
          providerName: 'DEMO', commentCount: review.aiComments.length,
          comments: review.aiComments.map((comment: object, index: number) => ({ ...comment, commentId: index + 1, reviewId: 55, status: 'PENDING' })),
        }
        summary.aiCodeReviewId = 55
        summary.aiCommentCount = review.aiComments.length
        data = detail()
      } else if (path === '/api/workspaces/42/code-reviews/1') {
        data = detail()
      }
      await route.fulfill({ json: { success: true, data } })
    })
    await page.goto('/workspace-hub')
    await page.getByRole('button', { name: /새 프로젝트 시작/ }).click()
    await page.getByRole('button', { name: /AI에게 주제 추천받기/ }).click()
    await page.getByRole('button', { name: /AI 설계 시작하기/ }).click()
    await expect(page.getByRole('button', { name: /백그라운드에서 계속/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: design.title, exact: true })).not.toBeVisible()
    await expect(page.getByRole('heading', { name: design.title, exact: true })).toBeVisible({ timeout: 15_000 })
    expect(Date.now() - generationStarted).toBeGreaterThanOrEqual(7500)
    await page.getByRole('button', { name: '아키텍처 & DB', exact: true }).click()
    await expect(page.getByText(design.architecture.technicalChallenges[0], { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'API 명세서', exact: true }).click()
    await expect(page.getByText(design.apis[2].path, { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: '개발 로드맵 & 면접', exact: true }).click()
    await expect(page.getByRole('heading', { name: `1. ${design.roadmap[0].title}`, exact: true })).toBeVisible()
    await page.getByRole('button', { name: /워크스페이스 생성/ }).click()
    await expect(page).toHaveURL(/squad-dashboard\?workspaceId=42&ai=1/)
    expect(created).toBe(true)
    await page.goto('/squad-review?workspaceId=42&ai=1')
    const runReview = page.getByRole('button', { name: 'AI 리뷰 실행', exact: true })
    await expect(runReview).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('GitHub 연결이 필요합니다')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /코드 피드백/ })).toHaveAttribute('aria-disabled', 'false')
    await expect(page.getByText('아직 AI 리뷰가 실행되지 않았습니다')).toBeVisible()
    for (const comment of comments) {
      await expect(page.locator('#commentThread').getByText(comment.body, { exact: true })).toBeVisible()
    }
    await runReview.click()
    await expect(page.getByRole('button', { name: '분석 중', exact: true })).toBeDisabled()
    await expect(page.getByText(review.aiComments[0].title)).toBeVisible({ timeout: 15_000 })
    await page.reload()
    await expect(page.getByText(review.aiComments[0].title)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('GitHub 연결이 필요합니다')).toHaveCount(0)
    for (const comment of comments) {
      await expect(page.locator('#commentThread').getByText(comment.body, { exact: true })).toBeVisible()
    }
    await page.screenshot({ path: testInfo.outputPath(`${preset}-demo-review.png`), fullPage: true })
  })
}
