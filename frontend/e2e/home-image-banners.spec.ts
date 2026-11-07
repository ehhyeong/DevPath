import { expect, test } from '@playwright/test'

const slides = [
  { label: 'AI 아키텍처 생성하기', href: '/project-create', filename: 'ai-builder.png', center: [326, 544] },
  { label: '스쿼드 라운지 입장', href: '/community-lounge', filename: 'team-squad.png', center: [337, 539] },
  { label: '내 맞춤 로드맵 찾기', href: '/roadmap-hub', filename: 'curated-roadmap.png', center: [315.5, 555] },
  { label: '내 시장 가치 확인하기', href: '/job-matching', filename: 'job-analysis.png', center: [357.5, 559.5] },
  { label: '런칭된 프로젝트 구경하기', href: '/dev-showcase', filename: 'showcase.png', center: [393.5, 549] },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const exp = 4102444800
    const role = 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role, exp, storage: 'local' }))
  })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    const data = path === '/api/home/dashboard'
      ? { currentLearning: null, participatingProjects: [], recentCourses: [], topCourseCategories: [] }
      : path.endsWith('/profile') ? { name: '김학습', profileImage: null } : []
    await route.fulfill({ json: { success: true, data } })
  })
})

test('다섯 이미지의 그려진 버튼을 클릭하면 각 기능으로 이동한다', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const [index, slide] of slides.entries()) {
    await page.goto('/home')
    await page.getByRole('button', { name: `${index + 1}번 배너 보기` }).click()
    const button = page.getByRole('button', { name: slide.label, exact: true })
    const image = button.locator('..').locator('img')
    await expect(image).toHaveAttribute('src', `/images/home/${slide.filename}`)
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth === 2089 && element.naturalHeight === 753)).toBe(true)
    await expect(button).toBeVisible()
    await expect.poll(async () => {
      const [bannerBox, buttonBox] = await Promise.all([page.getByTestId('welcome-promotion').boundingBox(), button.boundingBox()])
      if (!bannerBox || !buttonBox) return false
      const imageWidth = Math.max(bannerBox.width, 276 * 2089 / 753)
      return Math.abs(buttonBox.x + buttonBox.width / 2 - (bannerBox.x + slide.center[0] / 2089 * imageWidth)) < 1
    }).toBe(true)
    const imageBox = (await image.boundingBox())!
    await page.screenshot({ path: testInfo.outputPath(`home-${slide.filename}`) })
    await page.mouse.click(imageBox.x + slide.center[0] / 2089 * imageBox.width, imageBox.y + slide.center[1] / 753 * imageBox.height)
    await expect(page).toHaveURL(new RegExp(`${slide.href}$`))
  }
})

test('화면 크기가 바뀌어도 기존 260px 높이와 버튼 중심을 유지한다', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  await page.goto('/home')
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    const banner = page.getByTestId('welcome-promotion')
    await expect(banner).toHaveCSS('height', '260px')
    for (const [index, slide] of slides.entries()) {
      await page.getByRole('button', { name: `${index + 1}번 배너 보기` }).click()
      const button = page.getByRole('button', { name: slide.label, exact: true })
      await button.scrollIntoViewIfNeeded()
      expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      await expect.poll(async () => {
        const [bannerBox, buttonBox] = await Promise.all([banner.boundingBox(), button.boundingBox()])
        if (!bannerBox || !buttonBox) return null
        const imageWidth = Math.max(bannerBox.width, 276 * 2089 / 753)
        const imageHeight = imageWidth * 753 / 2089
        return {
          height: Math.round(bannerBox.height),
          xOffset: Math.round(Math.abs(buttonBox.x + buttonBox.width / 2 - (bannerBox.x + slide.center[0] / 2089 * imageWidth))),
          yOffset: Math.round(Math.abs(buttonBox.y + buttonBox.height / 2 - (bannerBox.y + 260 * 0.47 - imageHeight / 2 + slide.center[1] / 753 * imageHeight))),
        }
      }).toEqual({ height: 260, xOffset: 0, yOffset: 0 })
      const [bannerBox, buttonBox] = await Promise.all([banner.boundingBox(), button.boundingBox()])
      expect(buttonBox!.y).toBeGreaterThanOrEqual(bannerBox!.y)
      expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(bannerBox!.y + bannerBox!.height)
      const imageBox = (await button.locator('..').locator('img').boundingBox())!
      expect(imageBox.width / imageBox.height).toBeCloseTo(2089 / 753, 2)
      expect(imageBox.y).toBeLessThanOrEqual(bannerBox!.y)
      expect(imageBox.y + imageBox.height).toBeGreaterThanOrEqual(bannerBox!.y + bannerBox!.height)
      const clickable = await button.evaluate(element => {
        const box = element.getBoundingClientRect()
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
      })
      expect(clickable).toBe(true)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('heading', { name: /김학습님, 오늘도/ })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`home-${viewport.width}.png`) })
  }
  const button = page.getByRole('button', { name: slides[4].label, exact: true })
  await page.getByRole('button', { name: '1번 배너 보기' }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(button).toBeFocused()
  expect(await button.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/dev-showcase$/)
})
