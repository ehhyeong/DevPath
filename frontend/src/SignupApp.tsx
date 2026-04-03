import { useEffect } from 'react'
import { readStoredAuthSession } from './lib/auth-session'

function SignupApp() {
  useEffect(() => {
    const existingSession = readStoredAuthSession()

    if (existingSession) {
      window.location.replace('/')
      return
    }

    window.location.replace('/?auth=signup')
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
      회원가입 화면으로 이동 중입니다.
    </div>
  )
}

export default SignupApp
