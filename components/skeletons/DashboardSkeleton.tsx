import { Skeleton } from './Skeleton'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  )
}

function SkeletonListRow() {
  return (
    <div className="px-5 py-3 flex items-center justify-between">
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="space-y-1.5 items-end flex flex-col">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export default function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <Skeleton className="h-4 w-32" />
            </div>
            {Array.from({ length: 4 }).map((_, j) => <SkeletonListRow key={j} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
