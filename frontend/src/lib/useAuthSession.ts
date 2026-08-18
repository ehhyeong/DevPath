import { useState } from 'react'
import { readStoredAuthSession } from './auth-session'
import type { AuthSession } from '../types/auth'

export function useAuthSession() {
  return useState<AuthSession | null>(() => readStoredAuthSession())
}
