export type MentoringRecruitmentContent = {
  intro: string
  targetAudience: string
  prerequisites: string
  operationGuide: string
  deliverables: string
}

export const MENTORING_RECRUITMENT_SECTIONS = [
  { key: 'targetAudience', label: '참여 대상', icon: 'fa-user-check', hint: '어떤 경험과 목표를 가진 분에게 적합한가요?', placeholder: '예) 기본 API 구현 경험이 있고, 설계부터 테스트까지 완성해 보고 싶은 분' },
  { key: 'prerequisites', label: '준비 지식', icon: 'fa-book-open', hint: '참여 전에 알고 있어야 할 내용과 준비물을 알려 주세요.', placeholder: '예) Java 기초 문법, REST API 이해, Git 기본 사용법이 필요합니다.' },
  { key: 'operationGuide', label: '진행 및 피드백 방식', icon: 'fa-comments', hint: '정기 모임, 과제 제출, 코드 리뷰와 질문 답변 방식을 적어 주세요.', placeholder: '예) 매주 1회 온라인 리뷰를 진행하고, 모임 전날까지 PR로 과제를 제출합니다. 질문은 워크스페이스에서 받습니다.' },
  { key: 'deliverables', label: '최종 결과물', icon: 'fa-flag-checkered', hint: '종료 시 완성할 결과물과 얻을 수 있는 경험을 구체적으로 적어 주세요.', placeholder: '예) 배포한 API 서버, ERD·API 명세서, 통합 테스트, 성능 개선 기록을 포트폴리오로 정리합니다.' },
] as const

export function parseMentoringRecruitmentContent(content: string | null | undefined): MentoringRecruitmentContent {
  const empty: MentoringRecruitmentContent = { intro: content ?? '', targetAudience: '', prerequisites: '', operationGuide: '', deliverables: '' }
  const headings = new Map<string, Exclude<keyof MentoringRecruitmentContent, 'intro'>>(MENTORING_RECRUITMENT_SECTIONS.map((section) => [`## ${section.label}`, section.key]))
  const parts: Record<keyof MentoringRecruitmentContent, string[]> = { intro: [], targetAudience: [], prerequisites: [], operationGuide: [], deliverables: [] }
  let current: keyof MentoringRecruitmentContent = 'intro'
  let structured = false
  for (const line of (content ?? '').split(/\r?\n/)) {
    const section = headings.get(line.trim())
    if (section) { current = section; structured = true }
    else parts[current].push(line)
  }
  // 기존 자유 형식 모집글은 변환하지 않아 편집 재진입 시 본문이 바뀌지 않게 한다.
  if (!structured || !parts.intro.join('\n').trim()) return empty
  return Object.fromEntries(Object.entries(parts).map(([key, lines]) => [key, lines.join('\n').trim()])) as MentoringRecruitmentContent
}

export function formatMentoringRecruitmentContent(content: MentoringRecruitmentContent) {
  const sections = MENTORING_RECRUITMENT_SECTIONS
    .filter(({ key }) => content[key].trim())
    .map(({ key, label }) => `## ${label}\n${content[key].trim()}`)
  // 상세 정보도 기존 공개 본문에 포함해 저장·수정·학습자 조회가 같은 내용을 사용한다.
  return [content.intro.trim(), ...sections].filter(Boolean).join('\n\n')
}
