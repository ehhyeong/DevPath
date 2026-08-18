import { afterEach, describe, expect, it } from 'vitest'
import type { AdminAccount } from '../../types/admin'
import { closeAccountDetailModal, openAccountDetailModal } from './admin-account-detail'

const account: AdminAccount = {
  userId: 15,
  email: 'instructor@devpath.com',
  nickname: '강사 계정',
  role: 'ROLE_INSTRUCTOR',
  accountStatus: 'RESTRICTED',
  instructorStatus: 'PENDING',
  instructorGrade: 'STANDARD',
  createdAt: '2026-08-10T09:00:00',
  lastLoginAt: '2026-08-11T10:30:00',
}

function renderModalFixture() {
  document.body.innerHTML = `
    <div id="accountDetailModal" aria-hidden="true">
      <h3 id="accountDetailModalTitle"></h3>
      <p id="accountDetailModalDescription"></p>
      <div id="accountDetailModalBody"></div>
    </div>
  `
}

afterEach(() => {
  document.body.innerHTML = ''
  document.body.className = ''
})

describe('account detail modal', () => {
  it('renders the exact account status, instructor approval, and action logs', () => {
    renderModalFixture()

    openAccountDetailModal(account, [{
      logId: 3,
      targetUserId: 15,
      adminId: 1,
      logType: 'RESTRICT',
      reason: '운영 정책 위반',
      processedAt: '2026-08-11T11:00:00',
    }], {
      userId: 15,
      email: account.email,
      roles: ['ROLE_INSTRUCTOR'],
      adminRoleId: null,
      adminRoleName: null,
      permissionCodes: [],
      superAdmin: false,
    })

    expect(document.getElementById('accountDetailModal')).toHaveClass('active')
    expect(document.getElementById('accountDetailModal')).toHaveAttribute('aria-hidden', 'false')
    expect(document.getElementById('accountDetailModalTitle')).toHaveTextContent('강사 계정 회원 상세')
    expect(document.getElementById('accountDetailModalBody')).toHaveTextContent('제한')
    expect(document.getElementById('accountDetailModalBody')).toHaveTextContent('승인 대기')
    expect(document.getElementById('accountDetailModalBody')).toHaveTextContent('강사')
    expect(document.getElementById('accountDetailModalBody')).toHaveTextContent('운영 정책 위반')

    closeAccountDetailModal()
    expect(document.getElementById('accountDetailModal')).not.toHaveClass('active')
    expect(document.getElementById('accountDetailModal')).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows an empty state when the account has no action logs', () => {
    renderModalFixture()

    openAccountDetailModal(account, [], {
      userId: 15,
      email: account.email,
      roles: ['ROLE_INSTRUCTOR'],
      adminRoleId: null,
      adminRoleName: null,
      permissionCodes: [],
      superAdmin: false,
    })

    expect(document.getElementById('accountDetailModalBody')).toHaveTextContent('관리자 처리 이력이 없습니다.')
  })
})
