import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AiInterviewReport from './AiInterviewReport'

describe('면접 점수 표', () => {
  it('코드 증명 항목은 실제 작업 상태를 사용하고 연결 없는 질문을 완료로 꾸미지 않는다', () => {
    render(<AiInterviewReport questions={[
      { id: 'Q1', category: '핵심 난제', question: '중복 방지는?', answer: '', keywords: [], level: 3, tasks: ['DP-101'] },
      { id: 'Q2', category: '보안', question: '권한 검증은?', answer: '', keywords: [], level: 2, tasks: ['DP-999'] },
    ]} answers={{}} evidence={{ tasks: [{ id: 'DP-101', title: '신고 저장', status: 'progress' }], apis: [], tables: [] }} />)
    expect(screen.getByText('구현 진행 중 · #DP-101 신고 저장')).toBeInTheDocument()
    expect(screen.getByText('연결된 작업 없음')).toBeInTheDocument()
    expect(screen.queryByText('코드 근거 있음')).not.toBeInTheDocument()
  })

  it('저장된 실제 회차와 점수를 표로 펼치고 닫는다', () => {
    render(<AiInterviewReport questions={[]} answers={{}} sessions={[
      { id: 'session-1', at: '2026-10-06T12:00:00Z', questions: ['동시성'], scores: [82], average: 82 },
      { id: 'session-2', at: '2026-10-06T13:00:00Z', questions: ['인덱스'], scores: [91], average: 91 },
    ]} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '표로 보기' }))
    expect(screen.getByRole('table', { name: '모의 면접 점수 기록' })).toHaveTextContent('82점')
    expect(screen.getByRole('table')).toHaveTextContent('91점')
    fireEvent.click(screen.getByRole('button', { name: '표 닫기' }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('연습 전에는 가짜 점수 행을 표시하지 않는다', () => {
    render(<AiInterviewReport questions={[]} answers={{}} />)
    fireEvent.click(screen.getByRole('button', { name: '표로 보기' }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByText('아직 저장된 점수 기록이 없습니다.')).toHaveLength(2)
  })
})
