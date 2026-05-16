import { projectAsideItems, type ProjectAsideKey } from '../project-shell'

export type { ProjectAsideKey }

export type ProjectAsideSquad = {
  id: number | string
  name: string
  colorClass?: string | null
  href?: string | null
}

type ProjectAsideProps = {
  activeKey: ProjectAsideKey
  mySquads?: ProjectAsideSquad[]
}

export default function ProjectAside({ activeKey, mySquads = [] }: ProjectAsideProps) {
  return (
    <aside className="w-20 hover:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out group shadow-xl">
      <a
        href="home.html"
        className="h-20 flex items-center px-5 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 shrink-0"
      >
        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-brand text-xl shrink-0 shadow-md">
          <i className="fas fa-layer-group" />
        </div>
        <div className="sidebar-text flex flex-col">
          <p className="font-bold text-gray-900 text-lg tracking-tight">DevSquad</p>
          <p className="text-[10px] text-gray-400">Team Building</p>
        </div>
      </a>

      <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto overflow-x-hidden">
        <p className="px-4 text-xs font-bold text-gray-400 sidebar-section-title">MENU</p>
        {projectAsideItems.map((item) => (
          <a key={item.key} href={item.href} className={`nav-item${activeKey === item.key ? ' active' : ''}`}>
            <i className={`fas ${item.icon} w-6 text-center text-lg`} />
            <span className="sidebar-text">{item.label}</span>
          </a>
        ))}

        <p className="px-4 text-xs font-bold text-gray-400 sidebar-section-title">MY PROJECTS</p>
        <div id="mySquadList">
          {mySquads.length > 0 ? (
            mySquads.map((squad) => (
              <a key={`${squad.href || 'squad'}-${squad.id}`} href={squad.href || `/squad-dashboard?workspaceId=${encodeURIComponent(squad.id)}`} className="nav-item">
                <span className={`w-2.5 h-2.5 rounded-full ${squad.colorClass || 'bg-blue-500'} shrink-0 mx-2`} />
                <span className="sidebar-text truncate">{squad.name}</span>
              </a>
            ))
          ) : (
            <div className="nav-item opacity-50 cursor-default hover:bg-transparent">
              <i className="fas fa-ghost w-6 text-center text-sm"></i>
              <span className="sidebar-text text-[11px]">참여 중인 프로젝트 없음</span>
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
