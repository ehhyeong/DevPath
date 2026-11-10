import { expect, test } from '@playwright/test'

for (const scenario of ['assignment', 'next-section', 'last', 'failed', 'error'] as const) {
  test(`퀴즈 해설을 확인한 뒤 커리큘럼 순서와 통과 여부에 따라 이동한다 (${scenario})`, async ({ page }) => {
    await page.addInitScript(() => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({
        tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
        userId: 7, name: '테스트 학습자', role: 'ROLE_LEARNER', exp, storage: 'local',
      }))
    })
    const questions = [1, 2].map((questionId) => ({
      questionId, questionType: 'TRUE_FALSE', questionText: `렌더링 확인 문제 ${questionId}`,
      explanation: '브라우저 렌더링 해설', points: 5,
      options: [{ optionId: questionId * 10, optionText: '참' }, { optionId: questionId * 10 + 1, optionText: '거짓' }],
    }))
    const video = { lessonId: 701, title: '브라우저 영상', lessonType: 'VIDEO', videoUrl: '/samples/sample-intro.mp4' }
    const quiz = { lessonId: 702, title: '브라우저 퀴즈', lessonType: 'QUIZ', quiz: { quizId: 81, title: '렌더링 퀴즈', description: '', passScore: 5, questions } }
    const assignment = {
      lessonId: 703, title: '렌더링 실습', lessonType: 'ASSIGNMENT',
      assignment: { assignmentId: 91, title: '렌더링 실습', description: '렌더링 흐름을 설명하세요.', totalScore: 100, passScore: 80,
        allowTextSubmission: true, allowFileSubmission: false, allowUrlSubmission: false, rubrics: [] },
    }
    const sections = [
      { sectionId: 1, title: '렌더링', lessons: scenario === 'last' || scenario === 'next-section' ? [video, quiz] : [video, quiz, assignment] },
      ...(scenario === 'last' ? [] : [{ sectionId: 2, title: '다음 섹션', lessons: [{ lessonId: 704, title: '다음 영상', lessonType: 'VIDEO' }] }]),
    ].map((section, index) => ({ ...section, isPublished: true, sortOrder: index + 1,
      lessons: section.lessons.map((lesson, lessonIndex) => ({ materials: [], videoUrl: null, durationSeconds: 60, ...lesson, isPublished: true, sortOrder: lessonIndex + 1 })),
    }))
    const completed = new Set<number>()
    let releaseAttempt!: () => void
    const attemptResponse = new Promise<void>((resolve) => { releaseAttempt = resolve })
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      let data: unknown = []
      if (path === '/api/courses/73') data = { courseId: 73, title: '렌더링 강의', isEnrolled: true, status: 'PUBLISHED', sections }
      else if (path.includes('/api/learning/sessions/')) {
        const lessonId = Number(path.split('/')[4])
        if (route.request().method() === 'PUT' && route.request().postDataJSON().progressPercent === 100) completed.add(lessonId)
        data = { lessonId, progressPercent: completed.has(lessonId) ? 100 : 0, progressSeconds: completed.has(lessonId) ? 60 : 0,
          defaultPlaybackRate: 1, pipEnabled: false, isCompleted: completed.has(lessonId) }
      }
      else if (path.endsWith('/config')) data = { lessonId: Number(path.split('/')[4]), defaultPlaybackRate: 1, pipEnabled: false }
      else if (path.endsWith('/history')) data = { submissions: [] }
      else if (path.endsWith('/81/attempts')) {
        expect(route.request().postDataJSON().answers).toEqual([{ questionId: 1, selectedOptionId: 10 }, { questionId: 2, selectedOptionId: 20 }])
        await attemptResponse
        if (scenario === 'error') {
          await route.fulfill({ status: 503, json: { success: false, message: '채점 서버 오류' } })
          return
        }
        data = { attemptId: 501, quizId: 81, quizTitle: '렌더링 퀴즈', score: scenario === 'failed' ? 0 : 10, maxScore: 10,
          passed: scenario !== 'failed', attemptNumber: 1, completedAt: '2026-10-29T12:00:00',
          questionResults: questions.map((question) => ({
            ...question, correct: scenario !== 'failed', earnedPoints: scenario === 'failed' ? 0 : 5,
            selectedOptionId: question.questionId * 10, selectedOptionText: '참', textAnswer: null,
            correctAnswerText: scenario === 'failed' ? '거짓' : '참', explanation: `채점 후 해설 ${question.questionId}`,
          })) }
      }
      await route.fulfill({ json: { success: true, data } })
    })
    await page.goto('/learning?courseId=73&lessonId=701')
    const player = page.locator('video.learning-player-video-element')
    await expect.poll(() => player.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2)
    await player.evaluate((element: HTMLVideoElement) => {
      element.currentTime = element.duration - 0.2
      return element.play()
    })
    await expect.poll(() => completed.has(701)).toBe(true)
    await page.locator('.learning-player-sidebar').getByTitle('브라우저 퀴즈', { exact: true }).click()
    await page.getByRole('button', { name: '퀴즈 시작하기' }).click()
    const dialog = page.getByRole('dialog', { name: '브라우저 퀴즈' })
    await dialog.getByRole('button', { name: /1\. 참/ }).click()
    await dialog.getByRole('button', { name: '다음 문제' }).click()
    await expect(page).toHaveURL(/lessonId=702/)
    expect(completed.has(702)).toBe(false)
    await dialog.getByRole('button', { name: /1\. 참/ }).click()
    const submitted = page.waitForRequest('**/api/evaluation/learner/quizzes/81/attempts?*')
    await dialog.getByRole('button', { name: '답안 제출' }).click()
    await submitted
    await expect(dialog.getByRole('button', { name: '채점 중' })).toBeDisabled()
    await expect(page).toHaveURL(/lessonId=702/)
    expect(completed.has(702)).toBe(false)
    releaseAttempt()

    if (scenario !== 'error') {
      await expect(dialog.getByText(scenario === 'failed' ? '통과 점수에 도달하지 못했습니다.' : '퀴즈를 통과했습니다.', { exact: true })).toBeVisible()
      await expect(dialog.getByText('채점 후 해설 1', { exact: true })).toBeVisible()
      await expect(dialog.getByText('채점 후 해설 2', { exact: true })).toBeVisible()
      await expect(dialog.getByText(`정답: ${scenario === 'failed' ? '거짓' : '참'}`, { exact: true })).toHaveCount(2)
      await expect(page).toHaveURL(/lessonId=702/)
      await expect.poll(() => completed.has(702)).toBe(scenario !== 'failed')
      await expect(page.getByRole('heading', { name: '수고하셨습니다!', exact: true })).not.toBeVisible()
    }

    if (scenario === 'assignment' || scenario === 'next-section') {
      await dialog.getByRole('button', { name: '다음 학습으로', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`lessonId=${scenario === 'assignment' ? 703 : 704}`))
      await expect(dialog).not.toBeVisible()
      await expect.poll(() => completed.has(702)).toBe(true)
      if (scenario === 'assignment') await expect(page.getByPlaceholder('제출할 코드나 설명을 입력하세요.')).toBeVisible()
    } else {
      await expect(dialog.getByText(scenario === 'error' ? '채점 서버 오류' : scenario === 'failed' ? '통과 점수에 도달하지 못했습니다.' : '퀴즈를 통과했습니다.', { exact: true })).toBeVisible()
      await expect(page).toHaveURL(/lessonId=702/)
      expect(completed.has(702)).toBe(scenario === 'last')
      if (scenario === 'failed') {
        await dialog.getByRole('button', { name: '다시 응시하기' }).click()
        await expect(dialog.getByRole('button', { name: '다음 문제' })).toBeVisible()
      } else if (scenario === 'last') {
        await dialog.getByRole('button', { name: '다음 학습으로', exact: true }).click()
        await expect(dialog).not.toBeVisible()
        await expect(page.getByRole('heading', { name: '수고하셨습니다!', exact: true })).toBeVisible()
      }
    }
  })
}
