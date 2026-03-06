'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, Phone, ShoppingCart, Menu, X, Leaf, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/products',  label: 'Products',  Icon: Package },
  { href: '/calls',     label: 'Calls',     Icon: Phone },
  { href: '/orders',    label: 'Orders',    Icon: ShoppingCart },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1 mt-4 px-3 flex-1">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-green-700 text-white'
                : 'text-green-100 hover:bg-green-800 hover:text-white'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-5 py-5 border-b border-green-800">
      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
        <Leaf size={16} className="text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-sm leading-tight">Health is Wealth TT</p>
        <p className="text-green-300 text-xs">Sales Tracker</p>
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
    <div className="px-3 py-4 border-t border-green-800">
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-green-300 hover:bg-green-800 hover:text-white transition-colors disabled:opacity-60"
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
      <div className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 bg-green-900 z-30">
        <Brand />
        <NavLinks />
        <LogoutButton />
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-green-900 h-14 flex items-center px-4 gap-3 shadow-md">
        <button onClick={() => setIsOpen(true)} className="text-white p-1" aria-label="Open menu">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
            <Leaf size={12} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">Health is Wealth TT</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div className="relative w-72 bg-green-900 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-green-800 pr-3">
              <Brand />
              <button onClick={close} className="text-green-300 hover:text-white p-1" aria-label="Close menu">
                <X size={20} />
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
