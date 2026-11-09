import { describe, expect, it } from 'vitest'
import { findAiReviewLine, parseReviewDiff, reviewFindingPresentation } from './review-diff'
import type { AiReviewComment, CodeReviewFile } from './review-types'

const diff = 'diff --git a/auth.ts b/auth.ts\nindex abc..def 100644\n--- a/auth.ts\n+++ b/auth.ts\n@@ -8,3 +8,4 @@\n const a = 1\n-oldLogin()\n+await login()\n+clearError()\n done()\n@@ -30 +40 @@\n-oldValue\n+newValue\n\\ No newline at end of file\n'
const file: CodeReviewFile = { reviewId: 1, filePath: 'auth.ts', diffText: diff, additions: 3, deletions: 2 }
const finding: AiReviewComment = { commentId: 1, category: '보안', lineNumber: 12, title: '인증 검증', message: '검증 필요', status: 'PENDING' }

describe('코드 리뷰 diff와 지적 위치', () => {
  it('git 메타 헤더를 제외하고 각 hunk의 실제 이전/변경 줄 번호를 유지한다', () => {
    expect(parseReviewDiff(diff).map(({ oldLineNumber, newLineNumber, kind }) => [oldLineNumber, newLineNumber, kind])).toEqual([
      [8, 8, 'context'], [9, null, 'remove'], [null, 9, 'add'], [null, 10, 'add'], [10, 11, 'context'], [30, null, 'remove'], [null, 40, 'add'],
    ])
    expect(parseReviewDiff(diff).every(row => !/^(diff --git|index |--- |\+\+\+ |@@)/.test(row.text))).toBe(true)
  })
  it('헤더 없는 수동 코드·빈 diff·CRLF·++로 시작하는 실제 추가 코드를 처리한다', () => {
    expect(parseReviewDiff('')).toEqual([])
    expect(parseReviewDiff('const a = 1\r\n+const b = 2\r\n')[1]).toMatchObject({ oldLineNumber: null, newLineNumber: 2, kind: 'add' })
    expect(parseReviewDiff('@@ -0,0 +1 @@\n+++ count\n')[0]).toMatchObject({ newLineNumber: 1, text: '+++ count', kind: 'add' })
  })
  it('서버 scope/파일 제목을 포함한 AI 줄 번호를 실제 파일/코드 줄로 연결한다', () => {
    expect(findAiReviewLine([file], file.filePath, finding, 'GEMINI')).toMatchObject({ filePath: 'auth.ts', line: { newLineNumber: 9, rawLineNumber: 8 } })
    const second = { ...file, filePath: 'session.ts', diffText: '@@ -100 +100 @@\n+refresh()' }
    const offset = 4 + diff.split(/\r?\n/).length + 2
    expect(findAiReviewLine([second, file], file.filePath, { ...finding, lineNumber: offset + 2 }, 'RULE_BASED')).toMatchObject({ filePath: 'session.ts', line: { newLineNumber: 100 } })
    expect(findAiReviewLine([file], file.filePath, { ...finding, lineNumber: 9 }, 'GEMINI')).toBeNull()
  })
  it('위치를 확정할 수 없는 다중 파일/없는 행은 연결하지 않는다', () => {
    expect(findAiReviewLine([file, { ...file, filePath: 'other.ts' }], file.filePath, { ...finding, lineNumber: 9 }, 'DEMO')).toBeNull()
    expect(findAiReviewLine([file], file.filePath, { ...finding, lineNumber: 999 }, 'GEMINI')).toBeNull()
    expect(findAiReviewLine([file], file.filePath, { ...finding, lineNumber: 9 }, 'DEMO')).toMatchObject({ line: { newLineNumber: 9 } })
  })
  it('한글 보안/중복 지적도 경고로 구분하고 제안 수락을 해결 완료로 표시하지 않는다', () => {
    expect(reviewFindingPresentation(finding)).toMatchObject({ label: '확인 필요', color: 'text-amber-700' })
    expect(reviewFindingPresentation({ ...finding, category: '안정성', title: '중복 저장 방지' }).icon).toContain('exclamation')
    expect(reviewFindingPresentation({ ...finding, category: 'MAINTAINABILITY', title: '이름 개선' }).label).toBe('개선 제안')
    for (const status of ['PENDING', 'ACCEPTED', 'REJECTED'] as const) expect(reviewFindingPresentation({ ...finding, status }).icon).not.toContain('check')
  })
})
