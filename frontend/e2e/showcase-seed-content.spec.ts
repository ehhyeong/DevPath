import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// 실제 시드 문구·스택·이미지 경로가 브라우저에서도 함께 검증되도록 SQL 리소스를 읽는다.
const sql = readFileSync(new URL('../../src/main/resources/db/local/project-experience-showcases.sql', import.meta.url), 'utf8')
const fields = [...sql.matchAll(/'((?:''|[^'])*)'/g)].map((match) => match[1].replaceAll("''", "'"))
const authorNames: Record<string, string> = {
  'project.frontend@devpath.com': '이서준', 'project.backend@devpath.com': '정다은',
  'project.ai@devpath.com': '오서연', 'learner@devpath.com': '이학습',
}
const showcases = Array.from({ length: fields.length / 6 }, (_, index) => {
  const [email, title, description, thumbnailUrl, techStack, category] = fields.slice(index * 6, index * 6 + 6)
  return { showcaseId: index + 1, userId: index + 71, authorName: authorNames[email], title, description, thumbnailUrl, techStack, category,
    viewCount: 42 - index, likeCount: 10 - index, isPublic: true, links: [], createdAt: '2026-10-29T10:00:00' }
})

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`쇼케이스의 시드 이름·기술·설명·이미지를 표시하고 검색한다 (${viewport.width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(() => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`,
        refreshToken: 'test-only', userId: 7, name: '이학습', role: 'ROLE_LEARNER', exp, storage: 'local' }))
    })
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      let data: unknown = []
      if (path === '/api/lounge/shell') data = { user: { profileImage: null }, mySquads: [] }
      else if (path === '/api/showcases') data = showcases
      else if (path.endsWith('/comments')) data = [{ commentId: 1, userId: 900, authorName: '최민지', content: '발행 문서와 편집 내용을 분리한 구성이 좋네요.' }]
      else if (path.startsWith('/api/showcases/')) data = showcases.find((item) => item.showcaseId === Number(path.split('/')[3]))
      await route.fulfill({ json: { success: true, data } })
    })
    await page.goto('/dev-showcase')
    const cards = page.locator('.project-card')
    await expect(cards).toHaveCount(6)
    await expect(page.getByText(/작성자 \d+/)).toHaveCount(0)
    for (const showcase of showcases) {
      const card = cards.filter({ has: page.getByRole('heading', { name: showcase.title, exact: true }) })
      await card.scrollIntoViewIfNeeded()
      await expect(card.getByText(showcase.authorName, { exact: true })).toBeVisible()
      const image = card.getByRole('img', { name: `${showcase.title} 미리보기` })
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(1200)
    }
    const search = page.getByPlaceholder('프로젝트·작성자·기술 스택 검색')
    await search.fill('정다은')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('AI 코드 리뷰 대시보드')
    await search.fill('Supabase')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('스터디 매칭 모바일 MVP')
    await search.fill('포트폴리오')
    await expect(cards).toHaveCount(1)
    await page.screenshot({ path: testInfo.outputPath('showcase-card.png'), animations: 'disabled' })
    await cards.first().click()
    const modal = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: /상세 설명$/ }) })
    await expect(modal.getByText('이서준', { exact: true })).toBeVisible()
    await expect(modal.getByText('최민지', { exact: true })).toBeVisible()
    await expect(modal.getByText('OpenHTMLtoPDF', { exact: true })).toBeVisible()
    const description = modal.locator('p').filter({ hasText: '만들게 된 계기' })
    await expect(description).toContainText('편집 중인 내용과 발행된 문서를 분리')
    await expect(description).toHaveCSS('white-space', 'pre-line')
    const preview = modal.getByRole('img', { name: 'DevPath 포트폴리오 빌더 미리보기' })
    await expect.poll(() => preview.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(1200)
    await page.screenshot({ path: testInfo.outputPath('showcase-detail.png'), animations: 'disabled' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  })
}
