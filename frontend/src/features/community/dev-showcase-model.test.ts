import { describe, expect, it } from 'vitest'
import { getCommentAuthorName, getShowcaseShort, getShowcaseTeam, getShowcaseTechStack, type ShowcaseSummary } from './dev-showcase-model'

const showcase: ShowcaseSummary = {
  showcaseId: 5, userId: 482, authorName: '정다은', title: 'AI 코드 리뷰 대시보드', category: 'AI',
  techStack: 'Next.js, TypeScript, FastAPI, Gemini API, Redis, PostgreSQL',
  description: 'PR의 변경 내용을 함께 검토하는 도구입니다.\n\n만들게 된 계기\n리뷰 요청을 놓치지 않기 위해 만들었습니다.',
  viewCount: 42, likeCount: 4,
}

describe('쇼케이스 표시 데이터', () => {
  it('게시물과 댓글은 각 작성자의 실제 이름을 표시한다', () => {
    expect(getShowcaseTeam(showcase).name).toBe('정다은')
    expect(getCommentAuthorName({ commentId: 1, userId: 9, authorName: '이서준', content: '리뷰 근거를 바로 확인할 수 있네요.' })).toBe('이서준')
  })

  it('작성자 이름이나 기술 스택이 없는 이전 응답도 표시할 수 있다', () => {
    expect(getShowcaseTeam({ ...showcase, authorName: null }).name).toBe('DevPath 멤버')
    expect(getShowcaseTechStack({ ...showcase, techStack: null })).toEqual(['AI'])
    expect(getShowcaseTechStack({ ...showcase, techStack: ' , ' })).toEqual(['AI'])
  })

  it('요약은 첫 문단을 쓰고 기술 스택은 실제 사용 기술을 표시한다', () => {
    expect(getShowcaseShort(showcase)).toBe('PR의 변경 내용을 함께 검토하는 도구입니다.')
    expect(getShowcaseTechStack(showcase)).toEqual(['Next.js', 'TypeScript', 'FastAPI', 'Gemini API', 'Redis', 'PostgreSQL'])
    expect(showcase.description).toContain('만들게 된 계기')
  })
})
