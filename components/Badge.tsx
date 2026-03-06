interface Props {
  variant: 'sale' | 'not_a_sale' | 'pending' | 'delivered' | 'neutral' | 'archived'
  label: string
}

const STYLES: Record<Props['variant'], string> = {
  sale: 'bg-green-100 text-green-800',
  not_a_sale: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-800 border border-gray-200',
  neutral: 'bg-gray-100 text-gray-700',
}

export default function Badge({ variant, label }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STYLES[variant]}`}
    >
      {label}
    </span>
  )
}
