import { expect, test } from '@playwright/test'
import { DEMO_TEXT } from '../src/lib/demo-typing'

test('시연 계정의 저장 제목을 클릭하면 자모가 조합되며 짧게 완성된다', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp: Math.floor(Date.now() / 1000) + 3600 }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({
      tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7,
      name: '김학습', role: 'ROLE_LEARNER', exp: Math.floor(Date.now() / 1000) + 3600, storage: 'local',
    }))
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/users/me/profile') data = { userId: 7, email: 'kim.hakseup@devpath.com', name: '김학습', role: 'ROLE_LEARNER', profileImage: null, tags: [] }
    else if (path === '/api/roadmaps/hub-catalog') data = { sections: [{ active: true, title: '프론트엔드', sortOrder: 0, items: [{ active: true, linkedRoadmapId: 1, title: '프론트엔드 개발자', sortOrder: 0 }] }] }
    else if (path === '/api/roadmaps/1') data = { roadmapId: 1, title: '프론트엔드', nodes: [{ nodeId: 1, roadmapId: 1, title: 'HTML CSS', sortOrder: 0 }] }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/my-roadmap')
  await page.getByRole('button', { name: 'HTML CSS 추가', exact: true }).click()
  await page.getByRole('button', { name: /로드맵 저장$/ }).click()
  const input = page.getByPlaceholder('예: 내 백엔드 개발자 로드맵')
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('')
  await input.evaluate((element) => {
    const target = element as HTMLInputElement & { demoFrames?: string[]; demoCapture?: number }
    target.demoFrames = []
    target.demoCapture = window.setInterval(() => target.demoFrames!.push(target.value), 10)
  })
  await input.click()
  await expect(input).toHaveValue('프론트엔드 개발자 로드맵', { timeout: 3000 })
  const frames = await input.evaluate((element) => {
    const target = element as HTMLInputElement & { demoFrames?: string[]; demoCapture?: number }
    clearInterval(target.demoCapture)
    return target.demoFrames!
  })
  expect(frames).toEqual(expect.arrayContaining(['ㅍ', '프', '프ㄹ', '프론', '프론트엔드 개발자 로드맵']))
  const modal = page.getByRole('heading', { name: '로드맵 저장', exact: true }).locator('..')
  await expect(modal.getByRole('button', { name: /저장$/ })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('roadmap-title-demo.png') })
  await modal.getByRole('button', { name: '취소', exact: true }).click()
  await page.getByRole('button', { name: 'AI 네비게이터', exact: true }).click()
  const prompt = page.getByRole('textbox', { name: 'AI 네비게이터 프롬프트 입력' })
  await expect(prompt).toBeFocused()
  await expect(prompt).toHaveValue('')
  await prompt.click()
  await expect(prompt).not.toHaveValue(DEMO_TEXT.roadmap)
  await expect(prompt).toHaveValue(DEMO_TEXT.roadmap, { timeout: 6000 })
})
