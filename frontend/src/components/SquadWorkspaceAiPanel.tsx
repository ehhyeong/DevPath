import AiAssistantPanel, { type AiAnswer, type AiHistoryMessage } from './AiAssistantPanel'
import { projectApiRequest } from '../features/project/api'
import { readWorkspaceIdFromLocation } from '../lib/location-state'

/** 스쿼드 워크스페이스 공용 AI 패널. 대시보드·현황판·일정·자료실·ERD·코드 피드백이 같은 문구를 쓴다. */
export default function SquadWorkspaceAiPanel() {
  async function handleAsk(question: string, history: AiHistoryMessage[]): Promise<AiAnswer> {
    const workspaceId = readWorkspaceIdFromLocation()

    if (workspaceId == null) {
      return { text: '워크스페이스 정보를 찾을 수 없습니다. 워크스페이스를 다시 열어 주세요.' }
    }

    const data = await projectApiRequest<{ answer: string }>(
      `/api/workspaces/${workspaceId}/ai-assist`,
      { method: 'POST', body: JSON.stringify({ question, history }) },
      'required',
    )

    return { text: data.answer }
  }

  return (
    <AiAssistantPanel
      fabLabel="AI 에이전트"
      panelTitle="DevPath AI · 워크스페이스"
      greeting="스쿼드 진행 상황, 일정, 자료, 리뷰에 대해 자연어로 물어보세요."
      resetGreeting="새 세션입니다. 필요한 스쿼드 작업이나 일정 문의를 입력해 주세요."
      placeholder="예: 이번 주 마감 임박한 작업 알려줘"
      thinkingLabel="워크스페이스 분석 중"
      onAsk={handleAsk}
      suggestions={[
        { label: '마감 일정 요약', prompt: '마감 임박한 긴급 작업 요약해줘' },
        { label: '진행 상황 브리핑', prompt: '현재 스쿼드 진행 상황을 브리핑해줘' },
        { label: '팀원별 업무 조회', prompt: '팀원별로 맡고 있는 작업을 알려줘' },
      ]}
    />
  )
}