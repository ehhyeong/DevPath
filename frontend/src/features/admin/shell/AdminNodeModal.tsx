export default function AdminNodeModal() {
  return (
    <div id="addNodeModal" className="devpath-modal-overlay" aria-hidden="true">
      <div className="devpath-modal-container devpath-modal-container-lg" role="dialog" aria-modal="true" aria-labelledby="addNodeModalTitle">
        <form id="addNodeForm" className="devpath-modal-form" noValidate>
          <div className="devpath-modal-header">
            <h3 id="addNodeModalTitle" className="devpath-modal-title">
              {"마스터 로드맵 노드 추가"}
            </h3>
            <p id="addNodeModalDescription" className="devpath-modal-description">
              {"공식 로드맵에 연결할 노드 정보를 입력하세요."}
            </p>
          </div>
          <div className="devpath-modal-body">
            <div className="devpath-modal-grid">
              <div className="devpath-input-group">
                <label htmlFor="roadmapIdInput" className="devpath-input-label">
                  {"로드맵"}
                </label>
                <select id="roadmapIdInput" className="devpath-modal-input">
                  <option value="">
                    {"로드맵을 선택해주세요"}
                  </option>
                </select>
              </div>
              <div className="devpath-input-group">
                <label htmlFor="nodeTypeInput" className="devpath-input-label">
                  {"노드 유형"}
                </label>
                <select id="nodeTypeInput" className="devpath-modal-input">
                  <option value="CONCEPT">
                    {"개념"}
                  </option>
                  <option value="PRACTICE">
                    {"실습"}
                  </option>
                  <option value="PROJECT">
                    {"프로젝트"}
                  </option>
                  <option value="REVIEW">
                    {"복습"}
                  </option>
                  <option value="EXAM">
                    {"평가"}
                  </option>
                  <option value="QUIZ">
                    {"퀴즈"}
                  </option>
                  <option value="ASSIGNMENT">
                    {"과제"}
                  </option>
                </select>
              </div>
            </div>
            <div className="devpath-input-group">
              <label htmlFor="nodeTitleInput" className="devpath-input-label">
                {"노드 제목"}
              </label>
              <input type="text" id="nodeTitleInput" className="devpath-modal-input" placeholder="예: JavaScript 기초" autoComplete="off" />
            </div>
            <div className="devpath-input-group">
              <label htmlFor="nodeContentInput" className="devpath-input-label">
                {"노드 설명"}
              </label>
              <textarea id="nodeContentInput" className="devpath-modal-input devpath-modal-textarea" placeholder="비워두면 설명 없음으로 저장됩니다." rows={3}></textarea>
            </div>
            <div className="devpath-modal-grid">
              <div className="devpath-input-group">
                <label htmlFor="sortOrderInput" className="devpath-input-label">
                  {"정렬 순서"}
                </label>
                <input type="number" id="sortOrderInput" className="devpath-modal-input" min="0" placeholder="예: 1" />
              </div>
              <div className="devpath-input-group">
                <label htmlFor="branchGroupInput" className="devpath-input-label">
                  {"분기 그룹"}
                </label>
                <input type="number" id="branchGroupInput" className="devpath-modal-input" min="0" placeholder="기본 흐름이면 비워두세요" />
              </div>
            </div>
            <div className="devpath-input-group devpath-input-group-last">
              <label htmlFor="subTopicsInput" className="devpath-input-label">
                {"서브토픽"}
              </label>
              <input type="text" id="subTopicsInput" className="devpath-modal-input" placeholder="쉼표로 구분해서 입력" autoComplete="off" />
            </div>
          </div>
          <div className="devpath-modal-footer">
            <button id="cancelAddNodeBtn" className="devpath-btn devpath-btn-cancel" type="button">
              {"취소"}
            </button>
            <button id="confirmAddNodeBtn" className="devpath-btn devpath-btn-confirm" type="submit">
              {"추가하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
