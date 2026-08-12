export default function AdminUsersView() {
  return (
    <div id="view-users" className="admin-operations-view view-section hidden space-y-5">
      <section className="admin-panel">
        <header className="admin-panel-header">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-sky-50 text-sky-600">
              <i className="fas fa-users"></i>
            </span>
            <div>
              <h3>플랫폼 계정</h3>
              <p>이메일과 이름을 검색하고 권한·상태별로 계정을 관리합니다.</p>
            </div>
          </div>
          <div id="accountFilterSummary" className="admin-result-count">전체 0개</div>
        </header>

        <div className="admin-filter-surface">
          <div className="admin-account-filters">
            <label className="admin-search-field admin-filter-field">
              <span>계정 검색</span>
              <i className="fas fa-search"></i>
              <input id="accountFilterInput" type="text" placeholder="이메일 또는 이름을 입력하세요" />
            </label>
            <label className="admin-filter-field">
              <span>권한</span>
              <select id="accountRoleFilter" className="admin-select">
                <option value="">전체 권한</option>
                <option value="ROLE_ADMIN">관리자</option>
                <option value="ROLE_INSTRUCTOR">강사</option>
                <option value="ROLE_LEARNER">학습자</option>
              </select>
            </label>
            <label className="admin-filter-field">
              <span>계정 상태</span>
              <select id="accountStatusFilter" className="admin-select">
                <option value="">전체 상태</option>
                <option value="ACTIVE">활성</option>
                <option value="RESTRICTED">제한</option>
                <option value="DEACTIVATED">비활성</option>
                <option value="WITHDRAWN">탈퇴</option>
              </select>
            </label>
          </div>
        </div>

        <div className="admin-table-scroll admin-table-scroll-tall">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr>
                <th>ID</th>
                <th>계정</th>
                <th>이름</th>
                <th>권한</th>
                <th>상태</th>
                <th>관리 작업</th>
              </tr>
            </thead>
            <tbody id="accountTableBody" className="bg-white"></tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-violet-50 text-violet-600"><i className="fas fa-user-shield"></i></span>
            <div>
              <h3>관리자 Role과 권한 코드</h3>
              <p>운영 역할별 권한 코드 묶음을 등록하고 수정합니다.</p>
            </div>
          </div>
          <button data-admin-click="createAdminRole()" className="admin-primary-action bg-violet-600 hover:bg-violet-700" type="button">
            <i className="fas fa-plus"></i>Role 추가
          </button>
        </header>
        <div className="admin-table-scroll admin-table-scroll-short">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead><tr><th>Role</th><th>설명</th><th>권한 코드</th><th>관리</th></tr></thead>
            <tbody id="adminRoleTableBody" className="bg-white"></tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
