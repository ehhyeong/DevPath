import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '../../../lib/admin-api'
import AdminOperationsView from './AdminOperationsView'

vi.mock('../../../lib/admin-api', () => ({
  adminApi: {
    getAllJobs: vi.fn(), getCompanies: vi.fn(), getLearningMetrics: vi.fn(), getLearningRules: vi.fn(), getAnnualLearningReport: vi.fn(),
    getRecommendationSettings: vi.fn(), getExperimentResults: vi.fn(), getAnalyticsDashboard: vi.fn(), getMarketReport: vi.fn(),
    getNotices: vi.fn(), getRefunds: vi.fn(), getSettlements: vi.fn(),
    createCompany: vi.fn(), createLearningRule: vi.fn(), updateRecommendationSettings: vi.fn(), createExperiment: vi.fn(), createNotice: vi.fn(),
    getRefund: vi.fn(), getSettlementEligibility: vi.fn(), processRefund: vi.fn(), getSettlement: vi.fn(), updateSettlementStatus: vi.fn(),
  },
}))

describe('AdminOperationsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminApi.getAllJobs).mockResolvedValue([])
    vi.mocked(adminApi.getCompanies).mockResolvedValue([])
    vi.mocked(adminApi.getLearningMetrics).mockResolvedValue([])
    vi.mocked(adminApi.getLearningRules).mockResolvedValue([])
    vi.mocked(adminApi.getAnnualLearningReport).mockResolvedValue({ year: 2026 })
    vi.mocked(adminApi.getRecommendationSettings).mockResolvedValue([])
    vi.mocked(adminApi.getExperimentResults).mockResolvedValue([])
    vi.mocked(adminApi.getAnalyticsDashboard).mockResolvedValue({})
    vi.mocked(adminApi.getMarketReport).mockResolvedValue({ totalPostingCount: 0, openPostingCount: 0, closedPostingCount: 0, draftPostingCount: 0, analyzedSkillTagCount: 0, topSkills: [], topJobRoles: [], indicators: [] })
    vi.mocked(adminApi.getNotices).mockResolvedValue([])
    vi.mocked(adminApi.getRefunds).mockResolvedValue([])
    vi.mocked(adminApi.getSettlements).mockResolvedValue([])
    vi.mocked(adminApi.createCompany).mockResolvedValue({} as never)
    vi.mocked(adminApi.createLearningRule).mockResolvedValue({} as never)
    vi.mocked(adminApi.updateRecommendationSettings).mockResolvedValue([])
    vi.mocked(adminApi.createExperiment).mockResolvedValue({} as never)
    vi.mocked(adminApi.createNotice).mockResolvedValue({} as never)
  })

  it('loads and exposes every administrator operations panel', async () => {
    render(<AdminOperationsView />)
    window.dispatchEvent(new CustomEvent('devpath:admin-tab-change', { detail: 'operations' }))
    await waitFor(() => expect(adminApi.getAllJobs).toHaveBeenCalled())
    expect(document.querySelector('#view-operations')).toHaveClass('admin-operations-view')
    expect(screen.getByRole('button', { name: /채용·기업/ })).toHaveClass('admin-operation-tab', 'is-active')
    expect(screen.getByText('외부 채용 수집')).toBeInTheDocument()
    expect(screen.getByText('기업 인증과 보관')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /학습 운영/ }))
    await waitFor(() => expect(adminApi.getLearningRules).toHaveBeenCalled())
    expect(screen.getByText('학습 자동화 규칙')).toBeInTheDocument()
    expect(screen.getByLabelText('리포트 조회 연도')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /추천·분석/ }))
    await waitFor(() => expect(adminApi.getExperimentResults).toHaveBeenCalled())
    expect(screen.getByText('추천 알고리즘 설정')).toBeInTheDocument()
    expect(screen.getByText('A/B 실험 수명주기')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /플랫폼 공지/ }))
    await waitFor(() => expect(adminApi.getNotices).toHaveBeenCalled())
    expect(screen.getByText('새 플랫폼 공지')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /환불·정산/ }))
    await waitFor(() => expect(adminApi.getRefunds).toHaveBeenCalled())
    expect(screen.getByText('환불 요청')).toBeInTheDocument()
    expect(screen.getByText('정산 관리')).toBeInTheDocument()
  })

  it('shows operational codes in Korean and keeps finance actions on one row', async () => {
    vi.mocked(adminApi.getAllJobs).mockResolvedValue([{ jobId: 1, companyId: 1, companyName: 'DevPath', title: '백엔드 개발자', jobRole: 'Backend', source: 'INTERNAL', status: 'OPEN' }])
    vi.mocked(adminApi.getCompanies).mockResolvedValue([{ companyId: 1, name: 'DevPath', verificationStatus: 'VERIFIED' }])
    vi.mocked(adminApi.getLearningMetrics).mockResolvedValue([{ metricKey: 'clearanceRate', metricName: 'Node clearance rate', metricValue: 81.5, description: 'Percentage of node clearance results that are CLEARED.' }])
    vi.mocked(adminApi.getLearningRules).mockResolvedValue([{ ruleId: 1, ruleKey: 'TAG_MATCH_THRESHOLD', ruleName: 'Tag match threshold', description: 'Defines the minimum required tag coverage for automatic recommendation.', ruleValue: '0.8', priority: 10, status: 'ENABLED' }])
    vi.mocked(adminApi.getAnnualLearningReport).mockResolvedValue({ year: 2026, clearanceRate: 81.5, automationMonitors: [] })
    vi.mocked(adminApi.getRecommendationSettings).mockResolvedValue([{ id: 1, settingKey: 'algorithm.weight.recent_activity', settingValue: '0.8' }])
    vi.mocked(adminApi.getAnalyticsDashboard).mockResolvedValue({ totalUsers: 12, weeklyActiveUsers: 8, averageRoadmapProgress: 54.2, monthlyCompletedAssignments: 3 })
    vi.mocked(adminApi.getMarketReport).mockResolvedValue({ totalPostingCount: 2, openPostingCount: 2, closedPostingCount: 0, draftPostingCount: 0, analyzedSkillTagCount: 1, topSkills: [], topJobRoles: [], indicators: [{ type: 'REGION', label: '서울', postingCount: 2 }] })
    vi.mocked(adminApi.getExperimentResults).mockResolvedValue([{ experimentId: 'EXP-1', experimentName: '추천 개선', hypothesis: '완료율 증가', status: 'RUNNING', metricsJson: '{}' }])
    vi.mocked(adminApi.getRefunds).mockResolvedValue([{ id: 7, learnerId: 2, courseId: 3, instructorId: 4, reason: '단순 변심', status: 'PENDING', refundAmount: 10000 }])
    vi.mocked(adminApi.getSettlements).mockResolvedValue([{ settlementId: 8, instructorId: 4, learnerId: 2, courseId: 3, grossAmount: 10000, feeAmount: 1000, amount: 9000, status: 'HELD' }])

    render(<AdminOperationsView />)
    window.dispatchEvent(new CustomEvent('devpath:admin-tab-change', { detail: 'operations' }))

    expect(await screen.findByText('직접 등록')).toBeInTheDocument()
    expect(screen.getByText('인증 완료')).toBeInTheDocument()
    expect(screen.getByText('공개')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /학습 운영/ }))
    expect(await screen.findAllByText('노드 클리어율')).not.toHaveLength(0)
    expect(screen.getByText('전체 노드 판정 중 클리어된 비율입니다.')).toBeInTheDocument()
    expect(screen.getByText('태그 일치 기준')).toBeInTheDocument()
    expect(screen.getByText('자동 추천에 필요한 최소 태그 충족률을 정합니다.')).toBeInTheDocument()
    expect(screen.getByText('자동화 점검 항목')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /추천·분석/ }))
    expect(await screen.findByText('최근 활동 가중치')).toBeInTheDocument()
    expect(screen.getByText('전체 가입자')).toBeInTheDocument()
    expect(screen.getByText('지역 · 서울 2건')).toBeInTheDocument()
    expect(screen.getByText(/EXP-1 · 진행 중/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /환불·정산/ }))
    const refundReason = await screen.findByText('단순 변심')
    expect(refundReason.closest('table')).toHaveClass('admin-finance-table')
    expect(screen.getByRole('button', { name: '승인' }).parentElement).toHaveClass('admin-finance-actions')
    expect(screen.getByRole('button', { name: '보류 해제' }).parentElement).toHaveClass('admin-finance-actions')
    expect(screen.getAllByText('대기')).not.toHaveLength(0)
    expect(screen.getByText('보류')).toBeInTheDocument()
  })

  it('submits operational changes to each lifecycle API', async () => {
    vi.mocked(adminApi.getRecommendationSettings).mockResolvedValue([{ id: 1, settingKey: 'algorithm.weight.skill_match', settingValue: '0.8' }])
    vi.mocked(adminApi.getRefunds).mockResolvedValue([{ id: 7, learnerId: 2, courseId: 3, instructorId: 4, status: 'PENDING', refundAmount: 10000 }])
    vi.mocked(adminApi.getSettlements).mockResolvedValue([{ settlementId: 8, instructorId: 4, learnerId: 2, courseId: 3, grossAmount: 10000, feeAmount: 1000, amount: 9000, status: 'PENDING' }])
    vi.mocked(adminApi.getRefund).mockResolvedValue({ id: 7, learnerId: 2, courseId: 3, instructorId: 4, status: 'APPROVED', refundAmount: 10000 })
    vi.mocked(adminApi.getSettlementEligibility).mockResolvedValue({ refundRequestId: 7, courseId: 3, learnerId: 2, instructorId: 4, purchasedAt: '2026-08-01', refundDeadline: '2026-08-08', progressPercent: 0, refundAmount: 10000, withinRefundPeriod: true, progressEligible: true, refundApprovable: true, holdBlocked: false, hasPendingSettlement: true, candidateSettlementId: 8, candidateSettlementAmount: 9000, isEligible: true, remainingDays: 3 })
    vi.mocked(adminApi.getSettlement).mockResolvedValue({ settlementId: 8, instructorId: 4, learnerId: 2, courseId: 3, grossAmount: 10000, feeAmount: 1000, amount: 9000, status: 'COMPLETED' })
    vi.spyOn(window, 'prompt').mockReturnValue('검증 사유')

    render(<AdminOperationsView />)
    window.dispatchEvent(new CustomEvent('devpath:admin-tab-change', { detail: 'operations' }))

    fireEvent.change(await screen.findByPlaceholderText('기업명'), { target: { value: 'DevPath Labs' } })
    fireEvent.click(screen.getByRole('button', { name: '기업 저장' }))
    await waitFor(() => expect(adminApi.createCompany).toHaveBeenCalledWith(expect.objectContaining({ name: 'DevPath Labs' })))

    fireEvent.click(screen.getByRole('button', { name: /학습 운영/ }))
    fireEvent.change(await screen.findByPlaceholderText('규칙 코드'), { target: { value: 'TAG_MATCH_THRESHOLD' } })
    fireEvent.change(screen.getByPlaceholderText('규칙 이름'), { target: { value: '태그 기준' } })
    fireEvent.change(screen.getByPlaceholderText('규칙 값'), { target: { value: '0.8' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await waitFor(() => expect(adminApi.createLearningRule).toHaveBeenCalledWith(expect.objectContaining({ ruleKey: 'TAG_MATCH_THRESHOLD', ruleValue: '0.8' })))

    fireEvent.click(screen.getByRole('button', { name: /추천·분석/ }))
    await screen.findByText('추천 알고리즘 설정')
    fireEvent.click(screen.getByRole('button', { name: '전체 저장' }))
    await waitFor(() => expect(adminApi.updateRecommendationSettings).toHaveBeenCalledWith([{ key: 'algorithm.weight.skill_match', value: '0.8' }]))
    fireEvent.change(screen.getByPlaceholderText('실험 ID'), { target: { value: 'EXP-UI' } })
    fireEvent.change(screen.getByPlaceholderText('실험 이름'), { target: { value: '추천 UI' } })
    fireEvent.change(screen.getByPlaceholderText('검증 가설'), { target: { value: '완료율 증가' } })
    fireEvent.click(screen.getByRole('button', { name: '생성' }))
    await waitFor(() => expect(adminApi.createExperiment).toHaveBeenCalledWith({ experimentId: 'EXP-UI', experimentName: '추천 UI', hypothesis: '완료율 증가' }))

    fireEvent.click(screen.getByRole('button', { name: /플랫폼 공지/ }))
    fireEvent.change(await screen.findByPlaceholderText('공지 제목'), { target: { value: '점검 안내' } })
    fireEvent.change(screen.getByPlaceholderText('공지 내용'), { target: { value: '오늘 점검합니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '공지 등록' }))
    await waitFor(() => expect(adminApi.createNotice).toHaveBeenCalledWith({ title: '점검 안내', content: '오늘 점검합니다.', isPinned: false }))

    fireEvent.click(screen.getByRole('button', { name: /환불·정산/ }))
    await screen.findByText('#7')
    fireEvent.click(screen.getByRole('button', { name: '승인' }))
    await waitFor(() => expect(adminApi.processRefund).toHaveBeenCalledWith(7, true, '검증 사유'))
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    await waitFor(() => expect(adminApi.updateSettlementStatus).toHaveBeenCalledWith(8, 'complete', ''))
  })
})
