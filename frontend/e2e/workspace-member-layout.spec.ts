import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const design = JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/routinecare-design.json', import.meta.url), 'utf8'))

for (const userId of [7, 9]) {
  test(`${userId === 7 ? '생성자' : '초대받은 팀원'} 계정은 AI 표시 없는 링크에서도 같은 AI 워크스페이스 레이아웃을 사용한다`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.addInitScript((id) => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const role = 'ROLE_LEARNER'
      const claims = btoa(JSON.stringify({ sub: String(id), role, exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', name: '워크스페이스 멤버', userId: id, role, exp, storage: 'local' }))
    }, userId)
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      let data: unknown = []
      if (path === '/api/workspaces/hub/projects') data = [{ projectId: 42, owner: userId === 7, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1' }]
      else if (path === '/api/workspaces/hub/projects/42/ai-design') data = { workspaceId: 42, design, demoWorkspace: false }
      else if (path === '/api/workspaces/42/dashboard') data = {
        workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [
          { memberId: 1, learnerId: 7, learnerName: '김학습' }, { memberId: 2, learnerId: 9, learnerName: '초대 팀원' },
        ], unresolvedTaskCount: 0, activeMilestoneCount: 0,
      }
      await route.fulfill({ json: { success: true, data } })
    })
    await page.goto('/squad-blueprint?workspaceId=42&from=invite#roadmap')
    await expect(page).toHaveURL(/\/squad-blueprint\?workspaceId=42&from=invite&ai=1#roadmap$/)
    await expect(page.locator('.ai-squad-workspace:visible')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: /개발 구현 로드맵/ })).toBeVisible()
    const aside = page.locator('.squad-workspace-aside:visible')
    await aside.locator('a[href^="/squad-api?"]').click()
    await expect(page).toHaveURL(/\/squad-api\?workspaceId=42&ai=1/)
    await expect(page.locator('.ai-squad-workspace:visible')).toHaveCount(1)
    await page.reload()
    await expect(page.locator('.ai-squad-workspace:visible')).toHaveCount(1)
    await expect(page.getByRole('button', { name: '팀채팅', exact: true })).toBeVisible()
  })
}
