import type { AdminAccount, AdminAccountLog, AdminUserPermission } from '../../types/admin'
import { renderAdminMarkup } from './admin-react-renderer'
import { accountStatusLabel } from './admin-moderation-support'
import { escapeHtml, formatDateTime, roleLabel } from './admin-dashboard-support'

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id)
  if (!element) throw new Error(`${id} element was not found`)
  return element as T
}

function instructorStatusLabel(status: string | null) {
  switch ((status ?? '').toUpperCase()) {
    case 'PENDING': return '승인 대기'
    case 'APPROVED': return '승인 완료'
    case 'REJECTED': return '승인 거절'
    default: return '해당 없음'
  }
}

function accountLogTypeLabel(type: string) {
  switch (type.toUpperCase()) {
    case 'RESTRICT': return '계정 제한'
    case 'DEACTIVATE': return '계정 비활성화'
    case 'RESTORE': return '계정 복구'
    case 'WITHDRAW': return '탈퇴 처리'
    case 'APPROVE_INSTRUCTOR': return '강사 승인'
    default: return type
  }
}

function renderAccountLogs(logs: AdminAccountLog[]) {
  if (!logs.length) {
    return '<div class="admin-account-log-empty"><i class="fas fa-clock-rotate-left"></i><span>관리자 처리 이력이 없습니다.</span></div>'
  }

  return logs.map((log) => `
    <article class="admin-account-log-item">
      <span class="admin-account-log-icon"><i class="fas fa-shield-halved"></i></span>
      <div class="admin-account-log-content">
        <div><strong>${escapeHtml(accountLogTypeLabel(log.logType))}</strong><time>${escapeHtml(formatDateTime(log.processedAt))}</time></div>
        <p>${escapeHtml(log.reason || '처리 사유 없음')}</p>
        <small>처리 관리자 #${escapeHtml(log.adminId ?? '-')}</small>
      </div>
    </article>
  `).join('')
}

export function openAccountDetailModal(
  account: AdminAccount,
  logs: AdminAccountLog[],
  permission: AdminUserPermission,
) {
  const modal = getElement('accountDetailModal')
  getElement('accountDetailModalTitle').textContent = `${account.nickname} 회원 상세`
  getElement('accountDetailModalDescription').textContent = `회원 ID #${account.userId} · ${account.email}`

  renderAdminMarkup(getElement('accountDetailModalBody'), `
    <section class="admin-account-summary-card">
      <div class="admin-account-summary-avatar">${escapeHtml(account.nickname.slice(0, 1).toUpperCase())}</div>
      <div>
        <h4>${escapeHtml(account.nickname)}</h4>
        <p>${escapeHtml(account.email)}</p>
      </div>
      <span class="admin-account-summary-status">${escapeHtml(accountStatusLabel(account.accountStatus))}</span>
    </section>
    <dl class="admin-account-detail-grid">
      <div><dt>회원 ID</dt><dd>#${escapeHtml(account.userId)}</dd></div>
      <div><dt>권한</dt><dd>${escapeHtml(roleLabel(account.role))}</dd></div>
      <div><dt>적용 Role</dt><dd>${escapeHtml(permission.roles.map(roleLabel).join(', ') || '없음')}</dd></div>
      <div><dt>관리자 Role</dt><dd>${escapeHtml(permission.superAdmin && !permission.adminRoleName ? '최고 관리자' : permission.adminRoleName || '미배정')}</dd></div>
      <div><dt>세부 권한</dt><dd>${escapeHtml(permission.superAdmin && !permission.adminRoleName ? '전체 관리자 권한' : permission.permissionCodes.join(', ') || '권한 없음')}</dd></div>
      <div><dt>강사 승인</dt><dd>${escapeHtml(instructorStatusLabel(account.instructorStatus))}</dd></div>
      <div><dt>강사 등급</dt><dd>${escapeHtml(account.instructorGrade || '미지정')}</dd></div>
      <div><dt>가입일</dt><dd>${escapeHtml(formatDateTime(account.createdAt))}</dd></div>
      <div><dt>최근 로그인</dt><dd>${escapeHtml(formatDateTime(account.lastLoginAt))}</dd></div>
    </dl>
    <section class="admin-account-log-section">
      <header><h4>관리자 처리 이력</h4><span>${logs.length}건</span></header>
      <div class="admin-account-log-list">${renderAccountLogs(logs)}</div>
    </section>
  `)

  modal.classList.add('active')
  modal.setAttribute('aria-hidden', 'false')
  document.body.classList.add('devpath-modal-open')
}

export function closeAccountDetailModal() {
  const modal = getElement('accountDetailModal')
  modal.classList.remove('active')
  modal.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('devpath-modal-open')
}

export function installAccountDetailModalBindings() {
  const modal = getElement('accountDetailModal')
  getElement<HTMLButtonElement>('accountDetailModalClose').addEventListener('click', closeAccountDetailModal)
  getElement<HTMLButtonElement>('accountDetailModalCloseIcon').addEventListener('click', closeAccountDetailModal)
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeAccountDetailModal()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('active')) closeAccountDetailModal()
  })
}
