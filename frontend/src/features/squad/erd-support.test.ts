import { describe, expect, it } from 'vitest'
import { getErdViewportScale } from './erd-support'

describe('AI ERD 기본 보기 배율', () => {
  it('사용자가 확대한 네 테이블 도면의 읽기 크기를 캔버스에 맞춰 표시한다', () => {
    const scale = getErdViewportScale(743.281, 961.286, 1182, 774)
    expect(scale).toBeGreaterThanOrEqual(0.7)
    expect(961.286 * scale).toBeLessThanOrEqual(774 - 96)
    expect(743.281 * scale).toBeGreaterThan(500)
  })

  it('적은 테이블은 도면의 원래 글자 크기로 표시한다', () => {
    expect(getErdViewportScale(260, 180, 1182, 774)).toBe(1)
  })

  it.each([[3200, 800], [800, 3200]])('큰 도면 %s×%s도 가로·세로 모두 캔버스 안에 맞춘다', (width, height) => {
    const scale = getErdViewportScale(width, height, 1182, 774)
    expect(width * scale).toBeLessThanOrEqual(1182 - 96)
    expect(height * scale).toBeLessThanOrEqual(774 - 96)
    expect(scale).toBe(Math.min((1182 - 96) / width, (774 - 96) / height))
  })

  it('좁은 화면에서도 도면이 잘리지 않도록 배율을 낮춘다', () => {
    const wide = getErdViewportScale(1000, 600, 1400, 900)
    const narrow = getErdViewportScale(1000, 600, 900, 768)
    expect(narrow).toBeLessThan(wide)
    expect(1000 * narrow).toBeLessThanOrEqual(900 - 96)
    expect(getErdViewportScale(1000, 600, 480, 560)).toBe(0.384)
  })
})
