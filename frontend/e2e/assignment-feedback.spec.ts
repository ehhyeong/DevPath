import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const feedback = [
  'HTML/CSS/JavaScript 렌더링 흐름을 실제 코드로 구현했고 요구사항 대부분을 충족했습니다. 다만 접근성 보강과 반응형 완성도를 개선하면 더 좋습니다.',
  '- 시맨틱 구조: 23/25점 - header, main, section, button 구조가 확인됩니다. 입력 요소와 보조 설명의 연결을 보강하세요.',
  '- 반응형 레이아웃: 22/25점 - 카드 레이아웃이 일관적입니다. 모바일 화면에서 여백과 버튼 크기를 다시 점검하세요.',
  '- 렌더링 단계 구현: 26/30점 - DOM과 CSSOM에서 render tree, layout, paint로 이어지는 과정을 구현했습니다. 스타일 변경에 따른 차이를 비교해 보세요.',
  '- 검증 기록: 14/20점 - Vite와 DevTools를 활용했습니다. 변경 전후 결과와 측정 근거를 구체적으로 기록하세요.',
].join('\n')

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`과제 제출 피드백을 항목별로 읽고 다음 강의로 이동한다 (${viewport.width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(() => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({
        tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7,
        name: '테스트 학습자', role: 'ROLE_LEARNER', exp, storage: 'local',
      }))
    })
    const assignment = {
      assignmentId: 91, title: '렌더링 실습', description: '렌더링 과정을 설명하세요.', totalScore: 100, passScore: 70,
      allowTextSubmission: true, allowFileSubmission: false, allowUrlSubmission: false,
      readmeRequired: false, testRequired: false, lintRequired: false, allowedFileFormats: [], rubrics: [],
    }
    const lessons = [
      { lessonId: 701, title: '렌더링 실습', lessonType: 'ASSIGNMENT', assignment, sortOrder: 1 },
      { lessonId: 702, title: '다음 학습', lessonType: 'VIDEO', sortOrder: 2 },
    ].map((lesson) => ({ ...lesson, materials: [], isPublished: true, durationSeconds: 60, videoUrl: null }))
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      let data: unknown = []
      if (path === '/api/courses/73') data = {
        courseId: 73, title: '프론트엔드 실습', isEnrolled: true, status: 'PUBLISHED',
        sections: [{ sectionId: 1, title: '렌더링', lessons, isPublished: true, sortOrder: 1 }],
      }
      else if (path.includes('/api/learning/sessions/')) data = {
        lessonId: path.includes('/701/') ? 701 : 702, progressPercent: 0, progressSeconds: 0,
        defaultPlaybackRate: 1, pipEnabled: false, isCompleted: false,
      }
      else if (path.endsWith('/config')) data = { lessonId: 701, defaultPlaybackRate: 1, pipEnabled: false }
      else if (path.endsWith('/history')) data = { submissions: [] }
      else if (path.endsWith('/precheck')) data = {
        passed: true, readmePassed: true, testPassed: true, lintPassed: true, fileFormatPassed: true,
      }
      else if (path.endsWith('/91/submissions')) data = {
        submissionId: 901, assignmentId: 91, learnerId: 7, submissionStatus: 'GRADED',
        totalScore: 85, fileCount: 0, submittedAt: '2026-10-27T10:00:00', individualFeedback: feedback,
      }
      await route.fulfill({ json: { success: true, data } })
    })

    await page.goto('/learning?courseId=73&lessonId=701')
    await page.getByPlaceholder('제출할 코드나 설명을 입력하세요.').fill('DOM과 CSSOM, render tree, layout, paint 과정을 구현했습니다.')
    await page.getByRole('button', { name: /과제 제출하기$/ }).last().click()
    const panel = page.locator('.learning-assignment-result-panel')
    await expect(panel.getByRole('heading', { name: '채점 완료! 결과를 확인해 주세요.' })).toBeVisible()
    const content = panel.locator('.learning-assignment-feedback-card')
    await expect(content.getByRole('article')).toHaveCount(4)
    await expect(content.getByRole('region', { name: '종합 의견' }).locator('p')).toHaveCount(2)
    await expect(content.getByText('23/25점', { exact: true })).toHaveCount(1)
    await expect(content).toHaveCSS('overflow-y', 'visible')
    await content.getByRole('heading', { name: '종합 의견' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('assignment-feedback-summary.png') })
    await content.getByText('변경 전후 결과와 측정 근거를 구체적으로 기록하세요.').scrollIntoViewIfNeeded()
    await expect(content.getByText('변경 전후 결과와 측정 근거를 구체적으로 기록하세요.')).toBeVisible()
    const footer = panel.locator('.learning-assignment-result-footer')
    const footerBox = await footer.boundingBox()
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(viewport.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    await page.screenshot({ path: testInfo.outputPath('assignment-feedback.png') })
    await footer.getByRole('button').click()
    await expect(panel).not.toBeVisible()
    await expect(page).toHaveURL(/lessonId=702/)
  })
}

test('첨부 index.html의 본문을 전송하고 파일 형식 거절 사유를 표시한다', async ({ page }) => {
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({
      tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7,
      name: '테스트 학습자', role: 'ROLE_LEARNER', exp, storage: 'local',
    }))
  })
  const source = readFileSync(new URL('../../src/test/resources/submissions/index.html', import.meta.url))
  const assignment = {
    assignmentId: 91, title: '렌더링 실습', description: 'index.html로 제출하세요.', totalScore: 100, passScore: 80,
    allowTextSubmission: false, allowFileSubmission: true, allowUrlSubmission: false,
    allowedFileFormats: ['html'], readmeRequired: false, testRequired: false, lintRequired: false, rubrics: [],
  }
  const lessons = [
    { lessonId: 701, title: '렌더링 실습', lessonType: 'ASSIGNMENT', assignment, sortOrder: 1 },
    { lessonId: 702, title: '다음 학습', lessonType: 'VIDEO', sortOrder: 2 },
  ].map((lesson) => ({ ...lesson, materials: [], isPublished: true, durationSeconds: 60, videoUrl: null }))
  let submitted = false
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/courses/73') data = { courseId: 73, title: '렌더링 강의', isEnrolled: true, status: 'PUBLISHED', sections: [{ sectionId: 1, title: '렌더링', lessons, isPublished: true, sortOrder: 1 }] }
    else if (path.includes('/api/learning/sessions/')) data = { lessonId: 701, progressPercent: 0, progressSeconds: 0, defaultPlaybackRate: 1, isCompleted: false }
    else if (path.endsWith('/config')) data = { lessonId: 701, defaultPlaybackRate: 1, pipEnabled: false }
    else if (path.endsWith('/history')) data = { submissions: [] }
    else if (path.endsWith('/precheck')) {
      const body = route.request().postDataJSON()
      const valid = body.files[0].fileName === 'index.html'
      if (valid) {
        expect(body.files[0].fileType).toBe('html')
        expect(body.files[0].fileSize).toBe(source.length)
        expect(body.files[0].textContent).toBe(source.toString('utf8'))
      }
      data = { passed: valid, readmePassed: true, testPassed: true, lintPassed: true, fileFormatPassed: valid, message: valid ? '통과' : '허용되지 않은 파일 형식입니다. 허용 확장자: .html' }
    }
    else if (path.endsWith('/91/submissions')) {
      const body = route.request().postDataJSON()
      expect(body.files[0].textContent).toBe(source.toString('utf8'))
      submitted = true
      data = { submissionId: 901, assignmentId: 91, learnerId: 7, submissionStatus: 'GRADED', totalScore: 85, fileCount: 1, individualFeedback: feedback }
    }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/learning?courseId=73&lessonId=701')
  const upload = page.locator('input[type=file]')
  await expect(upload).toHaveAttribute('accept', '.html')
  await upload.setInputFiles({ name: 'index.exe', mimeType: 'application/octet-stream', buffer: source })
  await page.getByRole('button', { name: /과제 제출하기$/ }).last().click()
  await expect(page.getByText('허용되지 않은 파일 형식입니다. 허용 확장자: .html')).toBeVisible()
  expect(submitted).toBe(false)
  await page.getByRole('button', { name: '제거', exact: true }).click()
  await upload.setInputFiles({ name: 'index.html', mimeType: 'text/html', buffer: source })
  await page.getByRole('button', { name: /과제 제출하기$/ }).last().click()
  await expect(page.getByRole('heading', { name: '채점 완료! 결과를 확인해 주세요.' })).toBeVisible()
  expect(submitted).toBe(true)
})
