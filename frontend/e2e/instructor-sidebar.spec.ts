import { expect, test } from '@playwright/test'

for (const hasTouch of [false, true]) {
  test.describe(`강사 사이드바 (터치 지원 ${hasTouch})`, () => {
    test.use({ hasTouch, viewport: { width: 1440, height: 900 } })

    test('너비와 메뉴가 함께 펼쳐지고 페이지 이동 후에도 유지된다', async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        const exp = Math.floor(Date.now() / 1000) + 3600
        const claims = btoa(JSON.stringify({ sub: '8', role: 'ROLE_INSTRUCTOR', exp }))
        localStorage.setItem('devpath.auth.session', JSON.stringify({
          tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
          userId: 8, name: '테스트 강사', role: 'ROLE_INSTRUCTOR', exp, storage: 'local',
        }))
      })
      await page.route('**/api/**', async (route) => {
        const path = new URL(route.request().url()).pathname
        if (!path.startsWith('/api/')) return route.continue()
        // 데이터 조회 실패 상황에서도 공통 메뉴의 배치와 이동은 유지되어야 한다.
        await route.fulfill({ status: 503, json: { success: false, message: '테스트 조회 불가' } })
      })
      await page.goto('/instructor-dashboard')
      const sidebar = page.locator('.instructor-sidebar')
      await page.mouse.move(600, 80)
      await expect(sidebar).toHaveCSS('width', '80px')
      await expect(sidebar.locator('.menu-label').first()).toHaveCSS('opacity', '0')
      await sidebar.hover()
      await expect(sidebar.locator('.menu-label').first()).toHaveCSS('opacity', '1')
      await expect(sidebar).toHaveCSS('width', '250px')

      for (const label of ['강의 관리', '멘토링 관리', '수강생 분석', '질문 게시판', '수강평 관리', '정산 관리', '마케팅 관리', '대시보드']) {
        const link = sidebar.getByRole('link', { name: label })
        const href = await link.getAttribute('href')
        await link.click()
        await expect(page).toHaveURL(new RegExp(`${href}$`))
        await sidebar.hover()
        await expect(sidebar).toHaveCSS('width', '250px')
        await expect(sidebar.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
      }
      await sidebar.getByRole('button', { name: '강사 가이드' }).click()
      await expect(page.getByRole('heading', { name: /DevPath 강사 가이드/ })).toBeVisible()
      await page.getByRole('button', { name: '확인했습니다' }).click()
      await sidebar.hover()
      await page.screenshot({ path: testInfo.outputPath('instructor-sidebar-expanded.png') })
      await page.mouse.move(600, 80)
      await expect(sidebar).toHaveCSS('width', '80px')
      await expect(sidebar.locator('.menu-label').first()).toHaveCSS('opacity', '0')
      await expect(sidebar.locator('.workspace-sidebar-section-title').first()).toHaveCSS('height', '0px')
    })
  })
}
