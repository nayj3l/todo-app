import type { GuestSession } from '../types/auth'

const SESSION_KEY = 'todo-guest-session'

export function loadGuestSession(): GuestSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as GuestSession
  } catch {
    return null
  }
}

export function saveGuestSession(session: GuestSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearGuestSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function createGuestSession(nickname: string): GuestSession {
  return {
    guestId: crypto.randomUUID(),
    nickname: nickname.trim() || 'Guest',
    createdAt: new Date().toISOString(),
  }
}
