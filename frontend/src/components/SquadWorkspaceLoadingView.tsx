import type { ReactNode } from 'react'
import SquadWorkspaceAside, { type SquadWorkspaceAsidePage } from './SquadWorkspaceAside'

export default function SquadWorkspaceLoadingView({ activePage, workspaceId, projectName, children }: {
  activePage: SquadWorkspaceAsidePage
  workspaceId: number | null
  projectName?: string
  children?: ReactNode
}) {
  return (
    <div className="squad-dashboard-page flex h-screen overflow-hidden bg-[#F8F9FA] font-['Pretendard',sans-serif] text-gray-800">
      <SquadWorkspaceAside activePage={activePage} workspaceId={workspaceId} projectName={projectName} aiWorkspace />
      <main role="status" className="flex min-w-0 flex-1 items-center justify-center text-sm font-bold text-gray-500">
        워크스페이스를 불러오는 중입니다...
      </main>
      {children}
    </div>
  )
}
