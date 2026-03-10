'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Phone, Archive, RotateCcw, Trash2, RefreshCcw, Search, ArrowUpDown, Filter } from 'lucide-react'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { subscribeCalls, archiveCall, restoreCall, deleteCall, subscribeOrders, subscribeProducts, updateCall } from '@/lib/firestore'
import type { Call, Order, Product, CallOutcome } from '@/types'
import { DELIVERY_AREA_LABELS } from '@/types'
import Modal from '@/components/Modal'
import CallForm from '@/components/calls/CallForm'
import Badge from '@/components/Badge'
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { useAuth } from '@/contexts/AuthContext'


const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose Weight',
  detox: 'Detox',
  both: 'Both',
}

function fmt(ts?: { seconds: number }) {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-TT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

type SortBy = 'newest' | 'oldest' | 'name'

const STATUS_LABELS: Record<CallOutcome, string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  delivering: 'Delivering',
  rejected: 'Rejected',
  interested_future: 'Future Date'
}

export default function CallsPage() {
  const { user, loading: authLoading } = useAuth()

  const [calls, setCalls] = useState<Call[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Call | undefined>()
  const [viewCall, setViewCall] = useState<Call | undefined>()
  const [showArchived, setShowArchived] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>()
  const [statusFilter, setStatusFilter] = useState<CallOutcome | 'all'>('all')

  useEffect(() => {
    if (!user?.email) return
    setLoading(true)
    const u1 = subscribeCalls(user.email, (data) => {
      setCalls(data)
      setLoading(false)
    }, showArchived)

    const u2 = subscribeOrders(user.email, (data) => {
      setOrders(data)
    }, false)

    const u3 = subscribeProducts(user.email, (data) => {
      setProducts(data)
    }, false)

    return () => { u1(); u2(); u3() }
  }, [showArchived, refreshKey, user])

  function handleRefresh() {
    setLoading(true)
    setTimeout(() => setRefreshKey(prev => prev + 1), 500)
  }

  // Background Sync
  useEffect(() => {
    if (loading || calls.length === 0 || orders.length === 0) return

    const syncOutcomes = async () => {
      for (const call of calls) {
        const linkedOrder = orders.find(o => o.id === call.orderId || o.callId === call.id)
        if (linkedOrder) {
          // If a linked order exists, sync the call status to match the order status
          if (call.outcome !== linkedOrder.status) {
            await updateCall(call.id, { outcome: linkedOrder.status as CallOutcome })
          }
        }
      }
    }

    syncOutcomes()
  }, [calls, orders, loading])

  // Process calls: Filter -> Sort
  const processedCalls = useMemo(() => {
    let result = [...calls]

    // 1. Search (Name or Phone)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q)
      )
    }

    // 2. Date Filter (Interval)
    if (dateFilter?.from) {
      const start = startOfDay(dateFilter.from)
      const end = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(dateFilter.from)
      result = result.filter(c => {
        if (!c.createdAt) return false
        const d = new Date(c.createdAt.seconds * 1000)
        return isWithinInterval(d, { start, end })
      })
    }

    // 3. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.outcome === statusFilter)
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
        return a.name.localeCompare(b.name)
      }
      return 0
    })

    return result
  }, [calls, searchQuery, sortBy, dateFilter, statusFilter])

  function openAdd() {
    setEditing(undefined)
    setShowForm(true)
  }

  function openEdit(c: Call) {
    setEditing(c)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this client?')) return
    await archiveCall(id)
  }

  async function handleRestore(id: string) {
    await restoreCall(id)
  }

  async function handleDelete(id: string) {
    if (!confirm('PERMANENTLY DELETE this client? This cannot be undone.')) return
    await deleteCall(id)
  }

  const sales = calls.filter((c) => c.outcome === 'delivered').length
  const outForDelivery = calls.filter((c) => c.outcome === 'delivering').length
  const pending = calls.filter((c) => c.outcome === 'pending').length

  if (authLoading || (loading && calls.length === 0)) return <TableSkeleton cols={7} rows={5} />
  if (!user) return null

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Calls</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            <span className="text-green-700 font-bold">{sales}</span> delivered · <span className="text-orange-600 font-bold">{outForDelivery}</span> delivering · <span className="text-orange-500 font-bold">{pending}</span> pending
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleRefresh}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 shadow-sm active:scale-95"
            title="Refresh data"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
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
            className="flex items-center gap-2 px-6 py-2.5 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-all shadow-lg shadow-green-100 active:scale-95 uppercase tracking-widest"
          >
            <Plus size={18} strokeWidth={3} />
            LOG CALL
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 md:w-36">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CallOutcome | 'all')}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none font-bold text-gray-600"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
              <option value="delivering">Delivering</option>
              <option value="rejected">Rejected</option>
              <option value="interested_future">Future Date</option>
            </select>
          </div>

          <div className="relative flex-1 md:w-36">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none font-bold text-gray-600"
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

      {processedCalls.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 py-20 flex flex-col items-center gap-4 text-center px-6">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
            {searchQuery || dateFilter || statusFilter !== 'all' ? <Search size={40} className="text-gray-300" /> : <Phone size={40} className="text-gray-300" />}
          </div>
          <div>
            <p className="text-gray-900 font-black text-lg">
              {searchQuery || dateFilter || statusFilter !== 'all' ? 'No results found' : showArchived ? 'Archive is empty' : 'No calls logged yet'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {searchQuery || dateFilter || statusFilter !== 'all' ? 'Try adjusting your search criteria' : 'Ready to start your wellness outreach?'}
            </p>
          </div>
          {!showArchived && !searchQuery && !dateFilter && statusFilter === 'all' && (
            <button
              onClick={openAdd}
              className="mt-2 px-8 py-3 bg-green-50 text-green-700 font-black rounded-xl hover:bg-green-100 transition-colors uppercase tracking-wider text-xs"
            >
              Start First Log
            </button>
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
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Product / Package</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processedCalls.map((call) => (
                    <tr key={call.id} className="group hover:bg-green-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 group-hover:text-green-800 transition-colors">{call.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{fmt(call.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{call.phone}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-black text-gray-800 uppercase tracking-tighter">
                          {(() => {
                            const order = orders.find(o => o.callId === call.id)
                            if (order?.items && order.items.length > 1) return `${order.items.length} Products`
                            return order?.productName || '—'
                          })()}
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                          {(() => {
                            const order = orders.find(o => o.callId === call.id)
                            if (order?.items && order.items.length > 1) {
                              const qtys = order.items.reduce((s, i) => s + i.quantity, 0)
                              return `${qtys} Packages Total`
                            }
                            if (order?.items && order.items.length === 1) {
                              return `${order.items[0].packageTitle} (x${order.items[0].quantity})`
                            }
                            return order?.packageTitle || 'Potential Interest'
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={call.outcome}
                          label={STATUS_LABELS[call.outcome]}
                        />
                        {call.outcome === 'interested_future' && call.followUpDate && (
                          <div className="text-[9px] font-bold text-blue-600 mt-1 uppercase tracking-tighter">
                            Req: {new Date(call.followUpDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setViewCall(call)}
                            className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                            title="Quick View"
                          >
                            <Phone size={16} />
                          </button>
                          <button
                            onClick={() => openEdit(call)}
                            className="p-2 text-gray-400 hover:text-green-700 transition-colors"
                            title="Edit Details"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => showArchived ? handleRestore(call.id) : handleArchive(call.id)}
                            className={`p-2 transition-colors ${showArchived ? 'text-blue-400 hover:text-blue-700' : 'text-orange-300 hover:text-orange-600'}`}
                            title={showArchived ? 'Restore' : 'Archive'}
                          >
                            {showArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(call.id)}
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
            {processedCalls.map((call) => (
              <div
                key={call.id}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4 active:scale-[0.98] transition-all"
                onClick={() => setViewCall(call)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-black text-gray-900 text-lg leading-tight truncate">{call.name}</h3>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tight">{call.phone}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <Badge
                      variant={call.outcome}
                      label={STATUS_LABELS[call.outcome]}
                    />
                    {call.outcome === 'interested_future' && call.followUpDate && (
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                        {new Date(call.followUpDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</p>
                    <p className="text-xs font-black text-gray-800 mt-0.5 tracking-tight uppercase truncate">
                      {(() => {
                        const order = orders.find(o => o.callId === call.id)
                        if (order?.items && order.items.length > 1) return `${order.items.length} Products`
                        return order?.productName || 'TBD'
                      })()}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Package</p>
                    <p className="text-xs font-bold text-gray-500 mt-0.5 tracking-tight truncate">
                      {(() => {
                        const order = orders.find(o => o.callId === call.id)
                        if (order?.items && order.items.length > 1) {
                          const qtys = order.items.reduce((s, i) => s + i.quantity, 0)
                          return `${qtys} Packages`
                        }
                        if (order?.items && order.items.length === 1) {
                          return `${order.items[0].packageTitle} (x${order.items[0].quantity})`
                        }
                        return order?.packageTitle || 'NONE'
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{fmt(call.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(call)}
                      className="p-2.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors border border-gray-50 shadow-sm"
                    >
                      <Pencil size={16} />
                    </button>
                    {!showArchived ? (
                      <button
                        onClick={() => handleArchive(call.id)}
                        className="p-2.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors border border-gray-50 shadow-sm"
                      >
                        <Archive size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestore(call.id)}
                        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-50 shadow-sm"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Log / Edit call modal */}
      {showForm && (
        <Modal
          title={editing ? `Edit Log — ${editing.name}` : 'Log New Call'}
          onClose={closeForm}
          wide
        >
          <CallForm call={editing} order={editing ? orders.find(o => o.callId === editing.id) : undefined} products={products} onDone={closeForm} />
        </Modal>
      )}

      {/* View call details modal */}
      {viewCall && (
        <Modal
          title={`Detailed History — ${viewCall.name}`}
          onClose={() => setViewCall(undefined)}
          wide
        >
          <CallDetail call={viewCall} onEdit={() => { setViewCall(undefined); openEdit(viewCall) }} />
        </Modal>
      )}
    </div>
  )
}

function CallDetail({ call, onEdit }: { call: Call; onEdit: () => void }) {
  const rows: [string, string | undefined | boolean][] = [
    ['Phone', call.phone],
    ['Goal', call.goal ? GOAL_LABELS[call.goal] : undefined],
    ['Current Weight', call.currentWeight],
    ['Goal Weight', call.goalWeight],
    ['Medical / Medications', call.medicalConditions],
    ['Previous Attempts', call.previousAttempts],
    ['Pregnant', call.pregnant ? 'Yes' : undefined],
    ['Breastfeeding', call.breastfeeding ? 'Yes' : undefined],
    ['Allergies', call.allergies],
    ['Routine Convenience', call.routineConvenience],
    ['Timeline', call.timeline],
    ['Interested Package', call.interestedPackage],
    ['Requested Future Date', call.followUpDate ? new Date(call.followUpDate).toLocaleDateString() : undefined],
    ['Delivery Area', call.area ? DELIVERY_AREA_LABELS[call.area] : undefined],
    ['Address', call.address],
    ['Notes', call.notes],
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge
          variant={call.outcome}
          label={STATUS_LABELS[call.outcome]}
        />
        {call.orderId && <Badge variant="neutral" label="Order Connected" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {rows.map(([label, value]) =>
          value ? (
            <div key={label} className="border-b border-gray-50 pb-2">
              <dt className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{label}</dt>
              <dd className="text-sm text-gray-800 mt-1 font-bold">{String(value)}</dd>
            </div>
          ) : null
        )}
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-8 py-4 text-xs font-black text-white bg-green-700 rounded-2xl hover:bg-green-800 transition-all shadow-lg shadow-green-900/10 uppercase tracking-widest active:scale-95"
        >
          <Pencil size={18} />
          MODIFY RECORD
        </button>
      </div>
    </div>
  )
}
