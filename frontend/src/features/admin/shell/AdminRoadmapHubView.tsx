export default function AdminRoadmapHubView() {
  return (
    <div id="view-roadmap-hub" className="admin-operations-view view-section hidden">
      <section className="admin-panel">
        <header className="admin-panel-header admin-panel-header-actions">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-teal-50 text-teal-600">
              <i className="fas fa-map-signs"></i>
            </span>
            <div>
              <h3>로드맵 허브 구성</h3>
              <p>공개 허브의 섹션 순서와 연결 로드맵을 한곳에서 관리합니다.</p>
            </div>
          </div>
          <div className="admin-header-action-area">
            <div id="roadmapHubSummary" className="admin-result-count">섹션 0개 · 항목 0개</div>
            <div className="admin-segmented-actions">
              <button data-admin-click="setAllRoadmapHubSectionsCollapsed(true)" type="button" title="모든 섹션 접기"><i className="fas fa-compress-alt"></i><span>전체 접기</span></button>
              <button data-admin-click="setAllRoadmapHubSectionsCollapsed(false)" type="button" title="모든 섹션 펼치기"><i className="fas fa-expand-alt"></i><span>전체 펼치기</span></button>
            </div>
            <button data-admin-click="createRoadmapHubSection()" className="admin-secondary-action" type="button"><i className="fas fa-plus"></i>섹션 추가</button>
            <button id="roadmapHubSaveButton" data-admin-click="saveRoadmapHubCatalog()" className="admin-primary-action bg-teal-600 hover:bg-teal-700" type="button"><i className="fas fa-save"></i>전체 저장</button>
          </div>
        </header>

        <div className="admin-guidance-banner admin-guidance-banner-teal">
          <i className="fas fa-info-circle"></i>
          <span>역할형은 카드, 기술형은 칩, 프로젝트와 베스트 프랙티스는 링크 목록 레이아웃을 권장합니다.</span>
        </div>

        <div className="admin-filter-surface admin-filter-surface-stacked">
          <div className="admin-hub-primary-filters">
            <label className="admin-search-field admin-filter-field">
              <span>통합 검색</span>
              <i className="fas fa-search"></i>
              <input id="roadmapHubFilterInput" type="text" placeholder="제목, 부제 또는 연결 로드맵 검색" />
            </label>
            <label className="admin-filter-field">
              <span>섹션</span>
              <select id="roadmapHubSectionFilter" className="admin-select"><option value="">전체 섹션</option></select>
            </label>
            <label className="admin-filter-field">
              <span>연결 로드맵</span>
              <select id="roadmapHubRoadmapFilter" className="admin-select"><option value="">전체 연결 로드맵</option></select>
            </label>
          </div>
          <div className="admin-filter-grid admin-filter-grid-four">
            <label className="admin-filter-field">
              <span>레이아웃</span>
              <select id="roadmapHubLayoutFilter" className="admin-select">
                <option value="">전체 레이아웃</option>
                <option value="CARD_GRID">카드 그리드</option>
                <option value="CHIP_GRID">칩 그리드</option>
                <option value="LINK_LIST">링크 리스트</option>
              </select>
            </label>
            <label className="admin-filter-field">
              <span>공개 상태</span>
              <select id="roadmapHubStatusFilter" className="admin-select"><option value="">전체 상태</option><option value="ACTIVE">활성</option><option value="INACTIVE">비활성</option></select>
            </label>
            <label className="admin-filter-field">
              <span>강조 여부</span>
              <select id="roadmapHubFeaturedFilter" className="admin-select"><option value="">전체 강조</option><option value="FEATURED">강조만</option><option value="NORMAL">일반만</option></select>
            </label>
            <label className="admin-filter-field">
              <span>연결 상태</span>
              <select id="roadmapHubLinkedFilter" className="admin-select"><option value="">전체 연결</option><option value="LINKED">로드맵 연결됨</option><option value="UNLINKED">연결 안 됨</option></select>
            </label>
          </div>
          <div className="admin-filter-footer">
            <div id="roadmapHubFilterSummary" className="admin-filter-readout">전체 항목 0개</div>
            <button id="roadmapHubFilterReset" className="admin-text-action" type="button"><i className="fas fa-undo-alt"></i>필터 초기화</button>
          </div>
        </div>

        <div id="roadmapHubEditor" className="admin-editor-canvas"></div>
      </section>
    </div>
  )
}
