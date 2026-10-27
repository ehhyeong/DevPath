import { expect, test } from '@playwright/test'

for (const hasTouch of [false, true]) {
  test.describe(hasTouch ? '터치 입력 환경' : '마우스 입력 환경', () => {
    test.use({ hasTouch, viewport: { width: 1280, height: 800 } })

    test('일시정지·재생·설정·전체화면에서 영상 컨트롤을 사용할 수 있다', async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        const exp = Math.floor(Date.now() / 1000) + 3600
        const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
        localStorage.setItem('devpath.auth.session', JSON.stringify({
          tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
          userId: 7, name: '테스트 학습자', role: 'ROLE_LEARNER', exp, storage: 'local',
        }))
      })
      await page.route('**/api/**', async (route) => {
        const path = new URL(route.request().url()).pathname
        if (!path.startsWith('/api/')) return route.continue()
        let data: unknown = []
        if (path === '/api/courses/73') data = {
          courseId: 73, title: '렌더링 강의', isEnrolled: true, status: 'PUBLISHED',
          sections: [{ sectionId: 1, title: '렌더링', isPublished: true, sortOrder: 1, lessons: [{
            lessonId: 701, title: '브라우저 렌더링', lessonType: 'VIDEO', sortOrder: 1,
            materials: [], isPublished: true, durationSeconds: 60, videoUrl: '/samples/sample-intro.mp4',
          }] }],
        }
        else if (path.includes('/api/learning/sessions/')) data = {
          lessonId: 701, progressPercent: 0, progressSeconds: 0,
          defaultPlaybackRate: 1, pipEnabled: false, isCompleted: false,
        }
        else if (path.endsWith('/config')) data = { lessonId: 701, defaultPlaybackRate: 1, pipEnabled: false }
        await route.fulfill({ json: { success: true, data } })
      })
      await page.goto('/learning?courseId=73&lessonId=701')
      const video = page.locator('video.learning-player-video-element')
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2)
      const controls = page.getByRole('slider', { name: '재생 위치' }).locator('../..')
      await page.mouse.move(1270, 10)
      await expect(controls).toHaveCSS('opacity', '0')
      await expect(controls).toHaveCSS('pointer-events', 'none')
      await video.hover({ position: { x: 30, y: 200 } })
      await expect(controls).toHaveCSS('opacity', '1')
      await expect(page.getByRole('button', { name: '전체화면', exact: true })).toHaveAttribute('aria-pressed', 'false')

      await controls.getByRole('button').first().click()
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false)
      await page.mouse.move(1270, 10)
      await expect(controls).toHaveCSS('opacity', '0')
      await video.hover({ position: { x: 30, y: 200 } })
      await expect(controls).toHaveCSS('opacity', '1')
      await page.getByRole('button', { name: '재생 설정', exact: true }).click()
      await page.mouse.move(1270, 10)
      await expect(controls).toHaveCSS('opacity', '0')
      await video.hover({ position: { x: 30, y: 200 } })
      await expect(controls).toHaveCSS('opacity', '1')
      await page.getByRole('button', { name: '1.5x', exact: true }).click()
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.playbackRate)).toBe(1.5)
      await controls.getByRole('button').first().click()
      await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true)
      await page.mouse.move(1270, 10)
      await expect(controls).toHaveCSS('opacity', '0')
      await video.hover({ position: { x: 30, y: 200 } })
      await expect(controls).toHaveCSS('opacity', '1')
      await page.getByRole('button', { name: '전체화면', exact: true }).click()
      await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
      await page.mouse.move(1270, 10)
      await expect(controls).toHaveCSS('opacity', '1')
      await page.getByRole('button', { name: '전체화면 종료', exact: true }).click()
      await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
      await page.screenshot({ path: testInfo.outputPath('learning-player-controls.png') })
    })
  })
}
