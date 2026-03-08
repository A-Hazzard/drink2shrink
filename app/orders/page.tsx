'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, ShoppingCart, Archive, RotateCcw, Trash2, RefreshCcw, DollarSign, Search, ArrowUpDown, Calendar, Filter, CalendarDays } from 'lucide-react'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { subscribeOrders, subscribeCalls, subscribeProducts, updateOrder, archiveOrder, restoreOrder, deleteOrder, updateCall } from '@/lib/firestore'
import type { Order, Call, Product, OrderStatus, CallOutcome } from '@/types'
import { DELIVERY_AREA_LABELS } from '@/types'
import Modal from '@/components/Modal'
import OrderForm from '@/components/orders/OrderForm'
import Badge from '@/components/Badge'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

function fmt(ts?: { seconds: number }) {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-TT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type SortBy = 'newest' | 'oldest' | 'name'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  delivering: 'Delivering',
  interested_future: 'Future Date'
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [calls, setCalls] = useState<Call[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Order | undefined>()
  const [showArchived, setShowArchived] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')

  useEffect(() => {
    if (!user?.email) return
    setLoading(true)
    let done = false
    const clear = () => { if (!done) { done = true; setLoading(false) } }
    const u1 = subscribeOrders(user.email, (d) => { setOrders(d); clear() }, showArchived)
    const u2 = subscribeCalls(user.email, (d) => { setCalls(d); clear() })
    const u3 = subscribeProducts(user.email, (d) => { setProducts(d); clear() })
    return () => { u1(); u2(); u3() }
  }, [showArchived, refreshKey, user])

  function handleRefresh() {
    setLoading(true)
    setTimeout(() => setRefreshKey(prev => prev + 1), 500)
  }

  // Process orders: Filter -> Sort
  const processedOrders = useMemo(() => {
    let result = [...orders]

    // 1. Search (Name or Phone)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(o =>
        o.clientName.toLowerCase().includes(q) ||
        o.clientPhone.includes(q)
      )
    }

    // 2. Date Filter (Interval)
    if (dateFilter?.from) {
      const start = startOfDay(dateFilter.from)
      const end = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(dateFilter.from)
      result = result.filter(o => {
        if (!o.createdAt) return false
        const d = new Date(o.createdAt.seconds * 1000)
        return isWithinInterval(d, { start, end })
      })
    }

    // 3. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter)
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
      }
      if (sortBy === 'oldest') {
        return (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
      }
      if (sortBy === 'name') {
        return a.clientName.localeCompare(b.clientName)
      }
      return 0
    })

    return result
  }, [orders, searchQuery, sortBy, dateFilter, statusFilter])

  function openAdd() {
    setEditing(undefined)
    setShowForm(true)
  }

  function openEdit(o: Order) {
    setEditing(o)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
  }

  async function toggleStatus(order: Order) {
    // Cycle statuses: pending -> delivering -> delivered -> pending
    let next: OrderStatus = 'pending'
    if (order.status === 'pending') next = 'delivering'
    else if (order.status === 'delivering') next = 'delivered'
    else if (order.status === 'delivered') next = 'pending'
    else if (order.status === 'interested_future') next = 'pending'

    await updateOrder(order.id, { status: next })

    if (order.callId) {
      await updateCall(order.callId, { outcome: next as CallOutcome })
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this order?')) return
    await archiveOrder(id)
  }

  async function handleRestore(id: string) {
    await restoreOrder(id)
  }

  async function handleDelete(order: Order) {
    if (!confirm('PERMANENTLY DELETE this order? This cannot be undone.')) return
    await deleteOrder(order.id)

    if (order.callId) {
      await updateCall(order.callId, {
        orderId: undefined,
        outcome: 'pending'
      })
    }
  }

  const activeRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.packagePrice ?? 0), 0)

  if (authLoading || (loading && orders.length === 0)) return <TableSkeleton cols={7} rows={5} />
  if (!user) return null

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Orders</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
              <DollarSign size={12} className="text-green-600" />
              <span className="text-xs font-black text-green-700 uppercase tracking-tighter">
                ${activeRevenue.toLocaleString()} Revenue
              </span>
            </div>
            <span className="text-xs font-bold text-gray-400">• {orders.length} total</span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleRefresh}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 shadow-sm active:scale-95"
            title="Refresh data"
          >
            <RefreshCcw size={20} className={loading && refreshKey > 0 ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all shadow-sm active:scale-95 ${showArchived
              ? 'bg-gray-900 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
          >
            <Archive size={18} />
            <span className="hidden xs:inline">{showArchived ? 'Active' : 'Archived'}</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white text-sm font-black rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 active:scale-95 uppercase tracking-widest"
          >
            <Plus size={18} strokeWidth={3} />
            NEW ORDER
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by client or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 md:w-36">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all appearance-none font-bold text-gray-600"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
              <option value="delivering">Delivering</option>
              <option value="interested_future">Future Date</option>
            </select>
          </div>

          <div className="relative flex-1 md:w-36">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all appearance-none font-bold text-gray-600"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          <div className="flex-1 md:w-56">
            <DateRangePicker
              date={dateFilter}
              setDate={setDateFilter}
              placeholder="Select Date Interval"
              className="w-full"
            />
          </div>

          {(searchQuery || sortBy !== 'newest' || dateFilter || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setSortBy('newest'); setDateFilter(undefined); setStatusFilter('all') }}
              className="px-4 py-2 text-xs font-black text-red-500 hover:bg-red-50 rounded-xl transition-all uppercase tracking-tighter"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {processedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 py-20 flex flex-col items-center gap-4 text-center px-6">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
            {searchQuery || dateFilter || statusFilter !== 'all' ? <Search size={40} className="text-gray-300" /> : <ShoppingCart size={40} className="text-gray-300" />}
          </div>
          <div>
            <p className="text-gray-900 font-black text-lg">
              {searchQuery || dateFilter || statusFilter !== 'all' ? 'No results found' : showArchived ? 'No archived orders' : 'Your order book is empty'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {searchQuery || dateFilter || statusFilter !== 'all' ? 'Try adjusting your search criteria' : 'Ready to fulfill some wellness goals?'}
            </p>
          </div>
          {!showArchived && !searchQuery && !dateFilter && statusFilter === 'all' && (
            calls.length > 0 && products.length > 0 ? (
              <button
                onClick={openAdd}
                className="mt-2 px-8 py-3 bg-orange-50 text-orange-600 font-black rounded-xl hover:bg-orange-100 transition-colors uppercase tracking-wider text-xs"
              >
                Place First Order
              </button>
            ) : (
              <div className="mt-2 max-w-xs">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                  Add products and log calls first to enable ordering system.
                </p>
              </div>
            )
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Package Details</th>
                    <th className="px-6 py-4">Fulfillment</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processedOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-orange-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{order.clientName}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-tight">{order.clientPhone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-black text-gray-800 uppercase tracking-tighter">{order.productName}</div>
                        <div className="text-[10px] text-gray-500 font-medium mt-0.5">{order.packageTitle}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-black text-green-700 uppercase tracking-tighter">$ {order.packagePrice}</div>
                        <div className="text-[10px] text-gray-400 font-medium mt-0.5 capitalize">{DELIVERY_AREA_LABELS[order.area]}</div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(order)}
                          className="active:scale-95 transition-transform"
                        >
                          <Badge
                            variant={order.status}
                            label={STATUS_LABELS[order.status]}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(order)}
                            className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => showArchived ? handleRestore(order.id) : handleArchive(order.id)}
                            className={`p-2 transition-colors ${showArchived ? 'text-blue-400 hover:text-blue-700' : 'text-orange-300 hover:text-orange-600'}`}
                            title={showArchived ? 'Restore' : 'Archive'}
                          >
                            {showArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(order)}
                            className="p-2 text-gray-300 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {processedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-black text-gray-900 text-lg leading-tight truncate">{order.clientName}</h3>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tight">{order.clientPhone}</p>
                  </div>
                  <button
                    onClick={() => toggleStatus(order)}
                    className="shrink-0 active:scale-90 transition-transform"
                  >
                    <Badge
                      variant={order.status}
                      label={STATUS_LABELS[order.status]}
                    />
                  </button>
                </div>

                <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</p>
                    <p className="text-gray-800 uppercase tracking-tighter">{order.productName}</p>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Package</p>
                    <p className="text-gray-600">{order.packageTitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Price</p>
                    <p className="text-sm font-black text-green-700 tracking-tighter mt-1">${order.packagePrice}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Area</p>
                    <p className="text-xs font-bold text-gray-600 mt-1 uppercase tracking-tighter truncate">
                      {DELIVERY_AREA_LABELS[order.area]}
                    </p>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Date</p>
                    <p className="text-xs font-bold text-gray-400 mt-1">
                      {order.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString('en-TT', { day: 'numeric', month: 'short' })
                        : fmt(order.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => openEdit(order)}
                    className="p-2.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors border border-gray-50 shadow-sm"
                  >
                    <Pencil size={16} />
                  </button>
                  {!showArchived ? (
                    <button
                      onClick={() => handleArchive(order.id)}
                      className="p-2.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors border border-gray-50 shadow-sm"
                    >
                      <Archive size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRestore(order.id)}
                      className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-50 shadow-sm"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(order)}
                    className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-gray-50 shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <Modal
          title={editing ? 'Edit Order' : 'Place New Order'}
          onClose={closeForm}
          wide
        >
          <OrderForm
            calls={calls}
            products={products}
            order={editing}
            onDone={closeForm}
          />
        </Modal>
      )}
    </div>
  )
}
