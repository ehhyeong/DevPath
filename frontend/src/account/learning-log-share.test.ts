import { describe,expect,it } from 'vitest'
import { buildLearningLogShareUrl,getSharedProofCardId } from './learning-log-share'

describe('learning log share URL', () => {
  it('SPA 경로와 cardId 쿼리로 공유 URL을 만든다', () => {
    expect(buildLearningLogShareUrl('https://devpath.test', 42)).toBe('https://devpath.test/learning-log-gallery?cardId=42')
  })

  it('쿼리와 기존 hash 형식에서 유효한 카드 ID를 읽는다', () => {
    expect(getSharedProofCardId({ search: '?cardId=42', hash: '' })).toBe(42)
    expect(getSharedProofCardId({ search: '', hash: '#17' })).toBe(17)
  })

  it('잘못된 카드 ID는 무시한다', () => {
    expect(getSharedProofCardId({ search: '?cardId=-1', hash: '' })).toBeNull()
    expect(getSharedProofCardId({ search: '?cardId=abc', hash: '' })).toBeNull()
  })
})
