import { expect, test } from '@playwright/test'

for (const aiWorkspace of [false, true]) {
test(`코드 리뷰 로딩·미처리 지적·실제 코드 줄 이동과 작성자 정보를 구분한다 (AI 워크스페이스 ${aiWorkspace})`, async ({ page }, testInfo) => {
  const diff = ['diff --git a/src/auth.ts b/src/auth.ts', 'index abc..def 100644', '--- a/src/auth.ts', '+++ b/src/auth.ts', '@@ -8,3 +8,4 @@', ' const ready = true', '-oldLogin()', '+await login()', '+clearError()', ' done()'].join('\n')
  const summary = { reviewId: 1, workspaceId: 42, issueKey: 'PR-1', title: '로그인 실패 처리와 중복 저장 방지', status: 'OPEN', authorId: 1, authorName: '김학습', filePath: 'src/auth.ts', fileCount: 2, sourceBranch: 'feature/auth', targetBranch: 'main', additions: 10, deletions: 0, aiCommentCount: 3 }
  const profileImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  const members = [{ memberId: 1, learnerId: 1, learnerName: '김학습', profileImage: null }, { memberId: 2, learnerId: 2, learnerName: '박주승', profileImage: null }, { memberId: 3, learnerId: 3, learnerName: '김태형', profileImage }]
  let releaseBoard!: () => void
  const boardReady = new Promise<void>(resolve => { releaseBoard = resolve })
  await page.addInitScript(() => {
    const exp = 4102444800
    const role = 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: '1', role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 1, name: '김학습', role, exp, storage: 'local' }))
    const state = window as Window & { reviewProjectNames: string[] }
    state.reviewProjectNames = []
    new MutationObserver(() => {
      for (const element of document.querySelectorAll('[data-workspace-project-name]')) {
        const name = element.textContent?.trim()
        if (name) state.reviewProjectNames.push(name)
      }
    }).observe(document, { childList: true, subtree: true, characterData: true })
  })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/workspaces/42/code-reviews') {
      await boardReady
      data = { workspaceId: 42, projectName: 'RoutineCare', members, openReviews: [summary], closedReviews: [] }
    } else if (path === '/api/workspaces/42/code-reviews/1') {
      data = { summary, diffText: diff, files: [{ fileId: 1, reviewId: 1, filePath: summary.filePath, diffText: diff, additions: 10, deletions: 0 }, { fileId: 2, reviewId: 1, filePath: 'src/session.ts', diffText: '@@ -100 +100 @@\n+refresh()', additions: 1, deletions: 0 }], members, comments: [{ commentId: 1, reviewId: 1, authorId: 2, authorName: '박주승', body: '중복 요청 검증도 확인해주세요.', statusLabel: 'Commented' }], aiReview: { reviewId: 1, providerName: 'GEMINI', summary: '보안 검증과 중복 저장 흐름을 검토해주세요.', commentCount: 3, comments: [{ commentId: 1, category: '보안', status: 'PENDING', lineNumber: 12, title: '인증 실패 구분', message: '네트워크 오류를 인증 오류와 구분해주세요.', suggestion: '상태 코드별로 안내합니다.' }, { commentId: 2, category: '안정성', status: 'PENDING', lineNumber: 13, title: '중복 저장 방지', message: '저장 중에는 중복 실행을 막아주세요.' }, { commentId: 3, category: 'TEST', status: 'PENDING', lineNumber: 18, title: '세션 복구 테스트', message: '세션 복구를 검증하세요.' }] } }
    } else if (path === '/api/workspaces/42/dashboard') {
      data = { workspaceId: 42, name: 'RoutineCare', type: 'SQUAD', status: 'ACTIVE', ownerId: 1, members, unresolvedTaskCount: 0, activeMilestoneCount: 0 }
    } else if (path === '/api/workspaces/42/integrations') {
      data = [{ provider: 'GITHUB', active: true, repositoryUrl: 'https://github.com/example/test' }]
    } else if (path === '/api/workspaces/hub/projects/42/ai-design') {
      await boardReady
      data = { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-11-09T12:00:00', design: { title: '이전 설계 제목', summary: '로그인 테스트', difficulty: 'mvp', stack: { frontend: 'React', backend: 'Spring Boot', database: 'PostgreSQL', libraries: [], selectionReason: '테스트' }, scenario: { userFlows: [], coreFeatures: [] }, architecture: { style: '모놀리스', description: 'REST API', components: [], erdMermaid: 'erDiagram', entities: [], technicalChallenges: [] }, apis: [], roadmap: [], interviewQuestions: [] } }
    }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`/squad-review?workspaceId=42${aiWorkspace ? '&ai=1' : ''}`)
  await expect(page.getByRole('status', { name: '코드 리뷰를 불러오는 중입니다' })).toBeVisible()
  await expect(page.getByLabel('프로젝트 이름을 불러오는 중입니다')).toBeVisible()
  await expect(page.locator('header')).not.toContainText('스쿼드 프로젝트')
  const headerBefore = await page.locator('header').boundingBox()
  await page.screenshot({ path: testInfo.outputPath('review-loading.png') })
  releaseBoard()
  await expect(page.getByRole('heading', { level: 1, name: summary.title, exact: true })).toBeVisible()
  await expect(page.locator('header')).toContainText('RoutineCare')
  for (const name of ['김학습', '박주승']) {
    const avatar = page.locator('header').getByRole('img', { name: `${name} default profile`, exact: true })
    await expect(avatar.locator('.fa-user')).toHaveCount(1)
    await expect(avatar).toHaveText('')
  }
  const uploadedAvatar = page.locator('header').getByRole('img', { name: '김태형 profile', exact: true })
  await expect(uploadedAvatar).toHaveAttribute('src', profileImage)
  await expect(uploadedAvatar).toBeVisible()
  await expect.poll(() => uploadedAvatar.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
  expect((await page.locator('header').boundingBox())?.height).toBe(headerBefore?.height)
  const ai = page.locator('#aiReviewCard')
  await expect(ai.getByText('확인 필요', { exact: true })).toHaveCount(2)
  await expect(ai.locator('p').filter({ hasText: /^개선 제안$/ })).toHaveCount(1)
  await expect(ai.locator('.fa-check-circle')).toHaveCount(0)
  await expect(page.locator('#statusMessage')).toHaveText('AI 지적 3개 · 검토 필요')
  await expect(page.getByRole('button', { name: /PR 병합/ })).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.getByRole('img', { name: '김학습 profile', exact: true }).first()).toHaveText('학습')
  await expect(page.getByRole('img', { name: '박주승 profile', exact: true }).first()).toHaveText('주승')
  expect(await page.locator('.pr-card [role="img"]').first().evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await expect(page.getByRole('link', { name: '코드 피드백', exact: true })).toHaveAttribute('title', '코드 피드백')
  await expect(page.locator('#prDetailView').getByText('+10', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('review-findings.png') })

  const lineButtons = ai.getByRole('button', { name: /행으로 이동/ })
  await expect(lineButtons).toHaveCount(3)
  const widths = await lineButtons.evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().width))
  expect(new Set(widths).size).toBe(1)
  const positions = await lineButtons.evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().x))
  expect(new Set(positions).size).toBe(1)
  const heights = await lineButtons.evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height))
  expect(new Set(heights).size).toBe(1)
  await ai.getByRole('button', { name: 'src/auth.ts 9행으로 이동', exact: true }).click()
  const code = page.locator('#selectedReviewFile')
  await expect(code.locator('.code-line[data-new-line="9"]')).toBeFocused()
  await expect(code.locator('.code-line[data-new-line="9"]')).toBeInViewport({ ratio: 1 })
  await expect(code.locator('.code-line[data-new-line="9"]')).toContainText('+await login()')
  await expect(code.locator('.code-line[data-old-line="9"]')).toContainText('-oldLogin()')
  expect((await code.locator('.code-line').allTextContents()).some(line => /diff --git|index abc|@@|--- a\/|\+\+\+ b\//.test(line))).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('review-code-line.png') })

  await ai.getByRole('button', { name: 'src/session.ts 100행으로 이동', exact: true }).click()
  await expect(page.locator('#selectedReviewFile .code-line[data-new-line="100"]')).toBeFocused()
  await expect(page.locator('#selectedReviewFile .code-line[data-new-line="100"]')).toBeInViewport({ ratio: 1 })
  await expect(page.locator('#selectedReviewFile')).toContainText('+refresh()')
  await expect(page.locator('#codeDiffSection').getByText('직접 등록한 코드', { exact: true })).toBeVisible()
  await expect(page.locator('#codeDiffSection').getByText('변경 파일 2개', { exact: true })).toBeVisible()
  const scopeLabel = ai.getByText(/선택 파일 ·/)
  expect(await scopeLabel.evaluate(element => getComputedStyle(element).fontFamily)).not.toMatch(/mono|Consolas/i)
  expect(await scopeLabel.locator('span').evaluate(element => getComputedStyle(element).fontFamily)).toMatch(/mono|Consolas/i)
  const headerNames = await page.evaluate(() => (window as Window & { reviewProjectNames: string[] }).reviewProjectNames)
  expect(new Set(headerNames)).toEqual(new Set(['RoutineCare']))
})
}
