import { useEffect, useState } from 'react'
import {
  getPostLoginRedirect,
  getRoleLabel,
  persistAuthSession,
} from './lib/auth-session'
import type { AuthTokenResponse } from './types/auth'

function OAuthRedirectApp() {
  const [message, setMessage] = useState('소셜 로그인 결과를 처리하고 있습니다...')

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const tokenType = searchParams.get('tokenType') ?? 'Bearer'

    if (!accessToken || !refreshToken) {
      setMessage('소셜 로그인 토큰을 받지 못했습니다. 다시 시도해 주세요.')
      return
    }

    const response: AuthTokenResponse = {
      tokenType,
      accessToken,
      refreshToken,
      name: 'OAuth 사용자',
    }

    const session = persistAuthSession(response, true)
    setMessage(`${getRoleLabel(session.role)} 계정으로 로그인되었습니다. 이동 중입니다...`)

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
        <h1 className="text-xl font-bold text-gray-900">DevPath 로그인</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">{message}</p>
      </div>
    </div>
  )
}

export default OAuthRedirectApp
