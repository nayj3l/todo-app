import { useState } from 'react'
import { APP_NAME } from '../constants/app'

interface LoginPageProps {
  onGoogleSignIn: () => Promise<void>
  onGuestSignIn: (nickname: string) => Promise<void>
  googleSigningIn?: boolean
  guestSigningIn?: boolean
  error?: string | null
  googleEnabled?: boolean
}

export default function LoginPage({
  onGoogleSignIn,
  onGuestSignIn,
  googleSigningIn = false,
  guestSigningIn = false,
  error,
  googleEnabled = true,
}: LoginPageProps) {
  const busy = googleSigningIn || guestSigningIn

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-bg px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#E8E8ED] bg-white p-10 shadow-card">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[#1A1A2E]">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-surface-muted">
            Sign in to save your boards, or try guest mode on this device.
          </p>
        </div>

        {error && (
          <div
            data-testid="sign-in-error"
            className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        {googleEnabled && (
          <button
            type="button"
            data-testid="google-sign-in"
            onClick={() => void onGoogleSignIn()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E8E8ED] bg-white px-4 py-3 text-sm font-semibold text-[#1A1A2E] transition hover:bg-[#FAFAFB] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {googleSigningIn ? 'Signing in...' : 'Continue with Google'}
          </button>
        )}

        {googleEnabled && (
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E8E8ED]" />
            <span className="text-xs text-surface-muted">or</span>
            <div className="h-px flex-1 bg-[#E8E8ED]" />
          </div>
        )}

        <GuestSignInForm
          onGuestSignIn={onGuestSignIn}
          guestSigningIn={guestSigningIn}
          disabled={googleSigningIn}
        />
      </div>
    </div>
  )
}

function GuestSignInForm({
  onGuestSignIn,
  guestSigningIn,
  disabled,
}: {
  onGuestSignIn: (nickname: string) => Promise<void>
  guestSigningIn: boolean
  disabled: boolean
}) {
  const [nickname, setNickname] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!acknowledged || !nickname.trim()) {
          return
        }
        void onGuestSignIn(nickname.trim())
      }}
    >
      <div>
        <label htmlFor="guest-nickname" className="mb-1.5 block text-sm font-medium text-surface-text">
          Guest nickname
        </label>
        <input
          id="guest-nickname"
          data-testid="guest-nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="e.g. Nigel"
          maxLength={40}
          disabled={disabled || guestSigningIn}
          className="w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
        />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        <p className="font-semibold">Guest mode caveat</p>
        <p className="mt-1">
          Your changes are saved in this browser only (IndexedDB). They won&apos;t sync to other devices or
          survive if you clear site data. We load a copy of the planner template from the server once, then
          keep working locally.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-xs text-surface-muted">
        <input
          type="checkbox"
          data-testid="guest-acknowledge"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          disabled={disabled || guestSigningIn}
          className="mt-0.5 h-4 w-4 rounded border-[#D5D5DE] text-brand-500 focus:ring-brand-100"
        />
        <span>I understand guest data stays on this browser only</span>
      </label>

      <button
        type="submit"
        data-testid="guest-sign-in"
        disabled={disabled || guestSigningIn || !acknowledged || !nickname.trim()}
        className="flex w-full items-center justify-center rounded-xl bg-[#5B3FD6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4C34B8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {guestSigningIn ? 'Starting guest session...' : 'Continue as Guest'}
      </button>
    </form>
  )
}
