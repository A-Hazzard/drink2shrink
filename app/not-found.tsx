'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[420px] space-y-8 animate-in fade-in zoom-in duration-700 text-center">
        
        {/* Animated Icon */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-100 rounded-[2rem] rotate-6 animate-pulse" />
          <div className="absolute inset-0 bg-emerald-600 rounded-[2rem] -rotate-3 transition-transform hover:rotate-0 duration-500 shadow-2xl shadow-emerald-200" />
          <FileQuestion size={40} className="relative text-white z-10" />
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h1 className="text-[120px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-emerald-600 to-emerald-900 tracking-tighter">
            404
          </h1>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Page Not Found
          </h2>
          <p className="text-sm font-bold text-gray-400 max-w-[280px] mx-auto leading-relaxed">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-6 space-y-3">
          <Link
            href="/dashboard"
            className="w-full bg-gray-900 text-white rounded-2xl py-5 text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 hover:shadow-gray-300 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Return to Dashboard
          </Link>
          <button
            onClick={() => router.back()}
            className="w-full bg-white text-gray-600 rounded-2xl py-5 text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm border border-gray-100 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>

      </div>
    </div>
  )
}
