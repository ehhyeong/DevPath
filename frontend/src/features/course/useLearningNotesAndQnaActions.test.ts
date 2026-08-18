import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { qnaApi } from '../../lib/api/learner'
import type { LearningCourseDetail, LearningLesson } from '../../types/learning'
import type { QnaQuestionDetail } from '../../types/qna'
import { useLearningNotesAndQnaActions } from './useLearningNotesAndQnaActions'
import { useLearningNotesAndQnaState } from './useLearningPlayerState'

const course = { courseId: 73 } as LearningCourseDetail
const lesson = { lessonId: 279 } as LearningLesson

const createdQuestion: QnaQuestionDetail = {
  id: 41,
  authorId: 7,
  authorName: '학습자',
  courseId: 73,
  lessonId: 279,
  templateType: 'CONCEPT',
  difficulty: 'MEDIUM',
  title: '상태 관리 질문',
  content: '위젯 상태는 어디에 두나요?',
  adoptedAnswerId: null,
  lectureTimestamp: '02:05',
  qnaStatus: 'OPEN',
  answerCount: 0,
  viewCount: 0,
  createdAt: null,
  updatedAt: null,
  answers: [],
}

describe('learning notes and Q&A actions', () => {
  it('Q&A 제출 요청과 성공 상태 전환을 함께 적용한다', async () => {
    const createQuestion = vi.spyOn(qnaApi, 'createQuestion').mockResolvedValue(createdQuestion)
    const setActiveTab = vi.fn()
    const { result } = renderHook(() => {
      const state = useLearningNotesAndQnaState()
      const actions = useLearningNotesAndQnaActions({
        state,
        lesson,
        course,
        currentTime: 125,
        isStudentPreview: false,
        sessionUserId: 7,
        setActiveTab,
      })
      return { state, actions }
    })

    act(() => {
      result.current.state.setQuestionComposerOpen(true)
      result.current.state.setQuestionForm({
        templateType: 'CONCEPT',
        difficulty: 'MEDIUM',
        title: '상태 관리 질문',
        content: '위젯 상태는 어디에 두나요?',
        attachTimestamp: true,
      })
    })
    await act(async () => result.current.actions.handleSubmitQuestion())

    expect(createQuestion).toHaveBeenCalledWith({
      templateType: 'CONCEPT',
      difficulty: 'MEDIUM',
      title: '상태 관리 질문',
      content: '위젯 상태는 어디에 두나요?',
      courseId: 73,
      lessonId: 279,
      lectureTimestamp: '02:05',
    }, 7)
    expect(result.current.state.qnaQuestions[0]?.id).toBe(41)
    expect(result.current.state.openQuestionId).toBe(41)
    expect(result.current.state.questionComposerOpen).toBe(false)
    expect(result.current.state.questionMessage).toBe('질문이 등록되었습니다.')
    expect(setActiveTab).toHaveBeenCalledWith('qna')
  })

  it('미리보기에서는 Q&A API를 호출하지 않는다', async () => {
    const createQuestion = vi.spyOn(qnaApi, 'createQuestion')
    const { result } = renderHook(() => {
      const state = useLearningNotesAndQnaState()
      return {
        state,
        actions: useLearningNotesAndQnaActions({
          state,
          lesson,
          course,
          currentTime: 0,
          isStudentPreview: true,
          sessionUserId: 7,
          setActiveTab: vi.fn(),
        }),
      }
    })

    await act(async () => result.current.actions.handleSubmitQuestion())

    expect(createQuestion).not.toHaveBeenCalled()
    expect(result.current.state.questionMessage).toBe('미리보기에서는 질문을 등록할 수 없습니다.')
  })
})
