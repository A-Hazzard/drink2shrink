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
  Calendar
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
import type { Call, Order, Product } from '@/types'
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton'

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
    <div className={`rounded-xl shadow-sm border p-4 sm:p-5 flex items-start gap-3 sm:gap-4 transition-all ${highlight
      ? 'bg-orange-600 border-orange-500 xl:scale-105 shadow-orange-100 z-10'
      : 'bg-white border-gray-100'
      }`}>
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${highlight ? 'bg-white/20' : color
        }`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className={`text-xl sm:text-2xl font-bold ${highlight ? 'text-white' : 'text-gray-800'}`}>{value}</p>
        <p className={`text-xs sm:text-sm font-medium ${highlight ? 'text-orange-100' : 'text-gray-600'}`}>{label}</p>
        {(sub || trend) && (
          <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
            {sub && <p className={`text-[10px] sm:text-xs ${highlight ? 'text-orange-200' : 'text-gray-400'}`}>{sub}</p>}
            {trend && <p className="text-[10px] sm:text-xs font-bold text-green-500">{trend}</p>}
          </div>
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
  const [calls, setCalls] = useState<Call[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Filtering state
  const [filter, setFilter] = useState<TimeFilter>('30d')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })

  // --- Data Loading ---
  useEffect(() => {
    setLoading(true)
    let done = false
    const clear = () => { if (!done) { done = true; setLoading(false) } }
    const u1 = subscribeCalls((d) => { setCalls(d); clear() })
    const u2 = subscribeOrders((d) => { setOrders(d); clear() })
    const u3 = subscribeProducts((d) => { setProducts(d); clear() })
    return () => { u1(); u2(); u3() }
  }, [refreshKey])

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
          const correctOutcome = linkedOrder.status === 'delivered' ? 'sale' : 'out_for_delivery'
          if (call.outcome !== correctOutcome && (call.outcome === 'sale' || call.outcome === 'pending')) {
            console.log(`[Sync] Correcting call ${call.id} outcome to ${correctOutcome}`)
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
          console.log(`[Sync] Correcting revenue for order ${order.id}`)
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
        if (!customRange.start || !customRange.end) return null
        return { start: startOfDay(new Date(customRange.start)), end: endOfDay(new Date(customRange.end)) }
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
  const totalSales = filteredCalls.filter((c) => c.outcome === 'sale').length
  const totalOutForDelivery = filteredCalls.filter(c => c.outcome === 'out_for_delivery').length
  const totalRejected = filteredCalls.filter((c) => c.outcome === 'not_a_sale').length
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

  if (loading) return <DashboardSkeleton />

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Performance overview for Health is Wealth TT</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: 'this_month', label: 'Month' },
              { id: 'all', label: 'All' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as TimeFilter)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${filter === t.id ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setFilter('custom')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${filter === 'custom' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              <Calendar size={14} />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
            title="Refresh data"
          >
            <RefreshCcw size={20} className={loading && refreshKey > 0 ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {filter === 'custom' && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">From</label>
            <input
              type="date"
              value={customRange.start}
              onChange={e => setCustomRange(r => ({ ...r, start: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">To</label>
            <input
              type="date"
              value={customRange.end}
              onChange={e => setCustomRange(r => ({ ...r, end: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      )}

      {/* Stats Priority Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard
          label="Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          sub="Package only"
          Icon={DollarSign}
          color="bg-orange-500"
          highlight={true}
        />
        <StatCard
          label="Total Calls"
          value={totalCalls}
          Icon={Phone}
          color="bg-blue-500"
        />
        <StatCard
          label="Closed"
          value={totalSales}
          sub={`${convRate}% conv.`}
          Icon={TrendingUp}
          color="bg-green-600"
        />
        <StatCard
          label="Delivering"
          value={totalOutForDelivery}
          Icon={Truck}
          color="bg-purple-500"
        />
        <StatCard
          label="Rejected"
          value={totalRejected}
          Icon={XCircle}
          color="bg-red-500"
        />
        <StatCard
          label="Products"
          value={products.length}
          Icon={Package}
          color="bg-indigo-500"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Revenue Growth</h2>
            <p className="text-xs text-gray-400">Track your package revenue over time</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" />
              <span className="text-gray-600">Delivered Packages</span>
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
                itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f97316"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-orange-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-tight">Recent Orders</h2>
            </div>
          </div>
          <div className="flex-1">
            {filteredOrders.length === 0 ? (
              <p className="text-sm text-gray-400 px-5 py-12 text-center">No orders in this period.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {filteredOrders.slice(0, 6).map((o) => (
                  <li key={o.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-gray-800 italic">{o.clientName}</p>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        {o.productName} · {o.packageTitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-green-600">${o.packagePrice}</p>
                      <p className="text-[10px] text-gray-400">{fmt(o.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-blue-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-tight">Lead Activity</h2>
            </div>
          </div>
          <div className="flex-1">
            {filteredCalls.length === 0 ? (
              <p className="text-sm text-gray-400 px-5 py-12 text-center">No activity in this period.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {filteredCalls.slice(0, 6).map((c) => {
                  const badge =
                    c.outcome === 'sale'
                      ? 'text-green-700 bg-green-100'
                      : c.outcome === 'not_a_sale'
                        ? 'text-red-700 bg-red-100'
                        : c.outcome === 'out_for_delivery'
                          ? 'text-purple-700 bg-purple-100'
                          : 'text-yellow-700 bg-yellow-100'
                  const label =
                    c.outcome === 'sale'
                      ? 'Delivered'
                      : c.outcome === 'not_a_sale'
                        ? 'Rejected'
                        : c.outcome === 'out_for_delivery'
                          ? 'Delivering'
                          : 'Pending'
                  return (
                    <li key={c.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-gray-800 italic">{c.name}</p>
                        <p className="text-[10px] text-gray-400">{c.phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${badge}`}>
                          {label}
                        </span>
                        <span className="text-[10px] text-gray-400">{fmt(c.createdAt)}</span>
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
