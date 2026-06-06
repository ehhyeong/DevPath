import { useEffect, useState } from 'react'
import AuthModal, { type AuthView } from './AuthModal'
import { showAuthToast } from '../lib/auth-toast'

export default function LoginRequiredView({ message }: { message?: string }) {
  const [authView, setAuthView] = useState<AuthView>('login')

  useEffect(() => {
    showAuthToast({
      message: message ?? '로그인이 필요한 페이지입니다. 계속하려면 로그인해 주세요.',
      durationMs: 2600,
    })
  }, [message])

  function handleAuthenticated() {
    window.location.replace(`${window.location.pathname}${window.location.search}${window.location.hash}`)
  }

  function handleClose() {
    window.location.href = '/'
  }

  return (
    <AuthModal
      view={authView}
      onClose={handleClose}
      onViewChange={setAuthView}
      onAuthenticated={handleAuthenticated}
    />
  )
}
