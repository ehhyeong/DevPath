import { expect, test } from '@playwright/test'
import type { AdminCourseReviewDetail } from '../src/types/admin'

const lesson = { lessonId: 1, title: '검수 영상', description: null, lessonType: 'VIDEO',
  playbackUrl: '/samples/sample-intro.mp4', thumbnailUrl: null, durationSeconds: 60,
  preview: false, published: true, sortOrder: 1 }
const detail: AdminCourseReviewDetail = {
  courseId: 73, title: '커리큘럼 검수 강의', subtitle: '영상·퀴즈·과제', description: '학습 콘텐츠 검수',
  status: 'IN_REVIEW', price: 10000, originalPrice: 10000, currency: 'KRW', difficultyLevel: 'BEGINNER',
  language: '한국어', hasCertificate: true, thumbnailUrl: null, introVideoUrl: null, durationSeconds: 60,
  prerequisites: [], jobRelevance: [], submittedAt: '2026-10-31T12:00:00', instructorId: 7,
  instructorName: '검수 강사', instructorEmail: 'instructor@example.test', sectionCount: 1, lessonCount: 5,
  publishedLessonCount: 5, previewLessonCount: 0, totalDurationSeconds: 60, reviewHistory: [],
  sections: [{ sectionId: 1, title: '콘텐츠 확인', description: null, sortOrder: 1, published: true, lessons: [
    lesson,
    { ...lesson, lessonId: 2, title: '개념 퀴즈', lessonType: 'READING', playbackUrl: null, durationSeconds: 0,
      quiz: { quizId: 81, title: '렌더링 퀴즈', description: '상태 변경 이해도 확인', totalScore: 10, passScore: 5,
        timeLimitMinutes: 10, exposeAnswer: false, exposeExplanation: false, questions: [
          { questionId: 1, questionType: 'MULTIPLE_CHOICE', questionText: '렌더링은 언제 발생하나요?',
            points: 5, displayOrder: 1, explanation: '상태가 변경되면 렌더링됩니다.', options: [
              { optionId: 1, optionText: '상태 변경', isCorrect: true, displayOrder: 1 },
              { optionId: 2, optionText: '아무 때나', isCorrect: false, displayOrder: 2 },
            ] },
          { questionId: 2, questionType: 'SHORT_ANSWER', questionText: '주관식 렌더링 설명', points: 5,
            displayOrder: 2, explanation: '주관식 문항 해설', options: [
              { optionId: 3, optionText: '주관식 모범 답안', isCorrect: true, displayOrder: 1 },
            ] },
        ] } },
    { ...lesson, lessonId: 3, title: '구현 과제', lessonType: 'CODING', playbackUrl: null, durationSeconds: 0,
      assignment: { assignmentId: 91, title: '상태 관리 실습', description: '컴포넌트와 테스트를 구현하세요.\n실행 방법도 작성하세요.',
        submissionRuleDescription: 'README에 실행 방법을 포함하세요.', totalScore: 100, passScore: 80,
        submissionType: 'FILE', aiReviewEnabled: true, allowTextSubmission: false, allowFileSubmission: true,
        allowUrlSubmission: false, allowedFileFormats: 'zip,md', readmeRequired: true, testRequired: true,
        lintRequired: false, allowLateSubmission: false, dueAt: null, rubrics: [
          { rubricId: 1, criteriaName: '상태 관리', criteriaDescription: '상태 변경 검증', maxPoints: 60, displayOrder: 1 },
          { rubricId: 2, criteriaName: '테스트', criteriaDescription: '회귀 테스트 포함', maxPoints: 40, displayOrder: 2 },
        ] } },
    { ...lesson, lessonId: 4, title: '빈 퀴즈', lessonType: 'READING', playbackUrl: null, quiz: null },
    { ...lesson, lessonId: 5, title: '빈 과제', lessonType: 'CODING', playbackUrl: null, assignment: null },
  ] }],
}

for (const width of [1440, 1280]) {
  test(`관리자 검수에서 퀴즈·과제 상세 확인 후 승인한다 (${width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 720 })
    await page.addInitScript(() => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const claims = btoa(JSON.stringify({ sub: '1', role: 'ROLE_ADMIN', exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`,
        refreshToken: 'test-only', userId: 1, name: '검수 관리자', role: 'ROLE_ADMIN', exp, storage: 'local' }))
    })
    let approved = false
    const metric = { value: 0, suffix: '건', progressPercent: 0, changeLabel: '변화 없음', changeTone: 'neutral' }
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      let data: unknown = []
      if (path.endsWith('/dashboard/overview')) data = { weeklyActiveUsers: metric, pendingCourseReviews: metric,
        issuedCertificates: metric, pendingReports: metric, trafficTrend: [], courseCategoryDistribution: [] }
      else if (path.endsWith('/courses/pending')) data = approved ? [] : [{ courseId: 73, instructorId: 7,
        instructorName: '검수 강사', title: detail.title, submittedAt: detail.submittedAt }]
      else if (path.endsWith('/courses/73/review')) data = detail
      else if (path.endsWith('/moderations/stats')) data = { totalReports: 0, pendingReports: 0,
        resolvedReports: 0, blindedContents: 0, suspendedUsers: 0 }
      else if (path.endsWith('/courses/73/approve')) {
        expect(route.request().method()).toBe('PATCH')
        expect(route.request().postDataJSON()).toEqual({ reason: '영상과 퀴즈 및 과제 내용을 확인했습니다.' })
        approved = true
        data = null
      }
      await route.fulfill({ json: { success: true, data } })
    })
    await page.goto('/admin-dashboard')
    await page.locator('button[data-target="reports"]').click()
    await page.getByRole('button', { name: '검수하기' }).click()
    const dialog = page.getByRole('dialog', { name: `${detail.title} 검수`, exact: true })
    await expect(dialog).toBeVisible()
    const section = dialog.locator('.admin-course-review-section')
    if (!await section.evaluate((element: HTMLDetailsElement) => element.open)) await section.locator(':scope > summary').click()

    await expect(dialog.getByRole('button', { name: '영상 없음' })).toHaveCount(0)
    await expect(dialog.getByText('등록된 퀴즈가 없습니다.', { exact: true })).toBeVisible()
    await expect(dialog.getByText('등록된 과제가 없습니다.', { exact: true })).toBeVisible()
    await expect(dialog.getByText('상태가 변경되면 렌더링됩니다.', { exact: true })).not.toBeVisible()
    await dialog.getByText('퀴즈 상세보기', { exact: true }).click()
    await expect(dialog.getByText('상태가 변경되면 렌더링됩니다.', { exact: true })).toBeVisible()
    await expect(dialog.getByText('주관식 모범 답안', { exact: true })).toBeVisible()
    await expect(dialog.getByText('정답 비공개 · 해설 비공개', { exact: true })).toBeVisible()
    await dialog.getByText('과제 상세보기', { exact: true }).click()
    await expect(dialog.getByText('README에 실행 방법을 포함하세요.', { exact: true })).toBeVisible()
    await expect(dialog.getByText('회귀 테스트 포함', { exact: true })).toBeVisible()
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await dialog.screenshot({ path: testInfo.outputPath('assessment-review.png') })

    await dialog.getByRole('button', { name: '영상 확인' }).click()
    const video = dialog.locator('video')
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2)
    await dialog.getByRole('button', { name: '영상 닫기' }).click()
    await expect(dialog.getByText('회귀 테스트 포함', { exact: true })).toBeVisible()
    const approve = dialog.getByRole('button', { name: '승인 확정' })
    await expect(approve).toBeDisabled()
    for (const checkbox of await dialog.locator('.course-review-check').all()) await checkbox.check()
    await dialog.locator('#courseReviewReason').fill('영상과 퀴즈 및 과제 내용을 확인했습니다.')
    await expect(approve).toBeEnabled()
    page.once('dialog', (confirmation) => confirmation.accept())
    await approve.click()
    await expect.poll(() => approved).toBe(true)
    await expect(dialog).not.toBeVisible()
  })
}
