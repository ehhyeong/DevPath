import { describe,expect,it } from 'vitest'
import { buildNetworkStatus,buildSecurityStatus,formatElapsedTime,normalizeVoiceReaction } from './meeting-support'

describe('meeting support', () => {
  it('지원하는 회의 반응만 허용한다', () => {
    expect(normalizeVoiceReaction('👍')).toBe('👍')
    expect(normalizeVoiceReaction('invalid')).toBeNull()
  })

  it('네트워크 지연과 실패를 일관된 상태로 변환한다', () => {
    expect(buildNetworkStatus(30).tone).toBe('good')
    expect(buildNetworkStatus(350).tone).toBe('fair')
    expect(buildNetworkStatus(800).tone).toBe('poor')
    expect(buildNetworkStatus(null, true).tone).toBe('poor')
  })

  it('인증과 멤버 검증을 보안 상태에 반영한다', () => {
    expect(buildSecurityStatus(true, true).tone).toBe('secure')
    expect(buildSecurityStatus(true, false).tone).toBe('checking')
    expect(buildSecurityStatus(false, false).tone).toBe('warning')
  })

  it('회의 경과 시간을 시분초로 표시한다', () => {
    expect(formatElapsedTime('2026-08-08T00:00:00.000Z', Date.parse('2026-08-08T01:02:03.000Z'))).toBe('01:02:03')
  })
})
