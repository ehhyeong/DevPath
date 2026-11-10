import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('실제 멘토링 시드 7개의 상세 항목과 모집 상태를 표시한다', async ({ page }, testInfo) => {
  const sql = readFileSync(new URL('../../src/main/resources/db/local/mentoring-hub-seeds.sql', import.meta.url), 'utf8')
  const rows = [...sql.matchAll(/^\s*'([^'\r\n]+)',\s*\r?\n\s*'((?:''|[^'])*)',\s*\r?\n\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\r?\n\s*([\s\S]*?),\s*\r?\n\s*(-?\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(FALSE|TRUE)/gm)]
  expect(rows).toHaveLength(7)
  const posts = rows.map((row, index) => ({
    postId: index + 1,
    mentorId: index + 1,
    mentorName: '시드 멘토',
    title: row[1],
    content: row[2].replaceAll("''", "'"),
    category: row[3],
    mentoringType: row[4],
    requiredStacks: row[5],
    curriculum: [...row[6].matchAll(/'((?:''|[^'])*)'/g)].map((match) => match[1]),
    deadlineDaysLeft: Number(row[7]),
    durationWeeks: Number(row[8]),
    currentParticipants: Number(row[9]),
    maxParticipants: Number(row[10]),
    closed: row[11] === 'TRUE',
  }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const role = 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', name: '김학습', userId: 7, role, exp, storage: 'local' }))
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/mentorings/hub') data = { openPosts: posts, summary: { openPostCount: 6, totalPostCount: 7 } }
    else if (path === '/api/lounge/shell') data = { user: { name: '김학습', profileImage: null }, mySquads: [] }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/mentoring-hub')
  for (const post of posts) {
    await page.getByPlaceholder('프로젝트 제목, 기술 스택, 멘토 이름으로 검색해보세요').fill(post.title)
    const card = page.locator('article.project-card').filter({ has: page.getByRole('heading', { name: post.title, exact: true }) })
    await expect(card).not.toContainText('##')
    await card.click()
    const detail = page.getByRole('dialog', { name: `${post.title} 모집 상세`, exact: true })
    for (const label of ['참여 대상', '준비 지식', '진행 및 피드백 방식', '최종 결과물']) {
      const section = detail.locator('section').filter({ has: page.getByRole('heading', { name: label, exact: true }) })
      const text = post.content.split(`## ${label}\n`)[1].split('\n\n## ')[0].trim()
      expect(text.length).toBeGreaterThan(10)
      await expect(section).toContainText(text)
    }
    const apply = detail.getByRole('button', { name: '참가 신청하기' })
    if (post.closed) await expect(apply).toBeDisabled()
    else await expect(apply).toBeEnabled()
    if (post.postId === 1) {
      await detail.getByRole('heading', { name: '참여 대상', exact: true }).scrollIntoViewIfNeeded()
      await page.screenshot({ path: testInfo.outputPath('mentoring-seed-details.png') })
    }
    await detail.getByRole('button', { name: '모집 상세 닫기' }).click()
  }
})
