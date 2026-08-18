export default function AdminAccountDetailModal() {
  return (
    <div id="accountDetailModal" className="devpath-modal-overlay" aria-hidden="true">
      <div className="devpath-modal-container devpath-modal-container-lg" role="dialog" aria-modal="true" aria-labelledby="accountDetailModalTitle">
        <div className="devpath-modal-form">
          <div className="devpath-modal-header admin-account-modal-header">
            <div>
              <h3 id="accountDetailModalTitle" className="devpath-modal-title">회원 상세 정보</h3>
              <p id="accountDetailModalDescription" className="devpath-modal-description">계정 정보와 관리자 처리 이력을 확인합니다.</p>
            </div>
            <button id="accountDetailModalCloseIcon" className="admin-account-modal-close" type="button" aria-label="회원 상세 닫기">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div id="accountDetailModalBody" className="devpath-modal-body admin-account-modal-body"></div>
          <div className="devpath-modal-footer">
            <button id="accountDetailModalClose" className="devpath-btn devpath-btn-cancel" type="button">닫기</button>
          </div>
        </div>
      </div>
    </div>
  )
}
