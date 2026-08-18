import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LearningPlayerOverlays from './LearningPlayerOverlays'
import type { LearningPlayerReadyModel } from './useLearningPlayerController'

describe('LearningPlayerOverlays 퀴즈 응시', () => {
  it('정답을 노출하지 않고 실제 선택지 선택을 제출 흐름에 전달한다', () => {
    const handleQuizOptionSelect = vi.fn()
    const model = {
      quizModalLesson: { title: '실제 퀴즈', description: '서버 채점', lessonId: 1 },
      activeQuizQuestion: {
        questionId: 101,
        label: '문항 1',
        questionType: 'MULTIPLE_CHOICE',
        questionText: '실제 문항입니다.',
        points: 5,
        options: [{ optionId: 1001, optionText: '선택지 A' }, { optionId: 1002, optionText: '선택지 B' }],
      },
      closeQuizModal: vi.fn(),
      quizQuestionIndex: 0,
      quizModalQuestions: [{
        questionId: 101,
        label: '문항 1',
        questionType: 'MULTIPLE_CHOICE',
        questionText: '실제 문항입니다.',
        points: 5,
        options: [{ optionId: 1001, optionText: '선택지 A' }, { optionId: 1002, optionText: '선택지 B' }],
      }],
      activeQuizAnswer: undefined,
      quizSubmitBusy: false,
      quizAttemptResult: null,
      quizMessage: null,
      handleQuizOptionSelect,
      handleQuizTextAnswer: vi.fn(),
      setQuizQuestionIndex: vi.fn(),
      handleQuizNextQuestion: vi.fn(),
      handleQuizRetry: vi.fn(),
      handleQuizResultContinue: vi.fn(),
    } as unknown as LearningPlayerReadyModel

    render(<LearningPlayerOverlays model={model} />)

    fireEvent.click(screen.getByRole('button', { name: /1\. 선택지 A/ }))
    expect(handleQuizOptionSelect).toHaveBeenCalledWith(0)
    expect(screen.queryByText('정답입니다.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '답안 제출' })).toBeInTheDocument()
  })
})
