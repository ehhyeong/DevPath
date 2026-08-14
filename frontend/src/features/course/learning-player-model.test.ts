import { describe,expect,it } from 'vitest'
import type { LearningLessonAssignment,LearningLessonProgress } from '../../types/learning'
import { buildQuizModalQuestions,createAssignmentFormState,isAssignmentSubmissionFormReady,isLessonProgressCompleted,normalizeScorePercent,resolveAssignmentSubmissionMethods,resolveVideoQualitySources } from './learning-player-model'

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

  it('퀴즈 정보가 없는 강의는 임의의 고정 문제를 만들지 않는다', () => {
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

    expect(questions).toEqual([])
  })

  it('정답 비공개 퀴즈도 실제 문항과 선택지 ID를 응시 모델에 유지한다', () => {
    const questions = buildQuizModalQuestions({
      lessonId: 2,
      title: '실제 퀴즈',
      description: null,
      lessonType: 'QUIZ',
      videoUrl: null,
      videoAssetKey: null,
      thumbnailUrl: null,
      durationSeconds: null,
      isPreview: false,
      isPublished: true,
      sortOrder: 2,
      materials: [],
      quiz: {
        quizId: 10,
        title: '서버 채점 퀴즈',
        description: '',
        passScore: 60,
        exposeAnswer: false,
        questions: [{
          questionId: 101,
          questionType: 'MULTIPLE_CHOICE',
          questionText: '실제 문항',
          explanation: null,
          points: 5,
          options: [{ optionId: 1001, optionText: '선택지 A' }, { optionId: 1002, optionText: '선택지 B' }],
        }],
      },
    })

    expect(questions).toEqual([{
      questionId: 101,
      label: '문항 1',
      questionType: 'MULTIPLE_CHOICE',
      questionText: '실제 문항',
      points: 5,
      options: [{ optionId: 1001, optionText: '선택지 A' }, { optionId: 1002, optionText: '선택지 B' }],
    }])
  })

  it('관리자 최대 해상도가 720p이면 1080p 재생 소스를 제외한다', () => {
    const sources = resolveVideoQualitySources({
      lessonId: 1,
      title: '영상',
      description: null,
      lessonType: 'VIDEO',
      videoUrl: 'https://cdn.example/video-1080p.mp4',
      videoAssetKey: null,
      videoUrl720p: 'https://cdn.example/video-720p.mp4',
      thumbnailUrl: null,
      durationSeconds: null,
      isPreview: false,
      isPublished: true,
      sortOrder: 1,
      maxResolution: '720p',
      materials: [],
    }, null)

    expect(sources['1080']).toBeUndefined()
    expect(sources['720']).toBe('https://cdn.example/video-720p.mp4')
  })
})
