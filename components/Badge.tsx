interface Props {
  variant: 'delivered' | 'rejected' | 'pending' | 'delivering' | 'interested_future' | 'neutral' | 'archived'
  label: string
}

const STYLES: Record<Props['variant'], string> = {
  delivered: 'bg-green-100 text-green-800 border border-green-200',
  rejected: 'bg-red-100 text-red-700 border border-red-200',
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  delivering: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  interested_future: 'bg-blue-100 text-blue-800 border border-blue-200',
  archived: 'bg-gray-100 text-gray-800 border border-gray-200',
  neutral: 'bg-gray-100 text-gray-700',
}

export default function Badge({ variant, label }: Props) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STYLES[variant]}`}
    >
      {label}
    </span>
  )
}
