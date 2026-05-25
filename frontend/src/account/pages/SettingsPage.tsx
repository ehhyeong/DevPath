import { useEffect, useState, type FormEvent } from 'react'
import { userApi } from '../../lib/api'
import { LearnerContentRow, LearnerPageShell, MyMenuSidebar } from '../template'
import { readLocalPreferences } from '../ui'
import type { AuthSession } from '../../types/auth'
import type { UserProfile } from '../../types/learner'

const SETTINGS_STORAGE_KEY = 'devpath.account.preferences'

type ToastState = {
  message: string
  iconClassName: string
}

function resolveErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function ToggleSwitch({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="relative mr-2 inline-block w-10 align-middle transition duration-200 ease-in select-none">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="absolute block h-5 w-5 cursor-pointer appearance-none rounded-full border-4 bg-white transition-all duration-300"
        style={{
          right: checked ? 0 : '50%',
          zIndex: 1,
          borderColor: checked ? '#00C471' : '#E5E7EB',
        }}
      />
      <label
        htmlFor={id}
        className="block h-5 cursor-pointer overflow-hidden rounded-full transition-all duration-300"
        style={{ backgroundColor: checked ? '#00C471' : '#D1D5DB' }}
      />
    </div>
  )
}

export default function SettingsPage(props: { session: AuthSession }) {
  void props

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [preferences, setPreferences] = useState(() => readLocalPreferences())
  const [passwordError, setPasswordError] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProfile() {
      setProfileLoading(true)
      setProfileError('')

      try {
        const response = await userApi.getMyProfile(controller.signal)

        if (!controller.signal.aborted) {
          setProfile(response)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setProfile(null)
          setProfileError(resolveErrorMessage(error, '계정 정보를 불러오지 못했습니다.'))
        }
      } finally {
        if (!controller.signal.aborted) {
          setProfileLoading(false)
        }
      }
    }

    void loadProfile()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError('')
    setToast(null)

    if (!currentPassword.trim()) {
      setPasswordError('현재 비밀번호를 입력해주세요.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호와 확인 값이 일치하지 않습니다.')
      return
    }

    setIsSubmittingPassword(true)

    try {
      await userApi.changePassword({
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setToast({ message: '비밀번호가 변경되었습니다.', iconClassName: 'fas fa-check-circle' })
    } catch (submitError) {
      setPasswordError(resolveErrorMessage(submitError, '비밀번호 변경 중 문제가 발생했습니다.'))
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  function updatePreference(key: keyof typeof preferences, checked: boolean, enabledMessage: string, disabledMessage: string) {
    setPreferences((current) => ({ ...current, [key]: checked }))
    setToast({ message: checked ? enabledMessage : disabledMessage, iconClassName: 'fas fa-check-circle' })
  }

  function handleWithdrawal() {
    const firstCheck = window.confirm(
      '정말로 회원 탈퇴를 진행하시겠습니까?\n탈퇴 시 회원의 모든 학습 진도율, 수강 중인 강의 내역 및 로드맵 스크랩 데이터가 영구히 복구 불가능합니다.',
    )

    if (!firstCheck) {
      return
    }

    const secondCheck = window.confirm(
      '마지막 경고입니다. 작성하셨던 커뮤니티 게시글과 프로젝트 일지도 모두 관리 권한이 상실됩니다. 정말 삭제 처리를 최종 승인하시겠습니까?',
    )

    if (secondCheck) {
      window.alert('회원 탈퇴 API는 아직 연결되지 않았습니다.')
    }
  }

  const linkedEmail = profile?.email?.trim() ?? ''

  return (
    <LearnerPageShell>
      <LearnerContentRow>
        <MyMenuSidebar currentPageKey="settings" wrapperClassName="w-60 shrink-0 hidden lg:block -ml-0" />

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="mb-6 pt-[5px] text-2xl leading-none font-bold text-gray-900">계정 설정</h2>

            <section className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">
              <h3 className="mb-6 border-b border-gray-100 pb-2 text-lg font-bold text-gray-900">계정 정보</h3>

              <form className="space-y-6" onSubmit={handlePasswordSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">연동된 이메일</label>
                  <div className="flex items-center gap-3">
                    {profileLoading ? (
                      <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400">
                        계정 정보를 불러오는 중입니다.
                      </div>
                    ) : linkedEmail ? (
                      <>
                        <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                          {linkedEmail}
                        </div>
                        <span className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">
                          <i className="fas fa-envelope" /> 이메일 연동
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 italic">
                          아직 연동된 이메일 계정이 없습니다.
                        </div>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                          onClick={() => setToast({ message: '계정 연동 기능은 아직 연결되지 않았습니다.', iconClassName: 'fas fa-info-circle' })}
                        >
                          <i className="fas fa-link" /> 계정 연동하기
                        </button>
                      </>
                    )}
                  </div>
                  {profileError ? <p className="mt-2 text-xs font-bold text-amber-600">{profileError}</p> : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">현재 비밀번호</label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-green-100"
                    placeholder="현재 비밀번호 입력"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">새 비밀번호 설정</label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-green-100"
                    placeholder="새 비밀번호 입력"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">새 비밀번호 확인</label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-green-100"
                    placeholder="비밀번호 다시 입력"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                {passwordError ? <p className="text-sm font-bold text-red-500">{passwordError}</p> : null}

                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingPassword ? '변경 중' : '비밀번호 변경'}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">
              <h3 className="mb-6 border-b border-gray-100 pb-2 text-lg font-bold text-gray-900">알림 설정</h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800">새로운 댓글 알림</p>
                    <p className="text-xs text-gray-500">내 게시글에 새로운 댓글이 달리면 알림을 받습니다.</p>
                  </div>
                  <ToggleSwitch
                    id="settings-comment-alert"
                    checked={preferences.emailAlerts}
                    onChange={(checked) =>
                      updatePreference('emailAlerts', checked, '댓글 알림이 켜졌습니다.', '댓글 알림이 꺼졌습니다.')
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800">마케팅 정보 수신</p>
                    <p className="text-xs text-gray-500">이벤트 및 할인 혜택 정보를 받습니다.</p>
                  </div>
                  <ToggleSwitch
                    id="settings-marketing-alert"
                    checked={preferences.marketingAlerts}
                    onChange={(checked) =>
                      updatePreference('marketingAlerts', checked, '마케팅 정보 수신에 동의하셨습니다.', '마케팅 정보 수신이 해제되었습니다.')
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-bold text-red-600">회원 탈퇴</h3>
              <p className="mb-4 text-sm text-gray-600">탈퇴 시 작성한 게시글 및 학습 기록은 복구할 수 없습니다.</p>
              <button
                type="button"
                onClick={handleWithdrawal}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-50"
              >
                계정 영구 삭제
              </button>
            </section>
          </div>
        </section>
      </LearnerContentRow>

      {toast ? (
        <div
          id="toast"
          className="pointer-events-none fixed right-6 bottom-6 z-[1000] flex translate-y-0 items-center gap-2 rounded-xl bg-gray-800 px-6 py-3.5 text-white opacity-100 shadow-lg transition-all duration-300"
        >
          <i className={`${toast.iconClassName} text-lg text-brand`} />
          <span>{toast.message}</span>
        </div>
      ) : null}
    </LearnerPageShell>
  )
}
