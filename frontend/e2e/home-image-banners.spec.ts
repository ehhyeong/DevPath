import { expect, test } from '@playwright/test'

const slides = [
  { label: 'AI 아키텍처 생성하기', href: '/project-create', filename: 'ai-builder-artwork.png', title: '토이 프로젝트는 그만', badge: 'AI BUILDER' },
  { label: '스쿼드 라운지 입장', href: '/community-lounge', filename: 'team-squad-artwork.png', title: '최고의 팀원', badge: 'TEAM SQUAD' },
  { label: '내 맞춤 로드맵 찾기', href: '/roadmap-hub', filename: 'curated-roadmap-artwork.png', title: '막막하신가요', badge: 'CURATED ROADMAP' },
  { label: '내 시장 가치 확인하기', href: '/job-matching', filename: 'job-analysis-artwork.png', title: '기업 리스트', badge: 'JOB ANALYSIS' },
  { label: '런칭된 프로젝트 구경하기', href: '/dev-showcase', filename: 'showcase-artwork.png', title: '완벽한 이력서', badge: 'SHOWCASE' },
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

test('로그인 환영 문구는 좁은 카드에서도 잘림 없이 한 줄로 표시한다', async ({ page }, testInfo) => {
  await page.goto('/home')
  const greeting = page.getByRole('heading', { name: '김학습님, 오늘도 성장을 이어가세요!', exact: true })
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) {
    await page.setViewportSize(viewport)
    await greeting.scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    await expect.poll(() => greeting.evaluate(element => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const lines = new Set(Array.from(range.getClientRects()).filter(box => box.width > 0).map(box => Math.round(box.y)))
      return { lines: lines.size, fits: element.scrollWidth <= element.clientWidth, fontReadable: parseFloat(getComputedStyle(element).fontSize) >= 12 }
    })).toEqual({ lines: 1, fits: true, fontReadable: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if ([1440, 1024, 320].includes(viewport.width)) await page.screenshot({ path: testInfo.outputPath(`greeting-${viewport.width}.png`) })
  }
})

test('다섯 배너의 실제 제목과 새 일러스트를 표시하고 버튼으로 각 기능에 이동한다', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const [index, slide] of slides.entries()) {
    await page.goto('/home')
    await page.getByRole('button', { name: `${index + 1}번 배너 보기` }).click()
    const button = page.getByRole('button', { name: slide.label, exact: true })
    const image = button.locator('xpath=ancestor::*[@aria-hidden][1]').locator('img')
    await expect(image).toHaveAttribute('src', `/images/home/${slide.filename}`)
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth === 1774 && element.naturalHeight === 887)).toBe(true)
    await expect(image).toHaveCSS('object-fit', 'contain')
    await expect(page.getByRole('heading', { level: 2, name: new RegExp(slide.title) })).toBeVisible()
    await expect(page.getByText(slide.badge, { exact: true })).toBeVisible()
    await expect(button).toBeVisible()
    await button.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`home-${slide.filename}`) })
    await button.click()
    await expect(page).toHaveURL(new RegExp(`${slide.href}$`))
  }
})

test('화면 크기가 바뀌어도 260px 안에 배지·문구·버튼을 전부 표시하고 그림을 자르지 않는다', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  await page.goto('/home')
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) {
    await page.setViewportSize(viewport)
    const banner = page.getByTestId('welcome-promotion')
    await expect(banner).toHaveCSS('height', '260px')
    for (const [index, slide] of slides.entries()) {
      await page.getByRole('button', { name: `${index + 1}번 배너 보기` }).click()
      const button = page.getByRole('button', { name: slide.label, exact: true })
      await button.scrollIntoViewIfNeeded()
      expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      await expect.poll(() => button.evaluate(element => {
        const slide = element.closest('[aria-hidden]')!
        const banner = slide.closest('[data-testid="welcome-promotion"]')!.getBoundingClientRect()
        const fits = (node: Element | null) => {
          if (!node) return false
          const box = node.getBoundingClientRect()
          return box.x >= banner.x && box.right <= banner.right + 0.5 && box.y >= banner.y && box.bottom <= banner.bottom + 0.5
        }
        return { badge: fits(slide.querySelector('span')), title: fits(slide.querySelector('h2')), description: fits(slide.querySelector('p')), button: fits(element) }
      })).toEqual({ badge: true, title: true, description: true, button: true })
      const image = button.locator('xpath=ancestor::*[@aria-hidden][1]').locator('img')
      if (viewport.width >= 1024) {
        await expect(image).toBeVisible()
        await expect(image).toHaveCSS('object-fit', 'contain')
        const [bannerBox, imageBox] = await Promise.all([banner.boundingBox(), image.boundingBox()])
        expect(imageBox!.y).toBeGreaterThanOrEqual(bannerBox!.y)
        expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(bannerBox!.y + bannerBox!.height)
      } else await expect(image).not.toBeVisible()
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
