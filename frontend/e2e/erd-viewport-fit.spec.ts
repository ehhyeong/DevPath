import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

for (const preset of ['routinecare', 'studymate', 'pantryshare', 'sprintdesk']) {
  const design = JSON.parse(readFileSync(new URL(`../../src/main/resources/demo/workspace/${preset}-design.json`, import.meta.url), 'utf8'))

  test(`${preset} ERD는 실제 도면 비율로 화면에 맞추고 크기 변경·기본 보기를 지원한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript(() => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({
        tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
        name: '김학습', userId: 7, role: 'ROLE_LEARNER', exp, storage: 'local',
      }))
    })
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      let data: unknown = []
      if (path === '/api/workspaces/hub/projects/42/ai-design') data = { workspaceId: 42, design, demoWorkspace: true }
      else if (path === '/api/workspaces/42/dashboard') data = {
        workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7,
        members: [], unresolvedTaskCount: 0,
      }
      else if (path === '/api/workspaces/42/erd') data = {
        workspaceId: 42, projectName: design.title, members: [],
        schemaJson: '', mermaidCode: design.architecture.erdMermaid,
      }
      await route.fulfill({ json: { success: true, data } })
    })

    await page.goto('/squad-erd?workspaceId=42&ai=1')
    const canvas = page.locator('.erd-diagram-wrapper')
    const svg = canvas.locator('svg')
    await expect(svg).toBeVisible()

    async function expectFitted() {
      await expect.poll(async () => svg.evaluate((element) => {
        const diagram = element as SVGSVGElement
        const bounds = diagram.getBoundingClientRect()
        const area = diagram.closest('.erd-diagram-wrapper')!.getBoundingClientRect()
        return {
          contained: bounds.left >= area.left + 47 && bounds.right <= area.right - 47
            && bounds.top >= area.top + 47 && bounds.bottom <= area.bottom - 47,
          proportional: Math.abs(bounds.width / bounds.height - diagram.viewBox.baseVal.width / diagram.viewBox.baseVal.height) < 0.001,
        }
      })).toEqual({ contained: true, proportional: true })
    }

    await expectFitted()
    for (const viewport of [{ width: 1280, height: 720 }, { width: 960, height: 768 }]) {
      await page.setViewportSize(viewport)
      await expectFitted()
    }
    const fitted = (await svg.boundingBox())!
    await page.getByRole('button', { name: 'ERD 확대', exact: true }).click()
    await expect.poll(async () => (await svg.boundingBox())!.width).toBeGreaterThan(fitted.width * 1.09)
    const area = (await canvas.boundingBox())!
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
    await page.mouse.down()
    await page.mouse.move(area.x + area.width / 2 + 80, area.y + area.height / 2 + 40)
    await page.mouse.up()
    await page.getByRole('button', { name: 'ERD 기본 보기', exact: true }).click()
    await expectFitted()
    await page.screenshot({ path: testInfo.outputPath(`${preset}-erd-fit.png`) })
  })
}
