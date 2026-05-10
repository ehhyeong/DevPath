import { useEffect, useState } from 'react'
import {
  getPostLoginRedirect,
  getRoleLabel,
  persistAuthSession,
} from './lib/auth-session'
import type { AuthTokenResponse } from './types/auth'

function readOAuthParams() {
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  return {
    accessToken: searchParams.get('accessToken') ?? hashParams.get('accessToken'),
    refreshToken: searchParams.get('refreshToken') ?? hashParams.get('refreshToken'),
    tokenType: searchParams.get('tokenType') ?? hashParams.get('tokenType') ?? 'Bearer',
  }
}

function OAuthRedirectApp() {
  const [message, setMessage] = useState(
    '\uC18C\uC15C \uB85C\uADF8\uC778 \uACB0\uACFC\uB97C \uCC98\uB9AC\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4...',
  )

  useEffect(() => {
    const { accessToken, refreshToken, tokenType } = readOAuthParams()

    if (!accessToken || !refreshToken) {
      setMessage(
        '\uC18C\uC15C \uB85C\uADF8\uC778 \uD1A0\uD070\uC744 \uBC1B\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
      )
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
