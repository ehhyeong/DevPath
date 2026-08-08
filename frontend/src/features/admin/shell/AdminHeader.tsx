export default function AdminHeader() {
  return (
    <header className="admin-page-header sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800" id="page-title">
          {"플랫폼 실시간 현황"}
        </h2>
        <span className="text-slate-300">
          {"|"}
        </span>
        <p className="text-xs font-medium text-slate-500" id="page-desc">
          {"DevPath 관리자 운영 지표 요약"}
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
          {"System Normal"}
        </span>
        <button data-admin-click="refreshCurrentTab()" className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition hover:text-indigo-600" title="새로고침" type="button">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>
    </header>
  )
}
