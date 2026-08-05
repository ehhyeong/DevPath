import { describe,expect,it } from 'vitest'
import { sanitizeHtml,sanitizeSvg } from './html-sanitizer'

describe('sanitizeHtml', () => {
  it('위험한 스크립트와 이벤트 속성 및 URL을 제거한다', () => {
    const result = sanitizeHtml('<p onclick="alert(1)">안전한 본문</p><script>alert(2)</script><a href="javascript:alert(3)">링크</a>')

    expect(result).toContain('안전한 본문')
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('<script')
    expect(result).not.toContain('javascript:')
  })
})

describe('sanitizeSvg', () => {
  it('SVG의 스크립트 실행 경로를 제거한다', () => {
    const result = sanitizeSvg('<svg><foreignObject><script>alert(1)</script></foreignObject><circle onload="alert(2)" /></svg>')

    expect(result).toContain('<svg')
    expect(result).not.toContain('foreignObject')
    expect(result).not.toContain('<script')
    expect(result).not.toContain('onload')
  })
})
