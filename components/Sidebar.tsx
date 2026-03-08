'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, Phone, ShoppingCart, Menu, X, BarChart3, LogOut, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/products', label: 'Products', Icon: Package },
  { href: '/calls', label: 'Calls', Icon: Phone },
  { href: '/orders', label: 'Orders', Icon: ShoppingCart },
  { href: '/profile', label: 'Profile', Icon: User },
]

function NavLinks({ onClick, collapsed }: { onClick?: () => void, collapsed?: boolean }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1.5 mt-8 px-4 flex-1 overflow-y-auto no-scrollbar">
      {!collapsed && <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Main Menu</p>}
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${active
              ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/10'
              : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-800'
              } ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <Icon size={18} strokeWidth={active ? 3 : 2} />
            {!collapsed && <span>{label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  const { profile } = useAuth()
  return (
    <div className={`flex items-center gap-3 px-6 py-8 border-b border-gray-50 ${collapsed ? 'justify-center px-0' : ''}`}>
      <div className="w-10 h-10 rounded-[14px] bg-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/10 overflow-hidden">
        {profile?.logoUrl ? (
          <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <BarChart3 size={20} className="text-white fill-white/10" />
        )}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-gray-900 font-black text-sm leading-tight tracking-tight uppercase truncate">
            {profile?.businessName || 'SaleScope'}
          </p>
          <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.15em] mt-0.5 opacity-60">
            Sales Engine
          </p>
        </div>
      )}
    </div>
  )
}

function LogoutButton({ onClick, collapsed }: { onClick?: () => void, collapsed?: boolean }) {
  const { logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      onClick?.()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="px-4 py-6 border-t border-gray-50">
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        title={collapsed ? "Log Out" : undefined}
        className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-300 disabled:opacity-60 ${collapsed ? 'justify-center px-0' : ''}`}
      >
        <LogOut size={16} />
        {!collapsed && <span>{loggingOut ? 'Signing out…' : 'Log Out Account'}</span>}
      </button>
    </div>
  )
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuth()

  const close = () => {
    gsap.to(mobileMenuRef.current, { x: '-100%', duration: 0.4, ease: 'power3.inOut' })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.4, onComplete: () => setIsOpen(false) })
  }

  const openMobile = () => {
    setIsOpen(true)
  }

  useLayoutEffect(() => {
    if (isOpen) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 })
      gsap.fromTo(mobileMenuRef.current, { x: '-100%' }, { x: 0, duration: 0.4, ease: 'power3.out' })
    }
  }, [isOpen])

  useLayoutEffect(() => {
    gsap.to(sidebarRef.current, {
      width: isCollapsed ? 80 : 260,
      duration: 0.5,
      ease: 'elastic.out(1, 0.8)'
    })
  }, [isCollapsed])

  return (
    <>
      {/* Desktop sidebar */}
      <div
        ref={sidebarRef}
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white z-20 shadow-[0_0_40px_rgba(0,0,0,0.03)] border-r border-gray-100 overflow-hidden"
      >
        <Brand collapsed={isCollapsed} />
        <NavLinks collapsed={isCollapsed} />

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-32 w-6 h-6 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-emerald-600 shadow-md transition-colors z-30"
        >
          {isCollapsed ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronLeft size={12} strokeWidth={3} />}
        </button>

        <LogoutButton collapsed={isCollapsed} />
      </div>

      {/* Main Content Spacer for Desktop */}
      <div
        className={`hidden lg:block transition-all duration-500 ease-in-out ${isCollapsed ? 'w-20' : 'w-[260px]'}`}
      />

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl h-16 flex items-center px-4 gap-4 border-b border-gray-100 shadow-sm">
        <button
          onClick={openMobile}
          className="text-gray-600 p-2 hover:bg-emerald-50 rounded-xl transition-all"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/10 overflow-hidden">
            {profile?.logoUrl ? (
              <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <BarChart3 size={16} className="text-white fill-white/10" />
            )}
          </div>
          <span className="text-gray-900 font-black text-[11px] uppercase tracking-widest truncate max-w-[150px]">
            {profile?.businessName || 'SaleScope'}
          </span>
        </div>
      </div>

      {/* Mobile Menu with GSAP */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            ref={overlayRef}
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-md"
            onClick={close}
          />
          <div
            ref={mobileMenuRef}
            className="relative w-[300px] bg-white h-full flex flex-col shadow-2xl border-r border-gray-100"
          >
            <div className="flex items-center justify-between border-b border-gray-50 pr-4">
              <Brand />
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-50 rounded-xl transition-all"
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
