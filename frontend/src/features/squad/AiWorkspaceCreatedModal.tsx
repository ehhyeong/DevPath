import { navigateTo } from '../../lib/spa-navigation'
import type { WorkspaceAiDesign } from '../project/api'

type Props = {
  design: WorkspaceAiDesign
  onClose: () => void
  workspaceId: number
}

function workspaceHref(path: string, workspaceId: number) {
  return `${path}?workspaceId=${workspaceId}&ai=1`
}

export default function AiWorkspaceCreatedModal({ design, onClose, workspaceId }: Props) {
  const taskCount = design.roadmap.reduce((total, phase) => total + phase.tasks.length, 0)
  const rows = [
    ['fa-columns', '작업 현황판', `로드맵 기반 작업 카드 ${taskCount}개`, '/squad-workspace'],
    ['fa-project-diagram', 'ERD 설계', `AI 추천 스키마 ${design.architecture.entities.length}개 테이블`, '/squad-erd'],
    ['fa-plug', 'API 명세서', `엔드포인트 ${design.apis.length}개`, '/squad-api'],
    ['fa-calendar-alt', '일정 관리', `Phase ${design.roadmap.length}단계 마일스톤 + 작업 마감일`, '/squad-schedule'],
    ['fa-user-tie', '면접 준비', `실무 면접 예상 질문 ${design.interviewQuestions.length}개`, '/squad-interview'],
    ['fa-folder-open', '팀 자료실', 'AI 설계서 문서 5종', '/squad-files'],
  ] as const

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div aria-label="워크스페이스 생성 완료" aria-modal="true" className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl" role="dialog">
        <div className="p-7 pb-5 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-xl text-white shadow-lg shadow-green-200"><i className="fas fa-magic" /></div>
          <h3 className="mb-1 text-xl font-black text-gray-900">워크스페이스가 준비되었습니다</h3>
          <p className="text-sm font-medium text-gray-500">AI 설계서의 내용이 아래 메뉴에 자동으로 배치되었어요.</p>
        </div>

        <div className="space-y-2 px-7 pb-2">
          {rows.map(([icon, title, copy, path]) => (
            <button
              className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-green-200 hover:bg-green-50"
              key={path}
              onClick={() => navigateTo(workspaceHref(path, workspaceId))}
              type="button"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-brand"><i className={`fas ${icon} text-xs`} /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm font-bold text-gray-900">{title}</strong><span className="block text-[11px] text-gray-500">{copy}</span></span>
              <i className="fas fa-chevron-right text-[10px] text-gray-300" />
            </button>
          ))}
        </div>

        <div className="flex gap-2 p-7 pt-5">
          <button className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200" onClick={onClose} type="button">대시보드 보기</button>
          <button className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition hover:bg-black" onClick={() => navigateTo(workspaceHref('/squad-blueprint', workspaceId))} type="button">AI 설계서 열기</button>
        </div>
      </div>
    </div>
  )
}
