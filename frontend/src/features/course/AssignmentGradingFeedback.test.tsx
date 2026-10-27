import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AssignmentGradingFeedback from './AssignmentGradingFeedback'

describe('과제 AI 피드백 표시', () => {
  it('줄바꿈 없는 긴 총평도 문장별 문단으로 나눈다', () => {
    render(<AssignmentGradingFeedback content="요구사항 대부분을 충족했습니다. 접근성 보강이 필요합니다. 다음에는 키보드 탐색도 확인해 주세요." />)
    const summary = screen.getByRole('region', { name: '종합 의견' })
    expect(within(summary).getAllByRole('paragraph').map((item) => item.textContent)).toEqual([
      '요구사항 대부분을 충족했습니다.', '접근성 보강이 필요합니다.', '다음에는 키보드 탐색도 확인해 주세요.',
    ])
    expect(screen.queryByRole('region', { name: '채점 항목별 평가' })).not.toBeInTheDocument()
  })

  it('실제 저장 형식의 점수와 여러 줄 의견을 각 평가 항목에 유지한다', () => {
    render(<AssignmentGradingFeedback content={'총평입니다.\r\n- 시맨틱 구조: 23/25점 - header와 main이 확인됩니다. 보조 설명을 연결하세요.\r\n키보드 이동도 확인하세요.\r\n- 반응형 레이아웃: 0/25점 - 모바일 대응이 필요합니다.'} />)
    const semantic = screen.getByRole('article', { name: '시맨틱 구조' })
    expect(within(semantic).getByText('23/25점')).toBeInTheDocument()
    expect(within(semantic).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'header와 main이 확인됩니다.', '보조 설명을 연결하세요.', '키보드 이동도 확인하세요.',
    ])
    const responsive = screen.getByRole('article', { name: '반응형 레이아웃' })
    expect(within(responsive).getByText('0/25점')).toBeInTheDocument()
    expect(within(responsive).getByText('모바일 대응이 필요합니다.')).toBeInTheDocument()
  })

  it('점수 없는 일반 피드백과 URL·버전·HTML 문자를 누락하거나 실행하지 않는다', () => {
    const text = 'Node.js 22.12 환경입니다. https://example.com/v1.2 문서를 참고하세요. <script>alert(1)</script>'
    const { container } = render(<AssignmentGradingFeedback content={text} />)
    expect(screen.getByRole('region', { name: '종합 의견' }).textContent).toContain('Node.js 22.12 환경입니다.')
    expect(screen.getByRole('region', { name: '종합 의견' })).toHaveTextContent('https://example.com/v1.2 문서를 참고하세요.')
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
  })

  it('총평이나 코멘트가 없는 채점 항목도 점수를 표시한다', () => {
    render(<AssignmentGradingFeedback content="- 기능 구현: 30/30점" />)
    expect(screen.queryByRole('region', { name: '종합 의견' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '기능 구현' })).toBeInTheDocument()
    expect(screen.getByText('30/30점')).toBeInTheDocument()
  })
})
