import { describe, expect, it } from 'vitest'
import { getErdViewportScale, getValidationIssues } from './erd-support'
import type { ErdSchema } from './erd-types'

describe('ERD 한글 설계 검증', () => {
  it('외래 키 연결 경고를 테이블 관계와 한글 안내로 구분한다', () => {
    const schema: ErdSchema = {
      tables: ['MEMBERS', 'ITEMS'].map(name => ({ id: name, name, columns: [{ name: 'id', type: 'bigint', pk: true }] })),
      relationships: [{ id: 'r1', from: 'MEMBERS', to: 'ITEMS', type: '||--o{', label: 'owns' }],
    }
    expect(getValidationIssues(schema)).toEqual([{ target: 'MEMBERS → ITEMS', message: '관계에 연결할 기준 컬럼과 외래 키(FK) 컬럼이 지정되지 않았습니다.' }])
  })

  it('기본 키·중복 이름·없는 테이블/컬럼·다대다 경고를 한글로 제공한다', () => {
    const schema: ErdSchema = {
      tables: [
        { id: 'a', name: 'MEMBERS', columns: [{ name: 'name', type: 'varchar' }, { name: 'name', type: 'varchar' }] },
        { id: 'b', name: 'MEMBERS', columns: [{ name: 'id', type: 'bigint', pk: true }] },
        { id: 'c', name: 'ITEMS', columns: [{ name: 'id', type: 'bigint', pk: true }] },
      ],
      relationships: [
        { id: 'r1', from: 'MISSING', to: 'ITEMS', type: '||--o{', label: '' },
        { id: 'r2', from: 'MEMBERS', to: 'MISSING', type: '||--o{', label: '' },
        { id: 'r3', from: 'MEMBERS', to: 'ITEMS', type: '}o--o{', label: '', fromColumn: 'missing', toColumn: 'missing' },
      ],
    }
    const issues = getValidationIssues(schema)
    expect(issues).toHaveLength(8)
    for (const issue of issues) {
      expect(issue).toHaveProperty('target')
      expect(issue).toHaveProperty('message', expect.stringMatching(/[가-힣]/))
    }
    expect(issues).toContainEqual({ target: 'MEMBERS', message: '행을 구분할 기본 키(PK)가 없습니다.' })
    expect(issues).toContainEqual({ target: 'MEMBERS.name', message: '같은 이름의 컬럼이 중복되어 있습니다.' })
    expect(issues).toContainEqual({ target: 'MEMBERS', message: '같은 이름의 테이블이 중복되어 있습니다.' })
  })

  it('정상 연결은 경고 없이 통과하고 스키마를 변경하지 않는다', () => {
    const schema: ErdSchema = {
      tables: [{ id: 'a', name: 'MEMBERS', columns: [{ name: 'id', type: 'bigint', pk: true }] }, { id: 'b', name: 'ITEMS', columns: [{ name: 'id', type: 'bigint', pk: true }, { name: 'member_id', type: 'bigint', fk: true }] }],
      relationships: [{ id: 'r', from: 'MEMBERS', to: 'ITEMS', fromColumn: 'id', toColumn: 'member_id', type: '||--o{', label: '' }],
    }
    const original = JSON.stringify(schema)
    expect(getValidationIssues(schema)).toEqual([])
    expect(JSON.stringify(schema)).toBe(original)
  })
})

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
