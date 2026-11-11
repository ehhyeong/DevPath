import { expect, test, type Page } from '@playwright/test'

async function prepareHeaderPages(page: Page) {
  await page.addInitScript(() => {
    const exp = 4102444800
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role: 'ROLE_LEARNER', exp, storage: 'local' }))
  })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown
    if (path === '/api/users/me/profile') data = { userId: 7, name: '김학습', profileImage: null }
    else if (path === '/api/roadmaps/hub-catalog') data = { sections: [] }
    else if (path === '/api/my-roadmaps') data = { roadmaps: [] }
    else if (path === '/api/my-roadmaps/11') data = { customRoadmapId: 11, originalRoadmapId: 1, title: '백엔드 로드맵', infoContent: '<p>백엔드 학습</p>', progressRate: 0, nodes: [] }
    else if (['/api/me/recommendation-changes', '/api/me/recommendation-changes/histories', '/api/me/proof-cards'].includes(path)) data = []
    else if (path === '/api/jobs/activity-profile/me') data = { projectCount: 0, completedTaskCount: 0, proofCardCount: 0, averageProofCardScore: null, skillSignals: [], skillKeywords: [] }
    else return route.fulfill({ status: 503, json: { success: false, message: '테스트에서 본문 데이터 조회를 생략합니다.' } })
    await route.fulfill({ json: { success: true, data } })
  })
}

function desktopHeader(page: Page) {
  return page.locator('.site-header-navigation:visible')
}

async function expectActive(page: Page, label: string) {
  const header = desktopHeader(page)
  const active = header.getByRole('link', { name: label, exact: true })
  await expect(active).toHaveAttribute('aria-current', 'true')
  await expect(active).toHaveCSS('color', 'rgb(0, 196, 113)')
  await expect(header.locator('.site-header-nav-link[aria-current]')).toHaveCount(1)
}

test('탐색·내 로드맵·만들기·상세에서 로드맵을 초록색으로 유지한다', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareHeaderPages(page)
  await page.goto('/roadmap-hub')
  await expectActive(page, '로드맵')
  const roadmap = desktopHeader(page).getByRole('link', { name: '로드맵', exact: true })
  await roadmap.hover()
  await expect(roadmap).toHaveCSS('color', 'rgb(0, 196, 113)')
  await expect(roadmap.locator('i')).toHaveCSS('color', 'rgb(0, 196, 113)')
  await desktopHeader(page).getByRole('menuitem', { name: '내 로드맵', exact: true }).click()
  await expect(page).toHaveURL(/\/my-roadmap-list$/)
  await expectActive(page, '로드맵')
  await page.getByRole('link', { name: /나만의 로드맵 만들기/ }).click()
  await expect(page).toHaveURL(/\/my-roadmap$/)
  await expectActive(page, '로드맵')
  await page.mouse.move(0, 600)
  await page.screenshot({ path: testInfo.outputPath('roadmap-builder-active.png') })
  await page.reload()
  await expectActive(page, '로드맵')
  await page.goto('/roadmap?id=11')
  await expectActive(page, '로드맵')
})

test('다른 메뉴의 검정 호버와 선택 초록색을 유지하고 이동·뒤로가기에 맞춰 바꾼다', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareHeaderPages(page)
  await page.goto('/roadmap-hub')
  const lectures = desktopHeader(page).getByRole('link', { name: '강의', exact: true })
  await lectures.hover()
  await expect(lectures).toHaveCSS('color', 'rgb(17, 24, 39)')
  await expectActive(page, '로드맵')
  await lectures.click()
  await expectActive(page, '강의')
  await desktopHeader(page).getByRole('link', { name: '채용분석', exact: true }).click()
  await expectActive(page, '채용분석')
  await page.goBack()
  await expectActive(page, '강의')
  await desktopHeader(page).getByRole('link', { name: '커뮤니티', exact: true }).click()
  await expectActive(page, '커뮤니티')
  await page.reload()
  await expectActive(page, '커뮤니티')
  await desktopHeader(page).getByRole('link', { name: '프로젝트', exact: true }).click()
  await expectActive(page, '프로젝트')
  await page.mouse.move(0, 600)
  await page.screenshot({ path: testInfo.outputPath('project-active.png') })
})

test('모바일 메뉴에서도 관련 상위 메뉴를 초록색으로 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareHeaderPages(page)
  await page.goto('/my-roadmap')
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click()
  const menu = page.locator('#site-header-mobile-menu')
  await expect(menu.locator('.site-header-mobile-menu-link.active')).toHaveText('로드맵')
  await expect(menu.locator('.site-header-mobile-menu-link.active')).toHaveCSS('color', 'rgb(0, 196, 113)')
  await menu.getByRole('link', { name: '채용분석', exact: true }).click()
  await expect(page).toHaveURL(/\/job-matching$/)
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click()
  await expect(menu.locator('.site-header-mobile-menu-link.active')).toHaveText('채용분석')
  await expect(menu.locator('.site-header-mobile-menu-link.active')).toHaveCSS('color', 'rgb(0, 196, 113)')
})
