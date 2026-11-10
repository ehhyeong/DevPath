import { expect, test, type Page } from '@playwright/test'

async function prepareCompletion(page: Page) {
  let completed = false
  let finish!: () => void
  const analysis = new Promise<void>(resolve => { finish = resolve })
  let pending = [51, 52]
  const applied: number[] = []
  const suggestions = [51, 52].map((changeId, index) => ({
    changeId, sourceRecommendationId: null, nodeId: 201 + index,
    nodeTitle: index === 0 ? '[복습] Java 핵심 점검' : '[심화] JVM 메모리',
    nodeSortOrder: null, branchFromNodeId: 101, anchorCustomNodeId: 1,
    branchType: index === 0 ? 'REVIEW' : 'ADVANCED', reorderAfterNodeId: null, reorderAfterNodeTitle: null,
    reason: '완료한 학습을 바탕으로 다음 단계를 제안한다.', contextSummary: 'Java 학습 내용을 확장한다.',
    nodeChangeType: 'ADD', decisionStatus: 'PENDING', suggestedAt: '2026-11-10T13:00:00', appliedAt: null, ignoredAt: null,
  }))
  await page.addInitScript(() => {
    const exp = 4102444800
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role: 'ROLE_LEARNER', exp, storage: 'local' }))
  })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path.endsWith('/profile')) data = { userId: 7, name: '김학습', profileImage: null }
    else if (path === '/api/my-roadmaps/11') data = {
      customRoadmapId: 11, originalRoadmapId: 1, title: 'Java 학습', progressRate: completed ? 50 : 0, createdAt: '2026-11-10T09:00:00', nodes: [
        { customNodeId: 1, originalNodeId: 101, title: 'Java 기본기', content: 'Java 기초 개념을 학습한다.', sortOrder: 0, status: completed ? 'COMPLETED' : 'IN_PROGRESS', readyToClear: true, branchKind: 'SPINE', orderInLane: 0, prerequisiteCustomNodeIds: [] },
        { customNodeId: 2, originalNodeId: 102, title: '컬렉션', sortOrder: 1, status: 'PENDING', branchKind: 'SPINE', orderInLane: 1, prerequisiteCustomNodeIds: [] },
        ...applied.map(id => ({ customNodeId: id, originalNodeId: id + 150, title: suggestions.find(s => s.changeId === id)!.nodeTitle, sortOrder: 2, status: 'PENDING', branchKind: id === 51 ? 'REVIEW' : 'ADVANCED', anchorNodeId: 1, laneKey: 1, orderInLane: 0, prerequisiteCustomNodeIds: [] })),
      ],
    }
    else if (path === '/api/my-roadmaps') data = { roadmaps: [{ customRoadmapId: 11, originalRoadmapId: 1, title: 'Java 학습', progressRate: 0, isBuilderOrigin: false, createdAt: '2026-11-10T09:00:00' }] }
    else if (path.endsWith('/nodes/1/clear')) { completed = true; data = { customNodeId: 1, title: 'Java 기본기' } }
    else if (path.endsWith('/recommend-status')) { await analysis; data = { status: 'DONE', nodeId: 101, count: 2 } }
    else if (path === '/api/me/recommendation-changes') data = completed ? suggestions.filter(s => pending.includes(s.changeId)) : []
    else if (/\/recommendation-changes\/\d+\/(apply|ignore)$/.test(path)) {
      const id = Number(path.split('/').at(-2))
      pending = pending.filter(item => item !== id)
      if (path.endsWith('/apply')) applied.push(id)
      data = { nodeId: id + 150 }
    }
    await route.fulfill({ json: { success: true, data } })
  })
  return finish
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`완료 후 제안이 자연스럽게 등장하며 기존 강조와 적용·무시를 보존한다 (${reducedMotion})`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion })
    await page.setViewportSize({ width: 1440, height: 1000 })
    const finish = await prepareCompletion(page)
    await page.goto('/roadmap?id=11')
    await page.locator('[data-slot-id="node-1"] .node-box').click()
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: '이 노드 완료하기' }).click()
    await expect(page.getByText('AI 추천 분석 중…', { exact: true })).toBeVisible()
    await expect(page.locator('.roadmap-slot-suggested-branch')).toHaveCount(0)
    finish()
    const cards = page.locator('.roadmap-suggestion-enter')
    const lines = page.locator('.roadmap-edge-suggestion')
    await expect(cards).toHaveCount(2)
    await expect(lines).toHaveCount(2)
    await expect(page.locator('[data-slot-id="node-1"] .roadmap-suggestion-enter')).toHaveCount(0)
    await expect(cards.first().locator('.node-box')).toHaveCSS('animation-name', 'pulse-blue')
    await expect(lines.first()).toHaveCSS('stroke-dasharray', '8px, 8px')

    if (reducedMotion === 'reduce') {
      await expect(cards.first()).toHaveCSS('animation-name', 'none')
      await expect(lines.first()).toHaveCSS('animation-name', 'none')
      await expect(cards.first()).toHaveCSS('opacity', '1')
    } else {
      const samples = await cards.evaluateAll(elements => elements.map(element => {
        const animation = element.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'roadmap-suggestion-enter')!
        animation.pause()
        animation.currentTime = 0
        const start = { opacity: Number(getComputedStyle(element).opacity), translate: getComputedStyle(element).translate }
        animation.currentTime = 380
        const middle = Number(getComputedStyle(element).opacity)
        animation.finish()
        return { start, middle, end: Number(getComputedStyle(element).opacity) }
      }))
      for (const sample of samples) {
        expect(sample.start.opacity).toBe(0)
        expect(sample.middle).toBeGreaterThan(0)
        expect(sample.middle).toBeLessThan(1)
        expect(sample.end).toBe(1)
      }
      expect(samples[0].start.translate).toBe('20px 8px')
      expect(samples[1].start.translate).toBe('-20px 8px')
      await expect(lines.first()).toHaveCSS('animation-name', 'roadmap-suggestion-connect')
      for (const line of await lines.all()) await line.evaluate(element => {
        element.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'roadmap-suggestion-connect')!.finish()
      })
    }

    const advanced = page.locator('[data-slot-id="suggested-add-52"] .roadmap-suggestion-enter')
    await advanced.evaluate(element => { element.dataset.entryIdentity = 'original' })
    await lines.nth(1).evaluate(element => { element.dataset.entryIdentity = 'original' })
    await page.screenshot({ path: testInfo.outputPath('review-advanced-suggestions.png') })
    await page.setViewportSize({ width: 1360, height: 950 })
    await expect(advanced).toHaveAttribute('data-entry-identity', 'original')
    await page.locator('[data-slot-id="suggested-add-51"]').getByRole('button', { name: '추가 적용' }).click()
    await expect(page.locator('[data-slot-id="node-51"]')).toBeVisible()
    await expect(advanced).toHaveAttribute('data-entry-identity', 'original')
    await expect(lines).toHaveCount(1)
    await expect(lines.first()).toHaveAttribute('data-entry-identity', 'original')
    if (reducedMotion !== 'reduce') {
      expect(await advanced.evaluate(element => element.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'roadmap-suggestion-enter')?.playState)).toBe('finished')
    }
    await page.locator('[data-slot-id="suggested-add-52"]').getByRole('button', { name: '무시', exact: true }).click()
    await expect(cards).toHaveCount(0)
    await expect(lines).toHaveCount(0)
  })
}
