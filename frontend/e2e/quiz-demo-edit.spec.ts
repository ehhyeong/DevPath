import { expect, test } from '@playwright/test'
import { DEMO_COURSE_TITLE, DEMO_TEXT } from '../src/lib/demo-typing'

for (const firstField of ['question', 'explanation']) {
  test(`생성한 3번 OX 문항의 ${firstField} 클릭 후 독립 교체하고 거짓 정답으로 저장한다`, async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const claims = btoa(JSON.stringify({ sub: '4', role: 'ROLE_INSTRUCTOR', exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({
        tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
        userId: 4, name: '테스트 강사', role: 'ROLE_INSTRUCTOR', exp, storage: 'local',
      }))
    })
    const scriptText = 'HTML은 DOM, CSS는 CSSOM을 만듭니다. JavaScript의 클래스 변경은 상황에 따라 스타일 재계산, 레이아웃과 페인트를 유발합니다.'
    const base = {
      lessonId: 338, nodeId: 1155, quizId: 58, title: '렌더링 점검', description: '', quizType: 'AI_TOPIC',
      totalScore: 15, passScore: 10, timeLimitMinutes: 10, exposeAnswer: true, exposeExplanation: true, isPublished: false,
      keywords: ['JavaScript', 'CSS', 'HTML', 'Vite', '렌더링'], scriptText,
    }
    const questions = [1, 2, 3].map((order) => ({
      questionId: order, questionType: order === 3 ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE',
      questionText: order === 3 ? 'Vite는 브라우저 렌더링 엔진을 바꾸는 도구다.' : `기존 문제 ${order}`,
      explanation: `기존 해설 ${order}`, points: 5, displayOrder: order, sourceTimestamp: null,
      options: [
        { optionId: order * 2, optionText: '참', isCorrect: true, displayOrder: 1 },
        { optionId: order * 2 + 1, optionText: '거짓', isCorrect: false, displayOrder: 2 },
      ],
    }))
    let saved: { questions: typeof questions } | undefined
    let generations = 0
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      let data: unknown = []
      if (path === '/api/users/me/profile') data = { userId: 4, email: 'frontend@devpath.com', name: '테스트 강사' }
      else if (path === '/api/instructor/courses/64') data = { courseId: 64, title: DEMO_COURSE_TITLE, tags: base.keywords.map((tagName) => ({ tagName })) }
      else if (path.endsWith('/quiz-editor/generate')) {
        expect(route.request().postDataJSON()).toMatchObject({ scriptText, keywords: base.keywords })
        generations++
        data = { ...base, questions }
      }
      else if (path.endsWith('/338/quiz-editor')) {
        if (route.request().method() === 'PUT') saved = route.request().postDataJSON()
        data = { ...base, questions: [], ...saved }
      }
      await route.fulfill({ json: { success: true, data } })
    })
    await page.goto('/quiz-creator?lessonId=338&courseId=64&lessonTitle=렌더링%20퀴즈')
    await page.getByRole('button', { name: /텍스트 분석$/ }).click()
    await page.getByRole('button', { name: /퀴즈 생성하기$/ }).click()
    const third = page.locator('.course-quiz-editor-question-card').nth(2)
    const question = third.getByPlaceholder('질문을 입력하세요')
    const explanation = third.getByPlaceholder('정답 근거를 한두 문장으로 간결하게 입력하세요.')
    await expect(question).toHaveValue(questions[2].questionText)
    const selected = firstField === 'question' ? question : explanation
    const original = firstField === 'question' ? questions[2].questionText : questions[2].explanation
    await selected.evaluate((element: HTMLInputElement | HTMLTextAreaElement) => {
      // 짧은 선택 표시를 후속 자동화 요청의 실행 지연과 무관하게 클릭 이벤트 안에서 기록한다.
      document.addEventListener('click', () => {
        element.dataset.clickSelection = JSON.stringify([element.value, element.selectionStart, element.selectionEnd])
      }, { once: true })
    })
    await selected.click()
    await expect(selected).toHaveAttribute('data-click-selection', JSON.stringify([original, 0, original.length]))
    await expect(page.getByRole('button', { name: /저장 완료$/ })).toBeDisabled()
    await page.screenshot({ path: testInfo.outputPath('quiz-demo-selected.png') })
    await expect(question).toHaveValue(firstField === 'question' ? DEMO_TEXT.quizQuestion : questions[2].questionText)
    await expect(explanation).toHaveValue(firstField === 'explanation' ? DEMO_TEXT.quizExplanation : questions[2].explanation)
    await expect(page.getByRole('button', { name: /저장 완료$/ })).toBeEnabled()
    await expect(firstField === 'question' ? explanation : question).toHaveValue(
      firstField === 'question' ? questions[2].explanation : questions[2].questionText,
    )
    await expect(third.getByRole('button', { name: '거짓', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await (firstField === 'question' ? explanation : question).click()
    await expect(question).toHaveValue(DEMO_TEXT.quizQuestion)
    await expect(explanation).toHaveValue(DEMO_TEXT.quizExplanation)
    await expect(page.getByRole('button', { name: /저장 완료$/ })).toBeEnabled()
    await question.fill(`${DEMO_TEXT.quizQuestion} (직접 수정)`)
    await question.click()
    await expect(question).toHaveValue(`${DEMO_TEXT.quizQuestion} (직접 수정)`)
    await page.getByRole('button', { name: /퀴즈 생성하기$/ }).click()
    await expect(question).toHaveValue(questions[2].questionText)
    await question.click()
    await explanation.click()
    await expect(question).toHaveValue(DEMO_TEXT.quizQuestion)
    await expect(explanation).toHaveValue(DEMO_TEXT.quizExplanation)
    await page.screenshot({ path: testInfo.outputPath('quiz-demo-edited.png') })
    await page.getByRole('button', { name: /저장 완료$/ }).click()
    await expect(page).toHaveURL(/course-editor\?courseId=64/)
    expect(generations).toBe(2)
    expect(saved?.questions[2]).toMatchObject({ questionText: DEMO_TEXT.quizQuestion, explanation: DEMO_TEXT.quizExplanation })
    expect(saved?.questions[2].options.map((option) => option.isCorrect)).toEqual([false, true])
  })
}
