import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '../../../lib/admin-api'
import AdminHeader from './AdminHeader'

vi.mock('../../../lib/admin-api', () => ({
  adminApi: { getSystemHealth: vi.fn() },
}))

describe('AdminHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the system and external dependency status in Korean', async () => {
    vi.mocked(adminApi.getSystemHealth).mockResolvedValue({
      status: 'NORMAL',
      database: 'UP',
      checkedAt: '2026-08-12T17:00:00',
      jobkorea: { status: 'CONFIGURED', message: '잡코리아 설정 완료' },
      gemini: { status: 'FALLBACK_ONLY', message: '로컬 폴백 사용' },
      ffmpeg: { status: 'AVAILABLE', message: 'FFmpeg 사용 가능' },
    })

    render(<AdminHeader />)

    expect(await screen.findByText('시스템 정상')).toBeInTheDocument()
    expect(screen.getByText('외부 기능 · 잡코리아 설정됨 · Gemini 폴백 전용 · FFmpeg 사용 가능')).toBeInTheDocument()
  })
})
