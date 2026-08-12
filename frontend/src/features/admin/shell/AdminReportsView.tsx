export default function AdminReportsView() {
  return (
    <div id="view-reports" className="admin-operations-view view-section hidden space-y-5">
      <section className="admin-panel">
        <header className="admin-panel-header admin-review-header">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-amber-50 text-amber-600"><i className="fas fa-video"></i></span>
            <div>
              <h3>신규 강의 검수 대기열</h3>
              <p>제출된 강의 정보를 확인한 뒤 승인하거나 보완을 요청합니다.</p>
            </div>
          </div>
          <span className="admin-priority-label admin-priority-label-amber">검토 필요</span>
        </header>
        <div className="admin-table-scroll admin-table-scroll-short">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead><tr><th>강의 정보</th><th>제출자</th><th className="text-right">검수 결정</th></tr></thead>
            <tbody id="courseTableBody" className="bg-white"></tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <header className="admin-panel-header admin-review-header">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-indigo-50 text-indigo-600"><i className="fas fa-history"></i></span>
            <div><h3>강의 검수 처리 이력</h3><p>승인·반려 사유와 처리 관리자를 최근 순으로 확인합니다.</p></div>
          </div>
        </header>
        <div className="admin-table-scroll admin-table-scroll-short">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead><tr><th>강의</th><th>강사</th><th>결과</th><th>처리 사유</th><th>처리자·일시</th></tr></thead>
            <tbody id="courseReviewHistoryBody" className="bg-white"></tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <header className="admin-panel-header admin-review-header">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-rose-50 text-rose-600"><i className="fas fa-shield-alt"></i></span>
            <div>
              <h3>사용자 신고 접수 내역</h3>
              <p>신고 대상과 사유를 비교해 블라인드 또는 무시 처리를 결정합니다.</p>
            </div>
          </div>
          <div className="admin-header-action-area">
            <span id="reportFilterSummary" className="admin-result-count">전체 0개</span>
            <span className="admin-priority-label admin-priority-label-rose">우선 처리</span>
          </div>
        </header>
        <div className="admin-moderation-stats">
          <div><span>전체 신고</span><strong id="moderationTotalReports">0</strong></div>
          <div><span>처리 대기</span><strong id="moderationPendingReports">0</strong></div>
          <div><span>처리 완료</span><strong id="moderationResolvedReports">0</strong></div>
          <div><span>블라인드</span><strong id="moderationBlindedContents">0</strong></div>
          <div><span>계정 정지</span><strong id="moderationSuspendedUsers">0</strong></div>
        </div>
        <div className="admin-filter-surface">
          <div className="admin-filter-primary-row">
            <div className="admin-report-filter-grid">
              <label className="admin-filter-field admin-report-search-filter">
                <span>신고 검색</span>
                <span className="admin-search-field">
                  <i className="fas fa-search"></i>
                  <input id="reportFilterInput" type="text" placeholder="신고 ID, 대상, 신고자, 사유 검색" autoComplete="off" />
                </span>
              </label>
              <label className="admin-filter-field">
                <span>신고 대상</span>
                <select id="reportTargetFilter">
                  <option value="">전체 신고 대상</option>
                </select>
              </label>
              <label className="admin-filter-field">
                <span>처리 상태</span>
                <select id="reportStatusFilter">
                  <option value="PENDING">처리 대기</option>
                  <option value="RESOLVED">처리 완료</option>
                </select>
              </label>
              <label className="admin-filter-field">
                <span>콘텐츠 조치</span>
                <select id="reportContentFilter">
                  <option value="">전체 연결 상태</option>
                  <option value="LINKED">블라인드 가능</option>
                  <option value="UNLINKED">콘텐츠 없음</option>
                </select>
              </label>
            </div>
            <button id="reportFilterReset" className="admin-secondary-action" type="button">
              <i className="fas fa-rotate-left"></i>
              필터 초기화
            </button>
          </div>
        </div>
        <div className="admin-table-scroll admin-table-scroll-medium">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead><tr><th>신고 대상</th><th>신고 사유</th><th className="text-right">관리</th></tr></thead>
            <tbody id="reportTableBody" className="bg-white"></tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
