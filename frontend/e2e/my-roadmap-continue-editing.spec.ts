import { expect, test } from '@playwright/test'

test('로드맵 노드를 보존하고 소개의 기본 펼침과 사용자별 접기 선택을 유지한다', async ({ page }, testInfo) => {
  const savedBodies: Array<{ title: string; modules: Array<{ originalNodeId: number; sortOrder: number; laneKey: number | null }> }> = []
  await page.addInitScript(() => {
    if (localStorage.getItem('devpath.auth.session')) return
    const exp = 4102444800
    const role = 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role, exp, storage: 'local' }))
  })
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path.endsWith('/profile')) {
      data = { userId: 7, name: '김학습', email: 'learner@example.com', role: 'ROLE_LEARNER', profileImage: null }
    } else if (path === '/api/roadmaps/hub-catalog') {
      data = { sections: [{ active: true, title: '프론트엔드', sortOrder: 0, items: [{ active: true, linkedRoadmapId: 1, title: '프론트엔드 개발자', sortOrder: 0 }] }] }
    } else if (path === '/api/roadmaps/1') {
      data = { roadmapId: 1, title: '프론트엔드', isOfficial: true, nodes: ['HTML CSS', 'JavaScript', 'React', 'TypeScript'].map((title, index) => ({ nodeId: index + 1, roadmapId: 1, title, sortOrder: index })) }
    } else if (path === '/api/builder/roadmaps' && request.method() === 'POST') {
      savedBodies.push(request.postDataJSON())
      data = { myRoadmapId: 11, customRoadmapId: 110, title: savedBodies.at(-1)!.title, modules: [] }
    } else if (/^\/api\/my-roadmaps\/(110|111)$/.test(path)) {
      const saved = savedBodies.at(-1)!
      data = { customRoadmapId: Number(path.split('/').at(-1)), originalRoadmapId: null, title: saved.title, infoTitle: '프론트엔드 개발자 로드맵', infoContent: '<p>직접 구성한 단계에 따라 프론트엔드를 학습합니다.</p>', progressRate: 0, createdAt: '2026-11-08T12:00:00', nodes: saved.modules.map(module => ({ customNodeId: module.originalNodeId, originalNodeId: module.originalNodeId, title: ['HTML CSS', 'JavaScript', 'React', 'TypeScript'][module.originalNodeId - 1], sortOrder: module.sortOrder, laneKey: module.laneKey, status: 'NOT_STARTED', prerequisiteCustomNodeIds: [] })) }
    } else if (path === '/api/my-roadmaps') {
      data = { roadmaps: [{ customRoadmapId: 110, originalRoadmapId: null, title: savedBodies.at(-1)!.title, progressRate: 0, isBuilderOrigin: true, createdAt: '2026-11-08T12:00:00' }] }
    }
    await route.fulfill({ json: { success: true, data } })
  })

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/my-roadmap')
  const canvas = page.locator('.builder-timeline')
  await page.getByRole('button', { name: 'HTML CSS 추가', exact: true }).click()
  await canvas.getByLabel('HTML CSS', { exact: true }).hover()
  await page.getByTitle('이 위치에 분기 추가', { exact: true }).click()
  await page.getByRole('button', { name: 'JavaScript 추가', exact: true }).click()
  await page.getByRole('button', { name: 'React 추가', exact: true }).click()

  const beforeSave = await canvas.textContent()
  await page.getByRole('button', { name: /로드맵 저장$/ }).click()
  const titleInput = page.getByPlaceholder('예: 내 백엔드 개발자 로드맵')
  await titleInput.fill('프론트엔드 분기 설계')
  await titleInput.locator('..').getByRole('button', { name: /저장$/ }).click()
  await expect(page.getByRole('heading', { name: '저장 완료!', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '계속 편집하기', exact: true }).click()
  await expect(canvas).toHaveText(beforeSave!)
  for (const title of ['HTML CSS', 'JavaScript', 'React']) await expect(canvas.getByLabel(title, { exact: true })).toBeVisible()
  expect(savedBodies[0]).toEqual({ title: '프론트엔드 분기 설계', modules: [
    { builderModuleId: null, originalNodeId: 1, sortOrder: 1, laneKey: 1 },
    { builderModuleId: null, originalNodeId: 2, sortOrder: 1, laneKey: 2 },
    { builderModuleId: null, originalNodeId: 3, sortOrder: 2, laneKey: null },
  ] })

  await page.getByRole('button', { name: 'TypeScript 추가', exact: true }).click()
  await page.getByRole('button', { name: /로드맵 저장$/ }).click()
  await titleInput.fill('추가 편집한 설계')
  await titleInput.locator('..').getByRole('button', { name: /저장$/ }).click()
  await expect(page.getByRole('heading', { name: '저장 완료!', exact: true })).toBeVisible()
  expect(savedBodies[1]).toEqual({ title: '추가 편집한 설계', modules: [...savedBodies[0].modules, { builderModuleId: null, originalNodeId: 4, sortOrder: 3, laneKey: null }] })
  await page.getByRole('button', { name: '계속 편집하기', exact: true }).click()
  for (const title of ['HTML CSS', 'JavaScript', 'React', 'TypeScript']) {
    await expect(canvas.getByLabel(title, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: `${title} 추가됨`, exact: true })).toBeVisible()
  }
  await page.screenshot({ path: testInfo.outputPath('continued-roadmap.png') })

  await page.goto('/roadmap?id=110')
  const infoTitle = page.getByText('프론트엔드 개발자 로드맵', { exact: true })
  const infoBody = page.getByText('직접 구성한 단계에 따라 프론트엔드를 학습합니다.', { exact: true })
  const infoPanel = page.locator('.ui-collapse')
  await expect(infoTitle).toBeVisible()
  await expect(infoPanel).toHaveAttribute('data-open', 'true')
  await expect(infoBody).toBeVisible()
  await infoTitle.click()
  await expect(infoPanel).toHaveAttribute('data-open', 'false')
  await infoTitle.click()
  await expect(infoPanel).toHaveAttribute('data-open', 'true')
  await infoTitle.click()
  await expect(infoPanel).toHaveAttribute('data-open', 'false')
  await page.reload()
  await expect(infoTitle).toBeVisible()
  await expect(infoPanel).toHaveAttribute('data-open', 'false')
  await page.goto('/my-roadmap')
  await expect(page.getByRole('button', { name: 'HTML CSS 추가', exact: true })).toBeVisible()
  await page.goto('/roadmap?id=110')
  await expect(infoTitle).toBeVisible()
  await expect(infoPanel).toHaveAttribute('data-open', 'false')
  await page.goto('/roadmap?id=111')
  await expect(infoPanel).toHaveAttribute('data-open', 'true')
  await page.goto('/roadmap?id=110')
  await expect(infoPanel).toHaveAttribute('data-open', 'false')

  for (const userId of [8, 7]) {
    await page.evaluate(userId => {
      const session = JSON.parse(localStorage.getItem('devpath.auth.session')!)
      const claims = btoa(JSON.stringify({ sub: String(userId), role: session.role, exp: session.exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({ ...session, userId, accessToken: `test.${claims}.test` }))
      window.dispatchEvent(new CustomEvent('devpath:auth-session-sync'))
    }, userId)
    await expect(infoPanel).toHaveAttribute('data-open', userId === 8 ? 'true' : 'false')
  }
  await infoTitle.click()
  await expect(infoPanel).toHaveAttribute('data-open', 'true')
  await page.reload()
  await expect(infoPanel).toHaveAttribute('data-open', 'true')
  await expect.poll(async () => (await infoPanel.boundingBox())?.height ?? 0).toBeGreaterThan(0)
  await expect.poll(() => infoBody.evaluate(element => {
    const body = element.closest('.ui-collapse > div')!
    return body.scrollHeight <= body.clientHeight + 1
  })).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('roadmap-info-expanded.png') })
})
