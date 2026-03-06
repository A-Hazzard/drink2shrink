'use client'

import { useState } from 'react'
import { Leaf, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Spinner from '@/components/Spinner'

function getAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':        return 'Please enter a valid email address.'
    case 'auth/user-not-found':       return 'No account found with this email.'
    case 'auth/wrong-password':       return 'Incorrect password. Please try again.'
    case 'auth/invalid-credential':   return 'Invalid email or password.'
    case 'auth/too-many-requests':    return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/user-disabled':        return 'This account has been disabled.'
    case 'auth/network-request-failed': return 'Network error. Check your connection.'
    default:                          return 'Sign in failed. Please try again.'
  }
}

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim()) return setError('Email is required.')
    if (!password)      return setError('Password is required.')

    setLoading(true)
    try {
      await signIn(email.trim(), password)
      // AppShell will redirect to /dashboard automatically
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(getAuthError(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-green-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-xl shadow-orange-900/30">
            <Leaf size={30} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Health is Wealth TT</h1>
            <p className="text-green-300 text-sm mt-0.5">Sales Tracker</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                disabled={loading}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:opacity-60 disabled:bg-gray-50"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:opacity-60 disabled:bg-gray-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                <span className="text-red-600 text-xs mt-0.5">⚠</span>
                <p className="text-red-700 text-sm leading-snug">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <Spinner size={16} />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-green-400 text-xs mt-6 opacity-60">
          Health is Wealth TT © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
