import { useEffect, useState } from 'react'
import { userApi } from './lib/api'
import {
  consumePostLoginReturnPath,
  getPostLoginRedirect,
  getRoleLabel,
  persistAuthSession,
  updateStoredAuthSession,
} from './lib/auth-session'
import { queueAuthToast } from './lib/auth-toast'
import type { AuthTokenResponse } from './types/auth'
import type { UserProfile } from './types/learner'

type NicknamePrompt = {
  profile: UserProfile
  redirectPath: string
}

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
    name: searchParams.get('name') ?? hashParams.get('name'),
    newUser: (searchParams.get('newUser') ?? hashParams.get('newUser')) === 'true',
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

function isPlaceholderOAuthName(name: string | null | undefined) {
  const normalized = name?.trim().toLowerCase()

  return !normalized || normalized === 'oauth user' || normalized === 'oauth 사용자'
}

function buildProfileUpdatePayload(profile: UserProfile, name: string) {
  return {
    name,
    bio: profile.bio ?? '',
    phone: profile.phone ?? '',
    profileImage: profile.profileImage ?? '',
    channelName: profile.channelName ?? '',
    githubUrl: profile.githubUrl ?? '',
    blogUrl: profile.blogUrl ?? '',
    tagIds: profile.tags.map((tag) => tag.tagId),
  }
}

function OAuthRedirectApp() {
  const [message, setMessage] = useState(
    '\uC18C\uC15C \uB85C\uADF8\uC778 \uACB0\uACFC\uB97C \uCC98\uB9AC\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4...',
  )
  const [nicknamePrompt, setNicknamePrompt] = useState<NicknamePrompt | null>(null)
  const [nickname, setNickname] = useState('')
  const [nicknameStatus, setNicknameStatus] = useState<string | null>(null)
  const [nicknameSubmitting, setNicknameSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function completeOAuthRedirect() {
    const {
      accessToken,
      refreshToken,
      tokenType,
      error,
      errorDescription,
      provider,
      name,
      newUser,
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
      name: name?.trim() || 'OAuth \uC0AC\uC6A9\uC790',
    }

    const session = persistAuthSession(response, true, { persistToast: true })
    const redirectPath = getPostLoginRedirect(session.role)

    try {
      const profile = await userApi.getMyProfile()

      if (cancelled) {
        return
      }

      updateStoredAuthSession({ name: profile.name })

      if (newUser || isPlaceholderOAuthName(profile.name)) {
        setNickname('')
        setNicknamePrompt({ profile, redirectPath })
        setMessage('\uC0AC\uC6A9\uD560 \uB2C9\uB124\uC784\uC744 \uC124\uC815\uD574 \uC8FC\uC138\uC694.')
        return
      }
    } catch {
      if (cancelled) {
        return
      }
    }

    setMessage(`${getRoleLabel(session.role)} \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC774\uB3D9 \uC911\uC785\uB2C8\uB2E4...`)

    window.setTimeout(() => {
      window.location.replace(redirectPath)
    }, 300)
    }

    void completeOAuthRedirect()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleNicknameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!nicknamePrompt || nicknameSubmitting) {
      return
    }

    const trimmedNickname = nickname.trim()

    if (!trimmedNickname) {
      setNicknameStatus('\uB2C9\uB124\uC784\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.')
      return
    }

    setNicknameSubmitting(true)
    setNicknameStatus(null)

    try {
      const profile = await userApi.updateMyProfile(
        buildProfileUpdatePayload(nicknamePrompt.profile, trimmedNickname),
      )

      updateStoredAuthSession({ name: profile.name })
      setMessage('\uB2C9\uB124\uC784\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC774\uB3D9 \uC911\uC785\uB2C8\uB2E4...')
      window.setTimeout(() => {
        window.location.replace(nicknamePrompt.redirectPath)
      }, 300)
    } catch (error) {
      setNicknameStatus(
        error instanceof Error
          ? error.message
          : '\uB2C9\uB124\uC784 \uC800\uC7A5 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
      )
    } finally {
      setNicknameSubmitting(false)
    }
  }

  function skipNicknameSetup() {
    if (!nicknamePrompt) {
      return
    }

    window.location.replace(nicknamePrompt.redirectPath)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-[#00C471]">
          <i className="fas fa-circle-notch animate-spin text-2xl" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">DevPath {'\uB85C\uADF8\uC778'}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">{message}</p>
        {nicknamePrompt ? (
          <form onSubmit={handleNicknameSubmit} className="mt-6 text-left">
            <label htmlFor="oauth-nickname" className="mb-2 block text-xs font-bold text-gray-700">
              닉네임
            </label>
            <input
              id="oauth-nickname"
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="예: DevPath 러너"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#00C471] focus:ring-2 focus:ring-green-100"
              autoComplete="nickname"
              maxLength={100}
              autoFocus
            />
            {nicknameStatus ? (
              <p className="mt-2 text-xs font-semibold text-red-500">{nicknameStatus}</p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={skipNicknameSetup}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-500 transition hover:bg-gray-50"
              >
                나중에
              </button>
              <button
                type="submit"
                disabled={nicknameSubmitting}
                className="flex-1 rounded-xl bg-[#00C471] py-3 text-sm font-bold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {nicknameSubmitting ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}

export default OAuthRedirectApp
