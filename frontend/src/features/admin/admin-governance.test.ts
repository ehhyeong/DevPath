import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '../../lib/admin-api'
import { fetchAdminGovernance } from './admin-governance'

vi.mock('../../lib/admin-api', () => ({
  adminApi: {
    getSystemPolicies: vi.fn(),
    getCourseNodeMappingCandidates: vi.fn(),
  },
}))

function renderFixture() {
  document.body.innerHTML = `
    <input id="policyPlatformFeeRate" />
    <input id="policyRefundDays" />
    <input id="policyMaxCoursePrice" />
    <input id="policyHlsEnabled" type="checkbox" />
    <select id="policyMaxResolution"><option>1080p</option><option>1440p</option></select>
    <input id="policyWatermarkEnabled" type="checkbox" />
    <div id="mappingFilterSummary"></div>
    <table><tbody id="courseNodeMappingTableBody"></tbody></table>
  `
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('admin governance view data', () => {
  it('loads persisted policies and renders actionable mapping recommendations', async () => {
    renderFixture()
    vi.mocked(adminApi.getSystemPolicies).mockResolvedValue({
      platformFeeRate: 18,
      refundPolicyDays: 14,
      maxCoursePrice: 450000,
      hlsEnabled: true,
      maxResolution: '1440p',
      watermarkEnabled: false,
      updatedAt: '2026-08-11T18:00:00',
    })
    vi.mocked(adminApi.getCourseNodeMappingCandidates).mockResolvedValue([{
      courseId: 7,
      courseTitle: 'Spring Security',
      courseTags: ['Spring', 'Security'],
      mappedNodeIds: [11],
      suggestedNodeIds: [11, 12],
      tagMatchRate: 75,
      recommendationSource: 'GEMINI',
    }])

    await fetchAdminGovernance()

    expect(document.getElementById('policyPlatformFeeRate')).toHaveValue('18')
    expect(document.getElementById('policyRefundDays')).toHaveValue('14')
    expect(document.getElementById('policyMaxCoursePrice')).toHaveValue('450000')
    expect(document.getElementById('policyHlsEnabled')).toBeChecked()
    expect(document.getElementById('policyWatermarkEnabled')).not.toBeChecked()
    expect(document.getElementById('courseNodeMappingTableBody')).toHaveTextContent('Spring Security')
    expect(document.getElementById('courseNodeMappingTableBody')).toHaveTextContent('Gemini')
    expect(document.getElementById('courseNodeMappingTableBody')).toHaveTextContent('#12')
    expect(document.getElementById('mappingFilterSummary')).toHaveTextContent('전체 1개')
  })
})
