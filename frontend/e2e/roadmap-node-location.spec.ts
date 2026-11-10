import { expect, test, type Page } from '@playwright/test'

async function prepareRoadmap(page: Page) {
  await page.addInitScript(() => {
    const exp = 4102444800
    const role = 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role, exp, storage: 'local' }))
    const scroll = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (options) {
      if (typeof options === 'object') document.documentElement.dataset.nodeScrollBehavior = options.behavior
      scroll.call(this, options)
    }
  })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path.endsWith('/profile')) data = { userId: 7, name: '김학습', role: 'ROLE_LEARNER', profileImage: null }
    else if (path === '/api/roadmaps/hub-catalog') data = { sections: [] }
    else if (path === '/api/my-roadmaps/11') data = {
      customRoadmapId: 11, originalRoadmapId: 1, title: '백엔드 개발자', infoContent: '<p>백엔드 학습 순서</p>', progressRate: 20, createdAt: '2026-11-10T09:00:00',
      nodes: [
        ...Array.from({ length: 16 }, (_, index) => ({ customNodeId: index + 1, originalNodeId: index + 101, title: `학습 단계 ${index + 1}`, content: '단계별 학습 내용', sortOrder: index, status: index === 0 ? 'COMPLETED' : 'PENDING', prerequisiteCustomNodeIds: [], branchKind: 'SPINE', orderInLane: index })),
        { customNodeId: 77, originalNodeId: 900, title: 'Docker 실전 배포', content: '성장 공고에서 필요한 컨테이너 배포 역량을 학습한다.', sortOrder: 13, status: 'LOCKED', prerequisiteCustomNodeIds: [13], branchKind: 'ADVANCED', anchorNodeId: 13, laneKey: 2, orderInLane: 0 },
      ],
    }
    else if (path === '/api/my-roadmaps') data = { roadmaps: [{ customRoadmapId: 11, originalRoadmapId: 1, title: '백엔드 개발자', progressRate: 20, isBuilderOrigin: false, createdAt: '2026-11-10T09:00:00' }] }
    await route.fulfill({ json: { success: true, data } })
  })
}

test('일반 클릭에는 강조 없이 기존 블러를 표시하고 지도 배치를 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareRoadmap(page)
  await page.goto('/roadmap?id=11')
  const normal = page.locator('[data-slot-id="node-1"] .node-box')
  await normal.scrollIntoViewIfNeeded()
  const before = await page.locator('.roadmap-content').boundingBox()
  await normal.click()
  await expect(page.locator('.side-drawer')).toBeVisible()
  await expect(page.locator('.node-box[aria-current]')).toHaveCount(0)
  await expect(page.locator('.drawer-overlay')).toBeVisible()
  await expect(page.locator('.drawer-overlay')).toHaveCSS('backdrop-filter', 'blur(2px)')
  await expect(page.locator('.roadmap-main')).toHaveCSS('padding-right', '0px')
  expect(await page.locator('.roadmap-content').boundingBox()).toEqual(before)
  await expect(page.getByRole('button', { name: '로드맵에서 위치 보기' })).toHaveCount(0)
})

for (const width of [1440, 1100]) {
  test(`${width}px에서 추가 노드만 강조하고 상세의 원래 블러와 지도 폭을 유지한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await prepareRoadmap(page)
    await page.goto('/roadmap?id=11&focusOriginalNodeId=900')
    const target = page.locator('[data-slot-id="node-77"] .node-box')
    await expect(target).toHaveAttribute('aria-current', 'true')
    await expect(target.getByText('추가된 노드', { exact: true })).toBeVisible()
    const drawer = page.locator('.side-drawer')
    await expect(drawer).toHaveCount(0)
    await expect(target).toBeInViewport({ ratio: 1 })
    await page.screenshot({ path: testInfo.outputPath('added-node-arrival.png') })
    await target.click()
    await expect(drawer.getByRole('heading', { name: 'Docker 실전 배포' })).toBeVisible()
    await expect(target).toBeInViewport({ ratio: 1 })
    await expect(page).toHaveURL(/\/roadmap\?id=11$/)
    await expect(page.locator('.drawer-overlay')).toBeVisible()
    await expect(page.locator('.drawer-overlay')).toHaveCSS('backdrop-filter', 'blur(2px)')
    await expect(page.locator('.roadmap-main')).toHaveCSS('padding-right', '0px')
    const contentWidth = await page.locator('.roadmap-content').evaluate(el => el.clientWidth)
    await expect(target).toHaveCSS('outline-style', 'solid')
    await expect(target).toHaveCSS('animation-name', 'roadmap-node-locate')
    await expect(target).toHaveCSS('animation-iteration-count', '3')
    await page.screenshot({ path: testInfo.outputPath('added-node-with-detail.png') })
    await page.getByRole('button', { name: '노드 상세 닫기' }).click()
    await expect(drawer).toHaveCount(0)
    await expect(target).toHaveAttribute('aria-current', 'true')
    expect(await page.locator('.roadmap-content').evaluate(el => el.clientWidth)).toBe(contentWidth)

    const another = page.locator('[data-slot-id="node-13"] .node-box')
    await another.click()
    await expect(another).not.toHaveAttribute('aria-current')
    await expect(target).toHaveAttribute('aria-current', 'true')
    await expect(drawer.getByRole('heading', { name: '학습 단계 13', exact: true })).toBeVisible()
    await expect(page.getByText('선택한 노드', { exact: true })).toHaveCount(0)
    await expect(page.locator('.node-box[aria-current]')).toHaveCount(1)
    await expect(page.locator('.drawer-overlay')).toBeVisible()
    await page.getByRole('button', { name: '노드 상세 닫기' }).click()
    await expect(drawer).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('성장 공고의 부족 기술을 수락하면 실제 응답 ID의 노드를 찾아 강조한다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareRoadmap(page)
  const requests: unknown[] = []
  await page.route('**/api/jobs/**', async route => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = { projectCount: 1, completedTaskCount: 5, proofCardCount: 1, averageProofCardScore: 80, skillSignals: ['Java'], skillKeywords: [] }
    if (path.endsWith('/gemini-recommendations/me')) data = {
      recommendations: [], aiAnalyzed: true,
      stretchRecommendations: [{ externalId: 'growth-1', title: '백엔드 배포 개발자', companyName: '테스트 기업', areaCode: '서울', keywords: ['Java', 'Docker'], aiMatchScore: 75, aiReason: 'Java 역량 보유', missingSkills: ['Docker'] }],
    }
    else if (path.endsWith('/skill-suggestions')) {
      requests.push(route.request().postDataJSON())
      data = { mode: 'ADD', changeId: 51, targetCustomRoadmapId: 11, roadmapTitle: '백엔드 개발자', anchorNodeTitle: '학습 단계 13', newNodeTitle: 'Docker 실전 배포', branchType: 'ADVANCED', redirectUrl: '/roadmap?id=11' }
    }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.route('**/api/me/recommendation-changes/51/apply', async route => {
    requests.push(route.request().method())
    await route.fulfill({ json: { success: true, data: { nodeId: 900 } } })
  })
  await page.goto('/job-matching')
  await page.getByRole('button', { name: 'AI 맞춤 공고 스캔하기' }).click()
  await page.getByText('로드맵에서 학습하기', { exact: true }).click()
  await expect(page.getByText('학습 중인 로드맵에 노드를 추가할까요?')).toBeVisible()
  await page.getByRole('button', { name: '수락하고 추가' }).click()
  await expect(page).toHaveURL(/\/roadmap\?id=11$/)
  const target = page.locator('[data-slot-id="node-77"] .node-box')
  await expect(target).toHaveAttribute('aria-current', 'true')
  await expect(target.getByText('추가된 노드', { exact: true })).toBeVisible()
  await expect.poll(() => target.evaluate(el => el.getAnimations().length)).toBe(0)
  await expect(page.locator('.side-drawer')).toHaveCount(0)
  await target.click()
  await expect(page.locator('.side-drawer').getByRole('heading', { name: 'Docker 실전 배포' })).toBeVisible()
  expect(requests).toEqual([{ skill: 'Docker', jobTitle: '백엔드 배포 개발자' }, 'POST'])
})

test('좁은 화면에서도 기존 블러를 유지하고 상세를 닫으면 추가 노드 강조를 보여 준다', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareRoadmap(page)
  await page.goto('/roadmap?id=11&focusOriginalNodeId=900')
  await expect(page.locator('[data-slot-id="node-77"] .node-box')).toHaveAttribute('aria-current', 'true')
  // 기존 슬롯 등장의 8px 이동은 허용하되, 자동 중앙 스크롤 중 클릭 스크롤이 겹치지 않게 기다린다.
  await expect.poll(() => page.locator('[data-slot-id="node-77"]').evaluate(element => {
    const slot = element.getBoundingClientRect()
    const main = element.closest('.roadmap-main')!.getBoundingClientRect()
    return Math.abs(slot.top + slot.height / 2 - main.top - main.height / 2)
  })).toBeLessThan(16)
  await page.locator('[data-slot-id="node-77"] .node-box').click()
  await expect(page.locator('.side-drawer').getByRole('heading', { name: 'Docker 실전 배포' })).toBeVisible()
  await expect(page.locator('.drawer-overlay')).toHaveCSS('backdrop-filter', 'blur(2px)')
  await page.getByRole('button', { name: '노드 상세 닫기' }).click()
  const target = page.locator('[data-slot-id="node-77"] .node-box')
  await expect(target).toHaveAttribute('aria-current', 'true')
  await expect(target).toBeInViewport({ ratio: 1 })
  await expect(page.locator('.side-drawer')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('mobile-added-node.png') })
})

test('움직임 감소 설정에서는 파동과 부드러운 스크롤 없이 위치를 표시한다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareRoadmap(page)
  await page.goto('/roadmap?id=11&focusOriginalNodeId=900')
  const target = page.locator('[data-slot-id="node-77"] .node-box')
  await expect(page.locator('.side-drawer')).toHaveCount(0)
  await expect(target).toHaveAttribute('aria-current', 'true')
  await expect(target).toHaveCSS('animation-name', 'none')
  await expect(page.locator('html')).toHaveAttribute('data-node-scroll-behavior', 'instant')
  await expect(target).toBeInViewport({ ratio: 1 })
})

test('없는 원본 ID는 다른 노드를 강조하지 않고 잠긴 일반 복귀 노드는 상세를 열지 않는다', async ({ page }) => {
  await prepareRoadmap(page)
  await page.goto('/roadmap?id=11&focusOriginalNodeId=9999')
  await expect(page.locator('[data-slot-id="node-77"]')).toBeVisible()
  await expect(page.locator('.node-box[aria-current]')).toHaveCount(0)
  await expect(page.locator('.side-drawer')).toHaveCount(0)
  await page.goto('/roadmap?id=11&nodeId=77')
  await expect(page.locator('[data-slot-id="node-77"] .node-box')).not.toHaveAttribute('aria-current')
  await expect(page.locator('.side-drawer')).toHaveCount(0)
  await expect(page.getByText('추가된 노드', { exact: true })).toHaveCount(0)
})

test('새로고침하면 추가 노드의 강조와 자동 상세가 재생되지 않는다', async ({ page }) => {
  await prepareRoadmap(page)
  await page.goto('/roadmap?id=11&focusOriginalNodeId=900')
  await expect(page.locator('[data-slot-id="node-77"] .node-box')).toHaveAttribute('aria-current', 'true')
  await expect(page).toHaveURL(/\/roadmap\?id=11$/)
  await page.reload()
  await expect(page.locator('[data-slot-id="node-77"]')).toBeVisible()
  await expect(page.locator('.node-box[aria-current], .roadmap-node-located')).toHaveCount(0)
  await expect(page.locator('.side-drawer')).toHaveCount(0)
  await page.locator('[data-slot-id="node-77"] .node-box').click()
  await expect(page.locator('.side-drawer')).toBeVisible()
  await expect(page.locator('.node-box[aria-current]')).toHaveCount(0)
})

test('SPA로 다른 페이지에 나갔다가 뒤로 돌아오면 강조가 사라진다', async ({ page }) => {
  await prepareRoadmap(page)
  await page.goto('/roadmap?id=11&focusOriginalNodeId=900')
  await expect(page.locator('[data-slot-id="node-77"] .node-box')).toHaveAttribute('aria-current', 'true')
  await expect(page).toHaveURL(/\/roadmap\?id=11$/)
  await page.getByRole('link', { name: '로드맵', exact: true }).click()
  await expect(page).toHaveURL(/\/roadmap-hub$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/roadmap\?id=11$/)
  await expect(page.locator('[data-slot-id="node-77"]')).toBeVisible()
  await expect(page.locator('.node-box[aria-current], .roadmap-node-located')).toHaveCount(0)
  await expect(page.locator('.side-drawer')).toHaveCount(0)
})
