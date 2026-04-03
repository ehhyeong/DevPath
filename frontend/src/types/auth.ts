export interface AuthLoginRequest {
  email: string
  password: string
}

export interface AuthSignUpRequest {
  name: string
  email: string
  password: string
}

export interface AuthTokenResponse {
  tokenType: string
  accessToken: string
  refreshToken: string
  name: string
}

export interface AuthTokenClaims {
  userId: number | null
  role: string | null
  exp: number | null
}

export interface AuthSession extends AuthTokenResponse, AuthTokenClaims {
  storage: 'local' | 'session'
}
