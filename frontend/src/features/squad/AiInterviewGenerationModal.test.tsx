import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AiInterviewGenerationModal from './AiInterviewGenerationModal'

const question = { id: 'G1', category: '보안', question: '신고 소유권은 어떻게 검증하나요?', answer: '작성자와 회원을 비교합니다.', keywords: ['인가'], level: 2, from: 'PATCH /reports/{id}' }
const props = { ready: false, error: '', questions: [question], selected: [], saving: false, taskCount: 2, apiCount: 3, tableCount: 4, onToggle: vi.fn(), onRetry: vi.fn(), onClose: vi.fn(), onAdd: vi.fn() }

describe('원본 AI 면접 질문 생성 모달', () => {
  it('실제 응답 대기 중에는 설계서 항목 개수와 진행 안내를 표시하고 추가를 막는다', () => {
    render(<AiInterviewGenerationModal {...props} />)
    expect(screen.getByRole('status')).toHaveTextContent('작업 2개 확인')
    expect(screen.getByRole('status')).toHaveTextContent('API 명세 3개 · ERD 4개')
    expect(screen.getByRole('button', { name: '선택한 질문 추가' })).toBeDisabled()
  })

  it('서버 질문의 분류·출처·선택 개수와 저장 상태를 표시한다', () => {
    const view = render(<AiInterviewGenerationModal {...props} ready selected={['G1']} />)
    expect(screen.getByText(question.from)).toBeInTheDocument()
    expect(screen.getByText('1개 선택')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('G1 질문 선택'))
    expect(props.onToggle).toHaveBeenCalledWith('G1', false)
    fireEvent.click(screen.getByRole('button', { name: '선택한 질문 추가' }))
    expect(props.onAdd).toHaveBeenCalled()
    view.rerender(<AiInterviewGenerationModal {...props} ready selected={['G1']} saving />)
    expect(screen.getByRole('button', { name: '질문 추가 중...' })).toBeDisabled()
    expect(screen.getByLabelText('G1 질문 선택')).toBeDisabled()
  })

  it('생성 실패는 모달 안에 표시하고 재시도하며 빈 결과에도 다시 생성할 수 있다', () => {
    const view = render(<AiInterviewGenerationModal {...props} error="AI 요청 한도를 초과했습니다." />)
    expect(screen.getByRole('alert')).toHaveTextContent('AI 요청 한도를 초과했습니다.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(props.onRetry).toHaveBeenCalled()
    view.rerender(<AiInterviewGenerationModal {...props} ready questions={[]} />)
    expect(screen.getByText(/새로 추가할 질문이 없습니다/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 생성' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '선택한 질문 추가' })).toBeDisabled()
  })
})
