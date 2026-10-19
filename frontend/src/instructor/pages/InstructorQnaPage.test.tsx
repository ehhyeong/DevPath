import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InstructorQnaPage from './InstructorQnaPage'
import { DEMO_COURSE_TITLE, DEMO_TEXT } from '../../lib/demo-typing'
import { userApi } from '../../lib/api/auth'

const controls = vi.hoisted(() => ({ quick: true, submit: vi.fn(), save: vi.fn() }))
vi.mock('../../lib/auth-session', async (original) => ({ ...await original<typeof import('../../lib/auth-session')>(), readStoredAuthSession: () => ({ userId: 4 }) }))
vi.mock('./useInstructorQnaController', async () => {
  const { useState, useRef } = await import('react')
  return { useInstructorQnaController: () => {
    const [draftText, setDraftText] = useState('')
    const [quickTitle, setQuickTitle] = useState('')
    const [quickBody, setQuickBody] = useState('')
    const [quickOpen, setQuickOpen] = useState(controls.quick)
    return {
      statusFilter: 'pending', search: '', sortFilter: 'latest', courseOptions: [], activeCourseFilter: 'all',
      visibleQuestions: [], activeSelectedId: 1, activeTimeline: { publishedAnswer: null }, timelineLoading: false,
      current: { questionId: 1, courseId: 127, courseTitle: DEMO_COURSE_TITLE, title: DEMO_TEXT.questionTitle, content: DEMO_TEXT.questionContent },
      instructorDisplayName: '강사', showAnswerForm: true, quickReplies: [], loading: false,
      draftText, setDraftText, quickTitle, setQuickTitle, quickBody, setQuickBody, quickOpen, setQuickOpen,
      editorRef: useRef(null), saveQuickReply: () => controls.save(quickTitle, quickBody), submitAnswer: () => controls.submit(draftText),
    }
  } }
})

beforeEach(() => {
  controls.quick = true
  controls.save.mockClear()
  controls.submit.mockClear()
  vi.spyOn(userApi, 'getMyProfile').mockResolvedValue({ userId: 4, email: 'frontend@devpath.com' } as never)
})
afterEach(() => vi.useRealTimers())

describe('강사 시연 답변 입력', () => {
  it.each(['title', 'body'])('빠른 답변 %s 칸 클릭이 다른 칸과 실제 답변을 시작하지 않는다', async (field) => {
    await act(async () => render(<InstructorQnaPage session={{ userId: 4 } as never} />))
    const title = screen.getByPlaceholderText('예: JPA 순환 참조 답변')
    const body = screen.getByPlaceholderText('버튼 클릭 시 에디터에 그대로 삽입될 답변을 작성해주세요.')
    vi.useFakeTimers()
    fireEvent.click(field === 'title' ? title : body)
    expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(10000))
    expect(title).toHaveValue(field === 'title' ? DEMO_TEXT.answerTitle : '')
    expect(body).toHaveValue(field === 'body' ? DEMO_TEXT.answerContent : '')
    expect(screen.getByPlaceholderText(/수강생에게 격려의 말/)).toHaveValue('')
    expect(controls.save).not.toHaveBeenCalled()
  })

  it('실제 답변 작성칸도 클릭으로 내용만 입력하고 등록은 별도로 한다', async () => {
    controls.quick = false
    await act(async () => render(<InstructorQnaPage session={{ userId: 4 } as never} />))
    vi.useFakeTimers()
    const input = screen.getByPlaceholderText(/수강생에게 격려의 말/)
    fireEvent.click(input)
    expect(screen.getByRole('button', { name: '답변 등록' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(10000))
    expect(input).toHaveValue(DEMO_TEXT.answerContent)
    expect(controls.submit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '답변 등록' }))
    expect(controls.submit).toHaveBeenCalledWith(DEMO_TEXT.answerContent)
  })
})
