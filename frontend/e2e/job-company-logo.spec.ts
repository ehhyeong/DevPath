import { expect, test } from '@playwright/test'

test('스캔은 로고 응답을 기다리지 않고 결과를 표시하며 추천·성장 기업 로고를 나중에 채운다', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addInitScript(() => {
    const exp = 4102444800
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role: 'ROLE_LEARNER', exp, storage: 'local' }))
  })
  let releaseLogos: (() => void) | undefined
  const logoGate = new Promise<void>(resolve => { releaseLogos = resolve })
  const requestedPaths: string[] = []
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (url.pathname === '/api/jobs/company-logo') {
      requestedPaths.push(url.searchParams.get('companyPath')!)
      await logoGate
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') })
    }
    let data: unknown = []
    if (url.pathname.endsWith('/profile')) data = { userId: 7, name: '김학습' }
    else if (url.pathname.endsWith('/activity-profile/me')) data = { projectCount: 1, completedTaskCount: 1, proofCardCount: 1, averageProofCardScore: 85, skillSignals: ['Java'], skillKeywords: [] }
    else if (url.pathname.endsWith('/gemini-recommendations/me')) {
      const common = { keywords: ['Java'], aiMatchScore: 90, aiReason: '프로젝트 Java 역량과 일치합니다.', areaCode: 'I010,I020,I030', careerCode: '3' }
      data = {
        aiAnalyzed: true,
        recommendations: [{ ...common, externalId: '1', title: '추천 백엔드 개발자', companyName: '추천기업', companyUrl: 'http://www.jobkorea.co.kr/Recruit/Co_Read/C/recommended?api=secret' }],
        stretchRecommendations: [{ ...common, externalId: '2', title: '성장 백엔드 개발자', companyName: '성장기업', companyUrl: 'https://www.jobkorea.co.kr/Company/2/Info', missingSkills: ['Docker'] }],
      }
    }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/job-matching')
  await page.getByRole('button', { name: 'AI 맞춤 공고 스캔하기' }).click()
  await expect(page.getByRole('heading', { name: '추천 백엔드 개발자', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '성장 백엔드 개발자', exact: true })).toBeVisible()
  await expect(page.getByText('추천기업 · 강남구 · 강동구 외 1곳', { exact: true })).toBeVisible()
  await expect(page.getByText('성장기업 · 강남구 · 강동구 외 1곳', { exact: true })).toBeVisible()
  await expect(page.getByText('신입/경력', { exact: true })).toHaveCount(2)
  const recommended = page.getByRole('img', { name: '추천기업 로고' })
  const stretch = page.getByRole('img', { name: '성장기업 로고' })
  await recommended.scrollIntoViewIfNeeded()
  await expect(recommended).toHaveClass(/opacity-0/)
  await expect(page.getByRole('button', { name: 'AI 맞춤 공고 스캔하기' })).toBeEnabled()
  releaseLogos!()
  await expect(recommended).toHaveClass(/opacity-100/)
  await stretch.scrollIntoViewIfNeeded()
  await expect(stretch).toHaveClass(/opacity-100/)
  expect(requestedPaths).toEqual(expect.arrayContaining(['/Recruit/Co_Read/C/recommended', '/Company/2/Info']))
  expect(requestedPaths.some(path => path.includes('secret'))).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('scanned-company-logos.png') })
})
