const SETTINGS_STORAGE_KEY = 'devpath.account.preferences'

export type LocalPreferences = {
  emailAlerts: boolean
  marketingAlerts: boolean
}

export function readLocalPreferences(): LocalPreferences {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)

    if (!raw) {
      return {
        emailAlerts: true,
        marketingAlerts: false,
      }
    }

    return JSON.parse(raw) as LocalPreferences
  } catch {
    return {
      emailAlerts: true,
      marketingAlerts: false,
    }
  }
}

export function getAvatarUrl(name: string, image?: string | null) {
  if (image) {
    return image
  }

  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(name)}`
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '정보 없음'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '정보 없음'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('ko-KR').format(value ?? 0)
}

export function formatCurrency(value: number | null | undefined, currency: string | null | undefined = 'KRW') {
  if (value === null || value === undefined) {
    return '미정'
  }

  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency || 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

export function getStatusBadgeTone(status: string | null | undefined) {
  switch (status) {
    case 'COMPLETED':
    case 'PDF_READY':
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    case 'ACTIVE':
    case 'ISSUED':
    case 'PENDING':
    case 'RECRUITING':
      return 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
    case 'CANCELLED':
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
    default:
      return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
  }
}

export function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'ACTIVE':
      return '학습 중'
    case 'COMPLETED':
      return '완료'
    case 'CANCELLED':
      return '취소'
    case 'ISSUED':
      return '발급 완료'
    case 'PDF_READY':
      return 'PDF 준비'
    case 'PENDING':
      return '처리 중'
    case 'APPROVED':
      return '승인'
    case 'RECRUITING':
      return '모집 중'
    case 'IN_PROGRESS':
      return '진행 중'
    case 'GRADED':
      return '채점 완료'
    default:
      return status ?? '미정'
  }
}

export function getCategoryLabel(category: string) {
  switch (category) {
    case 'TECH_SHARE':
      return '기술 공유'
    case 'CAREER':
      return '커리어'
    case 'FREE':
      return '자유'
    default:
      return category
  }
}

export function getNotificationTypeLabel(type: string) {
  switch (type) {
    case 'STUDY_GROUP':
      return '스터디'
    case 'PLANNER':
      return '플래너'
    case 'STREAK':
      return '스트릭'
    case 'PROJECT':
      return '프로젝트'
    case 'SYSTEM':
      return '시스템'
    default:
      return type
  }
}

export function getHeatmapTone(level: number) {
  if (level >= 4) {
    return 'bg-emerald-500'
  }

  if (level === 3) {
    return 'bg-emerald-400'
  }

  if (level === 2) {
    return 'bg-emerald-300'
  }

  if (level === 1) {
    return 'bg-emerald-200'
  }

  return 'bg-gray-100'
}

export function downloadBase64File(fileName: string, mimeType: string, base64Content: string) {
  const binary = window.atob(base64Content)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  const blob = new Blob([bytes], { type: mimeType })
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}
