'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Phone,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  XCircle,
  RefreshCcw,
  Truck,
  Calendar,
  Clock,
  CalendarDays
} from 'lucide-react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  subYears,
  startOfYear,
} from 'date-fns'
import { subscribeCalls, subscribeOrders, subscribeProducts, updateCall, updateOrder } from '@/lib/firestore'
import type { Call, Order, Product, CallOutcome } from '@/types'
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

// === Types ===
type TimeFilter = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | '6m' | '12m' | 'all' | 'custom'

// === Components ===

function StatCard({
  label,
  value,
  sub,
  Icon,
  color,
  trend,
  highlight = false,
}: {
  label: string
  value: string | number
  sub?: string
  Icon: React.ElementType
  color: string
  trend?: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-3xl shadow-sm border p-5 flex flex-col gap-4 transition-all h-full ${highlight
      ? 'bg-green-700 border-green-600 shadow-green-100 z-10 text-white'
      : 'bg-white border-gray-100 text-gray-900 hover:shadow-lg hover:shadow-gray-50'
      }`}>
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${highlight ? 'bg-white/20' : color
          }`}>
          <Icon size={24} className="text-white" />
        </div>
        {trend && (
          <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${highlight ? 'bg-white/20 text-white' : 'bg-green-50 text-green-600'}`}>
            {trend}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-2xl sm:text-3xl font-black tracking-tight truncate">{value}</p>
        <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${highlight ? 'text-green-100' : 'text-gray-400'}`}>{label}</p>
        {sub && (
          <p className={`text-[10px] font-medium mt-1 italic ${highlight ? 'text-green-200' : 'text-gray-500'}`}>{sub}</p>
        )}
      </div>
    </div>
  )
}

function fmt(ts?: { seconds: number }) {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-TT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// === Main Page ===

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [calls, setCalls] = useState<Call[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Filtering state
  const [filter, setFilter] = useState<TimeFilter>('30d')
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)

  // --- Data Loading ---
  useEffect(() => {
    if (!user?.email) return

    setLoading(true)
    let done = false
    const clear = () => { if (!done) { done = true; setLoading(false) } }
    const u1 = subscribeCalls(user.email, (d: Call[]) => { setCalls(d); clear() })
    const u2 = subscribeOrders(user.email, (d: Order[]) => { setOrders(d); clear() })
    const u3 = subscribeProducts(user.email, (d: Product[]) => { setProducts(d); clear() })
    return () => { u1(); u2(); u3() }
  }, [refreshKey, user])

  function handleRefresh() {
    setLoading(true)
    setTimeout(() => setRefreshKey(prev => prev + 1), 500)
  }

  // --- Background Sync & Data Correction ---
  useEffect(() => {
    if (loading || calls.length === 0 || orders.length === 0) return

    const syncData = async () => {
      // 1. Sync Call Outcomes based on Order Status
      for (const call of calls) {
        const linkedOrder = orders.find(o => o.id === call.orderId || o.callId === call.id)
        if (linkedOrder) {
          const correctOutcome = linkedOrder.status as CallOutcome
          if (call.outcome !== correctOutcome && (call.outcome === 'delivered' || call.outcome === 'pending')) {
            await updateCall(call.id, { outcome: correctOutcome })
          }
        }
      }

      // 2. Correct Revenue Discrepancies (ensure packagePrice excludes delivery)
      for (const order of orders) {
        let needsUpdate = false
        const updates: Partial<Order> = {}

        if (order.packagePrice === undefined) {
          const fee = order.deliveryFee ?? 0
          updates.packagePrice = order.totalPrice - fee
          needsUpdate = true
        }

        if (needsUpdate) {
          await updateOrder(order.id, updates)
        }
      }
    }

    syncData()
  }, [calls, orders, loading])

  // --- Computed Stats ---

  const getInterval = () => {
    const now = new Date()
    switch (filter) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) }
      case 'yesterday': return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) }
      case '7d': return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
      case '30d': return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
      case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'last_month': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
      case '6m': return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) }
      case '12m': return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) }
      case 'custom':
        if (!customRange?.from || !customRange?.to) return null
        return { start: startOfDay(customRange.from), end: endOfDay(customRange.to) }
      default: return null
    }
  }

  const interval = getInterval()

  const filteredOrders = useMemo(() => {
    if (filter === 'all' || !interval) return orders
    return orders.filter(o => {
      if (!o.createdAt) return false
      const date = new Date(o.createdAt.seconds * 1000)
      return isWithinInterval(date, interval)
    })
  }, [orders, filter, interval])

  const filteredCalls = useMemo(() => {
    if (filter === 'all' || !interval) return calls
    return calls.filter(c => {
      if (!c.createdAt) return false
      const date = new Date(c.createdAt.seconds * 1000)
      return isWithinInterval(date, interval)
    })
  }, [calls, filter, interval])

  const totalCalls = filteredCalls.length
  const totalSales = filteredCalls.filter((c) => c.outcome === 'delivered').length
  const totalOutForDelivery = filteredCalls.filter(c => c.outcome === 'delivering').length
  const totalRejected = filteredCalls.filter((c) => c.outcome === 'rejected').length
  const totalInterestedFuture = filteredCalls.filter((c) => c.outcome === 'interested_future').length

  const totalRevenue = filteredOrders
    .filter((o) => o.status === 'delivered' && !o.archivedAt)
    .reduce((sum, o) => sum + (o.packagePrice ?? 0), 0)

  const convRate = totalCalls > 0 ? Math.round((totalSales / totalCalls) * 100) : 0

  // --- Chart Data Processing ---
  const chartData = useMemo(() => {
    if (!interval) return []

    // For All Time, we group by month
    if (filter === 'all' || filter === '12m' || filter === '6m') {
      const months: Record<string, number> = {}
      const start = filter === 'all' ? startOfYear(subYears(new Date(), 2)) : interval!.start
      const end = interval?.end || new Date()

      orders.forEach(o => {
        if (o.status !== 'delivered' || o.archivedAt || !o.createdAt) return
        const date = new Date(o.createdAt.seconds * 1000)
        if (date < start || date > end) return
        const key = format(date, 'MMM yy')
        months[key] = (months[key] || 0) + (o.packagePrice ?? 0)
      })

      return Object.entries(months).map(([name, revenue]) => ({ name, revenue }))
    }

    // For other ranges, we group by day
    const days = eachDayOfInterval(interval)
    return days.map(day => {
      const revenue = orders
        .filter(o => o.status === 'delivered' && !o.archivedAt && o.createdAt && isSameDay(new Date(o.createdAt.seconds * 1000), day))
        .reduce((sum, o) => sum + (o.packagePrice ?? 0), 0)
      return {
        name: format(day, filter === 'today' || filter === 'yesterday' ? 'HH:mm' : 'dd MMM'),
        revenue
      }
    })
  }, [orders, filter, interval])

  if (authLoading || (loading && refreshKey === 0)) return <DashboardSkeleton />
  if (!user) return null

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest text-[10px]">Business Performance Overview</p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto no-scrollbar max-w-[calc(100vw-80px)]">
            {[
              { id: 'today', label: 'TODAY' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: 'all', label: 'ALL' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as TimeFilter)}
                className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all whitespace-nowrap ${filter === t.id ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'
                  }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setFilter('custom')}
              className={`p-2 rounded-xl transition-all ${filter === 'custom' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'
                }`}
            >
              <CalendarDays size={18} />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-2xl transition-all border border-gray-100 bg-white shadow-sm active:scale-95"
            title="Refresh data"
          >
            <RefreshCcw size={20} className={loading && refreshKey > 0 ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {filter === 'custom' && (
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CalendarDays size={18} className="text-green-700" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Range Filter</p>
              <p className="text-xs font-bold text-gray-900">Select start and end dates</p>
            </div>
          </div>
          <DateRangePicker
            date={customRange}
            setDate={setCustomRange}
            placeholder="Select date interval"
          />
        </div>
      )}

      {/* Stats Priority Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatCard
          label="Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          sub="Package only"
          Icon={DollarSign}
          color="bg-green-700"
          highlight={true}
          trend="+12%"
        />
        <StatCard
          label="Closed Deals"
          value={totalSales}
          sub={`${convRate}% conversion`}
          Icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          label="Active Leads"
          value={totalCalls}
          sub="Total calls logged"
          Icon={Phone}
          color="bg-blue-500"
        />
        <StatCard
          label="Future Ops"
          value={totalInterestedFuture}
          sub="Wait-listed goals"
          Icon={Clock}
          color="bg-indigo-500"
        />
        <StatCard
          label="In Transit"
          value={totalOutForDelivery}
          sub="Delivering now"
          Icon={Truck}
          color="bg-orange-500"
        />
        <StatCard
          label="Lost Opps"
          value={totalRejected}
          sub="Rejected leads"
          Icon={XCircle}
          color="bg-red-400"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Revenue Trajectory</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Daily Package Volume</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-700 shadow-lg shadow-green-100" />
              <span>Revenue Growth</span>
            </div>
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15803d" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f8fafc" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 900 }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 900 }}
                tickFormatter={(val) => `$${val}`}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '20px',
                  border: 'none',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  padding: '16px',
                  background: '#111827',
                  color: '#fff'
                }}
                itemStyle={{ color: '#22c55e', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
                cursor={{ stroke: '#15803d', strokeWidth: 2, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#15803d"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-50 flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <ShoppingCart size={18} className="text-green-700" />
              </div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Recent Orders</h2>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Total {filteredOrders.length}</span>
          </div>
          <div className="flex-1">
            {filteredOrders.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-2">
                <Package size={30} className="text-gray-200" />
                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No Recent Sales</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {filteredOrders.slice(0, 5).map((o) => (
                  <li key={o.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-black text-gray-900 truncate group-hover:text-green-700 transition-colors uppercase tracking-tight">{o.clientName}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5 truncate uppercase">
                        {o.productName} • {o.packageTitle}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-green-700 tracking-tighter">${o.packagePrice}</p>
                      <p className="text-[9px] font-bold text-gray-300 uppercase mt-0.5">{fmt(o.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-50 flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Phone size={18} className="text-blue-700" />
              </div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Lead Pipeline</h2>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Activity Feed</span>
          </div>
          <div className="flex-1">
            {filteredCalls.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-2">
                <Phone size={30} className="text-gray-200" />
                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Quiet Pipeline</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {filteredCalls.slice(0, 5).map((c) => {
                  const variant =
                    c.outcome === 'delivered'
                      ? 'bg-green-100 text-green-700'
                      : c.outcome === 'rejected'
                        ? 'bg-red-100 text-red-600'
                        : c.outcome === 'delivering'
                          ? 'bg-orange-100 text-orange-600'
                          : c.outcome === 'interested_future'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                  const label =
                    c.outcome === 'delivered'
                      ? 'Delivered'
                      : c.outcome === 'rejected'
                        ? 'Rejected'
                        : c.outcome === 'delivering'
                          ? 'Delivering'
                          : c.outcome === 'interested_future'
                            ? 'Future'
                            : 'Pending'
                  return (
                    <li key={c.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-black text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight truncate">{c.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-tighter">{c.phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full ${variant}`}>
                          {label}
                        </span>
                        <span className="text-[9px] font-bold text-gray-300 uppercase">{fmt(c.createdAt)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
