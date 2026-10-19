import { expect, test } from '@playwright/test'

const summary = {
  reviewId: 1, workspaceId: 42, issueKey: 'PR-1', title: '레이아웃 검증', status: 'OPEN',
  authorId: 1, authorName: '테스트 사용자', filePath: 'src/example.ts', sourceBranch: 'feature/test',
  targetBranch: 'main', additions: 1, deletions: 0, aiCommentCount: 0,
}
const member = { memberId: 1, learnerId: 1, learnerName: '테스트 사용자' }

test('코드 피드백 도구는 하단 영역과 서로 겹치지 않고 높이 변경에 맞춰 이동한다', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const claims = btoa(JSON.stringify({ sub: '1', role: 'ROLE_LEARNER', exp: Math.floor(Date.now() / 1000) + 3600 }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({
      tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
      name: '테스트 사용자', userId: 1, role: 'ROLE_LEARNER', exp: Math.floor(Date.now() / 1000) + 3600,
      storage: 'local',
    }))
  })
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (!pathname.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (pathname === '/api/workspaces/42/code-reviews') {
      data = { workspaceId: 42, projectName: '테스트 스쿼드', members: [member], openReviews: [summary], closedReviews: [] }
    } else if (pathname === '/api/workspaces/42/code-reviews/1') {
      data = { summary, description: '테스트', diffText: '+ const example = 1', members: [member], comments: [] }
    } else if (pathname === '/api/workspaces/42/dashboard') {
      data = { workspaceId: 42, name: '테스트 스쿼드', type: 'SQUAD', status: 'ACTIVE', ownerId: 1, members: [member], unresolvedTaskCount: 0, activeMilestoneCount: 0 }
    } else if (pathname === '/api/workspaces/42/integrations') {
      data = [{ provider: 'GITHUB', active: true, repositoryUrl: 'https://github.com/example/test' }]
    }
    await route.fulfill({ json: { success: true, data } })
  })

  await page.goto('/squad-review?workspaceId=42')
  const ai = page.getByRole('button', { name: 'AI 에이전트', exact: true })
  const chat = page.getByRole('button', { name: '팀채팅', exact: true })
  const footer = page.getByRole('button', { name: /Merge Pull Request/ }).locator('xpath=../..')
  await expect(ai).toBeVisible({ timeout: 30_000 })
  await expect(chat).toBeVisible()
  await expect(footer).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  async function expectClearance() {
    await expect.poll(async () => {
      const [aiBounds, chatBounds, footerBounds] = await Promise.all([ai.boundingBox(), chat.boundingBox(), footer.boundingBox()])
      return Boolean(aiBounds && chatBounds && footerBounds
        && aiBounds.y + aiBounds.height <= footerBounds.y - 12
        && chatBounds.y + chatBounds.height <= aiBounds.y - 8
        && chatBounds.y >= 0)
    }).toBe(true)
    await ai.hover()
    await chat.hover()
  }

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 700 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await expectClearance()
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await expectClearance()
  await page.mouse.move(640, 200)
  await page.screenshot({ path: testInfo.outputPath('review-tools.png') })
  await footer.evaluate((element) => { element.style.minHeight = '180px' })
  await expectClearance()

  await page.locator('.squad-review-page').evaluate((element) => element.classList.add('hidden'))
  await expect.poll(async () => parseFloat(await ai.evaluate(element => getComputedStyle(element).bottom))).toBe(32)
  await page.locator('.squad-review-page').evaluate((element) => element.classList.remove('hidden'))
  await expectClearance()
})
