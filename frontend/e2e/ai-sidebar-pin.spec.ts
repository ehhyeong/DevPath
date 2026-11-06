import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const design = JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/routinecare-design.json', import.meta.url), 'utf8'))

test('AI 사이드바는 기본 고정 해제이며 메뉴 간 고정·해제와 재방문을 동기화한다', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', name: '김학습', userId: 7, role: 'ROLE_LEARNER', exp, storage: 'local' }))
    localStorage.setItem('sidebarPinned', 'true')
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/workspaces/hub/projects/42/ai-design') data = { workspaceId: 42, design, demoWorkspace: true }
    else if (path === '/api/workspaces/42/dashboard') data = { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [], unresolvedTaskCount: 0 }
    else if (path === '/api/workspaces/42/erd') data = { workspaceId: 42, projectName: design.title, members: [], schemaJson: '', mermaidCode: design.architecture.erdMermaid }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  const aside = page.locator('.squad-workspace-aside:visible')
  await expect(page.getByRole('heading', { name: design.title, exact: true })).toBeVisible()
  await page.mouse.move(1100, 400)
  await expect(aside).not.toHaveClass(/pinned/)
  await expect(aside).toHaveCSS('width', '80px')

  async function navigate(path: string) {
    await aside.locator(`a[href^="/${path}?"]`).click()
    await expect(page).toHaveURL(new RegExp(`/${path}\\?`))
    await page.mouse.move(1100, 400)
    await expect(aside).toHaveCount(1)
  }
  await navigate('squad-blueprint')
  await expect(aside).not.toHaveClass(/pinned/)
  await aside.hover()
  await aside.getByTitle('사이드바 고정', { exact: true }).click()
  await page.mouse.move(1100, 400)
  await expect(aside).toHaveClass(/pinned/)
  for (const path of ['squad-api', 'squad-dashboard', 'squad-erd', 'squad-blueprint']) {
    await navigate(path)
    await expect(aside).toHaveClass(/pinned/)
    await expect(aside).toHaveCSS('width', '256px')
  }
  await page.reload()
  await expect(aside).toHaveClass(/pinned/)
  await expect(aside).toHaveCSS('width', '256px')
  await aside.getByTitle('사이드바 고정 해제').click()
  await page.mouse.move(1100, 400)
  for (const path of ['squad-dashboard', 'squad-api', 'squad-erd', 'squad-blueprint']) {
    await navigate(path)
    await expect(aside).not.toHaveClass(/pinned/)
    await expect(aside).toHaveCSS('width', '80px')
  }
  await page.reload()
  await expect(aside).toHaveCSS('width', '80px')
  expect(await page.evaluate(() => localStorage.getItem('sidebarPinned'))).toBe('true')
  expect(await page.evaluate(() => localStorage.getItem('aiSidebarPinned'))).toBe('false')
  await page.screenshot({ path: testInfo.outputPath('ai-sidebar-unpinned.png') })
})
