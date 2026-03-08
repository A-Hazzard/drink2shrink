'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'
import { LogIn, Leaf, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      toast('Welcome back!')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[420px] space-y-8 animate-in fade-in zoom-in duration-700">
        {/* Branding */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-emerald-200 rotate-3 transition-transform hover:rotate-0 duration-500">
            <Leaf size={36} className="text-white fill-white/10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Health is Wealth</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Business Sales Tracker</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] space-y-8">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-black text-gray-900">Welcome Back</h2>
            <p className="text-sm font-bold text-gray-400">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 border-transparent rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm placeholder:text-gray-300"
                placeholder="name@business.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-transparent rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm placeholder:text-gray-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-[11px] font-bold leading-relaxed animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-2xl py-5 text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 hover:shadow-gray-300 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="pt-4 text-center border-t border-gray-50">
            <p className="text-sm font-bold text-gray-400">
              New business?{' '}
              <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 underline decoration-2 underline-offset-4">
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
          © {new Date().getFullYear()} Health is Wealth TT
        </p>
      </div>
    </div>
  )
}
