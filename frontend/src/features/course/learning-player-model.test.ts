import { describe,expect,it } from 'vitest'
import type { LearningLessonAssignment,LearningLessonProgress } from '../../types/learning'
import { buildQuizModalQuestions,createAssignmentFormState,isAssignmentSubmissionFormReady,isLessonProgressCompleted,normalizeScorePercent,resolveAssignmentSubmissionMethods } from './learning-player-model'

const assignment: LearningLessonAssignment = {
  assignmentId: 1,
  roadmapNodeId: null,
  title: '과제',
  description: null,
  submissionRuleDescription: null,
  totalScore: 20,
  passScore: 12,
  aiReviewEnabled: true,
  allowTextSubmission: true,
  allowFileSubmission: false,
  allowUrlSubmission: true,
  readmeRequired: false,
  testRequired: false,
  lintRequired: false,
  allowLateSubmission: false,
  dueAt: null,
  allowedFileFormats: [],
  rubrics: [],
}

describe('learning player model', () => {
  it('허용된 제출 방식 중 하나가 채워져야 과제를 제출할 수 있다', () => {
    const empty = createAssignmentFormState(assignment)
    expect(resolveAssignmentSubmissionMethods(assignment)).toEqual({ allowText: true,allowUrl: true,allowFile: false })
    expect(isAssignmentSubmissionFormReady(assignment, empty)).toBe(false)
    expect(isAssignmentSubmissionFormReady(assignment, { ...empty,submissionText: '설명' })).toBe(true)
    expect(isAssignmentSubmissionFormReady(assignment, { ...empty,submissionUrl: 'https://example.com' })).toBe(true)
  })

  it('완료 플래그와 100% 진행률을 모두 완료 상태로 취급한다', () => {
    const progress: LearningLessonProgress = {
      lessonId: 1,
      progressPercent: 99,
      progressSeconds: 10,
      defaultPlaybackRate: 1,
      pipEnabled: false,
      isCompleted: false,
      lastWatchedAt: null,
    }

    expect(isLessonProgressCompleted(progress)).toBe(false)
    expect(isLessonProgressCompleted({ ...progress,isCompleted: true })).toBe(true)
    expect(isLessonProgressCompleted({ ...progress,progressPercent: 100 })).toBe(true)
  })

  it('평가 점수를 백분율 범위로 정규화한다', () => {
    expect(normalizeScorePercent(12, 20)).toBe(60)
    expect(normalizeScorePercent(25, 20)).toBe(25)
    expect(normalizeScorePercent(null, 20)).toBeNull()
  })

  it('퀴즈 정보가 없는 강의는 기본 문제 목록을 만든다', () => {
    const questions = buildQuizModalQuestions({
      lessonId: 1,
      title: '영상',
      description: null,
      lessonType: 'VIDEO',
      videoUrl: null,
      videoAssetKey: null,
      thumbnailUrl: null,
      durationSeconds: null,
      isPreview: false,
      isPublished: true,
      sortOrder: 1,
      materials: [],
    })

    expect(questions).toHaveLength(3)
    expect(questions.every((question) => question.options.length >= 2)).toBe(true)
  })
})
