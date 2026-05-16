import { useEffect, useRef, useState } from 'react'
import AuthModal, { type AuthView } from '../components/AuthModal'
import LoginRequiredView from '../components/LoginRequiredView'
import SiteHeader from '../components/SiteHeader'
import { authApi, roadmapApi, userApi } from '../lib/api'
import {
  AUTH_SESSION_SYNC_EVENT,
  clearStoredAuthSession,
  getPostLoginRedirect,
  readStoredAuthSession,
} from '../lib/auth-session'
import type { MyRoadmapSummary } from '../types/roadmap'

function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get('auth')
  return value === 'login' || value === 'signup' ? value : null
}

function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href)
  if (view) {
    url.searchParams.set('auth', view)
  } else {
    url.searchParams.delete('auth')
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  const color =
    pct === 100 ? 'bg-[#00c471]' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-600 w-9 text-right">{pct}%</span>
    </div>
  )
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00c471] hover:bg-green-600'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function RoadmapCard({
  roadmap,
  onRename,
  onDelete,
}: {
  roadmap: MyRoadmapSummary
  onRename: (id: number, current: string) => void
  onDelete: (id: number, title: string) => void
}) {
  const isBuilder = roadmap.isBuilderOrigin
  const activityDate = roadmap.lastStudiedAt ?? roadmap.updatedAt ?? roadmap.createdAt

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* 카드 상단 */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${
                isBuilder
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {isBuilder ? 'B' : 'R'}
            </div>
            <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{roadmap.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              title="이름 변경"
              onClick={() => onRename(roadmap.customRoadmapId, roadmap.title)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <i className="fas fa-pen text-xs" />
            </button>
            <button
              type="button"
              title="삭제"
              onClick={() => onDelete(roadmap.customRoadmapId, roadmap.title)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
            >
              <i className="fas fa-trash text-xs" />
            </button>
          </div>
        </div>

        {/* 진행률 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">진행률</span>
            {roadmap.progressRate === 100 && (
              <span className="text-[10px] font-bold text-[#00c471]">
                <i className="fas fa-trophy mr-1" />완료
              </span>
            )}
          </div>
          <ProgressBar value={roadmap.progressRate} />
        </div>

        {/* 메타 정보 */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
          <div>
            <span className="block font-bold text-gray-500 mb-0.5">구분</span>
            <span className={`font-bold ${isBuilder ? 'text-blue-600' : 'text-green-600'}`}>
              {isBuilder ? '빌더 생성' : '공식 로드맵'}
            </span>
          </div>
          <div>
            <span className="block font-bold text-gray-500 mb-0.5">최근 활동</span>
            <span>{formatDate(activityDate)}</span>
          </div>
          <div>
            <span className="block font-bold text-gray-500 mb-0.5">생성일</span>
            <span>{formatDate(roadmap.createdAt)}</span>
          </div>
          {!isBuilder && roadmap.originalRoadmapId && (
            <div>
              <span className="block font-bold text-gray-500 mb-0.5">원본 ID</span>
              <span># {roadmap.originalRoadmapId}</span>
            </div>
          )}
        </div>
      </div>

      {/* 카드 하단 액션 */}
      <div className="border-t border-gray-100 px-5 py-3 flex gap-2">
        <a
          href={`roadmap.html?id=${roadmap.customRoadmapId}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#00c471] hover:bg-green-600 text-white text-sm font-bold rounded-xl transition"
        >
          <i className="fas fa-map text-xs" />
          로드맵 열기
        </a>
        {isBuilder && (
          <a
            href={roadmap.builderRoadmapId
              ? `my-roadmap.html?edit=${roadmap.builderRoadmapId}`
              : 'my-roadmap.html'}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-xl transition"
          >
            <i className="fas fa-pen-ruler text-xs" />
            편집
          </a>
        )}
      </div>
    </div>
  )
}

function RenameModal({
  currentTitle,
  onConfirm,
  onCancel,
  loading,
}: {
  currentTitle: string
  onConfirm: (newTitle: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [value, setValue] = useState(currentTitle)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed && trimmed !== currentTitle) onConfirm(trimmed)
    else if (trimmed === currentTitle) onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-96 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">로드맵 이름 변경</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={100}
            placeholder="새 로드맵 이름"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00c471] focus:border-transparent mb-4"
          />
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-bold text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="px-4 py-2 text-sm font-bold text-white bg-[#00c471] hover:bg-green-600 rounded-xl transition disabled:opacity-50"
            >
              {loading ? <i className="fas fa-circle-notch animate-spin mr-1" /> : null}
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MyRoadmapListPage() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(() => readAuthViewFromLocation())
  const [roadmaps, setRoadmaps] = useState<MyRoadmapSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 이름 변경
  const [renameTarget, setRenameTarget] = useState<{ id: number; title: string } | null>(null)
  const [renameLoading, setRenameLoading] = useState(false)

  // 삭제
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    document.title = 'DevPath - 내 로드맵 관리'
  }, [])

  useEffect(() => {
    syncAuthViewInLocation(authView)
  }, [authView])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    syncSession()
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setProfileImage(null)
      return
    }
    const controller = new AbortController()
    userApi
      .getMyProfile(controller.signal)
      .then((p) => setProfileImage(p.profileImage))
      .catch(() => setProfileImage(null))
    return () => controller.abort()
  }, [session])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    roadmapApi
      .getMyRoadmaps(controller.signal)
      .then((res) => setRoadmaps(res.roadmaps))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : '로드맵 목록을 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [session])

  async function handleLogout() {
    const cur = readStoredAuthSession()
    try {
      if (cur?.refreshToken) await authApi.logout(cur.refreshToken)
    } catch {}
    clearStoredAuthSession()
    setSession(null)
    setProfileImage(null)
  }

  function openAuthModal(view: AuthView) {
    setAuthView(view)
  }

  function closeAuthModal() {
    setAuthView(null)
  }

  function handleAuthenticated() {
    const next = readStoredAuthSession()
    if (next?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(next.role))
      return
    }
    setSession(next)
    closeAuthModal()
  }

  async function handleRename(newTitle: string) {
    if (!renameTarget) return
    setRenameLoading(true)
    try {
      const updated = await roadmapApi.renameMyRoadmap(renameTarget.id, newTitle)
      setRoadmaps((prev) =>
        prev.map((r) => (r.customRoadmapId === renameTarget.id ? { ...r, ...updated } : r)),
      )
      setRenameTarget(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '이름 변경에 실패했습니다.')
    } finally {
      setRenameLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await roadmapApi.deleteMyRoadmap(deleteTarget.id)
      setRoadmaps((prev) => prev.filter((r) => r.customRoadmapId !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const stats = {
    total: roadmaps.length,
    completed: roadmaps.filter((r) => r.progressRate === 100).length,
    inProgress: roadmaps.filter((r) => r.progressRate > 0 && r.progressRate < 100).length,
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => openAuthModal('login')}
        activeNavHref="roadmap-hub.html"
      />

      <main className="app-main flex-1">
        {/* 페이지 헤더 */}
        <header className="border-b border-gray-100 bg-white px-4 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <i className="fas fa-map text-[#00c471] text-lg" />
                  </div>
                  <h1 className="text-2xl font-black text-gray-900">내 로드맵 관리</h1>
                </div>
                <p className="text-sm text-gray-500 ml-13">
                  학습 로드맵의 진행 현황을 확인하고 이름 변경·삭제·편집을 할 수 있습니다.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href="my-roadmap.html"
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition"
                >
                  <i className="fas fa-pen-ruler text-xs" />
                  빌더로 만들기
                </a>
                <a
                  href="roadmap-hub.html"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#00c471] hover:bg-green-600 text-white text-sm font-bold rounded-xl transition"
                >
                  <i className="fas fa-plus text-xs" />
                  로드맵 추가
                </a>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* 비로그인 */}
          {!session && (
            <LoginRequiredView />
          )}

          {/* 로딩 */}
          {session && loading && (
            <div className="flex justify-center items-center py-24 text-gray-400 text-sm gap-2">
              <i className="fas fa-circle-notch animate-spin" />
              로드맵 목록을 불러오는 중입니다.
            </div>
          )}

          {/* 에러 */}
          {session && !loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
              <i className="fas fa-exclamation-circle text-rose-400 text-3xl mb-4 block" />
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full border border-rose-200 bg-white px-5 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
              >
                다시 불러오기
              </button>
            </div>
          )}

          {/* 콘텐츠 */}
          {session && !loading && !error && (
            <>
              {/* 요약 통계 */}
              {roadmaps.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { label: '전체', value: stats.total, icon: 'fas fa-layer-group', color: 'text-gray-700' },
                    { label: '진행 중', value: stats.inProgress, icon: 'fas fa-spinner', color: 'text-blue-600' },
                    { label: '완료', value: stats.completed, icon: 'fas fa-trophy', color: 'text-[#00c471]' },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-3">
                      <i className={`${icon} text-xl ${color}`} />
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">{label}</p>
                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 빈 상태 */}
              {roadmaps.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl px-6 py-20 text-center shadow-sm">
                  <i className="fas fa-map text-gray-200 text-6xl mb-6 block" />
                  <h3 className="text-lg font-bold text-gray-700 mb-2">아직 로드맵이 없습니다</h3>
                  <p className="text-sm text-gray-400 mb-8">
                    공식 로드맵을 시작하거나 빌더로 나만의 로드맵을 만들어 보세요.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <a
                      href="roadmap-hub.html"
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-[#00c471] hover:bg-green-600 text-white font-bold rounded-xl transition"
                    >
                      <i className="fas fa-compass" />
                      로드맵 허브 둘러보기
                    </a>
                    <a
                      href="my-roadmap.html"
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
                    >
                      <i className="fas fa-pen-ruler" />
                      나만의 로드맵 만들기
                    </a>
                  </div>
                </div>
              )}

              {/* 로드맵 카드 그리드 */}
              {roadmaps.length > 0 && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {roadmaps.map((rm) => (
                    <RoadmapCard
                      key={rm.customRoadmapId}
                      roadmap={rm}
                      onRename={(id, title) => setRenameTarget({ id, title })}
                      onDelete={(id, title) => setDeleteTarget({ id, title })}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 이름 변경 모달 */}
      {renameTarget && (
        <RenameModal
          currentTitle={renameTarget.title}
          onConfirm={handleRename}
          onCancel={() => setRenameTarget(null)}
          loading={renameLoading}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <ConfirmModal
          title="로드맵 삭제"
          message={`"${deleteTarget.title}" 로드맵을 삭제하면 모든 진행 데이터가 사라집니다. 정말 삭제할까요?`}
          confirmLabel={deleteLoading ? '삭제 중...' : '삭제'}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}

      {authView && (
        <AuthModal
          view={authView}
          onClose={closeAuthModal}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </div>
  )
}

export default MyRoadmapListPage