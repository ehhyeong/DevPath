export default function AdminSidebar() {
  return (
    <aside className="admin-sidebar z-10 flex w-64 flex-col border-r">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
        <h1 className="admin-sidebar-brand text-xl font-black tracking-tight">
          {"DevPath"}
          <span className="admin-sidebar-badge ml-1 rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-widest uppercase">
            {"Admin"}
          </span>
        </h1>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6" id="admin-nav">
        <div className="admin-nav-section px-4 pb-2 text-[10px] font-bold tracking-widest">
          {"개요"}
        </div>
        <button data-target="dashboard" className="nav-btn admin-nav-btn is-active w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all duration-200" type="button">
          <span className="admin-nav-icon">
            <i className="fas fa-chart-pie"></i>
          </span>
          <span>
            {"대시보드"}
          </span>
        </button>
        <div className="admin-nav-section px-4 pt-6 pb-2 text-[10px] font-bold tracking-widest">
          {"운영"}
        </div>
        <button data-target="tags" className="nav-btn admin-nav-btn w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all duration-200" type="button">
          <span className="admin-nav-icon">
            <i className="fas fa-tags"></i>
          </span>
          <span>
            {"기술 태그 관리"}
          </span>
        </button>
        <div className="admin-nav-section px-4 pt-6 pb-2 text-[10px] font-bold tracking-widest">
          {"학습 로드맵"}
        </div>
        <button data-target="official-roadmaps" className="nav-btn admin-nav-btn w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all duration-200" type="button">
          <span className="admin-nav-icon">
            <i className="fas fa-route"></i>
          </span>
          <span>
            {"로드맵 기본 정보"}
          </span>
        </button>
        <button data-target="roadmaps" className="nav-btn admin-nav-btn w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all duration-200" type="button">
          <span className="admin-nav-icon">
            <i className="fas fa-sitemap"></i>
          </span>
          <span>
            {"마스터 노드"}
          </span>
        </button>
        <button data-target="node-resources" className="nav-btn admin-nav-btn w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all duration-200" type="button">
          <span className="admin-nav-icon">
            <i className="fas fa-link"></i>
          </span>
          <span>
            {"노드 추천 자료"}
          </span>
        </button>
        <button data-target="roadmap-hub" className="nav-btn admin-nav-btn w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all duration-200" type="button">
          <span className="admin-nav-icon">
            <i className="fas fa-map-signs"></i>
          </span>
          <span>
            {"로드맵 허브"}
          </span>
        </button>
        <div className="admin-nav-section px-4 pt-6 pb-2 text-[10px] font-bold tracking-widest">
          {"콘텐츠"}
        </div>
        <button data-target="catalog-menu" className="nav-btn admin-nav-btn w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all duration-200" type="button">
          <span className="admin-nav-icon">
            <i className="fas fa-layer-group"></i>
          </span>
          <span>
            {"강의 메뉴 관리"}
          </span>
        </button>
        <div className="admin-nav-section px-4 pt-6 pb-2 text-[10px] font-bold tracking-widest">
          {"모니터링"}
        </div>
        <button data-target="users" className="nav-btn admin-nav-btn w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all duration-200" type="button">
          <span className="admin-nav-icon">
            <i className="fas fa-users"></i>
          </span>
          <span>
            {"회원 통합 관리"}
          </span>
        </button>
        <button data-target="reports" className="nav-btn admin-nav-btn w-full justify-between rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-all duration-200" type="button">
          <span className="admin-nav-label">
            <span className="admin-nav-icon">
              <i className="fas fa-shield-alt"></i>
            </span>
            <span>
              {"검수 및 신고"}
            </span>
          </span>
          <span id="nav-report-badge" className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
            {"0"}
          </span>
        </button>
      </nav>
      <div className="border-t border-slate-200 p-4">
        <button data-admin-click="logout()" className="admin-logout-button w-full rounded-lg py-2 text-xs font-bold transition-colors" type="button">
          <i className="fas fa-sign-out-alt mr-1"></i>
          {"관리자 로그아웃"}
        </button>
      </div>
    </aside>
  )
}
