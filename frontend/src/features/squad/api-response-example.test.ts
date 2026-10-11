import { describe, expect, it } from 'vitest'
import { parseApiResponseExample } from './api-response-example'

describe('API 응답 예시', () => {
  it('미정·JSON 객체·배열·null을 서로 구분한다', () => {
    expect(parseApiResponseExample({ status: ' ', body: '' })).toBeNull()
    expect(parseApiResponseExample({ status: '201', body: '{"id":1}' })).toEqual({ status: 201, body: { id: 1 } })
    expect(parseApiResponseExample({ status: '200', body: '[]' })).toEqual({ status: 200, body: [] })
    expect(parseApiResponseExample({ status: '200', body: 'null' })).toEqual({ status: 200, body: null })
  })
  it.each(['204', '304'])('%s의 본문 없음과 JSON 입력 거부를 검증한다', (status) => {
    expect(parseApiResponseExample({ status, body: '' })).toEqual({ status: Number(status) })
    expect(() => parseApiResponseExample({ status, body: '{}' })).toThrow('본문이 없습니다.')
  })
  it.each(['', '0', '199', '600', '200.5', 'NaN'])('잘못된 상태 %s를 거부한다', (status) => {
    expect(() => parseApiResponseExample({ status, body: '{}' })).toThrow('200~599')
  })
  it.each(['', '{', '{} {}', '{"id":}'])('빈·잘못된 JSON %s를 거부한다', (body) => {
    expect(() => parseApiResponseExample({ status: '200', body })).toThrow()
  })
})
