import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const originalDesign = JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/pantryshare-design.json', import.meta.url), 'utf8'))
const names = ['MEMBERS', 'ITEMS', 'OFFERS', 'RESERVATIONS', 'HANDOVERS', 'REVIEWS']
const pairs = [['MEMBERS', 'ITEMS'], ['ITEMS', 'OFFERS'], ['OFFERS', 'RESERVATIONS'], ['MEMBERS', 'RESERVATIONS'], ['RESERVATIONS', 'HANDOVERS'], ['MEMBERS', 'REVIEWS']]
const schema = {
  tables: names.map(name => ({ id: name, name, columns: [{ name: 'id', type: 'bigint', pk: true }] })),
  relationships: pairs.map(([from, to], index) => ({ id: `r${index}`, from, to, type: '||--o{', label: 'has' })),
}
const mermaid = `erDiagram\n${names.map(name => `${name} {\n bigint id PK\n}`).join('\n')}\n${pairs.map(([from, to]) => `${from} ||--o{ ${to} : has`).join('\n')}`
const design = { ...originalDesign, architecture: { ...originalDesign.architecture, erdMermaid: mermaid } }

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const role = 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role, exp, storage: 'local' }))
  })
})

test('ERD 검증의 여섯 항목을 대상과 한글 설명으로 나눠 표시하고 접을 수 있다', async ({ page }, testInfo) => {
  let saves = 0
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path.endsWith('/ai-design')) data = { workspaceId: 42, design, demoWorkspace: true }
    else if (path.endsWith('/dashboard')) data = { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [], unresolvedTaskCount: 0, activeMilestoneCount: 0 }
    else if (path === '/api/workspaces/42/erd') {
      if (route.request().method() === 'PUT') saves++
      data = { workspaceId: 42, projectName: design.title, members: [], schemaJson: JSON.stringify(schema), mermaidCode: mermaid }
    } else if (path.endsWith('/code-reviews')) data = { workspaceId: 42, openReviews: [], closedReviews: [] }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/squad-erd?workspaceId=42&ai=1')
  await expect(page.getByText('테이블 목록', { exact: true })).toBeVisible()
  const warning = page.locator('.erd-validation-box')
  await expect(warning.locator('summary')).toContainText('설계 확인이 필요한 항목')
  await expect(warning.locator('summary')).toContainText('6개')
  const list = warning.getByRole('list', { name: '설계 검증 항목' })
  await expect(list.getByRole('listitem')).toHaveCount(6)
  const explanation = '관계에 연결할 기준 컬럼과 외래 키(FK) 컬럼이 지정되지 않았습니다.'
  await expect(list.getByText(explanation, { exact: true })).toHaveCount(6)
  await expect(list.getByText('MEMBERS → ITEMS', { exact: true })).toBeVisible()
  expect(await list.getByText(explanation, { exact: true }).first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12)
  await list.getByRole('listitem').last().scrollIntoViewIfNeeded()
  await expect(list.getByText('MEMBERS → REVIEWS', { exact: true })).toBeVisible()
  await expect(warning).not.toContainText('FK columns are not linked')
  await warning.locator('summary').click()
  await expect(list).not.toBeVisible()
  await warning.locator('summary').click()
  await expect(list).toBeVisible()
  await list.evaluate(element => { element.scrollTop = 0 })
  await expect(page.locator('.erd-table-name-input').first()).toHaveValue('MEMBERS')
  expect(saves).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('erd-korean-validation.png') })
})

test('리뷰 방문 전부터 다른 메뉴와 접힌 사이드바에 열린 PR 수를 갱신한다', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const counts = new Map([[42, 1], [43, 2]])
  let detailReads = 0
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    const id = Number(path.match(/(?:workspaces(?:\/hub\/projects)?)\/(\d+)/)?.[1])
    let data: unknown = []
    if (path.endsWith('/ai-design')) data = { workspaceId: id, design, demoWorkspace: false }
    else if (path.endsWith('/dashboard')) data = { workspaceId: id, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [], unresolvedTaskCount: 0, activeMilestoneCount: 0 }
    else if (path.endsWith('/integrations')) data = [{ provider: 'GITHUB', isActive: true, repositoryUrl: 'https://github.com/example/repo' }]
    else if (path.endsWith('/erd')) data = { workspaceId: id, projectName: design.title, members: [], schemaJson: JSON.stringify(schema), mermaidCode: mermaid }
    else if (path.endsWith('/code-reviews')) data = { workspaceId: id, projectName: design.title, members: [], openReviews: Array.from({ length: counts.get(id) ?? 0 }, (_, index) => ({ reviewId: index + 1, workspaceId: id, status: 'OPEN' })), closedReviews: [] }
    else if (/\/code-reviews\/\d+$/.test(path)) detailReads++
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  const aside = page.locator('.squad-workspace-aside:visible')
  const badge = aside.locator('.squad-dashboard-review-badge')
  await page.mouse.move(1200, 100)
  await expect(badge).toBeVisible()
  await expect(badge).toHaveText('1')
  await expect(aside).toHaveCSS('width', '80px')
  for (const path of ['squad-blueprint', 'squad-workspace', 'squad-api', 'squad-erd']) {
    await aside.locator(`a[href^="/${path}?"]`).click()
    await expect(page).toHaveURL(new RegExp(`/${path}\\?`))
    await page.mouse.move(1200, 100)
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText('1')
  }
  counts.set(42, 2)
  await expect(badge).toHaveText('2', { timeout: 10_000 })
  counts.set(42, 0)
  await expect(badge).toHaveCount(0, { timeout: 10_000 })
  expect(detailReads).toBe(0)
  await page.goto('/squad-dashboard?workspaceId=43&ai=1')
  await page.mouse.move(1200, 100)
  await expect(badge).toBeVisible()
  await expect(badge).toHaveText('2')
  await page.screenshot({ path: testInfo.outputPath('review-badge-before-review-page.png') })
})
