import { useEffect, useState } from 'react'
import {
  consumePostLoginReturnPath,
  getPostLoginRedirect,
  getRoleLabel,
  persistAuthSession,
} from './lib/auth-session'
import { queueAuthToast } from './lib/auth-toast'
import type { AuthTokenResponse } from './types/auth'

function readOAuthParams() {
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  return {
    accessToken: searchParams.get('accessToken') ?? hashParams.get('accessToken'),
    refreshToken: searchParams.get('refreshToken') ?? hashParams.get('refreshToken'),
    tokenType: searchParams.get('tokenType') ?? hashParams.get('tokenType') ?? 'Bearer',
    error: searchParams.get('error') ?? hashParams.get('error'),
    errorDescription: searchParams.get('errorDescription') ?? hashParams.get('errorDescription'),
    provider: searchParams.get('provider') ?? hashParams.get('provider'),
  }
}

function getProviderLabel(provider: string | null) {
  switch (provider) {
    case 'google':
      return 'Google'
    case 'github':
      return 'GitHub'
    default:
      return '소셜'
  }
}

function buildOAuthErrorMessage(
  provider: string | null,
  error: string,
  errorDescription: string | null,
) {
  const providerLabel = getProviderLabel(provider)

  if (error === 'access_denied') {
    return `${providerLabel} 로그인 승인이 취소되었습니다.`
  }

  if (error === 'github_email_required') {
    return 'GitHub 계정 이메일을 확인할 수 없습니다. GitHub 이메일 권한을 확인해 주세요.'
  }

  if (error === 'invalid_client' || error === 'invalid_request') {
    return `${providerLabel} 로그인 설정이 맞지 않습니다. Client ID, Secret, Callback URL을 확인해 주세요.`
  }

  if (errorDescription) {
    return `${providerLabel} 로그인에 실패했습니다. ${errorDescription}`
  }

  return `${providerLabel} 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.`
}

function appendLoginModalParam(path: string) {
  const url = new URL(path, window.location.origin)
  url.searchParams.set('auth', 'login')

  return `${url.pathname}${url.search}${url.hash}`
}

function OAuthRedirectApp() {
  const [message, setMessage] = useState(
    '\uC18C\uC15C \uB85C\uADF8\uC778 \uACB0\uACFC\uB97C \uCC98\uB9AC\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4...',
  )

  useEffect(() => {
    const {
      accessToken,
      refreshToken,
      tokenType,
      error,
      errorDescription,
      provider,
    } = readOAuthParams()

    if (error) {
      const failureMessage = buildOAuthErrorMessage(provider, error, errorDescription)
      const returnPath = consumePostLoginReturnPath() ?? '/home'

      queueAuthToast({
        message: failureMessage,
        variant: 'error',
        durationMs: 3200,
      })
      setMessage(`${failureMessage} 로그인 화면으로 돌아갑니다...`)

      window.setTimeout(() => {
        window.location.replace(appendLoginModalParam(returnPath))
      }, 300)
      return
    }

    if (!accessToken || !refreshToken) {
      const failureMessage = '소셜 로그인 토큰을 받지 못했습니다. 다시 시도해 주세요.'
      const returnPath = consumePostLoginReturnPath() ?? '/home'

      queueAuthToast({
        message: failureMessage,
        variant: 'error',
        durationMs: 3200,
      })
      setMessage(`${failureMessage} 로그인 화면으로 돌아갑니다...`)

      window.setTimeout(() => {
        window.location.replace(appendLoginModalParam(returnPath))
      }, 300)
      return
    }

    const response: AuthTokenResponse = {
      tokenType,
      accessToken,
      refreshToken,
      name: 'OAuth \uC0AC\uC6A9\uC790',
    }

    const session = persistAuthSession(response, true, { persistToast: true })
    setMessage(`${getRoleLabel(session.role)} \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC774\uB3D9 \uC911\uC785\uB2C8\uB2E4...`)

    window.setTimeout(() => {
      window.location.replace(getPostLoginRedirect(session.role))
    }, 300)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-[#00C471]">
          <i className="fas fa-circle-notch animate-spin text-2xl" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">DevPath {'\uB85C\uADF8\uC778'}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">{message}</p>
      </div>
    </div>
  )
}

export default OAuthRedirectApp
