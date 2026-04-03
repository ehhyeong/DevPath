import { useEffect } from 'react'
import { readStoredAuthSession } from './lib/auth-session'

function LoginApp() {
  useEffect(() => {
    const existingSession = readStoredAuthSession()

    if (existingSession) {
      window.location.replace('/')
      return
    }

    window.location.replace('/?auth=login')
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
      로그인 화면으로 이동 중입니다.
    </div>
  )
}

export default LoginApp
