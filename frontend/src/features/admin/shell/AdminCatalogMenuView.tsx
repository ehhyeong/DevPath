export default function AdminCatalogMenuView() {
  return (
    <div id="view-catalog-menu" className="admin-operations-view view-section hidden">
      <section className="admin-panel">
        <header className="admin-panel-header admin-panel-header-actions">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-pink-50 text-pink-600">
              <i className="fas fa-layer-group"></i>
            </span>
            <div>
              <h3>강의 탐색 메뉴 구성</h3>
              <p>강의 목록의 상단 카테고리, 메가메뉴, 필터 그룹을 편집합니다.</p>
            </div>
          </div>
          <div className="admin-header-action-area">
            <div id="catalogMenuSummary" className="admin-result-count">카테고리 0개</div>
            <div className="admin-segmented-actions">
              <button data-admin-click="setAllCatalogCategoriesCollapsed(true)" type="button"><i className="fas fa-compress-alt"></i><span>전체 접기</span></button>
              <button data-admin-click="setAllCatalogCategoriesCollapsed(false)" type="button"><i className="fas fa-expand-alt"></i><span>전체 펼치기</span></button>
            </div>
            <button data-admin-click="createCatalogCategory()" className="admin-secondary-action" type="button"><i className="fas fa-plus"></i>카테고리 추가</button>
            <button id="catalogMenuSaveButton" data-admin-click="saveCourseCatalogMenu()" className="admin-primary-action bg-pink-600 hover:bg-pink-700" type="button"><i className="fas fa-save"></i>전체 저장</button>
          </div>
        </header>
        <div className="admin-guidance-banner admin-guidance-banner-amber">
          <i className="fas fa-exclamation-triangle"></i>
          <span><strong>전체 카테고리</strong>의 key는 <code>all</code>로 유지하세요. 연결 key는 강의 목록의 실제 필터로 사용됩니다.</span>
        </div>
        <div id="catalogMenuEditor" className="admin-editor-canvas"></div>
      </section>
    </div>
  )
}
