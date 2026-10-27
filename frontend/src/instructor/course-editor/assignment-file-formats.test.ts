import { describe, expect, it } from 'vitest'
import { parseAssignmentFileFormats, validateAssignmentFileFormats } from './assignment-file-formats'

describe('과제 허용 확장자 설정', () => {
  it('대소문자, 선행 점, 쉼표와 중복을 정리한다', () => {
    expect(parseAssignmentFileFormats('.HTML, pdf, MD, html')).toEqual(['html', 'pdf', 'md'])
  })
  it('실제로 비교할 수 없는 형식과 빈 제한 목록을 거절한다', () => {
    for (const formats of [[], ['text/html'], ['tar.gz'], ['*']]) {
      expect(validateAssignmentFileFormats(formats)).not.toBeNull()
    }
    expect(validateAssignmentFileFormats(['html', 'pdf', 'md'])).toBeNull()
    expect(validateAssignmentFileFormats(Array.from({ length: 30 }, (_, i) => `longformat${i}`))).not.toBeNull()
  })
})
