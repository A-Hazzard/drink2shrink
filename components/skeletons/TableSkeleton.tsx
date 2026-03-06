import { Skeleton } from './Skeleton'

interface Props {
  cols?: number
  rows?: number
}

export default function TableSkeleton({ cols = 5, rows = 6 }: Props) {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Fake thead */}
        <div className="bg-gray-50 px-4 py-3 flex gap-4 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={`h-3 rounded ${i === 0 ? 'w-24' : i === cols - 1 ? 'w-16' : 'w-20'}`} />
          ))}
        </div>
        {/* Fake rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex gap-4 items-center border-b border-gray-50 last:border-0">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            {Array.from({ length: cols - 2 }).map((_, j) => (
              <Skeleton key={j} className="h-3.5 w-16 hidden sm:block" />
            ))}
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
