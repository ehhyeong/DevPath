import { expect, test } from '@playwright/test'
import type { InstructorMentoringBoard } from '../src/types/instructor'

test('강사의 상세 모집 조건을 미리보기·등록·재편집·학습자 상세까지 보존한다', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  let board: InstructorMentoringBoard = { projects: [], requests: [], ongoingProjects: [] }
  let savedPost: Record<string, unknown> = {}
  const saves: Record<string, unknown>[] = []
  page.on('dialog', (dialog) => dialog.accept())
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const instructor = window.location.pathname.startsWith('/instructor-')
    const userId = instructor ? 4 : 7
    const role = instructor ? 'ROLE_INSTRUCTOR' : 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: String(userId), role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', name: instructor ? '테스트 강사' : '김학습', userId, role, exp, storage: 'local' }))
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    const method = route.request().method()
    let data: unknown = []
    if (path === '/api/instructor/mentoring/board') {
      if (method === 'PUT') board = route.request().postDataJSON()
      data = board
    } else if (path === '/api/mentoring-posts' || path === '/api/mentoring-posts/99') {
      if (method === 'POST' || method === 'PATCH') {
        const payload = route.request().postDataJSON() as Record<string, unknown>
        saves.push(payload)
        savedPost = { ...savedPost, ...payload, postId: 99 }
      }
      data = savedPost
    } else if (path === '/api/mentorings/hub') data = {
      openPosts: [{ ...savedPost, mentorId: 4, mentorName: '테스트 강사', mentorDescription: '백엔드 개발자', mentorImage: null, currentParticipants: 0, curriculum: String(savedPost.curriculum ?? '').split('\n'), closed: false }],
      summary: { openPostCount: 1, totalPostCount: 1 },
    }
    else if (path === '/api/lounge/shell') data = { user: { name: '김학습', profileImage: null }, mySquads: [] }
    else if (path === '/api/users/me/profile') data = { userId: 4, name: '테스트 강사', email: 'frontend@devpath.com', profileImage: null }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/instructor-mentoring')
  await page.getByRole('button', { name: /멘토링 모집 공고 등록/ }).click()
  const form = page.getByRole('dialog', { name: '멘토링 모집 공고 작성', exact: true })
  await form.getByRole('button', { name: '샘플 데이터 채우기' }).click()
  const title = '실무 API 완성 멘토링'
  await form.getByPlaceholder('예) 대용량 트래픽 커머스 서버').fill(title)
  const details = {
    '참여 대상': 'Spring Boot 기본 API를 만들어 본 학습자',
    '준비 지식': 'Java 기초와 SQL\nGit PR 사용법',
    '진행 및 피드백 방식': '매주 수요일 20시 온라인 리뷰\n모임 전날까지 PR 제출',
    '최종 결과물': '배포한 서버·ERD·API 명세서·테스트 보고서',
  }
  for (const [label, value] of Object.entries(details)) {
    await form.getByRole('textbox', { name: label, exact: true }).fill(value)
    await expect(form.getByRole('heading', { name: label, exact: true })).toHaveCount(1)
  }
  await form.getByRole('heading', { name: '참여 대상', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('mentoring-recruitment-form.png') })
  await form.getByRole('button', { name: /공고 등록하기/ }).click()
  await expect(form).toHaveCount(0)
  expect(saves).toHaveLength(1)
  for (const [label, value] of Object.entries(details)) expect(saves[0].content).toContain(`## ${label}\n${value}`)
  await page.reload()
  await page.getByRole('button', { name: `${title} 공고 관리` }).click()
  await page.getByRole('button', { name: /공고 수정$/ }).click()
  for (const [label, value] of Object.entries(details)) await expect(form.getByRole('textbox', { name: label, exact: true })).toHaveValue(value)
  details['진행 및 피드백 방식'] = '매주 목요일 20시 온라인 리뷰\n모임 전날까지 PR 제출'
  await form.getByRole('textbox', { name: '진행 및 피드백 방식', exact: true }).fill(details['진행 및 피드백 방식'])
  await form.getByRole('button', { name: /공고 수정하기/ }).click()
  await expect(form).toHaveCount(0)
  expect(saves).toHaveLength(2)
  expect(saves[1].content).toContain(details['진행 및 피드백 방식'])
  await page.goto('/mentoring-hub')
  const card = page.locator('article.project-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
  await expect(card).not.toContainText('## 참여 대상')
  await card.click()
  const detail = page.getByRole('dialog', { name: `${title} 모집 상세` })
  for (const [label, value] of Object.entries(details)) {
    const section = detail.locator('section').filter({ has: page.getByRole('heading', { name: label, exact: true }) })
    await expect(section).toContainText(value)
  }
  await detail.getByRole('heading', { name: '참여 대상', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('mentoring-recruitment-detail.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(detail).toBeVisible()
  const bounds = (await detail.boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(391)
  await page.screenshot({ path: testInfo.outputPath('mentoring-recruitment-detail-mobile.png') })
})
