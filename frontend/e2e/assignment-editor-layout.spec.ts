import { expect, test } from '@playwright/test'

const editor = {
  lessonId: 701, nodeId: null, assignmentId: 91,
  title: '서버에서 불러온 과제', description: '실제 과제 설명을 편집합니다.',
  totalScore: 100, passScore: 80, aiReviewEnabled: true,
  allowTextSubmission: true, allowFileSubmission: true, allowUrlSubmission: false,
  allowedFileFormats: ['html'],
  rubrics: [
    { rubricId: 1, criteriaName: '코드 구조', criteriaKeywords: 'main', maxPoints: 40, displayOrder: 1 },
    { rubricId: 2, criteriaName: '실행 결과', criteriaKeywords: 'output', maxPoints: 60, displayOrder: 2 },
  ],
  referenceFiles: [],
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`과제 편집기 원본 본문 스타일과 저장을 유지한다 (${viewport.width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(() => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const claims = btoa(JSON.stringify({ sub: '8', role: 'ROLE_INSTRUCTOR', exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({
        tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
        userId: 8, name: '테스트 강사', role: 'ROLE_INSTRUCTOR', exp, storage: 'local',
      }))
    })
    let saved: Record<string, unknown> | undefined
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      let data: unknown = []
      if (path.endsWith('/701/assignment-editor')) {
        if (route.request().method() === 'PUT') saved = route.request().postDataJSON()
        data = { ...editor, ...saved }
      }
      await route.fulfill({ json: { success: true, data } })
    })
    await page.goto('/content-assignment-editor?lessonId=701&courseId=73&lessonTitle=실습%20과제')
    const root = page.locator('.content-assignment-editor-page')
    const title = root.locator('.content-assignment-editor-card > input[type=text]')
    await expect(title).toHaveValue(editor.title)
    await expect(root).toHaveCSS('font-family', /Pretendard/)
    await expect(title).toHaveCSS('font-size', '20px')
    await expect(title).toHaveCSS('font-weight', '700')
    await expect(root.locator('textarea')).toHaveCSS('font-size', '14px')
    await expect(root.locator('textarea')).toHaveCSS('line-height', '22.75px')
    await expect(root.locator('.content-assignment-editor-save-button')).toHaveCSS('font-size', '14px')
    const panel = root.locator('.content-assignment-editor-rubric-panel')
    await expect(panel).toHaveCSS('padding', '0px')
    const rubric = root.locator('.content-assignment-editor-rubric-item').first()
    await expect(rubric.locator('label').first()).toHaveCSS('font-size', '10px')
    await expect(rubric.locator('input[type=number]')).toHaveCSS('color', 'rgb(0, 196, 113)')
    await expect(rubric.locator('input[type=number]')).toHaveCSS('font-weight', '900')
    await expect(rubric.locator('input[type=number]')).toHaveCSS('padding-right', '32px')
    const pass = root.locator('.content-assignment-editor-score-card input').last()
    await expect(pass).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(pass).toHaveCSS('color', 'rgb(0, 196, 113)')
    await expect(pass).toHaveCSS('padding-right', '64px')
    const submission = root.getByText('텍스트/코드 직접 입력', { exact: true })
    await expect(submission).toHaveCSS('font-size', '14px')
    await expect(submission).toHaveCSS('font-weight', '700')
    await expect(root.getByText('AI 코드 리뷰어 (Beta)', { exact: true })).toHaveCount(0)
    await expect(root.getByText('Premium', { exact: true })).toHaveCount(0)
    await expect(root.getByText('JDK 설치 및 환경변수 설정 인증하기', { exact: true })).toHaveCount(0)
    expect(await page.locator('.app-header').count()).toBe(1)
    await expect(page.locator('aside')).toHaveCount(1)
    if (viewport.width >= 1024) {
      await expect(page.locator('.instructor-sidebar')).toHaveCSS('width', '80px')
      await expect(page.locator('.instructor-sidebar .menu-label').first()).toHaveCSS('opacity', '0')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    await page.screenshot({ path: testInfo.outputPath('assignment-editor-top.png') })
    await root.getByRole('button', { name: /평가 기준 추가하기/ }).click()
    const newRubric = root.locator('.content-assignment-editor-rubric-item').last()
    await newRubric.locator('input[type=text]').first().fill('검증 기록')
    await newRubric.locator('input[type=text]').last().fill('test')
    await newRubric.locator('input[type=number]').fill('10')
    await expect(root.locator('.content-assignment-editor-score-card input').first()).toHaveValue('110')
    await newRubric.getByRole('button').click()
    await expect(root.locator('.content-assignment-editor-score-card input').first()).toHaveValue('100')
    await pass.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('assignment-editor-rubric.png') })
    await title.fill('편집한 과제 제목')
    await expect(root.getByLabel('허용 확장자 직접 입력')).toHaveCount(0)
    await expect(root.getByText(/쉼표로 구분해 추가할 수 있습니다/)).toHaveCount(0)
    const htmlFormat = root.getByRole('button', { name: '.html', exact: true })
    await expect(htmlFormat).toHaveAttribute('aria-pressed', 'true')
    await htmlFormat.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('assignment-editor-file-formats.png') })
    await htmlFormat.click()
    await root.locator('.content-assignment-editor-save-button').click()
    expect(saved).toBeUndefined()
    await expect(root.getByText(/허용할 확장자를 하나 이상 선택하거나/).first()).toBeVisible()
    await htmlFormat.click()
    await root.getByRole('button', { name: '.pdf', exact: true }).click()
    await root.getByRole('button', { name: '.md', exact: true }).click()
    await root.locator('textarea').fill('편집한 과제 설명')
    await root.locator('.content-assignment-editor-toolbar button').first().click()
    await expect(root.locator('textarea')).toHaveValue(/\*\*/)
    await root.getByRole('checkbox').last().check()
    await pass.fill('85')
    await root.locator('.content-assignment-editor-save-button').click()
    await expect(root.getByRole('heading', { name: '저장 완료!' })).toBeVisible()
    expect(saved).toMatchObject({
      title: '편집한 과제 제목', description: '편집한 과제 설명****', totalScore: 100, passScore: 85,
      allowUrlSubmission: true, aiReviewEnabled: true, rubrics: editor.rubrics, referenceFiles: [],
      allowedFileFormats: ['html', 'pdf', 'md'],
    })
    await page.reload()
    for (const format of ['.html', '.pdf', '.md']) {
      await expect(root.getByRole('button', { name: format, exact: true })).toHaveAttribute('aria-pressed', 'true')
    }
    await root.getByRole('radio', { name: '제한 없음', exact: true }).check()
    await root.locator('.content-assignment-editor-save-button').click()
    await expect(root.getByRole('heading', { name: '저장 완료!' })).toBeVisible()
    expect(saved?.allowedFileFormats).toEqual([])
  })
}
