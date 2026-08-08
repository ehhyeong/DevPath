export default function AdminRoadmapHubView() {
  return (
    <div id="view-roadmap-hub" className="view-section hidden space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {"로드맵 허브 관리"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {"roadmap-hub 역할형, 기술형, 링크형 섹션과 연결 공식 로드맵을 수정합니다."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div id="roadmapHubSummary" className="text-xs font-medium text-slate-500">
              {"섹션 0개 · 항목 0개"}
            </div>
            <button data-admin-click="setAllRoadmapHubSectionsCollapsed(true)" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
              <i className="fas fa-compress-alt mr-1"></i>
              {"전체 접기"}
            </button>
            <button data-admin-click="setAllRoadmapHubSectionsCollapsed(false)" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
              <i className="fas fa-expand-alt mr-1"></i>
              {"전체 펼치기"}
            </button>
            <button data-admin-click="createRoadmapHubSection()" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
              <i className="fas fa-plus mr-1"></i>
              {"섹션 추가"}
            </button>
            <button id="roadmapHubSaveButton" data-admin-click="saveRoadmapHubCatalog()" className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700" type="button">
              <i className="fas fa-save mr-1"></i>
              {"전체 저장"}
            </button>
          </div>
        </div>
        <div className="border-b border-slate-100 bg-amber-50/70 px-5 py-3 text-xs leading-5 text-amber-700">
          {"역할형은 카드 그리드, 기술형은 칩 그리드, 프로젝트 아이디어와 베스트 프랙티스는 링크 리스트를 권장합니다."}
        </div>
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex flex-col gap-3">
            <div className="admin-filter-bar flex-1">
              <label className="admin-filter-search relative block">
                <i className="fas fa-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400"></i>
                <input id="roadmapHubFilterInput" className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" type="text" placeholder="제목, 부제, 연결 로드맵으로 필터" />
              </label>
              <select id="roadmapHubSectionFilter" className="admin-filter-control-lg rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 섹션"}
                </option>
              </select>
              <select id="roadmapHubLayoutFilter" className="admin-filter-control-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 레이아웃"}
                </option>
                <option value="CARD_GRID">
                  {"카드 그리드"}
                </option>
                <option value="CHIP_GRID">
                  {"칩 그리드"}
                </option>
                <option value="LINK_LIST">
                  {"링크 리스트"}
                </option>
              </select>
              <select id="roadmapHubStatusFilter" className="admin-filter-control-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 상태"}
                </option>
                <option value="ACTIVE">
                  {"활성"}
                </option>
                <option value="INACTIVE">
                  {"비활성"}
                </option>
              </select>
              <select id="roadmapHubFeaturedFilter" className="admin-filter-control-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 강조"}
                </option>
                <option value="FEATURED">
                  {"강조만"}
                </option>
                <option value="NORMAL">
                  {"일반만"}
                </option>
              </select>
              <select id="roadmapHubLinkedFilter" className="admin-filter-control-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 연결"}
                </option>
                <option value="LINKED">
                  {"로드맵 연결됨"}
                </option>
                <option value="UNLINKED">
                  {"연결 안 됨"}
                </option>
              </select>
              <select id="roadmapHubRoadmapFilter" className="admin-filter-control-lg rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                <option value="">
                  {"전체 연결 로드맵"}
                </option>
              </select>
            </div>
            <div className="admin-filter-actions flex items-center gap-3">
              <div id="roadmapHubFilterSummary" className="text-xs font-medium text-slate-500">
                {"전체 항목 0개"}
              </div>
              <button id="roadmapHubFilterReset" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
                {"초기화"}
              </button>
            </div>
          </div>
        </div>
        <div id="roadmapHubEditor" className="space-y-5 bg-slate-50/40 p-5"></div>
      </div>
    </div>
  )
}
