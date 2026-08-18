import { useEffect, useState } from 'react'
import { adminApi } from '../../../lib/admin-api'
import type { SystemHealth } from '../../../types/admin-operations'

const dependencyStatusLabels: Record<string, string> = {
  AVAILABLE: '사용 가능',
  CONFIGURED: '설정됨',
  FALLBACK_ONLY: '폴백 전용',
  UNCONFIGURED: '미설정',
}

function dependencyStatusLabel(status?: string) {
  if (!status) return '확인 불가'
  return dependencyStatusLabels[status] ?? status
}

export default function AdminHeader() {
  const [systemStatus, setSystemStatus] = useState<'CHECKING' | 'NORMAL' | 'DEGRADED'>('CHECKING')
  const [dependencies, setDependencies] = useState<SystemHealth | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void adminApi.getSystemHealth(controller.signal)
      .then((health) => { setSystemStatus(health.status); setDependencies(health) })
      .catch(() => setSystemStatus('DEGRADED'))
    return () => controller.abort()
  }, [])

  const statusLabel = systemStatus === 'NORMAL' ? '시스템 정상' : systemStatus === 'DEGRADED' ? '시스템 점검 필요' : '시스템 확인 중'
  const statusColor = systemStatus === 'NORMAL' ? 'bg-emerald-500' : systemStatus === 'DEGRADED' ? 'bg-rose-500' : 'bg-amber-400'

  return (
    <header className="admin-page-header sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800" id="page-title">
          {"플랫폼 실시간 현황"}
        </h2>
        <span className="text-slate-300">
          {"|"}
        </span>
        <p className="text-xs font-medium text-slate-500" id="page-desc">
          {"DevPath 관리자 운영 지표 요약"}
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
        {dependencies ? <span className="hidden xl:inline" title={[dependencies.jobkorea?.message, dependencies.gemini?.message, dependencies.ffmpeg?.message].filter(Boolean).join('\n')}>외부 기능 · 잡코리아 {dependencyStatusLabel(dependencies.jobkorea?.status)} · Gemini {dependencyStatusLabel(dependencies.gemini?.status)} · FFmpeg {dependencyStatusLabel(dependencies.ffmpeg?.status)}</span> : null}
        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
          <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${statusColor}`}></span>
          {statusLabel}
        </span>
        <button data-admin-click="refreshCurrentTab()" className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition hover:text-indigo-600" title="새로고침" type="button">
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>
    </header>
  )
}
