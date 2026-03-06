'use client'

import { useEffect, useState } from 'react'
import { Phone, ShoppingCart, DollarSign, TrendingUp, Package, XCircle } from 'lucide-react'
import { subscribeCalls, subscribeOrders, subscribeProducts } from '@/lib/firestore'
import type { Call, Order, Product } from '@/types'
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton'

function StatCard({
  label,
  value,
  sub,
  Icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  Icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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

export default function DashboardPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let done = false
    const clear = () => { if (!done) { done = true; setLoading(false) } }
    const u1 = subscribeCalls((d) => { setCalls(d); clear() })
    const u2 = subscribeOrders((d) => { setOrders(d); clear() })
    const u3 = subscribeProducts((d) => { setProducts(d); clear() })
    return () => { u1(); u2(); u3() }
  }, [])

  const totalCalls = calls.length
  const totalSales = calls.filter((c) => c.outcome === 'sale').length
  const totalRejected = calls.filter((c) => c.outcome === 'not_a_sale').length
  const totalRevenue = orders.reduce((sum, o) => sum + (o.packagePrice ?? 0), 0)
  const convRate = totalCalls > 0 ? Math.round((totalSales / totalCalls) * 100) : 0

  const recentOrders = orders.slice(0, 5)
  const recentCalls = calls.slice(0, 5)

  if (loading) return <DashboardSkeleton />

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Health is Wealth TT — Sales overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total Calls"
          value={totalCalls}
          Icon={Phone}
          color="bg-blue-500"
        />
        <StatCard
          label="Sales Closed"
          value={totalSales}
          sub={`${convRate}% conversion`}
          Icon={TrendingUp}
          color="bg-green-600"
        />
        <StatCard
          label="Rejected"
          value={totalRejected}
          Icon={XCircle}
          color="bg-red-500"
        />
        <StatCard
          label="Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          sub="Package price only"
          Icon={DollarSign}
          color="bg-orange-500"
        />
        <StatCard
          label="Products"
          value={products.length}
          Icon={Package}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShoppingCart size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Recent Orders</h2>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 py-6">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentOrders.map((o) => (
                <li key={o.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{o.clientName}</p>
                    <p className="text-xs text-gray-400">
                      {o.productName} · {o.packageTitle}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-700">${o.totalPrice}</p>
                    <p className="text-xs text-gray-400">{fmt(o.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Calls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Phone size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Recent Calls</h2>
          </div>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 py-6">No calls logged yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentCalls.map((c) => {
                const badge =
                  c.outcome === 'sale'
                    ? 'text-green-700 bg-green-100'
                    : c.outcome === 'not_a_sale'
                      ? 'text-red-700 bg-red-100'
                      : 'text-yellow-700 bg-yellow-100'
                const label =
                  c.outcome === 'sale'
                    ? 'Sale'
                    : c.outcome === 'not_a_sale'
                      ? 'Not a Sale'
                      : 'Pending'
                return (
                  <li key={c.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>
                        {label}
                      </span>
                      <span className="text-xs text-gray-400">{fmt(c.createdAt)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
