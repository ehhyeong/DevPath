export default function AdminUsersView() {
  return (
    <div id="view-users" className="view-section hidden space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-800">
            {"플랫폼 계정 목록"}
          </h3>
        </div>
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="admin-filter-bar flex-1">
              <label className="admin-filter-search relative block">
                <i className="fas fa-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400"></i>
                <input id="accountFilterInput" className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" type="text" placeholder="이메일 또는 이름으로 필터" />
              </label>
              <select id="accountRoleFilter" className="admin-filter-control-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 권한"}
                </option>
                <option value="ROLE_ADMIN">
                  {"관리자"}
                </option>
                <option value="ROLE_INSTRUCTOR">
                  {"강사"}
                </option>
                <option value="ROLE_LEARNER">
                  {"학습자"}
                </option>
              </select>
              <select id="accountStatusFilter" className="admin-filter-control-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 상태"}
                </option>
                <option value="ACTIVE">
                  {"활성"}
                </option>
                <option value="RESTRICTED">
                  {"제한"}
                </option>
                <option value="INACTIVE">
                  {"비활성"}
                </option>
              </select>
            </div>
            <div id="accountFilterSummary" className="text-xs font-medium text-slate-500">
              {"전체 0개"}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"ID"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"계정"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"이름"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"권한"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"상태"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-right text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"관리"}
                </th>
              </tr>
            </thead>
            <tbody id="accountTableBody" className="bg-white text-sm"></tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
