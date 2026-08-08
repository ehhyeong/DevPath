export default function AdminNodeResourcesView() {
  return (
    <div id="view-node-resources" className="view-section hidden space-y-4">
      <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
        <form id="nodeResourceForm" className="min-w-0 rounded-lg border border-slate-200/60 bg-white shadow-sm" noValidate>
          <div className="border-b border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-800">
              {"노드 추천 자료 등록"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {"로드맵 노드 상세 패널에 노출할 무료 자료 링크를 관리합니다."}
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="nodeResourceRoadmapSelect" className="mb-1.5 block text-xs font-bold text-slate-500">
                  {"로드맵"}
                </label>
                <select id="nodeResourceRoadmapSelect" className="admin-select w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="">
                    {"로드맵을 선택하세요"}
                  </option>
                </select>
                <div id="nodeResourceRoadmapReadout" className="admin-select-readout mt-2 rounded-md px-3 py-2 text-xs leading-5">
                  {"로드맵을 선택하면 전체 이름이 표시됩니다."}
                </div>
              </div>
              <div>
                <label htmlFor="nodeResourceNodeSelect" className="mb-1.5 block text-xs font-bold text-slate-500">
                  {"연결 노드"}
                </label>
                <select id="nodeResourceNodeSelect" className="admin-select w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100" disabled>
                  <option value="">
                    {"로드맵을 먼저 선택하세요"}
                  </option>
                </select>
                <div id="nodeResourceNodeReadout" className="admin-select-readout mt-2 rounded-md px-3 py-2 text-xs leading-5">
                  {"노드를 선택하면 전체 이름이 표시됩니다."}
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="nodeResourceTitleInput" className="mb-1.5 block text-xs font-bold text-slate-500">
                {"자료 제목"}
              </label>
              <input id="nodeResourceTitleInput" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" type="text" placeholder="예: Java 공식 튜토리얼" autoComplete="off" />
            </div>
            <div>
              <label htmlFor="nodeResourceUrlInput" className="mb-1.5 block text-xs font-bold text-slate-500">
                {"링크 URL"}
              </label>
              <input id="nodeResourceUrlInput" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" type="url" placeholder="https://..." autoComplete="off" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="nodeResourceSourceTypeInput" className="mb-1.5 block text-xs font-bold text-slate-500">
                  {"자료 유형"}
                </label>
                <select id="nodeResourceSourceTypeInput" className="admin-select w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="BLOG">
                    {"블로그"}
                  </option>
                  <option value="DOCS">
                    {"문서"}
                  </option>
                  <option value="VIDEO">
                    {"영상"}
                  </option>
                  <option value="OFFICIAL">
                    {"공식문서"}
                  </option>
                  <option value="COURSE">
                    {"강의"}
                  </option>
                  <option value="OTHER">
                    {"기타"}
                  </option>
                </select>
              </div>
              <div>
                <label htmlFor="nodeResourceSortOrderInput" className="mb-1.5 block text-xs font-bold text-slate-500">
                  {"정렬 순서"}
                </label>
                <input id="nodeResourceSortOrderInput" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" type="number" min="0" placeholder="0" />
              </div>
            </div>
            <div>
              <label htmlFor="nodeResourceDescriptionInput" className="mb-1.5 block text-xs font-bold text-slate-500">
                {"간단한 설명"}
              </label>
              <textarea id="nodeResourceDescriptionInput" className="min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" placeholder="이 자료를 추천하는 이유나 학습 포인트를 적어주세요."></textarea>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              <input id="nodeResourceActiveInput" className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" type="checkbox" defaultChecked />
              {"로드맵 상세에 노출"}
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-5">
            <button id="nodeResourceCancelEdit" className="hidden rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50" type="button">
              {"편집 취소"}
            </button>
            <button id="nodeResourceSaveButton" className="rounded-md bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700" type="submit">
              <i className="fas fa-plus mr-1"></i>
              {"자료 등록"}
            </button>
          </div>
        </form>
        <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200/60 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {"등록된 추천 자료"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {"비활성 자료는 관리자 목록에만 남고 로드맵 상세에는 보이지 않습니다."}
              </p>
            </div>
            <div id="nodeResourceSummary" className="text-xs font-medium text-slate-500">
              {"전체 0개"}
            </div>
          </div>
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                <label className="admin-filter-search relative block">
                  <i className="fas fa-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400"></i>
                  <input id="nodeResourceFilterInput" className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100" type="text" placeholder="로드맵, 노드, 자료 제목, URL로 검색" />
                </label>
                <select id="nodeResourceRoadmapFilter" className="admin-select rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="">
                    {"전체 로드맵"}
                  </option>
                </select>
                <select id="nodeResourceNodeFilter" className="admin-select rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="">
                    {"전체 노드"}
                  </option>
                </select>
                <select id="nodeResourceSourceFilter" className="admin-select rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="">
                    {"전체 유형"}
                  </option>
                  <option value="BLOG">
                    {"블로그"}
                  </option>
                  <option value="DOCS">
                    {"문서"}
                  </option>
                  <option value="VIDEO">
                    {"영상"}
                  </option>
                  <option value="OFFICIAL">
                    {"공식문서"}
                  </option>
                  <option value="COURSE">
                    {"강의"}
                  </option>
                  <option value="OTHER">
                    {"기타"}
                  </option>
                </select>
                <select id="nodeResourceStatusFilter" className="admin-select rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100">
                  <option value="">
                    {"전체 상태"}
                  </option>
                  <option value="ACTIVE">
                    {"노출"}
                  </option>
                  <option value="INACTIVE">
                    {"비노출"}
                  </option>
                </select>
              </div>
              <button id="nodeResourceFilterReset" className="w-fit rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
                {"필터 초기화"}
              </button>
              <div id="nodeResourceFilterReadout" className="admin-select-readout rounded-md px-3 py-2 text-xs leading-5">
                {"전체 추천 자료를 보고 있습니다."}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[22%]" />
                <col className="w-[34%]" />
                <col className="w-[14%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"자료 ID"}
                  </th>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"노드"}
                  </th>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"자료"}
                  </th>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"상태"}
                  </th>
                  <th className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-right text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    {"관리"}
                  </th>
                </tr>
              </thead>
              <tbody id="nodeResourceTableBody" className="bg-white text-sm"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
