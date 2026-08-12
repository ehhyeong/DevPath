export default function AdminTagsView() {
  return (
    <div id="view-tags" className="admin-operations-view view-section hidden">
      <section className="admin-panel">
        <header className="admin-panel-header">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-emerald-50 text-emerald-600">
              <i className="fas fa-tags"></i>
            </span>
            <div>
              <h3>기술 태그 데이터베이스</h3>
              <p>검색과 병합을 통해 중복 태그와 표기 방식을 관리합니다.</p>
            </div>
          </div>
          <button data-admin-click="createTag()" className="admin-primary-action bg-emerald-600 hover:bg-emerald-700" type="button">
            <i className="fas fa-plus"></i>
            신규 태그 등록
          </button>
        </header>

        <div className="admin-filter-surface">
          <label className="admin-search-field">
            <span className="sr-only">기술 태그 검색</span>
            <i className="fas fa-search"></i>
            <input id="tagFilterInput" type="text" placeholder="태그명이나 설명을 입력하세요" />
          </label>
          <div id="tagFilterSummary" className="admin-result-count">전체 0개</div>
        </div>

        <div id="tagTableScroll" className="admin-table-scroll admin-table-scroll-tall">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr>
                <th>태그 ID</th>
                <th>태그명</th>
                <th>설명</th>
                <th>상태</th>
                <th className="text-right">관리</th>
              </tr>
            </thead>
            <tbody id="tagTableBody" className="bg-white"></tbody>
          </table>
        </div>
        <footer className="admin-table-footer">
          <span id="tagPageSummary">0개 표시</span>
          <div className="admin-pagination" aria-label="기술 태그 페이지 이동">
            <button id="tagPagePrevious" type="button" disabled><i className="fas fa-chevron-left"></i>이전</button>
            <button id="tagPageNext" type="button" disabled>다음<i className="fas fa-chevron-right"></i></button>
          </div>
        </footer>
      </section>
    </div>
  )
}
