import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MeetingMinutesSummary from './MeetingMinutesSummary'

describe('회의 요약 서식', () => {
  it('기존 일반 문장의 줄바꿈과 빈 줄 문단을 보존한다', () => {
    const { container } = render(<MeetingMinutesSummary summary={'첫 번째 줄\r\n두 번째 줄\r\n\r\n다음 문단'} />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0].textContent).toBe('첫 번째 줄\n두 번째 줄')
    expect(paragraphs[1]).toHaveTextContent('다음 문단')
  })

  it('제목·불릿·번호 목록·강조를 구분하며 마지막 항목까지 보존한다', () => {
    render(<MeetingMinutesSummary summary={'## 주요 논의\n- **화면 리뷰** 완료\n* 접근성 확인\n\n**다음 할 일**\n3. API 점검\n4) 배포 준비\n후속 안내\n• 일정 공유'} />)
    expect(screen.getByRole('heading', { name: '주요 논의' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '다음 할 일' })).toBeVisible()
    expect(screen.getByText('화면 리뷰', { selector: 'strong' })).toBeVisible()
    expect(screen.getAllByRole('list')).toHaveLength(3)
    expect(screen.getAllByRole('list')[1]).toHaveAttribute('start', '3')
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('후속 안내')).toBeVisible()
    expect(screen.getByText('일정 공유')).toBeVisible()
  })

  it('요약에 포함된 HTML을 실행하지 않고 텍스트로 보존한다', () => {
    const { container } = render(<MeetingMinutesSummary summary={'### 확인 필요\n- <img src=x onerror=alert(1)>\n<script>alert(1)</script>'} />)
    expect(container.querySelector('img, script')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible()
    expect(screen.getByText('<script>alert(1)</script>')).toBeVisible()
  })
})
