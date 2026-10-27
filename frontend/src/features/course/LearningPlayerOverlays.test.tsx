import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LearningPlayerOverlays from './LearningPlayerOverlays'
import type { LearningPlayerReadyModel } from './useLearningPlayerController'
import { DEMO_COURSE_TITLE, DEMO_TEXT } from '../../lib/demo-typing'
import { userApi } from '../../lib/api/auth'
import { readStoredAuthSession } from '../../lib/auth-session'

vi.mock('../../lib/auth-session', async (original) => ({ ...await original<typeof import('../../lib/auth-session')>(), readStoredAuthSession: vi.fn(() => null) }))
afterEach(() => vi.useRealTimers())

function Questions({ title = DEMO_COURSE_TITLE, onSubmit = vi.fn() }) {
  const [questionForm, setQuestionForm] = useState({ title: '', content: '', attachTimestamp: false })
  return <LearningPlayerOverlays model={{ course: { courseId: 127, title }, lesson: { title: '렌더링' },
    questionComposerOpen: true, questionForm, setQuestionForm, currentTime: 0, templateOptions: [{ templateType: 'CONCEPT', name: '개념' }],
    setQuestionComposerOpen: vi.fn(), handleSubmitQuestion: () => onSubmit(questionForm),
  } as unknown as LearningPlayerReadyModel} />
}

describe('시연 강의 Q&A 입력', () => {
  it.each(['title', 'content'])('%s 칸을 클릭하면 그 칸만 타이핑하고 다른 칸은 비워 둔다', async (field) => {
    vi.mocked(readStoredAuthSession).mockReturnValue({ userId: 7 } as never)
    vi.spyOn(userApi, 'getMyProfile').mockResolvedValue({ userId: 7, email: 'kim.hakseup@devpath.com' } as never)
    await act(async () => render(<Questions />))
    vi.useFakeTimers()
    const title = screen.getByPlaceholderText('질문 제목을 입력하세요')
    const body = screen.getByPlaceholderText(/어떤 부분이 이해가/)
    fireEvent.click(field === 'title' ? title : body)
    expect(screen.getByRole('button', { name: '등록하기' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(10000))
    expect(title).toHaveValue(field === 'title' ? DEMO_TEXT.questionTitle : '')
    expect(body).toHaveValue(field === 'content' ? DEMO_TEXT.questionContent : '')
  })

  it('다른 강의에서는 해당 계정이어도 자동 입력을 적용하지 않는다', async () => {
    vi.mocked(readStoredAuthSession).mockReturnValue({ userId: 7 } as never)
    vi.spyOn(userApi, 'getMyProfile').mockResolvedValue({ userId: 7, email: 'kim.hakseup@devpath.com' } as never)
    await act(async () => render(<Questions title="다른 강의" />))
    vi.useFakeTimers()
    fireEvent.click(screen.getByPlaceholderText('질문 제목을 입력하세요'))
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByPlaceholderText('질문 제목을 입력하세요')).toHaveValue('')
  })
})

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

describe('과제 채점 피드백', () => {
  it('총평과 항목별 점수·의견을 나누고 기존 결과 확인 동작을 유지한다', () => {
    const handleAssignmentResultPrimaryAction = vi.fn()
    render(<LearningPlayerOverlays model={{
      assignmentGradingResult: { lessonTitle: '렌더링 실습', assignment: { totalScore: 100 } },
      assignmentGradingBadge: { label: '통과', className: '', iconClassName: 'fas fa-check' },
      assignmentGradingPassed: true,
      assignmentGradingScore: 85,
      assignmentGradingReportRows: [],
      assignmentGradingFeedback: '요구사항 대부분을 충족했습니다. 접근성을 보강하면 더 좋습니다.\n- 시맨틱 구조: 23/25점 - header와 main을 사용했습니다. 입력 요소의 설명을 추가하세요.',
      handleAssignmentResultPrimaryAction,
      assignmentResultPrimaryActionLabel: '학습 이어가기',
    } as unknown as LearningPlayerReadyModel} />)

    expect(screen.getByRole('heading', { name: '종합 의견' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '시맨틱 구조' })).toBeInTheDocument()
    expect(screen.getByText('23/25점')).toBeInTheDocument()
    expect(screen.getByText('입력 요소의 설명을 추가하세요.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '학습 이어가기' }))
    expect(handleAssignmentResultPrimaryAction).toHaveBeenCalledOnce()
  })
})
