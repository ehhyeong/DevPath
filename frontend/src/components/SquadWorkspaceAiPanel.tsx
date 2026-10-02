import AiAssistantPanel, { type AiAnswer, type AiHistoryMessage } from './AiAssistantPanel'
import { projectApiRequest } from '../features/project/api'
import { parseMermaidCode } from '../features/squad/erd-support'
import { readWorkspaceIdFromLocation } from '../lib/location-state'
import { WORKSPACE_DATA_CHANGED_EVENT } from '../lib/workspace-events'

/** 서버가 검증해 돌려준 변경 제안. 실행할 때 그대로 돌려보내고, 서버가 다시 검증한다. */
type WorkspaceAiAction = {
  type: string
  summary: string
  content?: string | null
  schemaJson?: string | null
  [field: string]: unknown
}

/** 스쿼드 워크스페이스 공용 AI 패널. 대시보드·현황판·일정·자료실·ERD·코드 피드백이 같은 문구를 쓴다. */
export default function SquadWorkspaceAiPanel() {
  async function executeActions(workspaceId: number, actions: WorkspaceAiAction[]): Promise<string> {
    // ERD 화면은 편집기를 schemaJson으로, 다이어그램을 mermaid로 그리므로 둘을 함께 저장해 어긋나지 않게 한다.
    const payload = actions.map((action) =>
      action.type === 'ERD_UPDATE' && action.content
        ? { ...action, schemaJson: JSON.stringify(parseMermaidCode(action.content)) }
        : action,
    )
    const data = await projectApiRequest<{ results: string[] }>(
      `/api/workspaces/${workspaceId}/ai-assist/actions`,
      { method: 'POST', body: JSON.stringify({ actions: payload }) },
      'required',
    )

    window.dispatchEvent(new CustomEvent(WORKSPACE_DATA_CHANGED_EVENT))
    return ['변경을 반영했습니다.', ...data.results.map((result) => `- ${result}`)].join('\n')
  }

  async function handleAsk(question: string, history: AiHistoryMessage[]): Promise<AiAnswer> {
    const workspaceId = readWorkspaceIdFromLocation()

    if (workspaceId == null) {
      return { text: '워크스페이스 정보를 찾을 수 없습니다. 워크스페이스를 다시 열어 주세요.' }
    }

    const data = await projectApiRequest<{ answer: string; actions: WorkspaceAiAction[] }>(
      `/api/workspaces/${workspaceId}/ai-assist`,
      { method: 'POST', body: JSON.stringify({ question, history }) },
      'required',
    )
    const actions = data.actions ?? []

    if (actions.length === 0) {
      return { text: data.answer }
    }

    return {
      text: [data.answer, '', '[실행할 변경]', ...actions.map((action) => `- ${action.summary}`)].join('\n'),
      action: {
        label: `변경 ${actions.length}건 실행`,
        icon: 'fa-play',
        doneLabel: '실행 완료',
        run: () => executeActions(workspaceId, actions),
      },
    }
  }

  return (
    <AiAssistantPanel
      fabLabel="AI 에이전트"
      panelTitle="DevPath AI · 워크스페이스"
      greeting="스쿼드 진행 상황, 일정, 자료, 리뷰에 대해 물어보거나 작업·일정·회의록 등록을 맡겨 보세요."
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