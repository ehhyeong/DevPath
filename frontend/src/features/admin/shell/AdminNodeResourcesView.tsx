export default function AdminNodeResourcesView() {
  return (
    <div id="view-node-resources" className="admin-operations-view view-section hidden">
      <div className="admin-editor-list-layout admin-editor-list-layout-wide">
        <form id="nodeResourceForm" className="admin-panel admin-sticky-editor" noValidate>
          <header className="admin-panel-header admin-panel-header-compact">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon bg-teal-50 text-teal-600">
                <i className="fas fa-link"></i>
              </span>
              <div>
                <h3>추천 자료 등록</h3>
                <p>노드 상세에 표시할 무료 학습 자료를 연결합니다.</p>
              </div>
            </div>
          </header>

          <div className="admin-form-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-1">
              <div className="admin-field">
                <label htmlFor="nodeResourceRoadmapSelect">로드맵</label>
                <select id="nodeResourceRoadmapSelect" className="admin-select">
                  <option value="">로드맵을 선택하세요</option>
                </select>
                <div id="nodeResourceRoadmapReadout" className="admin-select-readout">로드맵을 선택하면 전체 이름이 표시됩니다.</div>
              </div>
              <div className="admin-field">
                <label htmlFor="nodeResourceNodeSelect">연결 노드</label>
                <select id="nodeResourceNodeSelect" className="admin-select" disabled>
                  <option value="">로드맵을 먼저 선택하세요</option>
                </select>
                <div id="nodeResourceNodeReadout" className="admin-select-readout">노드를 선택하면 전체 이름이 표시됩니다.</div>
              </div>
            </div>

            <label className="admin-field">
              <span>자료 제목</span>
              <input id="nodeResourceTitleInput" type="text" placeholder="예: Java 공식 튜토리얼" autoComplete="off" />
            </label>
            <label className="admin-field">
              <span>링크 URL</span>
              <input id="nodeResourceUrlInput" type="url" placeholder="https://..." autoComplete="off" />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="admin-field">
                <span>자료 유형</span>
                <select id="nodeResourceSourceTypeInput" className="admin-select">
                  <option value="BLOG">블로그</option>
                  <option value="DOCS">문서</option>
                  <option value="VIDEO">영상</option>
                  <option value="OFFICIAL">공식문서</option>
                  <option value="COURSE">강의</option>
                  <option value="OTHER">기타</option>
                </select>
              </label>
              <label className="admin-field">
                <span>정렬 순서</span>
                <input id="nodeResourceSortOrderInput" type="number" min="0" placeholder="0" />
              </label>
            </div>
            <label className="admin-field">
              <span>간단한 설명</span>
              <textarea id="nodeResourceDescriptionInput" className="min-h-24 resize-y" placeholder="추천 이유나 학습 포인트를 입력하세요."></textarea>
            </label>
            <label className="admin-check-field">
              <input id="nodeResourceActiveInput" type="checkbox" defaultChecked />
              <span>
                <strong>로드맵 상세에 노출</strong>
                <small>비활성화하면 관리자 목록에만 보관됩니다.</small>
              </span>
            </label>
          </div>

          <footer className="admin-form-footer">
            <button id="nodeResourceCancelEdit" className="admin-secondary-action hidden" type="button">편집 취소</button>
            <button id="nodeResourceSaveButton" className="admin-primary-action bg-teal-600 hover:bg-teal-700" type="submit">
              <i className="fas fa-plus"></i>
              자료 등록
            </button>
          </footer>
        </form>

        <section className="admin-panel min-w-0">
          <header className="admin-panel-header">
            <div>
              <h3>등록된 추천 자료</h3>
              <p>로드맵과 노드, 자료 유형, 노출 상태를 기준으로 빠르게 찾을 수 있습니다.</p>
            </div>
            <div id="nodeResourceSummary" className="admin-result-count">전체 0개</div>
          </header>

          <div className="admin-filter-surface admin-filter-surface-stacked">
            <div className="admin-filter-primary-row">
              <label className="admin-search-field">
                <span className="sr-only">추천 자료 검색</span>
                <i className="fas fa-search"></i>
                <input id="nodeResourceFilterInput" type="text" placeholder="로드맵, 노드, 자료 제목 또는 URL 검색" />
              </label>
              <button id="nodeResourceFilterReset" className="admin-secondary-action" type="button">
                <i className="fas fa-undo-alt"></i>
                필터 초기화
              </button>
            </div>
            <div className="admin-filter-grid admin-filter-grid-four">
              <label className="admin-filter-field">
                <span>로드맵</span>
                <select id="nodeResourceRoadmapFilter" className="admin-select"><option value="">전체 로드맵</option></select>
              </label>
              <label className="admin-filter-field">
                <span>노드</span>
                <select id="nodeResourceNodeFilter" className="admin-select"><option value="">전체 노드</option></select>
              </label>
              <label className="admin-filter-field">
                <span>자료 유형</span>
                <select id="nodeResourceSourceFilter" className="admin-select">
                  <option value="">전체 유형</option>
                  <option value="BLOG">블로그</option>
                  <option value="DOCS">문서</option>
                  <option value="VIDEO">영상</option>
                  <option value="OFFICIAL">공식문서</option>
                  <option value="COURSE">강의</option>
                  <option value="OTHER">기타</option>
                </select>
              </label>
              <label className="admin-filter-field">
                <span>노출 상태</span>
                <select id="nodeResourceStatusFilter" className="admin-select">
                  <option value="">전체 상태</option>
                  <option value="ACTIVE">노출</option>
                  <option value="INACTIVE">비노출</option>
                </select>
              </label>
            </div>
            <div id="nodeResourceFilterReadout" className="admin-filter-readout">전체 추천 자료를 보고 있습니다.</div>
          </div>

          <div className="admin-table-scroll admin-table-scroll-tall">
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
                  <th>자료 ID</th>
                  <th>노드</th>
                  <th>자료</th>
                  <th>상태</th>
                  <th className="text-right">관리</th>
                </tr>
              </thead>
              <tbody id="nodeResourceTableBody" className="bg-white"></tbody>
            </table>
          </div>
          <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span id="nodeResourcePageSummary" className="text-xs font-semibold text-slate-500">1 / 1 페이지</span>
            <div className="flex gap-2">
              <button id="nodeResourcePagePrevious" className="admin-secondary-action" type="button">이전</button>
              <button id="nodeResourcePageNext" className="admin-secondary-action" type="button">다음</button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
