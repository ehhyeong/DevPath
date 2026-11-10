import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { parseReviewDiff } from '../src/features/squad/review-diff'
import type { AiReviewComment } from '../src/features/squad/review-types'
import type { WorkspaceAiDesign } from '../src/features/project/api'

type ReviewSeed = {
  key: string; title: string; description: string; filePath: string; sourceBranch: string; diff: string
  aiTitle: string; aiSummary: string; juseungComment: string; taehyungComment: string
  files: Array<{ filePath: string; diff: string; changeType: string }>
  aiComments: Array<AiReviewComment & { filePath: string; lineNumber: number }>
}

for (const preset of ['routinecare', 'studymate', 'pantryshare', 'sprintdesk', 'toolshare', 'tripledger', 'eventpass', 'readtogether']) {
  test(`${preset} 시드 PR의 5개 파일과 다른 파일의 AI 지적을 연결한다`, async ({ page }, testInfo) => {
    const seed = JSON.parse(readFileSync(new URL(`../../src/main/resources/demo/workspace/${preset}-review.json`, import.meta.url), 'utf8')) as ReviewSeed
    const design = JSON.parse(readFileSync(new URL(`../../src/main/resources/demo/workspace/${preset}-design.json`, import.meta.url), 'utf8')) as WorkspaceAiDesign
    const files = seed.files.map((file, index) => {
      const lines = parseReviewDiff(file.diff)
      return { fileId: index + 1, reviewId: 1, filePath: file.filePath, diffText: file.diff, changeType: file.changeType, additions: lines.filter(line => line.kind === 'add').length, deletions: lines.filter(line => line.kind === 'remove').length }
    })
    const members = [{ memberId: 1, learnerId: 7, learnerName: '김학습', positionLabel: 'Frontend 개발자' }, { memberId: 2, learnerId: 8, learnerName: '박주승', positionLabel: 'QA·테스트' }, { memberId: 3, learnerId: 9, learnerName: '김태형', positionLabel: 'Backend·인프라' }]
    let displayFile = seed.filePath
    let aiReview: { reviewId: number; summary: string; commentCount: number; providerName: string; comments: AiReviewComment[] } | null = null
    const summary = () => ({ reviewId: 1, workspaceId: 42, issueKey: '#PR-1', title: seed.title, status: 'OPEN', authorId: 7, authorName: '김학습', authorRole: 'Frontend 개발자', filePath: displayFile, fileCount: files.length, sourceBranch: seed.sourceBranch, targetBranch: 'main', additions: files.reduce((sum, file) => sum + file.additions, 0), deletions: files.reduce((sum, file) => sum + file.deletions, 0), aiCommentCount: aiReview?.commentCount ?? 0 })
    const detail = () => ({ summary: summary(), description: seed.description, diffText: seed.diff, files, members, aiReview, comments: [{ commentId: 1, reviewId: 1, authorId: 8, authorName: '박주승', filePath: seed.filePath, body: seed.juseungComment, statusLabel: 'Commented' }, { commentId: 2, reviewId: 1, authorId: 9, authorName: '김태형', filePath: seed.filePath, body: seed.taehyungComment, statusLabel: 'Commented' }] })
    await page.addInitScript(() => {
      const exp = 4102444800, role = 'ROLE_LEARNER'
      const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role, exp, storage: 'local' }))
    })
    await page.route('**/api/**', async route => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      let data: unknown = []
      if (path === '/api/workspaces/42/code-reviews') data = { workspaceId: 42, projectName: design.title, members, openReviews: [summary()], closedReviews: [] }
      else if (path === '/api/workspaces/42/code-reviews/1') data = detail()
      else if (path === '/api/workspaces/42/code-reviews/1/ai-review') {
        displayFile = request.postDataJSON().filePath
        const ordered = [...files].sort((a, b) => Number(b.filePath === displayFile) - Number(a.filePath === displayFile))
        const comments = seed.aiComments.map(comment => {
          let offset = 4
          for (const file of ordered) {
            if (file.filePath === comment.filePath) {
              const row = parseReviewDiff(file.diffText).find(line => line.newLineNumber === comment.lineNumber)
              expect(row).toBeDefined()
              return { ...comment, status: 'PENDING' as const, lineNumber: offset + row!.rawLineNumber }
            }
            offset += file.diffText.split(/\r?\n/).length + 2
          }
          throw new Error(`지적 파일 누락. ${comment.filePath}`)
        })
        aiReview = { reviewId: 1, summary: seed.aiSummary, commentCount: 3, providerName: 'DEMO_MULTI_FILE', comments }
        data = detail()
      } else if (path === '/api/workspaces/42/dashboard') data = { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members, unresolvedTaskCount: 0, activeMilestoneCount: 0 }
      else if (path === '/api/workspaces/42/integrations') data = [{ provider: 'GITHUB', active: true, repositoryUrl: 'https://github.com/example/demo' }]
      else if (path === '/api/workspaces/hub/projects/42/ai-design') data = { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', design, createdAt: '2026-11-09T12:00:00', demoWorkspace: true }
      await route.fulfill({ json: { success: true, data } })
    })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/squad-review?workspaceId=42&ai=1')
    await expect(page.getByRole('heading', { level: 1, name: seed.title, exact: true })).toBeVisible()
    for (const member of members) {
      const avatar = page.locator('header').getByRole('img', { name: `${member.learnerName} default profile`, exact: true })
      await expect(avatar.locator('.fa-user')).toHaveCount(1)
      await expect(avatar).toHaveText('')
    }
    await expect(page.locator('header img')).toHaveCount(0)
    await expect(page.locator('#codeDiffSection').getByText('변경 파일 5개', { exact: true })).toHaveCount(1)
    await page.getByRole('button', { name: '리뷰 파일 선택', exact: true }).first().click()
    for (const file of files) await expect(page.getByRole('button').filter({ hasText: file.filePath }).last()).toBeVisible()
    await page.getByRole('button').filter({ hasText: files[1].filePath }).last().click()
    await expect(page.locator('#selectedReviewFile')).toContainText(files[1].filePath)
    await page.getByRole('button', { name: 'AI 리뷰 실행', exact: true }).click()
    await expect(page.locator('#statusMessage')).toContainText('AI 지적 3개')
    const finding = seed.aiComments[2]
    await page.getByRole('button', { name: `${finding.filePath} ${finding.lineNumber}행으로 이동`, exact: true }).click()
    const target = page.locator(`#selectedReviewFile .code-line[data-new-line="${finding.lineNumber}"]`)
    await expect(target).toBeFocused()
    await expect(target).toBeInViewport({ ratio: 1 })
    await expect(target).toContainText('assertThat(saved)')
    await expect(page.locator('#selectedReviewFile')).toContainText(finding.filePath)
    if (preset === 'routinecare' || preset === 'toolshare') await page.screenshot({ path: testInfo.outputPath(`${preset}-multi-file.png`) })
  })
}
