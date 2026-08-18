export default function AdminRoadmapsView() {
  return (
    <div id="view-roadmaps" className="admin-operations-view view-section hidden">
      <section className="admin-panel">
        <header className="admin-panel-header admin-panel-header-actions">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-amber-50 text-amber-600">
              <i className="fas fa-sitemap"></i>
            </span>
            <div>
              <h3>마스터 로드맵 노드</h3>
              <p>로드맵별 학습 노드와 연결 구조, 선수 조건, 완료 기준을 관리합니다.</p>
            </div>
          </div>
          <div className="admin-header-action-area">
            <div id="nodeFilterSummary" className="admin-result-count">전체 0개</div>
            <button data-admin-click="createRoadmapNode()" className="admin-primary-action" type="button">
              <i className="fas fa-plus"></i>
              새 노드 추가
            </button>
          </div>
        </header>

        <div className="admin-guidance-banner admin-guidance-banner-amber">
          <i className="fas fa-circle-info"></i>
          <span>노드 수정은 기본 정보, 선수 조건, 기술 태그, 완료 기준으로 나뉩니다. 필요한 항목만 선택해 변경할 수 있습니다.</span>
        </div>

        <div className="admin-filter-surface admin-filter-surface-stacked">
          <div className="admin-node-search-row">
            <label className="admin-search-field">
              <span className="sr-only">마스터 노드 검색</span>
              <i className="fas fa-search"></i>
              <input id="nodeFilterInput" type="text" placeholder="노드명, 설명, 로드맵명으로 검색" autoComplete="off" />
            </label>
            <button id="nodeFilterReset" className="admin-secondary-action" type="button">
              <i className="fas fa-rotate-left"></i>
              필터 초기화
            </button>
          </div>

          <div className="admin-node-filter-grid">
            <label className="admin-filter-field">
              <span>허브 분류</span>
              <select id="nodeHubSectionFilter">
                <option value="">전체 허브 분류</option>
              </select>
            </label>
            <label className="admin-filter-field">
              <span>허브 항목</span>
              <select id="nodeHubItemFilter">
                <option value="">전체 허브 항목</option>
              </select>
            </label>
            <label className="admin-filter-field">
              <span>공식 로드맵</span>
              <select id="nodeRoadmapFilter">
                <option value="">전체 로드맵</option>
              </select>
            </label>
            <label className="admin-filter-field">
              <span>노드 유형</span>
              <select id="nodeTypeFilter">
                <option value="">전체 유형</option>
                <option value="CONCEPT">개념</option>
                <option value="PRACTICE">실습</option>
                <option value="PROJECT">프로젝트</option>
                <option value="REVIEW">복습</option>
                <option value="EXAM">평가</option>
                <option value="QUIZ">퀴즈</option>
                <option value="ASSIGNMENT">과제</option>
              </select>
            </label>
          </div>

          <div className="admin-node-quick-filter-area">
            <div className="admin-node-quick-filter-heading">
              <span><i className="fas fa-bolt"></i> 허브 빠른 필터</span>
              <small>허브 노출 위치를 기준으로 즉시 좁혀봅니다.</small>
            </div>
            <div id="nodeHubQuickFilters" className="admin-node-quick-filters"></div>
          </div>
        </div>

        <div id="nodeTableScroll" className="admin-table-scroll admin-table-scroll-tall admin-node-table-scroll">
          <table className="w-full min-w-[1240px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[23%]" />
              <col className="w-[22%]" />
              <col className="w-[19%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr>
                <th>노드 ID</th>
                <th>노드 정보</th>
                <th>로드맵과 허브 노출</th>
                <th>학습 구조</th>
                <th>완료 조건</th>
                <th className="text-right">관리 작업</th>
              </tr>
            </thead>
            <tbody id="nodeTableBody" className="bg-white"></tbody>
          </table>
        </div>
        <footer className="admin-table-footer">
          <span id="nodePageSummary">0개 표시</span>
          <div className="admin-pagination" aria-label="마스터 노드 페이지 이동">
            <button id="nodePagePrevious" type="button" disabled><i className="fas fa-chevron-left"></i>이전</button>
            <button id="nodePageNext" type="button" disabled>다음<i className="fas fa-chevron-right"></i></button>
          </div>
        </footer>
      </section>
    </div>
  )
}
