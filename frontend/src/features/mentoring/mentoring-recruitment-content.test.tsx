import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MentoringRecruitmentDetails from './MentoringRecruitmentDetails'
import { formatMentoringRecruitmentContent, parseMentoringRecruitmentContent } from './mentoring-recruitment-content'
import { buildProjectFromForm, createDefaultForm, projectToForm, toMentoringPostPayload, withPostId } from '../../instructor/pages/instructor-mentoring-model'

const details = {
  intro: '쿠폰 발급 API의 동시성 문제를 해결합니다.',
  targetAudience: 'CRUD API를 구현해 본 분',
  prerequisites: 'Java 기초\nGit PR 사용 경험',
  operationGuide: '온라인 리뷰 주 1회\n과제는 PR로 제출합니다.',
  deliverables: '테스트를 포함한 API 서버와 성능 개선 보고서',
}

describe('멘토링 모집 상세 정보', () => {
  it.each(['study', 'team'] as const)('%s 모집의 상세 정보를 저장하고 수정 재진입 시 모두 복원한다', (mode) => {
    const form = { ...createDefaultForm(), ...details, mode, title: '동시성 멘토링', mentorName: '강사', mentorBio: '백엔드 개발자' }
    const project = buildProjectFromForm(form)
    const payload = toMentoringPostPayload(project)
    const saved = withPostId(project, { postId: 99, title: payload.title, content: payload.content, mentoringType: mode })
    expect(projectToForm(saved)).toMatchObject(details)
    expect(payload.content).toContain('## 준비 지식\nJava 기초\nGit PR 사용 경험')
    expect(project.description).toBe(details.intro)
  })

  it.each(['기존 강사의 소개입니다.\r\n\r\n# 기존 제목\r\n리뷰를 함께 진행합니다.', '## 참여 대상\n기존 제목으로 시작하는 자유 본문입니다.'])('기존 자유 본문 %s는 새 항목 없이 수정·저장해도 유지한다', (legacy) => {
    const project = buildProjectFromForm({ ...createDefaultForm(), intro: legacy })
    const form = projectToForm(project)
    expect(form.intro).toBe(legacy)
    expect(form.targetAudience).toBe('')
    expect(toMentoringPostPayload(buildProjectFromForm(form)).content).toBe(legacy)
  })

  it('선택 항목을 비워도 내용을 만들지 않고 입력한 항목만 공개한다', () => {
    const form = { ...createDefaultForm(), intro: '소개', deliverables: '  배포한 서비스  ' }
    expect(formatMentoringRecruitmentContent(form)).toBe('소개\n\n## 최종 결과물\n배포한 서비스')
    render(<MentoringRecruitmentDetails content={formatMentoringRecruitmentContent(form)} />)
    expect(screen.getByRole('heading', { name: '최종 결과물' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '참여 대상' })).not.toBeInTheDocument()
  })

  it('미리보기·학습자 상세에 줄바꿈과 항목을 표시하고 HTML은 실행하지 않는다', () => {
    const content = formatMentoringRecruitmentContent({ ...details, targetAudience: '<img src=x onerror=alert(1)>' })
    const { container } = render(<MentoringRecruitmentDetails content={content} />)
    expect(screen.getAllByRole('heading')).toHaveLength(4)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container).not.toHaveTextContent('##')
    expect(parseMentoringRecruitmentContent(content).operationGuide).toBe(details.operationGuide)
  })
})
