'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Leaf } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import ToastContainer from '@/components/Toast'

function FullPageLoader() {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
          <Leaf size={22} className="text-white" />
        </div>
        <div className="w-7 h-7 rounded-full border-[3px] border-green-200 border-t-green-700 animate-spin" />
      </div>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  useEffect(() => {
    if (loading) return
    if (!user && !isAuthPage) router.replace('/login')
    if (user && isAuthPage) router.replace('/dashboard')
  }, [user, loading, isAuthPage, router])

  if (loading) return <FullPageLoader />

  // Auth pages (Login/Signup) — no sidebar, no shell
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {children}
        <ToastContainer />
      </div>
    )
  }

  // Not logged in yet (redirect pending)
  if (!user) return <FullPageLoader />

  // Authenticated app shell
  return (
    <div className="flex bg-[#fafafa] min-h-screen">
      <Sidebar />
      <main className="flex-1 w-full pt-16 lg:pt-0 min-h-screen animate-in fade-in duration-500 overflow-hidden">
        <div className="h-full">
          {children}
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}
