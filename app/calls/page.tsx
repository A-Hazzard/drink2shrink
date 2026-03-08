'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Phone, Archive, RotateCcw, Trash2, RefreshCcw } from 'lucide-react'
import { subscribeCalls, archiveCall, restoreCall, deleteCall, subscribeOrders, updateCall } from '@/lib/firestore'
import type { Call, Order } from '@/types'
import { DELIVERY_AREA_LABELS } from '@/types'
import Modal from '@/components/Modal'
import CallForm from '@/components/calls/CallForm'
import Badge from '@/components/Badge'
import TableSkeleton from '@/components/skeletons/TableSkeleton'

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
  })
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Call | undefined>()
  const [viewCall, setViewCall] = useState<Call | undefined>()
  const [showArchived, setShowArchived] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    const u1 = subscribeCalls((data) => {
      setCalls(data)
      setLoading(false)
    }, showArchived)

    const u2 = subscribeOrders((data) => {
      setOrders(data)
    }, false)

    return () => { u1(); u2() }
  }, [showArchived, refreshKey])

  function handleRefresh() {
    setLoading(true)
    setTimeout(() => setRefreshKey(prev => prev + 1), 500)
  }

  // Background Sync: Ensure 'sale' outcomes match order status
  useEffect(() => {
    if (loading || calls.length === 0 || orders.length === 0) return

    const syncOutcomes = async () => {
      for (const call of calls) {
        const linkedOrder = orders.find(o => o.id === call.orderId || o.callId === call.id)
        if (linkedOrder) {
          const correctOutcome = linkedOrder.status === 'delivered' ? 'sale' : 'out_for_delivery'
          if (call.outcome !== correctOutcome && (call.outcome === 'sale' || call.outcome === 'pending')) {
            await updateCall(call.id, { outcome: correctOutcome })
          }
        }
      }
    }

    syncOutcomes()
  }, [calls, orders, loading])

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

  const totalCalls = calls.length
  const sales = calls.filter((c) => c.outcome === 'sale').length
  const outForDelivery = calls.filter((c) => c.outcome === 'out_for_delivery').length
  const pending = calls.filter((c) => c.outcome === 'pending').length

  if (loading) return <TableSkeleton cols={7} rows={5} />

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Calls</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            <span className="text-green-700 font-bold">{sales}</span> delivered · <span className="text-purple-600 font-bold">{outForDelivery}</span> delivering · <span className="text-orange-500 font-bold">{pending}</span> pending
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
            className="flex items-center gap-2 px-6 py-2.5 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-all shadow-lg shadow-green-100 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            LOG CALL
          </button>
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 py-20 flex flex-col items-center gap-4 text-center px-6">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
            <Phone size={40} className="text-gray-300" />
          </div>
          <div>
            <p className="text-gray-900 font-black text-lg">{showArchived ? 'Archive is empty' : 'No calls logged yet'}</p>
            <p className="text-gray-500 text-sm mt-1">Ready to start your wellness outreach?</p>
          </div>
          {!showArchived && (
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
                    <th className="px-6 py-4">Goal</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Order</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {calls.map((call) => (
                    <tr key={call.id} className="group hover:bg-green-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 group-hover:text-green-800 transition-colors">{call.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{fmt(call.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{call.phone}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md uppercase tracking-tighter">
                          {call.goal ? GOAL_LABELS[call.goal] : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            call.outcome === 'sale'
                              ? 'sale'
                              : call.outcome === 'not_a_sale'
                                ? 'not_a_sale'
                                : call.outcome === 'out_for_delivery'
                                  ? 'out_for_delivery'
                                  : 'pending'
                          }
                          label={
                            call.outcome === 'sale'
                              ? 'Delivered'
                              : call.outcome === 'not_a_sale'
                                ? 'No Sale'
                                : call.outcome === 'out_for_delivery'
                                  ? 'Delivering'
                                  : 'Pending'
                          }
                        />
                      </td>
                      <td className="px-6 py-4">
                        {call.orderId ? (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-tighter">Ordered</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
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
            {calls.map((call) => (
              <div
                key={call.id}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 active:scale-[0.98] transition-all"
                onClick={() => setViewCall(call)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-black text-gray-900 text-lg leading-tight truncate">{call.name}</h3>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tight">{call.phone}</p>
                  </div>
                  <div className="shrink-0">
                    <Badge
                      variant={
                        call.outcome === 'sale'
                          ? 'sale'
                          : call.outcome === 'not_a_sale'
                            ? 'not_a_sale'
                            : call.outcome === 'out_for_delivery'
                              ? 'out_for_delivery'
                              : 'pending'
                      }
                      label={
                        call.outcome === 'sale'
                          ? 'Delivered'
                          : call.outcome === 'not_a_sale'
                            ? 'No Sale'
                            : call.outcome === 'out_for_delivery'
                              ? 'Delivering'
                              : 'Pending'
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Goal</p>
                    <p className="text-xs font-bold text-gray-600 mt-0.5 tracking-tight capitalize truncate">
                      {call.goal ? GOAL_LABELS[call.goal] : 'No goal set'}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Logged</p>
                    <p className="text-xs font-bold text-gray-400 mt-0.5 tracking-tight">
                      {fmt(call.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {call.orderId && (
                      <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black text-green-700 uppercase tracking-tighter">Ordered</span>
                      </div>
                    )}
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
          title={editing ? `Edit Call — ${editing.name}` : 'Log New Call'}
          onClose={closeForm}
          wide
        >
          <CallForm call={editing} onDone={closeForm} />
        </Modal>
      )}

      {/* View call details modal */}
      {viewCall && (
        <Modal
          title={`Call Details — ${viewCall.name}`}
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
    ['Goal', call.goal ? { lose_weight: 'Lose Weight', detox: 'Detox', both: 'Both' }[call.goal] : undefined],
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
    ['Delivery Area', call.area ? DELIVERY_AREA_LABELS[call.area] : undefined],
    ['Address', call.address],
    ['Notes', call.notes],
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge
          variant={
            call.outcome === 'sale'
              ? 'sale'
              : call.outcome === 'not_a_sale'
                ? 'not_a_sale'
                : call.outcome === 'out_for_delivery'
                  ? 'out_for_delivery'
                  : 'pending'
          }
          label={
            call.outcome === 'sale'
              ? 'Delivered'
              : call.outcome === 'not_a_sale'
                ? 'No Sale'
                : call.outcome === 'out_for_delivery'
                  ? 'Delivering'
                  : 'Pending'
          }
        />
        {call.orderId && <Badge variant="neutral" label="Order placed" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {rows.map(([label, value]) =>
          value ? (
            <div key={label} className="border-b border-gray-50 pb-2">
              <dt className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{label}</dt>
              <dd className="text-sm text-gray-800 mt-1 font-medium">{String(value)}</dd>
            </div>
          ) : null
        )}
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-6 py-3 text-sm font-black text-white bg-green-700 rounded-xl hover:bg-green-800 transition-all shadow-lg shadow-green-100"
        >
          <Pencil size={18} />
          EDIT LOG
        </button>
      </div>
    </div>
  )
}
