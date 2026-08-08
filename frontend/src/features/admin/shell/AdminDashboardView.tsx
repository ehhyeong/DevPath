export default function AdminDashboardView() {
  return (
    <div id="view-dashboard" className="view-section block space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-indigo-50 opacity-50 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 mb-4 flex items-start justify-between">
            <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              {"주간 활성 사용자"}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <i className="fas fa-users text-sm"></i>
            </div>
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black tracking-tight text-slate-800" id="weekly-active-users-value">
                {"0"}
              </div>
              <span id="weekly-active-users-change" className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500">
                {"변화 없음"}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div id="weekly-active-users-progress" className="h-1.5 rounded-full bg-indigo-500" style={{ width: "0%" }}></div>
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-amber-50 opacity-50 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 mb-4 flex items-start justify-between">
            <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              {"강의 검수 대기열"}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <i className="fas fa-video text-sm"></i>
            </div>
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black tracking-tight text-slate-800">
                <span id="pending-course-reviews-value">
                  {"0"}
                </span>
                <span className="ml-1 text-sm font-medium text-slate-400" id="pending-course-reviews-suffix">
                  {"건"}
                </span>
              </div>
              <span id="pending-course-reviews-change" className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500">
                {"검수 대기 없음"}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div id="pending-course-reviews-progress" className="h-1.5 rounded-full bg-amber-400" style={{ width: "0%" }}></div>
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-blue-50 opacity-50 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 mb-4 flex items-start justify-between">
            <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              {"누적 인증서 발급"}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <i className="fas fa-certificate text-sm"></i>
            </div>
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black tracking-tight text-slate-800" id="issued-certificates-value">
                {"0"}
              </div>
              <span id="issued-certificates-change" className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500">
                {"이번 주 발급 없음"}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div id="issued-certificates-progress" className="h-1.5 rounded-full bg-blue-500" style={{ width: "0%" }}></div>
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-rose-50 opacity-50 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 mb-4 flex items-start justify-between">
            <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              {"미처리 신고 내역"}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <i className="fas fa-shield-alt text-sm"></i>
            </div>
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black tracking-tight text-rose-600">
                <span id="pending-reports-value">
                  {"0"}
                </span>
                <span className="ml-1 text-sm font-medium text-slate-400" id="pending-reports-suffix">
                  {"건"}
                </span>
              </div>
              <span id="pending-reports-change" className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500">
                {"대기 신고 없음"}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div id="pending-reports-progress" className="h-1.5 rounded-full bg-rose-500" style={{ width: "0%" }}></div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">
                {"플랫폼 유입 추이"}
              </h3>
            </div>
          </div>
          <div className="chart-container">
            <canvas id="trafficChart"></canvas>
          </div>
        </div>
        <div className="flex flex-col rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="font-bold text-slate-800">
              {"카테고리별 강의 분포"}
            </h3>
          </div>
          <div className="doughnut-container flex flex-1 items-center justify-center">
            <canvas id="categoryChart"></canvas>
          </div>
          <div id="categoryLegend" className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-600"></div>
        </div>
      </div>
    </div>
  )
}
