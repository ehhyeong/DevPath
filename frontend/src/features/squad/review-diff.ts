import type { AiReviewComment, CodeReviewFile } from './review-types'

export type ReviewDiffLine = {
  rawLineNumber: number
  oldLineNumber: number | null
  newLineNumber: number | null
  kind: 'add' | 'remove' | 'context'
  text: string
}

export function parseReviewDiff(diff: string): ReviewDiffLine[] {
  let oldLine = 1
  let newLine = 1
  let inHunk = false
  const result: ReviewDiffLine[] = []
  const lines = diff.split(/\r?\n/)
  for (const [index, line] of lines.entries()) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
    if (hunk) {
      oldLine = Number(hunk[1])
      newLine = Number(hunk[2])
      inHunk = true
      continue
    }
    if (line.startsWith('diff --git ')) { inHunk = false; continue }
    if (line.startsWith('\\ No newline at end of file')) continue
    if (!inHunk && /^(index |--- |\+\+\+ |new file mode |deleted file mode |old mode |new mode |similarity index |rename from |rename to |Binary files |GIT binary patch)/.test(line)) continue
    if (line === '' && index === lines.length - 1) continue
    const kind = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context'
    result.push({
      rawLineNumber: index + 1,
      oldLineNumber: kind === 'add' ? null : oldLine++,
      newLineNumber: kind === 'remove' ? null : newLine++,
      kind,
      text: line,
    })
  }
  return result
}

export function findAiReviewLine(files: CodeReviewFile[], primaryFilePath: string, comment: AiReviewComment, providerName: string) {
  if (!comment.lineNumber || comment.lineNumber < 1) return null
  const ordered = [...files].sort((a, b) => Number(b.filePath === primaryFilePath) - Number(a.filePath === primaryFilePath))
  // 두 provider는 서버의 scope 3줄 + 파일 제목 + 원본 diff 전체를 입력받아 그 입력의 줄 번호를 반환한다.
  if (/RULE_BASED|GEMINI/i.test(providerName)) {
    let offset = 4
    for (const file of ordered) {
      const line = parseReviewDiff(file.diffText ?? '').find(row => offset + row.rawLineNumber === comment.lineNumber)
      if (line) return { filePath: file.filePath, line }
      offset += (file.diffText ?? '').split(/\r?\n/).length + 2
    }
    return null
  }
  // 파일 경로가 없는 시연/수동 지적은 파일이 하나일 때만 코드 줄에 연결해 다른 파일로의 오이동을 막는다.
  if (files.length !== 1) return null
  const file = files[0]
  const line = parseReviewDiff(file.diffText ?? '').find(row => row.newLineNumber === comment.lineNumber)
    ?? parseReviewDiff(file.diffText ?? '').find(row => row.oldLineNumber === comment.lineNumber)
  return line ? { filePath: file.filePath, line } : null
}

export function reviewFindingPresentation(comment: AiReviewComment) {
  if (comment.status === 'ACCEPTED') return { label: '제안 수락', icon: 'fas fa-lightbulb', color: 'text-blue-700' }
  if (comment.status === 'REJECTED') return { label: '반려됨', icon: 'fas fa-minus-circle', color: 'text-gray-500' }
  if (/SECURITY|BUG|보안|오류|중복/i.test(`${comment.category} ${comment.title}`)) return { label: '확인 필요', icon: 'fas fa-exclamation-triangle', color: 'text-amber-700' }
  return { label: '개선 제안', icon: 'fas fa-lightbulb', color: 'text-blue-700' }
}
