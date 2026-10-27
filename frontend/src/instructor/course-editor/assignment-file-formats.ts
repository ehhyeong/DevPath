export const ASSIGNMENT_FILE_FORMAT_OPTIONS = [
  'html', 'htm', 'css', 'js', 'ts', 'json', 'java', 'py',
  'pdf', 'md', 'txt', 'docx', 'zip', 'png', 'jpg', 'jpeg', 'webp', 'svg',
]

export function parseAssignmentFileFormats(value: string) {
  return [...new Set(value.split(/[,\s]+/).filter(Boolean).map((format) => format.replace(/^\./, '').toLowerCase()))]
}

export function validateAssignmentFileFormats(formats: string[]) {
  if (!formats.length) return '허용할 확장자를 하나 이상 선택하거나 제한 없음을 선택해 주세요.'
  if (formats.some((format) => !/^[a-z0-9][a-z0-9_-]{0,19}$/.test(format))) {
    return '확장자는 html, pdf, md처럼 입력해 주세요. MIME 유형이나 tar.gz 같은 복합 확장자는 사용할 수 없습니다.'
  }
  if (formats.join(',').length > 300) return '허용 확장자는 쉼표를 포함해 300자 이내로 입력해 주세요.'
  return null
}
