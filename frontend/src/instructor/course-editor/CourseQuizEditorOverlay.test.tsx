import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CourseQuizEditorOverlay from './CourseQuizEditorOverlay'
import { instructorLessonEvaluationApi } from '../../lib/api/instructor'
import { userApi } from '../../lib/api/auth'
import type { InstructorQuizEditor } from '../../types/instructor-evaluation'

vi.mock('../../lib/auth-session', async (original) => ({ ...await original<typeof import('../../lib/auth-session')>(), readStoredAuthSession: () => ({ userId: 4 }) }))

const newQuestion = 'JavaScript로 요소의 글자 색상만 바꾸면 항상 레이아웃(layout) 단계부터 다시 실행된다.'
const newExplanation = '글자 색상만 바뀌면 스타일 재계산과 페인트로 처리될 수 있습니다. 요소의 크기나 위치가 바뀌지 않으면 레이아웃을 다시 계산할 필요가 없습니다.'
const editor: InstructorQuizEditor = {
  lessonId: 338, nodeId: 1155, quizId: 58, title: '렌더링 점검', description: '', quizType: 'AI_TOPIC',
  totalScore: 15, passScore: 10, timeLimitMinutes: 10, exposeAnswer: true, exposeExplanation: true, isPublished: false,
  keywords: ['JavaScript', 'CSS', 'HTML', 'Vite', '렌더링'], scriptText: 'DOM과 CSSOM, 레이아웃과 페인트를 학습합니다.',
  questions: [1, 2, 3].map((order) => ({
    questionId: order, questionType: 'TRUE_FALSE', questionText: `기존 문제 ${order}`, explanation: `기존 해설 ${order}`,
    points: 5, displayOrder: order, sourceTimestamp: null,
    options: [{ optionId: order * 2, optionText: '참', isCorrect: true, displayOrder: 1 }, { optionId: order * 2 + 1, optionText: '거짓', isCorrect: false, displayOrder: 2 }],
  })),
}

beforeEach(() => {
  vi.spyOn(userApi, 'getMyProfile').mockResolvedValue({ userId: 4, email: 'frontend@devpath.com' } as never)
  vi.spyOn(instructorLessonEvaluationApi, 'getQuizEditor').mockResolvedValue(editor)
  vi.spyOn(instructorLessonEvaluationApi, 'saveQuizEditor').mockResolvedValue(editor)
})
afterEach(() => vi.useRealTimers())

describe('강사 퀴즈 수정 시연', () => {
  it.each(['question', 'explanation'])('%s 칸을 전체 선택하고 지운 뒤 한 번에 교체하며 거짓 정답으로 저장한다', async (field) => {
    const view = await act(async () => render(<CourseQuizEditorOverlay lessonId={338} lessonTitle="시연 퀴즈" demoCourse onClose={() => {}} />))
    const third = view.container.querySelectorAll('.course-quiz-editor-question-card')[2] as HTMLElement
    const question = within(third).getByPlaceholderText('질문을 입력하세요')
    const explanation = within(third).getByPlaceholderText('정답 근거를 한두 문장으로 간결하게 입력하세요.')
    fireEvent.focus(question)
    expect(question).toHaveValue('기존 문제 3')
    vi.useFakeTimers()
    const selected = (field === 'question' ? question : explanation) as HTMLInputElement | HTMLTextAreaElement
    const initial = selected.value
    fireEvent.click(selected)
    expect(selected).toHaveValue(initial)
    expect(selected.selectionStart).toBe(0)
    expect(selected.selectionEnd).toBe(initial.length)
    expect(screen.getByRole('button', { name: '저장 완료' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(350))
    expect(selected).toHaveValue('')
    act(() => vi.advanceTimersByTime(100))
    expect(question).toHaveValue(field === 'question' ? newQuestion : '기존 문제 3')
    expect(explanation).toHaveValue(field === 'explanation' ? newExplanation : '기존 해설 3')
    expect(screen.getByRole('button', { name: '저장 완료' })).toBeEnabled()
    expect(vi.getTimerCount()).toBe(0)
    fireEvent.click(screen.getAllByPlaceholderText('질문을 입력하세요')[0])
    expect(screen.getAllByPlaceholderText('질문을 입력하세요')[0]).toHaveValue('기존 문제 1')
    fireEvent.click(field === 'question' ? explanation : question)
    act(() => vi.advanceTimersByTime(350))
    act(() => vi.advanceTimersByTime(100))
    expect(question).toHaveValue(newQuestion)
    expect(explanation).toHaveValue(newExplanation)
    fireEvent.change(question, { target: { value: `${newQuestion} (수정)` } })
    fireEvent.click(question)
    expect(question).toHaveValue(`${newQuestion} (수정)`)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '저장 완료' })))
    const saved = vi.mocked(instructorLessonEvaluationApi.saveQuizEditor).mock.calls[0][1].questions[2]
    expect(saved.questionText).toBe(`${newQuestion} (수정)`)
    expect(saved.explanation).toBe(newExplanation)
    expect(saved.options.map((option) => option.isCorrect)).toEqual([false, true])
  })

  it.each(['question', 'explanation'])('%s만 클릭하고 저장하면 클릭하지 않은 칸의 기존 내용은 유지한다', async (field) => {
    await act(async () => render(<CourseQuizEditorOverlay lessonId={338} lessonTitle="퀴즈" demoCourse onClose={() => {}} />))
    vi.useFakeTimers()
    const question = screen.getAllByPlaceholderText('질문을 입력하세요')[2]
    const explanation = screen.getAllByPlaceholderText('정답 근거를 한두 문장으로 간결하게 입력하세요.')[2]
    fireEvent.click(field === 'question' ? question : explanation)
    act(() => vi.advanceTimersByTime(350))
    act(() => vi.advanceTimersByTime(100))
    act(() => vi.advanceTimersByTime(5000))
    expect(question).toHaveValue(field === 'question' ? newQuestion : '기존 문제 3')
    expect(explanation).toHaveValue(field === 'explanation' ? newExplanation : '기존 해설 3')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '저장 완료' })))
    const saved = vi.mocked(instructorLessonEvaluationApi.saveQuizEditor).mock.calls[0][1].questions[2]
    expect(saved.questionText).toBe(field === 'question' ? newQuestion : '기존 문제 3')
    expect(saved.explanation).toBe(field === 'explanation' ? newExplanation : '기존 해설 3')
  })

  it.each(['other-account', 'other-course'])('%s에서는 기존 내용을 바꾸지 않는다', async (scope) => {
    if (scope === 'other-account') vi.mocked(userApi.getMyProfile).mockResolvedValue({ userId: 4, email: 'other@devpath.com' } as never)
    const view = await act(async () => render(<CourseQuizEditorOverlay lessonId={338} lessonTitle="퀴즈" demoCourse={scope !== 'other-course'} onClose={() => {}} />))
    const third = view.container.querySelectorAll('.course-quiz-editor-question-card')[2] as HTMLElement
    const question = within(third).getByPlaceholderText('질문을 입력하세요')
    const explanation = within(third).getByPlaceholderText('정답 근거를 한두 문장으로 간결하게 입력하세요.')
    fireEvent.click(question)
    fireEvent.click(explanation)
    expect(question).toHaveValue('기존 문제 3')
    expect(explanation).toHaveValue('기존 해설 3')
  })

  it.each([0, 350])('%dms 단계에서 수동 입력을 시작하면 새 입력을 덮어쓰지 않는다', async (elapsed) => {
    await act(async () => render(<CourseQuizEditorOverlay lessonId={338} lessonTitle="퀴즈" demoCourse onClose={() => {}} />))
    vi.useFakeTimers()
    const question = screen.getAllByPlaceholderText('질문을 입력하세요')[2]
    const explanation = screen.getAllByPlaceholderText('정답 근거를 한두 문장으로 간결하게 입력하세요.')[2]
    fireEvent.click(question)
    fireEvent.click(explanation)
    act(() => vi.advanceTimersByTime(elapsed))
    fireEvent.keyDown(question, { key: 'a' })
    fireEvent.change(question, { target: { value: '직접 입력한 문제' } })
    act(() => vi.advanceTimersByTime(5000))
    expect(question).toHaveValue('직접 입력한 문제')
    expect(explanation).toHaveValue(newExplanation)
    expect(screen.getByRole('button', { name: '저장 완료' })).toBeEnabled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([0, 350, 450])('%dms 단계에서 화면을 닫으면 선택·삭제·교체 타이머를 해제한다', async (elapsed) => {
    const view = await act(async () => render(<CourseQuizEditorOverlay lessonId={338} lessonTitle="퀴즈" demoCourse onClose={() => {}} />))
    vi.useFakeTimers()
    fireEvent.click(screen.getAllByPlaceholderText('질문을 입력하세요')[2])
    act(() => vi.advanceTimersByTime(elapsed))
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
