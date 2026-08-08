export default function AdminCatalogMenuView() {
  return (
    <div id="view-catalog-menu" className="view-section hidden space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {"강의 목록 메뉴 관리"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {"lecture-list 상단 카테고리, 메가메뉴, 태그 필터 구성을 수정합니다."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div id="catalogMenuSummary" className="text-xs font-medium text-slate-500">
              {"카테고리 0개"}
            </div>
            <button data-admin-click="setAllCatalogCategoriesCollapsed(true)" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
              <i className="fas fa-compress-alt mr-1"></i>
              {"전체 접기"}
            </button>
            <button data-admin-click="setAllCatalogCategoriesCollapsed(false)" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
              <i className="fas fa-expand-alt mr-1"></i>
              {"전체 펼치기"}
            </button>
            <button data-admin-click="createCatalogCategory()" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50" type="button">
              <i className="fas fa-plus mr-1"></i>
              {"카테고리 추가"}
            </button>
            <button id="catalogMenuSaveButton" data-admin-click="saveCourseCatalogMenu()" className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700" type="button">
              <i className="fas fa-save mr-1"></i>
              {"전체 저장"}
            </button>
          </div>
        </div>
        <div className="border-b border-slate-100 bg-amber-50/70 px-5 py-3 text-xs leading-5 text-amber-700">
          {"`전체` 카테고리는 key를 `all`로 유지하는 편이 안전합니다. 연결 카테고리 key를 넣으면 전체 탭에서 해당 분류 필터로 동작합니다."}
        </div>
        <div id="catalogMenuEditor" className="space-y-5 bg-slate-50/40 p-5"></div>
      </div>
    </div>
  )
}
