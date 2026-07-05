export type AuthMode = 'google' | 'guest'

export interface AuthUser {
  id: number
  name: string
  email: string | null
  pictureUrl: string | null
  mode: AuthMode
  guestId?: string
}

export interface GuestSession {
  guestId: string
  nickname: string
  createdAt: string
}
