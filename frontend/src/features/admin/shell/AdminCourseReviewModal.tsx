export default function AdminCourseReviewModal() {
  return (
    <div id="courseReviewModal" className="devpath-modal-overlay" aria-hidden="true">
      <div className="devpath-modal-container devpath-modal-container-lg admin-course-review-modal" role="dialog" aria-modal="true" aria-labelledby="courseReviewModalTitle">
        <div className="devpath-modal-form">
          <div className="devpath-modal-header admin-course-review-modal-header">
            <div>
              <h3 id="courseReviewModalTitle" className="devpath-modal-title">강의 검수</h3>
              <p id="courseReviewModalDescription" className="devpath-modal-description">강의 구성과 제출 내용을 확인한 뒤 검수 결정을 내립니다.</p>
            </div>
            <button id="courseReviewModalCloseIcon" className="admin-course-review-modal-close" type="button" aria-label="강의 검수 닫기">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div id="courseReviewModalBody" className="devpath-modal-body admin-course-review-modal-body"></div>
          <div className="devpath-modal-footer admin-course-review-modal-footer">
            <span id="courseReviewModalStatus" className="admin-course-review-status" aria-live="polite"></span>
            <div className="admin-course-review-footer-actions">
              <button id="courseReviewModalClose" className="devpath-btn devpath-btn-cancel" type="button">닫기</button>
              <button id="courseReviewReject" className="devpath-btn admin-course-review-reject" type="button" disabled>반려 확정</button>
              <button id="courseReviewApprove" className="devpath-btn admin-course-review-approve" type="button" disabled>승인 확정</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
