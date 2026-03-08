'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  type User,
  signOut
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { subscribeUserProfile } from '@/lib/firestore'
import type { UserProfile } from '@/types'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)

      if (!firebaseUser) {
        setProfile(null)
        setLoading(false)
        // Only redirect if we're not on auth pages
        if (pathname !== '/login' && pathname !== '/signup') {
          router.push('/login')
        }
      }
    })

    return () => unsub()
  }, [pathname, router])

  useEffect(() => {
    if (!user?.email) return

    setLoading(true)
    const unsub = subscribeUserProfile(user.email, (userProfile) => {
      setProfile(userProfile)
      setLoading(false)
    })

    return () => unsub()
  }, [user])

  const logout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
