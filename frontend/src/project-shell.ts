export type ProjectAsideKey = 'dashboard' | 'lounge' | 'mentoring' | 'workspace' | 'showcase'

export const projectHeaderLinks = [
  { href: '/roadmap-hub', label: '로드맵' },
  { href: '/lecture-list', label: '강의' },
  { href: 'lounge-dashboard.html', label: '프로젝트' },
  { href: '/job-matching', label: '채용분석' },
  { href: 'community-list.html', label: '커뮤니티' },
]

export const projectAsideItems: Array<{
  key: ProjectAsideKey
  href: string
  label: string
  icon: string
}> = [
  { key: 'dashboard', href: 'lounge-dashboard.html', label: '대시보드', icon: 'fa-home' },
  { key: 'lounge', href: 'community-lounge.html', label: '라운지 (팀 찾기)', icon: 'fa-rocket' },
  { key: 'mentoring', href: 'mentoring-hub.html', label: '멘토링 찾기', icon: 'fa-chalkboard-teacher' },
  { key: 'workspace', href: 'workspace-hub.html', label: '워크스페이스', icon: 'fa-laptop-code' },
  { key: 'showcase', href: 'dev-showcase.html', label: '런칭 쇼케이스', icon: 'fa-trophy' },
]

export function createProjectAsideHtml(activeKey: ProjectAsideKey) {
  const menuHtml = projectAsideItems.map((item) => {
    const active = item.key === activeKey ? ' active' : ''

    return `<a href="${item.href}" target="_top" class="nav-item${active}"><i class="fas ${item.icon} w-6 text-center text-lg"></i><span class="sidebar-text">${item.label}</span></a>`
  }).join('')

  return `<aside class="w-20 hover:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out group shadow-xl">
    <div class="h-20 flex items-center px-5 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 shrink-0" onclick="window.top.location.href='/home'">
      <div class="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-brand text-xl shrink-0 shadow-md">
        <i class="fas fa-layer-group"></i>
      </div>
      <div class="sidebar-text flex flex-col">
        <p class="font-bold text-gray-900 text-lg tracking-tight">DevSquad</p>
        <p class="text-[10px] text-gray-400">Team Building</p>
      </div>
    </div>

    <nav class="flex-1 px-3 space-y-2 mt-4 overflow-y-auto overflow-x-hidden">
      <p class="px-4 text-xs font-bold text-gray-400 sidebar-section-title">MENU</p>
      ${menuHtml}

      <p class="px-4 text-xs font-bold text-gray-400 sidebar-section-title">MY PROJECTS</p>
      <div id="mySquadList">
        <div class="nav-item opacity-50 cursor-default hover:bg-transparent">
          <i class="fas fa-ghost w-6 text-center text-sm"></i>
          <span class="sidebar-text text-[11px]">참여 중인 프로젝트 없음</span>
        </div>
      </div>
    </nav>
  </aside>`
}

export function createProjectHeaderHtml(activeHref = 'lounge-dashboard.html') {
  const navHtml = projectHeaderLinks.map((item) => {
    const activeClass = item.href === activeHref ? 'text-brand transition border-b-2 border-brand pb-1' : 'hover:text-brand transition'

    return `<a href="${item.href}" target="_top" class="${activeClass}">${item.label}</a>`
  }).join('')

  return `<header class="h-16 bg-white border-b border-gray-100 flex items-center px-8 sticky top-0 z-30 shrink-0">
      <div class="flex-1"></div>
      <div class="flex items-center gap-10 text-sm font-bold text-gray-500">
        ${navHtml}
      </div>

      <div class="flex-1 flex items-center justify-end gap-2">
        <div class="relative">
          <div class="cursor-pointer p-2.5 rounded-full hover:bg-gray-100 transition relative text-gray-500 hover:text-brand" onclick="toggleMsg()">
            <i class="far fa-envelope text-lg"></i>
            <span id="msgBadge" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white hidden"></span>
          </div>
          <div id="msgPopup" class="hidden absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 text-left flex flex-col">
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 class="font-extrabold text-sm text-gray-900">받은 메시지</h3>
              <span class="text-[11px] text-gray-500 hover:text-brand cursor-pointer font-bold transition" onclick="if (typeof markAllMsgRead === 'function') markAllMsgRead()">모두 읽음</span>
            </div>
            <div id="msgList" class="max-h-[300px] overflow-y-auto custom-scrollbar bg-white"></div>
          </div>
        </div>

        <div class="relative">
          <div class="cursor-pointer p-2.5 rounded-full hover:bg-gray-100 transition relative text-gray-500 hover:text-brand" onclick="toggleNoti()">
            <i class="far fa-bell text-lg"></i>
            <span id="notiBadge" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white hidden"></span>
          </div>
          <div id="notiPopup" class="hidden absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 text-left flex flex-col">
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 class="font-extrabold text-sm text-gray-900">알림</h3>
              <span class="text-[11px] text-gray-500 hover:text-red-500 cursor-pointer font-bold transition" onclick="if (typeof clearNotis === 'function') { clearNotis(); } else if (typeof clearNoti === 'function') { clearNoti(); }">모두 지우기</span>
            </div>
            <div id="notiList" class="max-h-[300px] overflow-y-auto custom-scrollbar bg-white">
              <div class="p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer">
                <p class="text-xs text-gray-800">새 알림이 없습니다.</p>
                <span class="text-[10px] text-gray-400">방금 전</span>
              </div>
            </div>
          </div>
        </div>

        <div class="w-px h-6 bg-gray-200 mx-4"></div>

        <div class="flex items-center gap-2 cursor-pointer">
          <span id="shellUserName" class="text-sm font-bold text-gray-700">게스트</span>
          <img id="shellUserImage" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Guest" class="w-9 h-9 rounded-full border border-gray-200 shadow-sm" />
        </div>
      </div>
    </header>`
}
