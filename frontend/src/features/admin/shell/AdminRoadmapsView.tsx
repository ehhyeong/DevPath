export default function AdminRoadmapsView() {
  return (
    <div id="view-roadmaps" className="view-section hidden space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-800">
            {"마스터 로드맵 노드"}
          </h3>
          <button data-admin-click="createRoadmapNode()" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
            <i className="fas fa-plus mr-1"></i>
            {"노드 추가"}
          </button>
        </div>
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="admin-filter-bar flex-1">
              <label className="admin-filter-search relative block">
                <i className="fas fa-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400"></i>
                <input id="nodeFilterInput" className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" type="text" placeholder="로드맵명 또는 노드명으로 필터" />
              </label>
              <select id="nodeHubSectionFilter" className="admin-filter-control-lg rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 허브 분류"}
                </option>
              </select>
              <select id="nodeHubItemFilter" className="admin-filter-control-lg rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 허브 항목"}
                </option>
              </select>
              <select id="nodeRoadmapFilter" className="admin-filter-control-lg rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 로드맵"}
                </option>
              </select>
              <select id="nodeTypeFilter" className="admin-filter-control-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 유형"}
                </option>
                <option value="CONCEPT">
                  {"개념"}
                </option>
                <option value="PRACTICE">
                  {"실습"}
                </option>
                <option value="PROJECT">
                  {"프로젝트"}
                </option>
                <option value="REVIEW">
                  {"복습"}
                </option>
                <option value="EXAM">
                  {"평가"}
                </option>
                <option value="QUIZ">
                  {"퀴즈"}
                </option>
                <option value="ASSIGNMENT">
                  {"과제"}
                </option>
              </select>
            </div>
            <div id="nodeFilterSummary" className="text-xs font-medium text-slate-500">
              {"전체 0개"}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
            <div className="mb-2 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
              {"허브 메가 필터"}
            </div>
            <div id="nodeHubQuickFilters" className="flex flex-wrap gap-2"></div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[26%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[10%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"노드 ID"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"노드명"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"로드맵 / 유형"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"구조"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"필수 정보"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-right text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"관리"}
                </th>
              </tr>
            </thead>
            <tbody id="nodeTableBody" className="bg-white text-sm"></tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
