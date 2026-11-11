import { useState } from 'react'
import { initials } from './job-matching-model'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export default function CompanyLogo({ companyName, companyLogoUrl, companyUrl, className }: {
  companyName: string
  companyLogoUrl?: string | null
  companyUrl?: string | null
  className: string
}) {
  const [loadedSource, setLoadedSource] = useState('')
  const [failedSource, setFailedSource] = useState('')
  let source = companyLogoUrl?.trim() ?? ''
  if (!source && companyUrl) {
    try {
      const company = new URL(companyUrl)
      if (company.hostname === 'www.jobkorea.co.kr' && ['http:', 'https:'].includes(company.protocol)) {
        // API 키가 들어갈 수 있는 C_URL의 쿼리를 이미지 요청에 넣지 않는다.
        source = `${API_BASE_URL}/api/jobs/company-logo?companyPath=${encodeURIComponent(company.pathname)}`
      }
    } catch {
      // 이전 스캔 결과에 기업정보 주소가 없거나 잘못된 경우 이니셜을 표시한다.
    }
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <span aria-hidden="true">{initials(companyName)}</span>
      {source && failedSource !== source ? (
        <img src={source} alt={`${companyName} 로고`} loading="lazy" decoding="async" referrerPolicy="no-referrer"
          onLoad={() => setLoadedSource(source)} onError={() => setFailedSource(source)}
          className={`absolute inset-0 h-full w-full bg-white object-contain p-1 ${loadedSource === source ? 'opacity-100' : 'opacity-0'}`} />
      ) : null}
    </div>
  )
}
