'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, Phone, ShoppingCart, Menu, X, Leaf, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/products', label: 'Products', Icon: Package },
  { href: '/calls', label: 'Calls', Icon: Phone },
  { href: '/orders', label: 'Orders', Icon: ShoppingCart },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-2 mt-8 px-4 flex-1">
      <p className="px-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Main Menu</p>
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${active
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
          >
            <Icon size={18} strokeWidth={active ? 3 : 2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-6 py-8 border-b border-white/5">
      <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-900/20">
        <Leaf size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-white font-black text-sm leading-tight tracking-tight uppercase truncate">HealthIsWealth</p>
        <p className="text-orange-200/50 text-[10px] font-bold uppercase tracking-widest mt-0.5">Sales Engine</p>
      </div>
    </div>
  )
}

function LogoutButton({ onClick }: { onClick?: () => void }) {
  const { logOut } = useAuth()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logOut()
      onClick?.()
      router.replace('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="px-4 py-6 border-t border-white/5 bg-black/20">
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 disabled:opacity-60"
      >
        <LogOut size={16} />
        {loggingOut ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  )
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const close = () => setIsOpen(false)

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0a0a0a] z-30 shadow-2xl border-r border-white/5">
        <Brand />
        <NavLinks />
        <LogoutButton />
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl h-16 flex items-center px-4 gap-4 border-b border-white/5">
        <button
          onClick={() => setIsOpen(true)}
          className="text-white p-2 hover:bg-white/5 rounded-xl transition-all"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-900/20">
            <Leaf size={16} className="text-white" />
          </div>
          <span className="text-white font-black text-xs uppercase tracking-widest">HealthIsWealth</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-all duration-500" onClick={close} />
          <div className="relative w-80 bg-[#0a0a0a] h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 border-r border-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pr-4">
              <Brand />
              <button
                onClick={close}
                className="text-white/40 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <NavLinks onClick={close} />
            <LogoutButton onClick={close} />
          </div>
        </div>
      )}
    </>
  )
}
