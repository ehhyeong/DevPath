import AiAssistantPanel from './AiAssistantPanel'

/** 스쿼드 워크스페이스 공용 AI 패널. 대시보드·현황판·일정·자료실·ERD·코드 피드백이 같은 문구를 쓴다. */
export default function SquadWorkspaceAiPanel({ fabRaised = false }: { fabRaised?: boolean }) {
  return (
    <AiAssistantPanel
      fabLabel="AI 에이전트"
      panelTitle="DevPath AI · 워크스페이스"
      greeting="스쿼드 진행 상황, 일정, 자료, 리뷰에 대해 자연어로 물어보세요."
      resetGreeting="새 세션입니다. 필요한 스쿼드 작업이나 일정 문의를 입력해 주세요."
      placeholder="예: 이번 주 마감 임박한 작업 알려줘"
      thinkingLabel="워크스페이스 분석 중"
      fabRaised={fabRaised}
      suggestions={[
        { label: '마감 일정 요약', prompt: '마감 임박한 긴급 작업 요약해줘' },
        { label: '진행 상황 브리핑', prompt: '현재 스쿼드 진행 상황을 브리핑해줘' },
        { label: '팀원별 업무 조회', prompt: '팀원별로 맡고 있는 작업을 알려줘' },
      ]}
    />
  )
}