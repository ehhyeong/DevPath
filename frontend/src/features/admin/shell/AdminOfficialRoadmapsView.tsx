export default function AdminOfficialRoadmapsView() {
  return (
    <div id="view-official-roadmaps" className="admin-operations-view view-section hidden">
      <div className="admin-editor-list-layout">
        <form id="officialRoadmapForm" className="admin-panel admin-sticky-editor">
          <header className="admin-panel-header admin-panel-header-compact">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon bg-violet-50 text-violet-600">
                <i className="fas fa-route"></i>
              </span>
              <div>
                <h3>로드맵 기본 정보</h3>
                <p>공개 로드맵의 제목과 소개 문구를 등록합니다.</p>
              </div>
            </div>
          </header>

          <div className="admin-form-body">
            <label className="admin-field">
              <span>로드맵 제목</span>
              <input id="officialRoadmapTitleInput" type="text" placeholder="예: Backend Master Roadmap" autoComplete="off" />
            </label>
            <label className="admin-field">
              <span>설명</span>
              <textarea id="officialRoadmapDescriptionInput" className="min-h-32 resize-y" placeholder="로드맵의 학습 목표와 범위를 입력하세요." rows={5}></textarea>
            </label>
          </div>

          <footer className="admin-form-footer">
            <button id="officialRoadmapCancelEdit" className="admin-secondary-action hidden" type="button">취소</button>
            <button id="officialRoadmapSaveButton" className="admin-primary-action bg-violet-600 hover:bg-violet-700" type="submit">
              <i className="fas fa-plus"></i>
              로드맵 생성
            </button>
          </footer>
        </form>

        <section className="admin-panel min-w-0">
          <header className="admin-panel-header">
            <div>
              <h3>등록된 공식 로드맵</h3>
              <p>노드 연결에 사용되는 공식 로드맵을 검색하고 수정합니다.</p>
            </div>
            <div id="officialRoadmapSummary" className="admin-result-count">전체 0개</div>
          </header>
          <div className="admin-filter-surface">
            <label className="admin-search-field">
              <span className="sr-only">공식 로드맵 검색</span>
              <i className="fas fa-search"></i>
              <input id="officialRoadmapFilterInput" type="text" placeholder="로드맵명이나 설명을 입력하세요" />
            </label>
          </div>
          <div className="admin-table-scroll admin-table-scroll-tall">
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
                  <th>ID</th>
                  <th>로드맵</th>
                  <th>생성일</th>
                  <th>상태</th>
                  <th className="text-right">관리</th>
                </tr>
              </thead>
              <tbody id="officialRoadmapTableBody" className="bg-white"></tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
