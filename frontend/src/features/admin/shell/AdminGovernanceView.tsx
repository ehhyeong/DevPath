export default function AdminGovernanceView() {
  return (
    <div id="view-governance" className="admin-operations-view view-section hidden space-y-5">
      <div className="admin-governance-grid">
        <section className="admin-panel">
          <header className="admin-panel-header">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon bg-indigo-50 text-indigo-600"><i className="fas fa-percent"></i></span>
              <div><h3>결제·환불 정책</h3><p>플랫폼 수수료와 환불·가격 상한을 관리합니다.</p></div>
            </div>
          </header>
          <form id="adminSystemPolicyForm" className="admin-policy-form">
            <label className="admin-filter-field"><span>플랫폼 수수료율</span><input id="policyPlatformFeeRate" type="number" min="0" max="100" required /></label>
            <label className="admin-filter-field"><span>환불 가능 기간</span><input id="policyRefundDays" type="number" min="0" max="30" required /></label>
            <label className="admin-filter-field"><span>최대 강의 가격</span><input id="policyMaxCoursePrice" type="number" min="0" required /></label>
            <button className="admin-primary-action" type="submit"><i className="fas fa-save"></i>정책 저장</button>
          </form>
        </section>

        <section className="admin-panel">
          <header className="admin-panel-header">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon bg-cyan-50 text-cyan-600"><i className="fas fa-video"></i></span>
              <div><h3>스트리밍 정책</h3><p>HLS, 최대 해상도와 워터마크를 관리합니다.</p></div>
            </div>
          </header>
          <form id="adminStreamingPolicyForm" className="admin-policy-form">
            <label className="admin-filter-field"><span>최대 해상도</span><select id="policyMaxResolution"><option>480p</option><option>720p</option><option>1080p</option><option>1440p</option><option>2160p</option></select></label>
            <label className="admin-policy-toggle"><input id="policyHlsEnabled" type="checkbox" /><span>HLS 암호화 사용</span></label>
            <label className="admin-policy-toggle"><input id="policyWatermarkEnabled" type="checkbox" /><span>워터마크 사용</span></label>
            <button className="admin-primary-action bg-cyan-600 hover:bg-cyan-700" type="submit"><i className="fas fa-save"></i>스트리밍 저장</button>
          </form>
        </section>
      </div>

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div className="admin-panel-heading">
            <span className="admin-panel-icon bg-fuchsia-50 text-fuchsia-600"><i className="fas fa-wand-magic-sparkles"></i></span>
            <div><h3>강의·로드맵 노드 자동 매핑</h3><p>태그 커버리지 추천을 검토하고 필요한 강의만 AI로 재선정합니다.</p></div>
          </div>
          <div id="mappingFilterSummary" className="admin-result-count">전체 0개</div>
        </header>
        <div className="admin-filter-surface">
          <label className="admin-search-field admin-filter-field">
            <span>강의 검색</span><i className="fas fa-search"></i>
            <input id="mappingFilterInput" type="text" placeholder="강의명, 태그 또는 노드 ID 검색" />
          </label>
        </div>
        <div className="admin-table-scroll admin-table-scroll-tall">
          <table className="w-full min-w-[1080px] border-collapse text-left">
            <thead><tr><th>강의</th><th>강의 태그</th><th>현재 매핑</th><th>추천 결과</th><th>관리</th></tr></thead>
            <tbody id="courseNodeMappingTableBody" className="bg-white"></tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
