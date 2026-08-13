import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PurchasePage from './PurchasePage'

const { requestRefund } = vi.hoisted(() => ({ requestRefund: vi.fn() }))

vi.mock('../../lib/api/learner', () => ({
  enrollmentApi: {
    getMyEnrollments: vi.fn().mockResolvedValue([{
      enrollmentId: 1,
      courseId: 10,
      courseTitle: '실전 강의',
      instructorName: '강사',
      thumbnailUrl: null,
      price: 49000,
      originalPrice: 49000,
      currency: 'KRW',
      hasCertificate: true,
      status: 'ACTIVE',
      progressPercentage: 10,
      enrolledAt: '2026-08-10T10:00:00',
      completedAt: null,
      lastAccessedAt: null,
    }]),
  },
  wishlistApi: { getCourses: vi.fn().mockResolvedValue([]) },
  proofCardApi: { getGallery: vi.fn().mockResolvedValue([]) },
  refundApi: {
    getMine: vi.fn().mockResolvedValue([]),
    requestRefund,
  },
}))

describe('PurchasePage 환불 접수', () => {
  it('구매 내역에서 사유를 입력해 환불을 접수하고 상태를 표시한다', async () => {
    requestRefund.mockResolvedValue({
      id: 20,
      learnerId: 7,
      courseId: 10,
      instructorId: 3,
      reason: '학습 계획 변경',
      status: 'PENDING',
      enrolledAt: '2026-08-10T10:00:00',
      progressPercentSnapshot: 10,
      refundAmount: 49000,
      requestedAt: '2026-08-12T10:00:00',
      processedAt: null,
    })

    render(<PurchasePage />)

    fireEvent.click(await screen.findByRole('button', { name: '환불 요청' }))
    fireEvent.change(screen.getByLabelText('환불 사유'), { target: { value: '학습 계획 변경' } })
    fireEvent.click(screen.getByRole('button', { name: '환불 요청 접수' }))

    await waitFor(() => expect(requestRefund).toHaveBeenCalledWith(10, '학습 계획 변경'))
    expect(await screen.findByText('검토 중')).toBeInTheDocument()
    expect(screen.getByText('환불 요청이 접수되었습니다.')).toBeInTheDocument()
  })
})
