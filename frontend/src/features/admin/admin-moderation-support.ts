import type { AdminModerationReport } from '../../types/admin'

export function accountStatusLabel(status: string | null | undefined) {
  switch ((status ?? '').toUpperCase()) {
    case 'ACTIVE': return '활성'
    case 'RESTRICTED': return '제한'
    case 'INACTIVE': return '비활성'
    default: return status || '미확인'
  }
}

export function reportTargetLabel(report: AdminModerationReport) {
  if (report.targetLabel?.trim()) return report.targetLabel
  if (report.targetType === 'USER') return '회원 신고'
  if (report.targetType === 'CONTENT') return '콘텐츠 신고'
  return '대상 미확인'
}

export function reportTargetSummary(report: AdminModerationReport) {
  if (report.targetSummary?.trim()) return report.targetSummary
  if (report.targetType === 'USER') return `회원 ID #${report.targetId ?? '-'}`
  if (report.targetType === 'CONTENT') return `콘텐츠 ID #${report.targetId ?? report.contentId ?? '-'}`
  return '신고 대상 정보를 찾을 수 없습니다.'
}

export function reportReporterSummary(report: AdminModerationReport) {
  if (report.reporterName && report.reporterEmail) return `${report.reporterName} (${report.reporterEmail})`
  return report.reporterEmail || '신고자 정보 없음'
}

export function reportContentContext(report: AdminModerationReport) {
  const contexts = [report.contentTitle, report.contentPreview].filter((value): value is string => Boolean(value?.trim()))
  return contexts.length ? contexts.join(' / ') : null
}
