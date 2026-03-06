'use client'

import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

const CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-green-700', border: 'border-green-600' },
  error:   { icon: XCircle,      bg: 'bg-red-600',   border: 'border-red-500'   },
  info:    { icon: Info,         bg: 'bg-blue-600',  border: 'border-blue-500'  },
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-4 z-[200] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0"
    >
      {toasts.map((t) => {
        const { icon: Icon, bg, border } = CONFIG[t.type]
        return (
          <div
            key={t.id}
            className={`animate-toast-in flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm border ${bg} ${border}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
