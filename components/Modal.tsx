'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}

export default function Modal({ title, onClose, children, wide }: Props) {
  // Prevent scroll shift and close on Escape
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handler)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex sm:items-center sm:justify-center overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-950/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={`relative bg-white w-full h-full sm:h-auto sm:rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'} sm:max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-5 sm:zoom-in-95 duration-500 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0 bg-white sm:rounded-t-3xl sticky top-0 z-10">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-white sm:rounded-b-3xl">
          {children}
        </div>
      </div>
    </div>
  )
}
