import { useEffect, useState } from 'react'
import { authApi } from '../lib/api'
import { persistAuthSession } from '../lib/auth-session'

export type AuthView = 'login' | 'signup'

interface AuthModalProps {
  view: AuthView
  onClose: () => void
  onViewChange: (view: AuthView) => void
  onAuthenticated: () => void
}

type StatusMessage = {
  tone: 'error' | 'success'
  message: string
}

function AuthModal({ view, onClose, onViewChange, onAuthenticated }: AuthModalProps) {
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const [loginStatus, setLoginStatus] = useState<StatusMessage | null>(null)

  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [signupSubmitting, setSignupSubmitting] = useState(false)
  const [signupStatus, setSignupStatus] = useState<StatusMessage | null>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loginSubmitting) {
      return
    }

    setLoginSubmitting(true)
    setLoginStatus(null)

    try {
      const response = await authApi.login({
        email: loginEmail.trim(),
        password: loginPassword,
      })

      persistAuthSession(response, rememberMe)
      setLoginStatus({
        tone: 'success',
        message: '로그인되었습니다.',
      })

      window.setTimeout(() => {
        onAuthenticated()
      }, 150)
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인 중 문제가 발생했습니다.'

      setLoginStatus({
        tone: 'error',
        message,
      })
    } finally {
      setLoginSubmitting(false)
    }
  }

  async function handleSignupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (signupSubmitting) {
      return
    }

    const trimmedName = signupName.trim()
    const trimmedEmail = signupEmail.trim()

    if (!trimmedName || !trimmedEmail || !signupPassword || !signupPasswordConfirm) {
      setSignupStatus({
        tone: 'error',
        message: '필수 항목을 모두 입력해 주세요.',
      })
      return
    }

    if (signupPassword.length < 8) {
      setSignupStatus({
        tone: 'error',
        message: '비밀번호는 8자 이상으로 입력해 주세요.',
      })
      return
    }

    if (signupPassword !== signupPasswordConfirm) {
      setSignupStatus({
        tone: 'error',
        message: '비밀번호 확인이 일치하지 않습니다.',
      })
      return
    }

    if (!agreedToTerms) {
      setSignupStatus({
        tone: 'error',
        message: '서비스 이용약관과 개인정보 처리방침에 동의해 주세요.',
      })
      return
    }

    setSignupSubmitting(true)
    setSignupStatus(null)

    try {
      await authApi.signUp({
        name: trimmedName,
        email: trimmedEmail,
        password: signupPassword,
      })

      setSignupStatus({
        tone: 'success',
        message: '회원가입이 완료되었습니다. 로그인해 주세요.',
      })

      setLoginEmail(trimmedEmail)
      setLoginPassword('')

      window.setTimeout(() => {
        onViewChange('login')
      }, 300)
    } catch (error) {
      const message = error instanceof Error ? error.message : '회원가입 중 문제가 발생했습니다.'

      setSignupStatus({
        tone: 'error',
        message,
      })
    } finally {
      setSignupSubmitting(false)
    }
  }

  function startOAuth(provider: 'google' | 'github') {
    window.location.href = `/oauth2/authorization/${provider}`
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-gray-900 px-12 text-white md:flex">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 to-gray-800" />
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-2">
              <i className="fas fa-code-branch text-3xl text-[#00C471]" />
              <h1 className="text-3xl font-bold">DevPath</h1>
            </div>
            <h2 className="mb-4 text-2xl leading-tight font-bold">
              성장하는 개발자를 위한
              <br />
              가장 확실한 로드맵
            </h2>
            <p className="mb-8 leading-relaxed text-gray-400">
              데이터 기반 커리큘럼과
              <br />
              증명 가능한 포트폴리오로 취업까지 함께하세요.
            </p>

            <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <div className="mb-2 flex gap-1 text-xs text-yellow-400">
                <i className="fas fa-star" />
                <i className="fas fa-star" />
                <i className="fas fa-star" />
                <i className="fas fa-star" />
                <i className="fas fa-star" />
              </div>
              <p className="mb-3 text-sm text-gray-200">
                &quot;DevPath 덕분에 백엔드 개발자로 취업했습니다. 로드맵이 정말 체계적이에요!&quot;
              </p>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gray-400" />
                <span className="text-xs text-gray-400">네카라쿠배 합격자 김OO님</span>
              </div>
            </div>
          </div>

          <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-[#00C471] opacity-20 blur-3xl" />
        </div>

        <div className="relative w-full overflow-y-auto p-8 md:w-1/2 md:p-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 transition hover:text-gray-600"
            aria-label="닫기"
          >
            <i className="fas fa-times text-xl" />
          </button>

          {view === 'login' ? (
            <>
              <div className="mb-8 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900">로그인</h2>
                <p className="mt-1 text-sm text-gray-500">DevPath에 오신 것을 환영합니다</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label htmlFor="modal-login-email" className="mb-1 block text-xs font-bold text-gray-700">
                    이메일
                  </label>
                  <input
                    id="modal-login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="example@email.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#00C471] focus:ring-2 focus:ring-green-100"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-login-password"
                    className="mb-1 block text-xs font-bold text-gray-700"
                  >
                    비밀번호
                  </label>
                  <input
                    id="modal-login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#00C471] focus:ring-2 focus:ring-green-100"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex cursor-pointer items-center gap-2 text-gray-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="accent-[#00C471]"
                    />
                    로그인 상태 유지
                  </label>
                  <a href="#" className="font-bold text-[#00C471] hover:underline">
                    비밀번호 찾기
                  </a>
                </div>

                {loginStatus ? (
                  <div
                    className={[
                      'rounded-lg border px-4 py-3 text-sm',
                      loginStatus.tone === 'success'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-red-200 bg-red-50 text-red-600',
                    ].join(' ')}
                  >
                    {loginStatus.message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loginSubmitting}
                  className="w-full rounded-lg bg-[#00C471] py-3 font-bold text-white shadow-lg shadow-green-100 transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loginSubmitting ? '로그인 중...' : '로그인하기'}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">Or continue with</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => startOAuth('google')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <i className="fab fa-google text-red-500" /> Google
                </button>
                <button
                  type="button"
                  onClick={() => startOAuth('github')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <i className="fab fa-github" /> GitHub
                </button>
              </div>

              <p className="mt-8 text-center text-xs text-gray-500">
                아직 계정이 없으신가요?{' '}
                <button
                  type="button"
                  onClick={() => onViewChange('signup')}
                  className="font-bold text-[#00C471] hover:underline"
                >
                  회원가입
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-8 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900">회원가입</h2>
                <p className="mt-1 text-sm text-gray-500">30초 만에 DevPath를 시작해 보세요</p>
              </div>

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label htmlFor="modal-signup-name" className="mb-1 block text-xs font-bold text-gray-700">
                    이름 (실명)
                  </label>
                  <input
                    id="modal-signup-name"
                    type="text"
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    placeholder="홍길동"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#00C471] focus:ring-2 focus:ring-green-100"
                    autoComplete="name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="modal-signup-email" className="mb-1 block text-xs font-bold text-gray-700">
                    이메일
                  </label>
                  <input
                    id="modal-signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    placeholder="example@email.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#00C471] focus:ring-2 focus:ring-green-100"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="modal-signup-password"
                      className="mb-1 block text-xs font-bold text-gray-700"
                    >
                      비밀번호
                    </label>
                    <input
                      id="modal-signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(event) => setSignupPassword(event.target.value)}
                      placeholder="8자 이상"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#00C471] focus:ring-2 focus:ring-green-100"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="modal-signup-password-confirm"
                      className="mb-1 block text-xs font-bold text-gray-700"
                    >
                      비밀번호 확인
                    </label>
                    <input
                      id="modal-signup-password-confirm"
                      type="password"
                      value={signupPasswordConfirm}
                      onChange={(event) => setSignupPasswordConfirm(event.target.value)}
                      placeholder="한 번 더 입력"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#00C471] focus:ring-2 focus:ring-green-100"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(event) => setAgreedToTerms(event.target.checked)}
                      className="mt-0.5 accent-[#00C471]"
                      required
                    />
                    <span>
                      (필수) <a href="#" className="underline hover:text-gray-900">서비스 이용약관</a> 및{' '}
                      <a href="#" className="underline hover:text-gray-900">
                        개인정보 처리방침
                      </a>
                      에 동의합니다.
                    </span>
                  </label>
                </div>

                {signupStatus ? (
                  <div
                    className={[
                      'rounded-lg border px-4 py-3 text-sm',
                      signupStatus.tone === 'success'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-red-200 bg-red-50 text-red-600',
                    ].join(' ')}
                  >
                    {signupStatus.message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={signupSubmitting}
                  className="mt-2 w-full rounded-lg bg-[#00C471] py-3.5 font-bold text-white shadow-lg shadow-green-100 transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {signupSubmitting ? '회원가입 중...' : '회원가입 완료'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-gray-500">
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => onViewChange('login')}
                  className="font-bold text-[#00C471] hover:underline"
                >
                  로그인
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
