export default function AdminTagsView() {
  return (
    <div id="view-tags" className="view-section hidden space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-800">
            {"전체 태그 데이터베이스"}
          </h3>
          <button data-admin-click="createTag()" className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700" type="button">
            <i className="fas fa-plus mr-1"></i>
            {"신규 태그 등록"}
          </button>
        </div>
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <label className="relative block flex-1">
              <i className="fas fa-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400"></i>
              <input id="tagFilterInput" className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" type="text" placeholder="태그명 또는 설명으로 필터" />
            </label>
            <div id="tagFilterSummary" className="text-xs font-medium text-slate-500">
              {"전체 0개"}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"태그 ID"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"태그명"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"설명"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"상태"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-right text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"관리"}
                </th>
              </tr>
            </thead>
            <tbody id="tagTableBody" className="bg-white text-sm"></tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
