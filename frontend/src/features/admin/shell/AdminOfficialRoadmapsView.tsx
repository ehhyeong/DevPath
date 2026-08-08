export default function AdminOfficialRoadmapsView() {
  return (
    <div id="view-official-roadmaps" className="view-section hidden space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {"공식 로드맵 관리"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {"노드가 연결될 공식 로드맵을 생성, 수정, 삭제합니다."}
            </p>
          </div>
          <div id="officialRoadmapSummary" className="text-xs font-medium text-slate-500">
            {"전체 0개"}
          </div>
        </div>
        <form id="officialRoadmapForm" className="border-b border-slate-100 bg-slate-50/60 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(300px,1.2fr)_auto] lg:items-start">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">
                {"로드맵 제목"}
              </span>
              <input id="officialRoadmapTitleInput" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" type="text" placeholder="예: Backend Master Roadmap" autoComplete="off" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">
                {"설명"}
              </span>
              <textarea id="officialRoadmapDescriptionInput" className="min-h-[38px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="로드맵 설명을 입력하세요." rows={2}></textarea>
            </label>
            <div className="flex gap-2 lg:pt-6">
              <button id="officialRoadmapSaveButton" className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-bold whitespace-nowrap text-white shadow-sm transition hover:bg-indigo-700" type="submit">
                <i className="fas fa-plus mr-1"></i>
                {"로드맵 생성"}
              </button>
              <button id="officialRoadmapCancelEdit" className="hidden rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold whitespace-nowrap text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
                {"취소"}
              </button>
            </div>
          </div>
        </form>
        <div className="border-b border-slate-100 bg-white px-5 py-4">
          <label className="relative block max-w-xl">
            <i className="fas fa-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400"></i>
            <input id="officialRoadmapFilterInput" className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" type="text" placeholder="로드맵명 또는 설명으로 필터" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[48%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"ID"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"로드맵"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"생성일"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"상태"}
                </th>
                <th className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-right text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {"관리"}
                </th>
              </tr>
            </thead>
            <tbody id="officialRoadmapTableBody" className="bg-white text-sm"></tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
