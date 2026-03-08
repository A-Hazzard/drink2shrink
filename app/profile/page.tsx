'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createOrUpdateProfile } from '@/lib/firestore'
import { useToast } from '@/contexts/ToastContext'
import {
    Building2,
    Mail,
    Camera,
    Save,
    Leaf,
    ChevronRight,
    ShieldCheck,
    LogOut
} from 'lucide-react'

export default function ProfilePage() {
    const { user, profile, logout } = useAuth()
    const { toast } = useToast()
    const [businessName, setBusinessName] = useState(profile?.businessName || '')
    const [logoUrl, setLogoUrl] = useState(profile?.logoUrl || '')
    const [saving, setSaving] = useState(false)


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.email) return
        setSaving(true)
        try {
            await createOrUpdateProfile(user.email, {
                businessName: businessName.trim(),
                logoUrl: logoUrl.trim(),
            })
            toast('Profile updated successfully!')
        } catch (err) {
            toast('Failed to update profile', 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-4 sm:p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-emerald-600 mb-1">
                        <ShieldCheck size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Business Preferences</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Business Profile</h1>
                    <p className="text-sm font-bold text-gray-400">Manage your business identity and security settings</p>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95"
                >
                    <LogOut size={16} />
                    Sign Out Instance
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Column: Avatar & Quick Info */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col items-center text-center space-y-4">
                        <div className="relative group">
                            <div className="w-32 h-32 bg-emerald-50 rounded-[42px] flex items-center justify-center border-4 border-white shadow-inner overflow-hidden">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Leaf size={48} className="text-emerald-600 fill-emerald-600/10" />
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-gray-900">{profile?.businessName || 'Your Business'}</h3>
                            <p className="text-xs font-bold text-gray-400 flex items-center justify-center gap-1.5">
                                <Mail size={12} className="text-emerald-500" />
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <div className="bg-emerald-900 p-8 rounded-[40px] text-white space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <h4 className="text-xs font-black uppercase tracking-widest opacity-60">Account Integrity</h4>
                        <p className="text-sm font-bold leading-relaxed">Your data is isolated and encrypted. Only you can access your business records.</p>
                        <div className="pt-2">
                            <span className="inline-flex items-center px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                Tier: Enterprise
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Settings Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSave} className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
                        <div className="p-8 sm:p-10 space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Building2 size={12} className="text-emerald-500" /> Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        className="w-full bg-gray-50 border-transparent rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                                        placeholder="Health Is Wealth"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Camera size={12} className="text-emerald-500" /> Logo URL
                                    </label>
                                    <input
                                        type="url"
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        className="w-full bg-gray-50 border-transparent rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                                        placeholder="https://your-logo-url.png"
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 rounded-3xl space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex-shrink-0 flex items-center justify-center">
                                        <Mail size={18} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-black text-gray-900 uppercase tracking-widest">Authentication Email</h5>
                                        <p className="text-sm font-bold text-gray-400 mt-0.5">{user?.email}</p>
                                        <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-widest flex items-center gap-1">
                                            Verified <ChevronRight size={10} />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="px-8 sm:px-10 py-8 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-gray-900 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 hover:shadow-gray-400 disabled:opacity-50 active:scale-95 flex items-center gap-3"
                            >
                                {saving ? (
                                    'Synchronizing...'
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Commit Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
